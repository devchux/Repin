import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantExecutionFoundation1786118400000 implements MigrationInterface {
  name = 'AddAssistantExecutionFoundation1786118400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."assistant_runs_status_enum" ADD VALUE IF NOT EXISTS 'awaiting_approval' AFTER 'running'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."assistant_runs_status_enum" ADD VALUE IF NOT EXISTS 'suspended' AFTER 'awaiting_approval'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_runs_phase_enum" AS ENUM('queued', 'initializing', 'reasoning', 'executing', 'awaiting_approval', 'suspended', 'finalizing', 'terminal')`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "phase" "public"."assistant_runs_phase_enum" NOT NULL DEFAULT 'queued'`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "checkpointVersion" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "modelCallCount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "toolCallCount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "maxModelCalls" integer NOT NULL DEFAULT 12`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "maxToolCalls" integer NOT NULL DEFAULT 30`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "queueJobId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "executionLane" character varying NOT NULL DEFAULT 'short'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_run_steps_type_enum" AS ENUM('model', 'tool', 'verification')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_run_steps_status_enum" AS ENUM('running', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "assistant_run_steps" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "runId" uuid NOT NULL, "sequence" integer NOT NULL, "type" "public"."assistant_run_steps_type_enum" NOT NULL, "status" "public"."assistant_run_steps_status_enum" NOT NULL, "input" jsonb, "output" jsonb, "error" text, "attempt" integer NOT NULL DEFAULT 1, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, CONSTRAINT "PK_assistant_run_steps_id" PRIMARY KEY ("id"), CONSTRAINT "FK_assistant_run_steps_run" FOREIGN KEY ("runId") REFERENCES "assistant_runs"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_assistant_run_steps_run_sequence" ON "assistant_run_steps" ("runId", "sequence")`,
    );
    await queryRunner.query(
      `CREATE TABLE "assistant_run_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "runId" uuid NOT NULL, "sequence" integer NOT NULL, "type" character varying NOT NULL, "data" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_assistant_run_events_id" PRIMARY KEY ("id"), CONSTRAINT "FK_assistant_run_events_run" FOREIGN KEY ("runId") REFERENCES "assistant_runs"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_assistant_run_events_run_sequence" ON "assistant_run_events" ("runId", "sequence")`,
    );
    await queryRunner.query(
      `CREATE TABLE "assistant_run_checkpoints" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "runId" uuid NOT NULL, "version" integer NOT NULL, "status" character varying NOT NULL, "phase" character varying NOT NULL, "state" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_assistant_run_checkpoints_id" PRIMARY KEY ("id"), CONSTRAINT "FK_assistant_run_checkpoints_run" FOREIGN KEY ("runId") REFERENCES "assistant_runs"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_assistant_run_checkpoints_run_version" ON "assistant_run_checkpoints" ("runId", "version")`,
    );
    await queryRunner.query(
      `CREATE TABLE "browser_tool_approvals" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "runId" uuid NOT NULL, "userId" integer NOT NULL, "toolName" character varying NOT NULL, "arguments" jsonb NOT NULL, "actionFingerprint" character varying NOT NULL, "effect" character varying NOT NULL, "reason" text NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "expiresAt" TIMESTAMP NOT NULL, "decidedAt" TIMESTAMP, "consumedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_browser_tool_approvals_id" PRIMARY KEY ("id"), CONSTRAINT "FK_browser_tool_approvals_run" FOREIGN KEY ("runId") REFERENCES "assistant_runs"("id") ON DELETE CASCADE, CONSTRAINT "FK_browser_tool_approvals_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_browser_tool_approvals_run_action" ON "browser_tool_approvals" ("runId", "actionFingerprint") WHERE "status" IN ('pending', 'approved')`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_browser_tool_approvals_user_status" ON "browser_tool_approvals" ("userId", "status")`,
    );
    await queryRunner.query(
      `CREATE TABLE "assistant_run_continuations" ("runId" uuid NOT NULL, "iteration" integer NOT NULL, "messages" jsonb NOT NULL, "pendingToolCalls" jsonb NOT NULL, "idempotencyKey" uuid NOT NULL, "reason" character varying NOT NULL DEFAULT 'prepared', "dispatchState" character varying NOT NULL DEFAULT 'prepared', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_assistant_run_continuations_run" PRIMARY KEY ("runId"), CONSTRAINT "FK_assistant_run_continuations_run" FOREIGN KEY ("runId") REFERENCES "assistant_runs"("id") ON DELETE CASCADE)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assistant_run_continuations"`);
    await queryRunner.query(`DROP TABLE "browser_tool_approvals"`);
    await queryRunner.query(`DROP TABLE "assistant_run_checkpoints"`);
    await queryRunner.query(`DROP TABLE "assistant_run_events"`);
    await queryRunner.query(`DROP TABLE "assistant_run_steps"`);
    await queryRunner.query(
      `DROP TYPE "public"."assistant_run_steps_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."assistant_run_steps_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "checkpointVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "maxToolCalls"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "queueJobId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "executionLane"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "maxModelCalls"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "toolCallCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "modelCallCount"`,
    );
    await queryRunner.query(`ALTER TABLE "assistant_runs" DROP COLUMN "phase"`);
    await queryRunner.query(`DROP TYPE "public"."assistant_runs_phase_enum"`);
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."assistant_runs_status_enum" RENAME TO "assistant_runs_status_enum_with_approval"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_runs_status_enum" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ALTER COLUMN "status" TYPE "public"."assistant_runs_status_enum" USING (CASE WHEN "status"::text IN ('awaiting_approval', 'suspended') THEN 'queued' ELSE "status"::text END)::"public"."assistant_runs_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ALTER COLUMN "status" SET DEFAULT 'queued'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."assistant_runs_status_enum_with_approval"`,
    );
  }
}
