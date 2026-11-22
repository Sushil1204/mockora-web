"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, StreamVideoClient } from "@stream-io/video-react-sdk";

import { ApiError, apiRequest } from "@/lib/api";
import { formatBookingDateTime } from "@/lib/labels";
import { mediaErrorMessage } from "@/lib/media-errors";
import type {
  InterviewState,
  InterviewTokenResponse,
  PublicUser,
} from "@/lib/types";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

import type { StreamRoomConnection } from "./stream-room";

const StreamRoom = dynamic(
  () => import("./stream-room").then((module) => module.StreamRoom),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center p-6 text-sm text-stone-300">
        Preparing the video room…
      </div>
    ),
  },
);

type Stage = "ready" | "connecting" | "connected" | "left" | "error";

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
  const [connection, setConnection] = useState<StreamRoomConnection>("idle");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);

  const mountedRef = useRef(true);
  const intentionalLeaveRef = useRef(false);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const callRef = useRef<Call | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const currentCall = callRef.current;
      const currentClient = clientRef.current;
      callRef.current = null;
      clientRef.current = null;

      if (currentCall) {
        void currentCall.leave().catch(() => undefined);
      }

      if (currentClient) {
        void currentClient.disconnectUser().catch(() => undefined);
      }
    };
  }, []);

  const disposeConnection = useCallback(async () => {
    const currentCall = callRef.current;
    const currentClient = clientRef.current;
    callRef.current = null;
    clientRef.current = null;

    if (mountedRef.current) {
      setClient(null);
      setCall(null);
    }

    if (currentCall) {
      await currentCall.leave().catch(() => undefined);
    }

    if (currentClient) {
      await currentClient.disconnectUser().catch(() => undefined);
    }
  }, []);

  const handleCallEnded = useCallback(() => {
    if (!mountedRef.current || intentionalLeaveRef.current) {
      return;
    }

    setStage("left");
    setConnection("closed");
    setNotice("The interview session has ended.");
    void disposeConnection();
  }, [disposeConnection]);

  async function enableInitialDevices(streamCall: Call) {
    try {
      await streamCall.microphone.enable();
    } catch (error) {
      if (mountedRef.current) {
        setDeviceError((current) => current ?? mediaErrorMessage(error));
      }
    }

    try {
      await streamCall.camera.enable();
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
    setNotice(null);
    setConnection("idle");
    intentionalLeaveRef.current = false;

    try {
      if (clientRef.current || callRef.current) {
        await disposeConnection();
      }

      const access = await apiRequest<InterviewTokenResponse>(
        `/bookings/${bookingId}/interview-session/token`,
        { method: "POST" },
      );

      const sdk = await import("@stream-io/video-react-sdk");
      const streamClient = new sdk.StreamVideoClient({
        apiKey: access.interview.apiKey,
        user: {
          id: access.interview.userId,
          name: access.interview.userName,
        },
        token: access.interview.token,
      });

      clientRef.current = streamClient;
      const streamCall = streamClient.call(
        access.interview.callType,
        access.interview.callId,
      );
      callRef.current = streamCall;

      await streamCall.join({ create: true });

      if (!mountedRef.current) {
        await disposeConnection();
        return;
      }

      setInterview(access.interview);
      setClient(streamClient);
      setCall(streamCall);
      setStage("connected");
      setConnection("connected");

      void enableInitialDevices(streamCall);
    } catch (error) {
      await disposeConnection();

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

  async function leaveInterview() {
    intentionalLeaveRef.current = true;
    await disposeConnection();

    if (!mountedRef.current) {
      return;
    }

    setStage("left");
    setConnection("closed");
    setNotice("You left the interview.");
  }

  const connected = stage === "connected";
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

      <div className="relative overflow-hidden bg-stone-950">
        {connected && client && call ? (
          <StreamRoom
            client={client}
            call={call}
            counterpartName={counterpartName}
            userName={user.name}
            deviceNotice={deviceError}
            onConnectionChange={setConnection}
            onCallEnded={handleCallEnded}
            onLeave={() => void leaveInterview()}
          />
        ) : (
          <div className="flex min-h-[340px] items-center justify-center p-4 backdrop-blur-sm sm:min-h-[440px]">
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
        )}
      </div>

      {notice && !connected ? (
        <div className="border-t border-border px-5 py-4 sm:px-6">
          <p className="rounded-lg border border-info/20 bg-info-soft px-3 py-2 text-sm text-info">
            {notice}
          </p>
        </div>
      ) : null}
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
    return "Video interviews are not configured for this environment. Ask the administrator to set the Stream API key and secret.";
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
  connection: StreamRoomConnection;
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

function readableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return "The interview room could not start. Check your connection and try again.";
}
