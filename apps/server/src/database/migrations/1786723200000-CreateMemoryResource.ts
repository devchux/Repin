import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMemoryResource1786723200000 implements MigrationInterface {
  name = 'CreateMemoryResource1786723200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "memories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "kind" character varying NOT NULL, "content" text NOT NULL, "scope" character varying NOT NULL DEFAULT 'global', "scopeId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_memories_id" PRIMARY KEY ("id"), CONSTRAINT "FK_memories_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memories_user_scope_updated" ON "memories" ("userId", "scope", "scopeId", "updatedAt")`,
    );
    await queryRunner.query(
      `CREATE TABLE "memory_sources" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "memoryId" uuid NOT NULL, "type" character varying NOT NULL, "sourceId" character varying, "url" text, "trust" character varying NOT NULL, "observedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_memory_sources_id" PRIMARY KEY ("id"), CONSTRAINT "FK_memory_sources_memory" FOREIGN KEY ("memoryId") REFERENCES "memories"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_memory_sources_memory_created" ON "memory_sources" ("memoryId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "memory_sources"`);
    await queryRunner.query(`DROP TABLE "memories"`);
  }
}
