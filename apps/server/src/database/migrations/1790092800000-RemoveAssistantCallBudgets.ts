import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAssistantCallBudgets1790092800000
  implements MigrationInterface
{
  name = 'RemoveAssistantCallBudgets1790092800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "maxToolCalls"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "maxModelCalls"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "maxModelCalls" integer NOT NULL DEFAULT 12`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "maxToolCalls" integer NOT NULL DEFAULT 30`,
    );
  }
}
