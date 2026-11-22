"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiError, apiRequest } from "@/lib/api";
import { formatBookingDateTime } from "@/lib/labels";
import type {
  InterviewState,
  InterviewTokenResponse,
  PublicUser,
} from "@/lib/types";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type ZoomClient = ReturnType<
  typeof import("@zoom/videosdk").default.createClient
>;
type ZoomStream = ReturnType<ZoomClient["getMediaStream"]>;
type VideoQualityValue = Parameters<ZoomStream["attachVideo"]>[1];

type Stage = "ready" | "connecting" | "connected" | "left" | "error";
type Connection = "idle" | "connected" | "reconnecting" | "closed" | "failed";

type RoomParticipant = {
  userId: number;
  name: string;
  videoOn: boolean;
  muted: boolean;
  isSelf: boolean;
  isInFailover: boolean;
};

export function InterviewRoom({
  bookingId,
  counterpartName,
  user,
  initialInterview,
}: {
  bookingId: string;
  counterpartName: string;
  user: PublicUser;
  initialInterview: InterviewState | null;
}) {
  const router = useRouter();
  const [interview, setInterview] = useState(initialInterview);
  const [stage, setStage] = useState<Stage>("ready");
  const [connection, setConnection] = useState<Connection>("idle");
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [audioOn, setAudioOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [busyAudio, setBusyAudio] = useState(false);
  const [busyVideo, setBusyVideo] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const intentionalLeaveRef = useRef(false);
  const clientRef = useRef<ZoomClient | null>(null);
  const streamRef = useRef<ZoomStream | null>(null);
  const videoQualityRef = useRef<VideoQualityValue | null>(null);
  const currentUserIdRef = useRef<number | null>(null);
  const audioStartedRef = useRef(false);
  const videoElementsRef = useRef(new Map<number, HTMLElement>());
  const remoteContainerRef = useRef<HTMLDivElement | null>(null);
  const selfContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const client = clientRef.current;
      clientRef.current = null;
      streamRef.current = null;

      if (client) {
        void client.leave().catch(() => undefined);
      }

      void import("@zoom/videosdk")
        .then((module) => module.default.destroyClient())
        .catch(() => undefined);
    };
  }, []);

  function syncParticipants() {
    const client = clientRef.current;

    if (!client) {
      return;
    }

    const currentUserId = currentUserIdRef.current;
    const all = client.getAllUser();
    const currentUser = client.getCurrentUserInfo();

    if (
      currentUser &&
      !all.some((participant) => participant.userId === currentUser.userId)
    ) {
      all.push(currentUser);
    }

    if (!mountedRef.current) {
      return;
    }

    setParticipants(
      all.map((participant) => ({
        userId: participant.userId,
        name: participant.displayName || "Participant",
        videoOn: participant.bVideoOn,
        muted: participant.muted ?? false,
        isSelf: participant.userId === currentUserId,
        isInFailover: participant.isInFailover ?? false,
      })),
    );
  }

  async function attachVideoFor(userId: number) {
    const stream = streamRef.current;
    const videoQuality = videoQualityRef.current;

    if (!stream || !videoQuality || videoElementsRef.current.has(userId)) {
      return;
    }

    const isSelf = userId === currentUserIdRef.current;
    const container = isSelf
      ? selfContainerRef.current
      : remoteContainerRef.current;

    if (!container) {
      return;
    }

    const player = await stream.attachVideo(userId, videoQuality);

    if (!(player instanceof HTMLElement)) {
      return;
    }

    if (isSelf) {
      container.replaceChildren(player);
    } else {
      container.appendChild(player);
    }

    videoElementsRef.current.set(userId, player);
  }

  async function detachVideoFor(userId: number) {
    const stream = streamRef.current;

    if (!stream) {
      return;
    }

    const detached = await stream.detachVideo(userId);

    if (Array.isArray(detached)) {
      detached.forEach((element) => element.remove());
    } else if (detached instanceof HTMLElement) {
      detached.remove();
    }

    videoElementsRef.current.delete(userId);
  }

  function bindClientEvents(client: ZoomClient) {
    client.on(
      "connection-change",
      (payload: { state: string; reason?: string }) => {
        if (!mountedRef.current) {
          return;
        }

        if (payload.state === "Connected") {
          setConnection("connected");
          setStage("connected");
          setJoinError(null);
          syncParticipants();
          return;
        }

        if (payload.state === "Reconnecting") {
          setConnection("reconnecting");
          setNotice("Your connection was interrupted. Reconnecting…");
          return;
        }

        if (payload.state === "Closed") {
          setConnection("closed");
          setAudioOn(false);
          setVideoOn(false);
          setNotice(
            intentionalLeaveRef.current
              ? "You left the interview."
              : "The interview session has ended.",
          );
          if (!intentionalLeaveRef.current) {
            setStage("left");
          }
          return;
        }

        if (payload.state === "Fail") {
          setConnection("failed");
          setStage("error");
          setJoinError(
            payload.reason
              ? `The video connection failed: ${payload.reason}.`
              : "The video connection failed. Check your network and try again.",
          );
        }
      },
    );

    client.on("user-added", () => syncParticipants());
    client.on("user-updated", () => syncParticipants());
    client.on("user-removed", (removed: Array<{ userId: number }>) => {
      removed.forEach((participant) => {
        void detachVideoFor(participant.userId);
      });
      syncParticipants();
    });
    client.on(
      "peer-video-state-change",
      (payload: { action: "Start" | "Stop"; userId: number }) => {
        if (payload.action === "Start") {
          void attachVideoFor(payload.userId);
        } else {
          void detachVideoFor(payload.userId);
        }
        syncParticipants();
      },
    );
    client.on("current-audio-change", (payload: { action: string }) => {
      if (!mountedRef.current) {
        return;
      }

      if (payload.action === "muted") {
        setAudioOn(false);
      } else if (payload.action === "unmuted" || payload.action === "join") {
        setAudioOn(true);
      } else if (payload.action === "leave") {
        setAudioOn(false);
        audioStartedRef.current = false;
      }
    });
    client.on("active-media-failed", (payload: { message?: string }) => {
      if (!mountedRef.current) {
        return;
      }

      setMediaError(
        payload.message ||
          "Your microphone or camera was interrupted. Refresh the page to recover.",
      );
    });
  }

  async function startInitialMedia() {
    const stream = streamRef.current;

    if (!stream) {
      return;
    }

    try {
      await stream.startAudio();
      audioStartedRef.current = true;
      if (mountedRef.current) {
        setAudioOn(true);
      }
    } catch (error) {
      if (mountedRef.current) {
        setDeviceError((current) => current ?? mediaErrorMessage(error));
      }
    }

    try {
      await stream.startVideo();
      if (mountedRef.current) {
        setVideoOn(true);
      }
      const currentUserId = currentUserIdRef.current;
      if (currentUserId !== null) {
        await attachVideoFor(currentUserId);
      }
    } catch (error) {
      if (mountedRef.current) {
        setDeviceError((current) => current ?? mediaErrorMessage(error));
      }
    }
  }

  async function joinInterview() {
    if (joining) {
      return;
    }

    setJoining(true);
    setStage("connecting");
    setJoinError(null);
    setDeviceError(null);
    setMediaError(null);
    setNotice(null);
    intentionalLeaveRef.current = false;

    try {
      if (clientRef.current) {
        await disposeClient();
      }

      const access = await apiRequest<InterviewTokenResponse>(
        `/bookings/${bookingId}/interview-session/token`,
        { method: "POST" },
      );

      const sdk = await import("@zoom/videosdk");
      const ZoomVideo = sdk.default;
      const support = ZoomVideo.checkSystemRequirements();

      if (!support.audio || !support.video) {
        throw new Error(
          "This browser does not support the audio and video features required for the interview room.",
        );
      }

      const client = ZoomVideo.createClient();
      clientRef.current = client;
      videoQualityRef.current = sdk.VideoQuality.Video_720P;

      await client.init("en-US", "Global");
      bindClientEvents(client);

      if (!mountedRef.current) {
        return;
      }

      setInterview(access.interview);
      await client.join(
        access.interview.sessionName,
        access.interview.token,
        access.interview.userName,
      );

      streamRef.current = client.getMediaStream();
      currentUserIdRef.current = client.getCurrentUserInfo().userId;

      if (!mountedRef.current) {
        return;
      }

      setStage("connected");
      setConnection("connected");
      syncParticipants();

      for (const participant of client.getAllUser()) {
        if (
          participant.bVideoOn &&
          participant.userId !== currentUserIdRef.current
        ) {
          await attachVideoFor(participant.userId);
        }
      }

      await startInitialMedia();
    } catch (error) {
      await disposeClient();

      if (mountedRef.current) {
        setStage("error");
        setConnection("failed");
        setJoinError(readableError(error));
      }
    } finally {
      if (mountedRef.current) {
        setJoining(false);
      }
    }
  }

  async function toggleAudio() {
    const stream = streamRef.current;

    if (!stream || busyAudio) {
      return;
    }

    setBusyAudio(true);
    setDeviceError(null);

    try {
      if (audioOn) {
        await stream.muteAudio();
        setAudioOn(false);
      } else {
        if (!audioStartedRef.current) {
          await stream.startAudio();
          audioStartedRef.current = true;
        }
        await stream.unmuteAudio();
        setAudioOn(true);
      }
    } catch (error) {
      setDeviceError(mediaErrorMessage(error));
    } finally {
      setBusyAudio(false);
    }
  }

  async function toggleVideo() {
    const stream = streamRef.current;

    if (!stream || busyVideo) {
      return;
    }

    setBusyVideo(true);
    setDeviceError(null);

    try {
      if (videoOn) {
        await stream.stopVideo();
        setVideoOn(false);
        const currentUserId = currentUserIdRef.current;
        if (currentUserId !== null) {
          await detachVideoFor(currentUserId);
        }
      } else {
        await stream.startVideo();
        setVideoOn(true);
        const currentUserId = currentUserIdRef.current;
        if (currentUserId !== null) {
          await attachVideoFor(currentUserId);
        }
      }
    } catch (error) {
      setDeviceError(mediaErrorMessage(error));
    } finally {
      setBusyVideo(false);
    }
  }

  async function leaveInterview() {
    intentionalLeaveRef.current = true;
    await disposeClient();

    if (!mountedRef.current) {
      return;
    }

    setStage("left");
    setConnection("closed");
    setParticipants([]);
    setAudioOn(false);
    setVideoOn(false);
    setNotice("You left the interview.");
  }

  async function disposeClient() {
    const client = clientRef.current;
    clientRef.current = null;
    streamRef.current = null;
    currentUserIdRef.current = null;
    videoQualityRef.current = null;
    audioStartedRef.current = false;

    videoElementsRef.current.forEach((element) => element.remove());
    videoElementsRef.current.clear();
    remoteContainerRef.current?.replaceChildren();
    selfContainerRef.current?.replaceChildren();

    if (client) {
      await client.leave().catch(() => undefined);
    }

    try {
      const sdk = await import("@zoom/videosdk");
      await sdk.default.destroyClient();
    } catch {
      // The SDK may already be torn down after a failed join.
    }
  }

  const connected = stage === "connected";
  const showsRoom = connected || stage === "left";
  const blocked = interview !== null && !interview.canJoin && stage === "ready";
  const timezone = interview?.booking.timezone ?? "UTC";

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            Mock interview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {counterpartName}
          </h1>
          {interview ? (
            <p className="mt-1 text-sm text-muted">
              {formatBookingDateTime(
                interview.booking.startsAt,
                interview.booking.timezone,
              )}
              {" · "}
              {interview.booking.id.slice(0, 8)}
            </p>
          ) : null}
        </div>
        <ConnectionPill connection={connection} stage={stage} />
      </div>

      <div className="relative overflow-hidden bg-stone-950 p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-900">
            <video-player-container
              ref={remoteContainerRef}
              className="h-full w-full"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 to-transparent px-3 pb-3 pt-10">
              <p className="text-sm font-medium text-white">
                {counterpartName}
              </p>
              <p className="text-xs text-stone-300">
                {remoteStatus(participants)}
              </p>
            </div>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-900 lg:aspect-auto lg:min-h-48">
            <video-player-container
              ref={selfContainerRef}
              className="h-full w-full"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 to-transparent px-3 pb-3 pt-10">
              <p className="text-sm font-medium text-white">
                {user.name} (you)
              </p>
              <p className="text-xs text-stone-300">
                {videoOn ? "Camera on" : "Camera off"}
                {!audioOn ? " · Microphone muted" : ""}
              </p>
            </div>
          </div>
        </div>

        {!connected ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-dialog">
              <RoomGate
                interview={interview}
                counterpartName={counterpartName}
                stage={stage}
                joining={joining}
                joinError={joinError}
                blocked={blocked}
                onJoin={() => void joinInterview()}
                onRefresh={() => router.refresh()}
                timezone={timezone}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border px-5 py-4 sm:px-6">
        {connection === "reconnecting" ? (
          <p className="mb-3 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-sm text-warning">
            Network interrupted. Reconnecting now — keep this tab open.
          </p>
        ) : null}

        {notice && connected ? (
          <p className="mb-3 rounded-lg border border-info/20 bg-info-soft px-3 py-2 text-sm text-info">
            {notice}
          </p>
        ) : null}

        {deviceError ? (
          <div className="mb-3 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-sm text-warning">
            <p>{deviceError}</p>
            <p className="mt-1 text-xs">
              Check your browser site permissions, close other apps using the
              camera, and try the control again.
            </p>
          </div>
        ) : null}

        {mediaError ? (
          <div className="mb-3 rounded-lg border border-error/20 bg-error-soft px-3 py-2 text-sm text-error">
            <p>{mediaError}</p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className={`${secondaryButtonClass} mt-2 h-9 px-3 text-xs`}
            >
              Refresh page
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleAudio()}
            disabled={!connected || busyAudio}
            aria-pressed={audioOn}
            className={`${secondaryButtonClass} h-10 px-4 text-xs`}
          >
            {busyAudio
              ? "Updating…"
              : audioOn
                ? "Mute microphone"
                : "Unmute microphone"}
          </button>
          <button
            type="button"
            onClick={() => void toggleVideo()}
            disabled={!connected || busyVideo}
            aria-pressed={videoOn}
            className={`${secondaryButtonClass} h-10 px-4 text-xs`}
          >
            {busyVideo
              ? "Updating…"
              : videoOn
                ? "Turn camera off"
                : "Turn camera on"}
          </button>
          <button
            type="button"
            onClick={() => void leaveInterview()}
            disabled={!connected && stage !== "error"}
            className="ml-auto inline-flex h-10 items-center justify-center rounded-lg border border-error/30 bg-error-soft px-4 text-xs font-semibold text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Leave interview
          </button>
        </div>

        {showsRoom ? (
          <div className="mt-4 border-t border-border pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Participants
            </h2>
            {participants.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Connecting participants…
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {participants.map((participant) => (
                  <li
                    key={participant.userId}
                    className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs text-foreground"
                  >
                    <span className="font-medium">{participant.name}</span>
                    {participant.isSelf ? " (you)" : ""}
                    <span className="text-muted">
                      {" · "}
                      {participant.isInFailover
                        ? "Reconnecting"
                        : participant.muted
                          ? "Muted"
                          : "Audio on"}
                      {participant.videoOn ? " · Video on" : " · Video off"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Recording is disabled for this interview. The room remains open
              until the scheduled join window closes.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RoomGate({
  interview,
  counterpartName,
  stage,
  joining,
  joinError,
  blocked,
  onJoin,
  onRefresh,
  timezone,
}: {
  interview: InterviewState | null;
  counterpartName: string;
  stage: Stage;
  joining: boolean;
  joinError: string | null;
  blocked: boolean;
  onJoin: () => void;
  onRefresh: () => void;
  timezone: string;
}) {
  if (!interview) {
    return (
      <>
        <h2 className="text-lg font-semibold text-white">
          We could not confirm access
        </h2>
        <p className="mt-2 text-sm text-stone-300">
          Refresh the page to request the room state again. No booking changes
          were made.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className={`${primaryButtonClass} mt-5`}
        >
          Refresh access
        </button>
      </>
    );
  }

  if (blocked) {
    return (
      <>
        <h2 className="text-lg font-semibold text-white">
          The room is not open yet
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-300">
          {blockedMessage(interview, timezone)}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className={`${secondaryButtonClass} mt-5 h-10 border-stone-600 bg-stone-800 text-white hover:bg-stone-700`}
        >
          Refresh access
        </button>
      </>
    );
  }

  if (stage === "connecting" || joining) {
    return (
      <>
        <h2 className="text-lg font-semibold text-white">
          Connecting to the interview…
        </h2>
        <p className="mt-2 text-sm text-stone-300" aria-live="polite">
          Validating your access, preparing your devices, and joining the
          session.
        </p>
      </>
    );
  }

  if (stage === "error") {
    return (
      <>
        <h2 className="text-lg font-semibold text-white">
          The interview room could not start
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-300">
          {joinError ?? "Check your connection and try again."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onJoin} className={primaryButtonClass}>
            Try again
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className={`${secondaryButtonClass} border-stone-600 bg-stone-800 text-white hover:bg-stone-700`}
          >
            Refresh access
          </button>
        </div>
      </>
    );
  }

  if (stage === "left") {
    return (
      <>
        <h2 className="text-lg font-semibold text-white">
          You left the interview
        </h2>
        <p className="mt-2 text-sm text-stone-300">
          You can rejoin while the server-validated join window is still open.
        </p>
        <button
          type="button"
          onClick={onJoin}
          className={`${primaryButtonClass} mt-5`}
        >
          Rejoin interview
        </button>
      </>
    );
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-white">
        Ready to join your interview?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-300">
        Only you and {counterpartName} can enter this booking&apos;s room. Your
        browser will ask for microphone and camera permission.
      </p>
      <p className="mt-2 text-xs text-stone-400">
        Join window closes{" "}
        {formatBookingDateTime(interview.joinWindow.closesAt, timezone)}.
      </p>
      <button
        type="button"
        onClick={onJoin}
        className={`${primaryButtonClass} mt-5`}
      >
        Join with microphone and camera
      </button>
    </>
  );
}

function blockedMessage(interview: InterviewState, timezone: string): string {
  if (interview.unavailableReason === "NOT_CONFIGURED") {
    return "Video interviews are not configured for this environment. Ask the administrator to set the Zoom Video SDK credentials.";
  }

  if (interview.unavailableReason === "NOT_CONFIRMED") {
    return "This booking is not confirmed. The interview room becomes available after payment succeeds.";
  }

  if (interview.unavailableReason === "NOT_OPEN") {
    return `The room opens at ${formatBookingDateTime(
      interview.joinWindow.opensAt,
      timezone,
    )} and closes at ${formatBookingDateTime(
      interview.joinWindow.closesAt,
      timezone,
    )}.`;
  }

  if (interview.unavailableReason === "WINDOW_CLOSED") {
    return `The join window closed at ${formatBookingDateTime(
      interview.joinWindow.closesAt,
      timezone,
    )}.`;
  }

  if (interview.unavailableReason === "ENDED") {
    return "This interview session has ended.";
  }

  return "The interview room is not available right now.";
}

function ConnectionPill({
  connection,
  stage,
}: {
  connection: Connection;
  stage: Stage;
}) {
  const label =
    stage === "connected" && connection === "reconnecting"
      ? "Reconnecting"
      : stage === "connected"
        ? "Live"
        : stage === "connecting"
          ? "Connecting"
          : stage === "left"
            ? "Left"
            : stage === "error"
              ? "Unavailable"
              : "Not joined";

  const style =
    stage === "connected" && connection === "reconnecting"
      ? "border-warning/20 bg-warning-soft text-warning"
      : stage === "connected"
        ? "border-success/20 bg-success-soft text-success"
        : "border-border bg-surface-muted text-muted";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}

function remoteStatus(participants: RoomParticipant[]): string {
  const remote = participants.find((participant) => !participant.isSelf);

  if (!remote) {
    return participants.length === 0
      ? "Connecting…"
      : "Waiting for the other participant";
  }

  if (remote.isInFailover) {
    return "Reconnecting…";
  }

  return remote.videoOn ? "Camera on" : "Camera off";
}

function readableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "reason" in error) {
    const reason = (error as { reason?: unknown }).reason;

    if (typeof reason === "string" && reason) {
      return `The video connection could not start: ${reason}.`;
    }
  }

  return "The interview room could not start. Check your connection and try again.";
}

function mediaErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera or microphone permission was denied. Allow access in your browser and try again.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera or microphone was found. Connect a device and try again.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your camera or microphone is already in use by another app. Close it and try again.";
  }

  return "Your camera or microphone could not be started. Check your device and browser permissions.";
}
