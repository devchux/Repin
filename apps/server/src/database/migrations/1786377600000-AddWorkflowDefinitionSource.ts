import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowDefinitionSource1786377600000 implements MigrationInterface {
  name = 'AddWorkflowDefinitionSource1786377600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" ADD "source" character varying NOT NULL DEFAULT 'manual'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" DROP COLUMN "source"`,
    );
  }
}
