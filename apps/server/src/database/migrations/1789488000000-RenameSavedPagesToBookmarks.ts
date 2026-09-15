import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSavedPagesToBookmarks1789488000000
  implements MigrationInterface
{
  name = 'RenameSavedPagesToBookmarks1789488000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "saved_pages" RENAME TO "bookmarks"`);
    await queryRunner.query(
      `ALTER TABLE "bookmarks" RENAME CONSTRAINT "PK_saved_pages_id" TO "PK_bookmarks_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" RENAME CONSTRAINT "FK_saved_pages_user" TO "FK_bookmarks_user"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_saved_pages_user_normalized_url" RENAME TO "IDX_bookmarks_user_normalized_url"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_saved_pages_user_created" RENAME TO "IDX_bookmarks_user_created"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_saved_pages_tags" RENAME TO "IDX_bookmarks_tags"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX "IDX_bookmarks_tags" RENAME TO "IDX_saved_pages_tags"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_bookmarks_user_created" RENAME TO "IDX_saved_pages_user_created"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_bookmarks_user_normalized_url" RENAME TO "IDX_saved_pages_user_normalized_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" RENAME CONSTRAINT "FK_bookmarks_user" TO "FK_saved_pages_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" RENAME CONSTRAINT "PK_bookmarks_id" TO "PK_saved_pages_id"`,
    );
    await queryRunner.query(`ALTER TABLE "bookmarks" RENAME TO "saved_pages"`);
  }
}
