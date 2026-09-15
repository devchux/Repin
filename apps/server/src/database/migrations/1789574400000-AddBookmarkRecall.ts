import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookmarkRecall1789574400000 implements MigrationInterface {
  name = 'AddBookmarkRecall1789574400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookmarks" ADD "saveReason" text`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bookmarks_search" ON "bookmarks" USING GIN (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("url", '') || ' ' || coalesce("note", '') || ' ' || coalesce("saveReason", '') || ' ' || coalesce("selectedText", '') || ' ' || coalesce("excerpt", '') || ' ' || coalesce("content", '')))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_bookmarks_search"`);
    await queryRunner.query(`ALTER TABLE "bookmarks" DROP COLUMN "saveReason"`);
  }
}
