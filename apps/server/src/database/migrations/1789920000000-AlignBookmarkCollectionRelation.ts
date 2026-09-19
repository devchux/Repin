import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignBookmarkCollectionRelation1789920000000 implements MigrationInterface {
  name = 'AlignBookmarkCollectionRelation1789920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookmark_collection_items" DROP COLUMN "createdAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookmark_collection_items" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }
}
