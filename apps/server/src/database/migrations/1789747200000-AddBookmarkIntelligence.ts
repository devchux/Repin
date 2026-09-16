import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookmarkIntelligence1789747200000 implements MigrationInterface {
  name = 'AddBookmarkIntelligence1789747200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(
      `CREATE TABLE "bookmark_collections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "name" character varying(120) NOT NULL, "description" text, "color" character varying(20), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bookmark_collections" PRIMARY KEY ("id"), CONSTRAINT "FK_bookmark_collections_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bookmark_collections_user_name" ON "bookmark_collections" ("userId", "name")`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookmark_collection_items" ("collectionId" uuid NOT NULL, "bookmarkId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bookmark_collection_items" PRIMARY KEY ("collectionId", "bookmarkId"), CONSTRAINT "FK_bookmark_collection_items_collection" FOREIGN KEY ("collectionId") REFERENCES "bookmark_collections"("id") ON DELETE CASCADE, CONSTRAINT "FK_bookmark_collection_items_bookmark" FOREIGN KEY ("bookmarkId") REFERENCES "bookmarks"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookmark_collection_items_bookmark" ON "bookmark_collection_items" ("bookmarkId")`,
    );
    await queryRunner.query(`ALTER TABLE "bookmarks" ADD "aiSummary" text`);
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD "aiTopics" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD "enrichmentStatus" character varying(20) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD "enrichmentError" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD "enrichedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD "embedding" vector(1536)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookmarks_embedding" ON "bookmarks" USING hnsw ("embedding" vector_cosine_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_bookmarks_embedding"`);
    await queryRunner.query(`ALTER TABLE "bookmarks" DROP COLUMN "embedding"`);
    await queryRunner.query(`ALTER TABLE "bookmarks" DROP COLUMN "enrichedAt"`);
    await queryRunner.query(
      `ALTER TABLE "bookmarks" DROP COLUMN "enrichmentError"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" DROP COLUMN "enrichmentStatus"`,
    );
    await queryRunner.query(`ALTER TABLE "bookmarks" DROP COLUMN "aiTopics"`);
    await queryRunner.query(`ALTER TABLE "bookmarks" DROP COLUMN "aiSummary"`);
    await queryRunner.query(`DROP TABLE "bookmark_collection_items"`);
    await queryRunner.query(`DROP INDEX "IDX_bookmark_collections_user_name"`);
    await queryRunner.query(`DROP TABLE "bookmark_collections"`);
  }
}
