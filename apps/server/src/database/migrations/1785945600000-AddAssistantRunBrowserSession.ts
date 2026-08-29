import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantRunBrowserSession1785945600000 implements MigrationInterface {
  name = 'AddAssistantRunBrowserSession1785945600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "assistant_runs" ADD "browserSessionId" character varying',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "assistant_runs" DROP COLUMN "browserSessionId"',
    );
  }
}
