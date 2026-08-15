import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantExecutionFoundation1786118400000 implements MigrationInterface {
  name = 'AddAssistantExecutionFoundation1786118400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_runs_phase_enum" AS ENUM('queued', 'initializing', 'reasoning', 'executing', 'finalizing', 'terminal')`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "phase" "public"."assistant_runs_phase_enum" NOT NULL DEFAULT 'queued'`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "checkpointVersion" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_run_steps_type_enum" AS ENUM('model', 'tool')`,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(`ALTER TABLE "assistant_runs" DROP COLUMN "phase"`);
    await queryRunner.query(`DROP TYPE "public"."assistant_runs_phase_enum"`);
  }
}
