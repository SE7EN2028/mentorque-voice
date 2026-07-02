-- CreateTable
CREATE TABLE "feedback_reports" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "dimension_scores" JSONB NOT NULL,
    "topic_coverage" JSONB NOT NULL,
    "difficulty_reached" INTEGER NOT NULL,
    "difficulty_progression" INTEGER[],
    "duration_ms" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "top_strengths" TEXT[],
    "areas_for_improvement" TEXT[],
    "missed_opportunities" TEXT[],
    "recommended_next_steps" TEXT[],
    "actionable_practice_advice" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_reports_session_id_key" ON "feedback_reports"("session_id");

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
