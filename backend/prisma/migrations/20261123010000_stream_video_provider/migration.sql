-- Replace the Zoom Video SDK provider with Stream Video. Existing rows keep
-- their session reference; only the enum label changes.
ALTER TYPE "InterviewSessionProvider" RENAME VALUE 'ZOOM_VIDEO_SDK' TO 'STREAM_VIDEO';

ALTER TABLE "interview_sessions"
  ALTER COLUMN "provider" SET DEFAULT 'STREAM_VIDEO';
