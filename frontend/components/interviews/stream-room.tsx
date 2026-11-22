"use client";

import {
  CallingState,
  ParticipantView,
  ParticipantsAudio,
  StreamCall,
  StreamVideo,
  useCallStateHooks,
  type Call,
  type StreamVideoClient,
  type StreamVideoParticipant,
} from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";

import { mediaErrorMessage } from "@/lib/media-errors";

export type StreamRoomConnection =
  "idle" | "connected" | "reconnecting" | "closed" | "failed";

export function StreamRoom({
  client,
  call,
  counterpartName,
  userName,
  deviceNotice,
  onConnectionChange,
  onCallEnded,
  onLeave,
}: {
  client: StreamVideoClient;
  call: Call;
  counterpartName: string;
  userName: string;
  deviceNotice: string | null;
  onConnectionChange: (connection: StreamRoomConnection) => void;
  onCallEnded: () => void;
  onLeave: () => void;
}) {
  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <Room
          counterpartName={counterpartName}
          userName={userName}
          deviceNotice={deviceNotice}
          onConnectionChange={onConnectionChange}
          onCallEnded={onCallEnded}
          onLeave={onLeave}
        />
      </StreamCall>
    </StreamVideo>
  );
}

function Room({
  counterpartName,
  userName,
  deviceNotice,
  onConnectionChange,
  onCallEnded,
  onLeave,
}: {
  counterpartName: string;
  userName: string;
  deviceNotice: string | null;
  onConnectionChange: (connection: StreamRoomConnection) => void;
  onCallEnded: () => void;
  onLeave: () => void;
}) {
  const {
    useCallCallingState,
    useParticipants,
    useLocalParticipant,
    useMicrophoneState,
    useCameraState,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();
  const {
    isMute: microphoneMuted,
    microphone,
    isTogglePending: microphonePending,
  } = useMicrophoneState();
  const {
    isMute: cameraMuted,
    camera,
    isTogglePending: cameraPending,
  } = useCameraState();
  const [busyMicrophone, setBusyMicrophone] = useState(false);
  const [busyCamera, setBusyCamera] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    onConnectionChange(connectionFor(callingState));

    if (callingState === CallingState.LEFT) {
      onCallEnded();
    }
  }, [callingState, onCallEnded, onConnectionChange]);

  const remote = participants.find(
    (participant) => !participant.isLocalParticipant,
  );
  const local =
    localParticipant ??
    participants.find((participant) => participant.isLocalParticipant);

  const remoteVideoOn = hasLiveTrack(remote?.videoStream);
  const remoteAudioOn = hasLiveTrack(remote?.audioStream);
  const reconnecting =
    callingState === CallingState.RECONNECTING ||
    callingState === CallingState.MIGRATING;
  const failed =
    callingState === CallingState.OFFLINE ||
    callingState === CallingState.RECONNECTING_FAILED;

  async function toggleMicrophone() {
    if (busyMicrophone || microphonePending) {
      return;
    }

    setBusyMicrophone(true);
    setDeviceError(null);

    try {
      await microphone.toggle();
    } catch (error) {
      setDeviceError(mediaErrorMessage(error));
    } finally {
      setBusyMicrophone(false);
    }
  }

  async function toggleCamera() {
    if (busyCamera || cameraPending) {
      return;
    }

    setBusyCamera(true);
    setDeviceError(null);

    try {
      await camera.toggle();
    } catch (error) {
      setDeviceError(mediaErrorMessage(error));
    } finally {
      setBusyCamera(false);
    }
  }

  return (
    <>
      <div className="p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <ParticipantTile
            participant={remote}
            label={counterpartName}
            status={
              remote
                ? `${remoteVideoOn ? "Camera on" : "Camera off"} · ${
                    remoteAudioOn ? "Microphone on" : "Microphone muted"
                  }`
                : "Waiting for the other participant"
            }
          />

          <ParticipantTile
            participant={local}
            label={`${userName} (you)`}
            status={`${cameraMuted ? "Camera off" : "Camera on"} · ${
              microphoneMuted ? "Microphone muted" : "Microphone on"
            }`}
            mirror
          />
        </div>

        <ParticipantsAudio participants={participants} />
      </div>

      <div className="border-t border-border px-5 py-4 sm:px-6">
        {reconnecting ? (
          <p className="mb-3 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-sm text-warning">
            Network interrupted. Reconnecting now — keep this tab open.
          </p>
        ) : null}

        {failed ? (
          <div className="mb-3 rounded-lg border border-error/20 bg-error-soft px-3 py-2 text-sm text-error">
            <p>
              The video connection was lost. Check your network, then leave and
              rejoin while the join window is still open.
            </p>
            <button
              type="button"
              onClick={onLeave}
              className="mt-2 text-xs font-semibold underline underline-offset-2"
            >
              Leave and rejoin
            </button>
          </div>
        ) : null}

        {deviceNotice ? (
          <div className="mb-3 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-sm text-warning">
            <p>{deviceNotice}</p>
            <p className="mt-1 text-xs">
              Check your browser site permissions, close other apps using the
              camera, and try the control again.
            </p>
          </div>
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleMicrophone()}
            disabled={busyMicrophone || microphonePending}
            aria-pressed={!microphoneMuted}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyMicrophone || microphonePending
              ? "Updating…"
              : microphoneMuted
                ? "Unmute microphone"
                : "Mute microphone"}
          </button>
          <button
            type="button"
            onClick={() => void toggleCamera()}
            disabled={busyCamera || cameraPending}
            aria-pressed={!cameraMuted}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyCamera || cameraPending
              ? "Updating…"
              : cameraMuted
                ? "Turn camera on"
                : "Turn camera off"}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="ml-auto inline-flex h-10 items-center justify-center rounded-lg border border-error/30 bg-error-soft px-4 text-xs font-semibold text-error transition-colors hover:bg-error/10"
          >
            Leave interview
          </button>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Participants
          </h2>
          {participants.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Connecting participants…</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {participants.map((participant) => (
                <li
                  key={participant.sessionId}
                  className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs text-foreground"
                >
                  <span className="font-medium">
                    {participant.isLocalParticipant
                      ? userName
                      : participant.name || counterpartName}
                  </span>
                  {participant.isLocalParticipant ? " (you)" : ""}
                  <span className="text-muted">
                    {" · "}
                    {participant.isLocalParticipant
                      ? microphoneMuted
                        ? "Muted"
                        : "Audio on"
                      : hasLiveTrack(participant.audioStream)
                        ? "Audio on"
                        : "Muted"}
                    {participant.isLocalParticipant
                      ? cameraMuted
                        ? " · Video off"
                        : " · Video on"
                      : hasLiveTrack(participant.videoStream)
                        ? " · Video on"
                        : " · Video off"}
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
      </div>
    </>
  );
}

function ParticipantTile({
  participant,
  label,
  status,
  mirror = false,
}: {
  participant: StreamVideoParticipant | undefined;
  label: string;
  status: string;
  mirror?: boolean;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-900 lg:aspect-auto lg:min-h-48">
      {participant ? (
        <ParticipantView
          participant={participant}
          ParticipantViewUI={null}
          mirror={mirror}
          className="h-full w-full"
        />
      ) : (
        <div className="flex h-full min-h-48 items-center justify-center px-4 text-center text-sm text-stone-400">
          Waiting for the other participant…
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 to-transparent px-3 pb-3 pt-10">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-stone-300">{status}</p>
      </div>
    </div>
  );
}

function hasLiveTrack(stream: MediaStream | undefined): boolean {
  return (
    stream
      ?.getTracks()
      .some((track) => track.readyState === "live" && track.enabled) ?? false
  );
}

function connectionFor(callingState: CallingState): StreamRoomConnection {
  if (callingState === CallingState.JOINED) {
    return "connected";
  }

  if (
    callingState === CallingState.RECONNECTING ||
    callingState === CallingState.MIGRATING
  ) {
    return "reconnecting";
  }

  if (
    callingState === CallingState.OFFLINE ||
    callingState === CallingState.RECONNECTING_FAILED
  ) {
    return "failed";
  }

  if (callingState === CallingState.LEFT) {
    return "closed";
  }

  return "connected";
}
