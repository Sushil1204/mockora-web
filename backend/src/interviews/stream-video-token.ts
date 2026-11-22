import { StreamClient } from "@stream-io/node-sdk";

const TOKEN_LIFETIME_SECONDS = 4 * 60 * 60;

/**
 * Builds a Stream user token for the authenticated participant. Tokens are
 * signed locally by the Stream server SDK; no network request is made. The API
 * key is public, but the API secret must stay on the backend.
 */
export function createStreamUserToken(input: {
  apiKey: string;
  apiSecret: string;
  userId: string;
  now?: Date;
}): string {
  const issuedAt = Math.floor((input.now ?? new Date()).getTime() / 1000) - 30;
  const client = new StreamClient(input.apiKey, input.apiSecret);

  return client.generateUserToken({
    user_id: input.userId,
    iat: issuedAt,
    validity_in_seconds: TOKEN_LIFETIME_SECONDS,
  });
}
