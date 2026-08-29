import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantRunBrowserExecutionTarget1786032000000 implements MigrationInterface {
  name = 'AddAssistantRunBrowserExecutionTarget1786032000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "browserExecutionTarget" character varying NOT NULL DEFAULT 'extension'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "assistant_runs" DROP COLUMN "browserExecutionTarget"',
    );
  }
}
