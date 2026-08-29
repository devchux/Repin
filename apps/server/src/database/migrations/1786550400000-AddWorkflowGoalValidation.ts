import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowGoalValidation1786550400000 implements MigrationInterface {
  name = 'AddWorkflowGoalValidation1786550400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" ADD "goal" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_instances" ADD "goalValidation" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_instances" DROP COLUMN "goalValidation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" DROP COLUMN "goal"`,
    );
  }
}
