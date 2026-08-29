import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowActivation1786291200000 implements MigrationInterface {
  name = 'AddWorkflowActivation1786291200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" ADD "activation" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" DROP COLUMN "activation"`,
    );
  }
}
