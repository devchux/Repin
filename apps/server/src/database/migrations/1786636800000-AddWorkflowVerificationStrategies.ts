import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowVerificationStrategies1786636800000 implements MigrationInterface {
  name = 'AddWorkflowVerificationStrategies1786636800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "workflow_definitions"
      SET "goal" = jsonb_set(
        "goal",
        '{successCriteria}',
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', 'semantic-' || criterion.ordinality,
              'description', criterion.value,
              'verification', jsonb_build_object('type', 'model')
            )
            ORDER BY criterion.ordinality
          )
          FROM jsonb_array_elements_text("goal"->'successCriteria')
            WITH ORDINALITY AS criterion(value, ordinality)
        )
      )
      WHERE "goal" IS NOT NULL
        AND jsonb_array_length("goal"->'successCriteria') > 0
        AND jsonb_typeof("goal"->'successCriteria'->0) = 'string'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "workflow_definitions"
      SET "goal" = jsonb_set(
        "goal",
        '{successCriteria}',
        (
          SELECT jsonb_agg(criterion.value->>'description' ORDER BY criterion.ordinality)
          FROM jsonb_array_elements("goal"->'successCriteria')
            WITH ORDINALITY AS criterion(value, ordinality)
        )
      )
      WHERE "goal" IS NOT NULL
        AND jsonb_array_length("goal"->'successCriteria') > 0
        AND jsonb_typeof("goal"->'successCriteria'->0) = 'object'
    `);
  }
}
