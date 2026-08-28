import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantRunDeadlines1786464000000
  implements MigrationInterface
{
  name = 'AddAssistantRunDeadlines1786464000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "assistant_runs" ADD "deadlineAt" TIMESTAMP',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "assistant_runs" DROP COLUMN "deadlineAt"',
    );
  }
}
