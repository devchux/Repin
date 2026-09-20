import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeCollectionQueries1790006400000 implements MigrationInterface {
  name = 'OptimizeCollectionQueries1790006400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_assistant_runs_user_status_created" ON "assistant_runs" ("userId", "status", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_messages_role_created" ON "assistant_conversation_messages" ("conversationId", "role", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memories_user_status_updated" ON "memories" ("userId", "embeddingStatus", "updatedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_memories_user_status_updated"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_messages_role_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_assistant_runs_user_status_created"`,
    );
  }
}
