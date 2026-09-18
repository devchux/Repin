import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLibraryItems1786809600000 implements MigrationInterface {
  name = 'CreateLibraryItems1786809600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "library_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "userId" integer NOT NULL, "type" character varying NOT NULL, "title" character varying, "content" text, "url" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_library_items_id" PRIMARY KEY ("id"), CONSTRAINT "FK_library_items_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_library_items_user_type_updated" ON "library_items" ("userId", "type", "updatedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "library_items"`);
  }
}
