export function mediaErrorMessage(error: unknown): string {
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
