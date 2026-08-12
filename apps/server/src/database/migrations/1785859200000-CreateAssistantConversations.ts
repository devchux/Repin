import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssistantConversations1785859200000 implements MigrationInterface {
  name = 'CreateAssistantConversations1785859200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "assistant_conversations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "initialCapability" character varying NOT NULL, "context" jsonb NOT NULL, "options" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_assistant_conversations_id" PRIMARY KEY ("id"), CONSTRAINT "FK_assistant_conversations_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assistant_conversations_user_updated" ON "assistant_conversations" ("userId", "updatedAt")`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "conversationId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD CONSTRAINT "FK_assistant_runs_conversation" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assistant_runs_conversation" ON "assistant_runs" ("conversationId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "assistant_conversation_messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "conversationId" uuid NOT NULL, "runId" uuid, "role" character varying NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_assistant_conversation_messages_id" PRIMARY KEY ("id"), CONSTRAINT "FK_assistant_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE, CONSTRAINT "FK_assistant_messages_run" FOREIGN KEY ("runId") REFERENCES "assistant_runs"("id") ON DELETE SET NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assistant_messages_conversation_created" ON "assistant_conversation_messages" ("conversationId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_assistant_messages_run_role" ON "assistant_conversation_messages" ("runId", "role")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assistant_conversation_messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_assistant_runs_conversation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "conversationId"`,
    );
    await queryRunner.query(`DROP TABLE "assistant_conversations"`);
  }
}
