import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantRunQueueWait1785772800000 implements MigrationInterface {
  name = 'AddAssistantRunQueueWait1785772800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "queueWaitMs" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "queueWaitMs"`,
    );
  }
}
