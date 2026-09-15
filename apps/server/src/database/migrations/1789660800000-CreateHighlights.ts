import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHighlights1789660800000 implements MigrationInterface {
  name = 'CreateHighlights1789660800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "highlights" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "clientId" uuid, "url" text NOT NULL, "normalizedUrl" text NOT NULL, "pageTitle" character varying(500) NOT NULL, "quote" text NOT NULL, "prefix" character varying(300), "suffix" character varying(300), "note" text, "color" character varying(20) NOT NULL DEFAULT 'yellow', "capturedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "FK_highlights_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE, CONSTRAINT "PK_highlights_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_highlights_user_created" ON "highlights" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_highlights_user_normalized_url" ON "highlights" ("userId", "normalizedUrl")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_highlights_user_client_id" ON "highlights" ("userId", "clientId") WHERE "clientId" IS NOT NULL AND "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "highlights"`);
  }
}
