import { createHmac } from "node:crypto";

export type ZoomVideoTokenClaims = {
  app_key: string;
  role_type: 0;
  tpc: string;
  version: 1;
  iat: number;
  exp: number;
  user_identity: string;
  cloud_recording_option: 0;
};

const TOKEN_LIFETIME_SECONDS = 60 * 60;

/**
 * Builds a Zoom Video SDK participant JWT. Both booked participants receive
 * role 0 so neither client can end the session for the other participant.
 */
export function createZoomVideoToken(input: {
  sdkKey: string;
  sdkSecret: string;
  sessionName: string;
  userId: string;
  now?: Date;
}): string {
  const issuedAt = Math.floor((input.now ?? new Date()).getTime() / 1000) - 30;
  const header = { alg: "HS256", typ: "JWT" };
  const payload: ZoomVideoTokenClaims = {
    app_key: input.sdkKey,
    role_type: 0,
    tpc: input.sessionName,
    version: 1,
    iat: issuedAt,
    exp: issuedAt + 30 + TOKEN_LIFETIME_SECONDS,
    user_identity: input.userId,
    cloud_recording_option: 0,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url",
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", input.sdkSecret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}
