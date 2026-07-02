-- CreateEnum
CREATE TYPE "TurnRole" AS ENUM ('INTERVIEWER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "TurnAction" AS ENUM ('FOLLOW_UP', 'PROBE', 'CHALLENGE', 'ADVANCE_TOPIC', 'CONCLUDE');

-- CreateTable
CREATE TABLE "transcript_turns" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "TurnRole" NOT NULL,
    "content" TEXT NOT NULL,
    "evaluation" JSONB,
    "action_taken" "TurnAction",
    "difficulty_at_turn" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transcript_turns_session_id_sequence_idx" ON "transcript_turns"("session_id", "sequence");

-- AddForeignKey
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
