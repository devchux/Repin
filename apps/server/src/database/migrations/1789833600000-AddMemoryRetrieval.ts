import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemoryRetrieval1789833600000 implements MigrationInterface {
  name = 'AddMemoryRetrieval1789833600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(
      `ALTER TABLE "memories" ADD "embedding" vector(1536)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memories_search" ON "memories" USING GIN (to_tsvector('english', coalesce("content", '')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memories_embedding" ON "memories" USING hnsw ("embedding" vector_cosine_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_memories_embedding"`);
    await queryRunner.query(`DROP INDEX "IDX_memories_search"`);
    await queryRunner.query(`ALTER TABLE "memories" DROP COLUMN "embedding"`);
  }
}
