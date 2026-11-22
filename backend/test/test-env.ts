export const TEST_PG_PORT = 55433;
export const TEST_DB_NAME = "mockoraa_test";
export const TEST_DATABASE_URL = `postgresql://postgres:postgres@localhost:${TEST_PG_PORT}/${TEST_DB_NAME}?schema=public`;

export function applyTestEnvironment(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.SESSION_COOKIE_NAME = "mockoraa_session";
  process.env.SESSION_TTL_DAYS = "1";
  process.env.SESSION_COOKIE_SECURE = "false";
  process.env.PORT = "4001";
  process.env.ZOOM_VIDEO_SDK_KEY = "test-video-sdk-key";
  process.env.ZOOM_VIDEO_SDK_SECRET = "test-video-sdk-secret";
  process.env.INTERVIEW_JOIN_EARLY_MINUTES = "15";
  process.env.INTERVIEW_JOIN_CLOSE_GRACE_MINUTES = "15";
}
