import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotes1789401600000 implements MigrationInterface {
  name = 'CreateNotes1789401600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "title" character varying(500) NOT NULL, "body" text NOT NULL, "sourceUrl" text, "selectedText" text, "tags" text array NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "FK_notes_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE, CONSTRAINT "PK_notes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notes_user_updated" ON "notes" ("userId", "updatedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notes"`);
  }
}
