import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssistantRunsTable1785686400000 implements MigrationInterface {
  name = 'CreateAssistantRunsTable1785686400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_runs_capability_enum" AS ENUM('summarize', 'explain', 'translate', 'chat')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assistant_runs_status_enum" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "assistant_runs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "capability" "public"."assistant_runs_capability_enum" NOT NULL, "status" "public"."assistant_runs_status_enum" NOT NULL DEFAULT 'queued', "context" jsonb NOT NULL, "input" text, "options" jsonb, "result" text, "error" text, "provider" character varying, "model" character varying, "inputTokens" integer, "outputTokens" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "startedAt" TIMESTAMP, "completedAt" TIMESTAMP, "cancelledAt" TIMESTAMP, CONSTRAINT "PK_assistant_runs_id" PRIMARY KEY ("id"), CONSTRAINT "FK_assistant_runs_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assistant_runs_user_created" ON "assistant_runs" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assistant_runs_status" ON "assistant_runs" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assistant_runs"`);
    await queryRunner.query(`DROP TYPE "public"."assistant_runs_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."assistant_runs_capability_enum"`,
    );
  }
}
