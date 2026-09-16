import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavedPages1789315200000 implements MigrationInterface {
  name = 'CreateSavedPages1789315200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "saved_pages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "url" text NOT NULL, "normalizedUrl" text NOT NULL, "canonicalUrl" text, "title" character varying(500) NOT NULL, "description" text, "siteName" character varying(255), "author" character varying(255), "publishedAt" TIMESTAMP WITH TIME ZONE, "imageUrl" text, "faviconUrl" text, "excerpt" text, "content" text, "selectedText" text, "note" text, "tags" text array NOT NULL DEFAULT '{}', "capturedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "FK_saved_pages_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE, CONSTRAINT "PK_saved_pages_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_saved_pages_user_normalized_url" ON "saved_pages" ("userId", "normalizedUrl") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_saved_pages_user_created" ON "saved_pages" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_saved_pages_tags" ON "saved_pages" USING GIN ("tags")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "saved_pages"`);
  }
}
