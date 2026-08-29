import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowRuntime1786204800000 implements MigrationInterface {
  name = 'CreateWorkflowRuntime1786204800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."workflow_instances_status_enum" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."workflow_node_executions_status_enum" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD "idempotencyKey" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" ADD CONSTRAINT "UQ_assistant_runs_idempotency_key" UNIQUE ("idempotencyKey")`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer NOT NULL, "key" character varying NOT NULL, "name" character varying NOT NULL, "description" text, "version" integer NOT NULL, "graph" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_workflow_definition_version" UNIQUE ("userId", "key", "version"), CONSTRAINT "PK_workflow_definitions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_instances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer NOT NULL, "definitionId" uuid NOT NULL, "status" "public"."workflow_instances_status_enum" NOT NULL DEFAULT 'queued', "currentNodeId" character varying NOT NULL, "input" jsonb NOT NULL DEFAULT '{}', "output" jsonb NOT NULL DEFAULT '{}', "error" text, "eventSequence" integer NOT NULL DEFAULT '0', "queueJobId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "startedAt" TIMESTAMP, "completedAt" TIMESTAMP, "cancelledAt" TIMESTAMP, CONSTRAINT "PK_workflow_instances" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_node_executions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "instanceId" uuid NOT NULL, "nodeId" character varying NOT NULL, "nodeType" character varying NOT NULL, "status" "public"."workflow_node_executions_status_enum" NOT NULL DEFAULT 'pending', "runId" uuid, "output" jsonb, "error" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "startedAt" TIMESTAMP, "completedAt" TIMESTAMP, CONSTRAINT "UQ_workflow_node_execution" UNIQUE ("instanceId", "nodeId"), CONSTRAINT "PK_workflow_node_executions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "instanceId" uuid NOT NULL, "sequence" integer NOT NULL, "type" character varying NOT NULL, "nodeId" character varying, "data" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_workflow_event_sequence" UNIQUE ("instanceId", "sequence"), CONSTRAINT "PK_workflow_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_instances_user_created" ON "workflow_instances" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_instances_status" ON "workflow_instances" ("status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" ADD CONSTRAINT "FK_workflow_definitions_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_instances" ADD CONSTRAINT "FK_workflow_instances_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_instances" ADD CONSTRAINT "FK_workflow_instances_definition" FOREIGN KEY ("definitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_node_executions" ADD CONSTRAINT "FK_workflow_nodes_instance" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_node_executions" ADD CONSTRAINT "FK_workflow_nodes_run" FOREIGN KEY ("runId") REFERENCES "assistant_runs"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_events" ADD CONSTRAINT "FK_workflow_events_instance" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_events" DROP CONSTRAINT "FK_workflow_events_instance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_node_executions" DROP CONSTRAINT "FK_workflow_nodes_run"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_node_executions" DROP CONSTRAINT "FK_workflow_nodes_instance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_instances" DROP CONSTRAINT "FK_workflow_instances_definition"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_instances" DROP CONSTRAINT "FK_workflow_instances_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_definitions" DROP CONSTRAINT "FK_workflow_definitions_user"`,
    );
    await queryRunner.query(`DROP TABLE "workflow_events"`);
    await queryRunner.query(`DROP TABLE "workflow_node_executions"`);
    await queryRunner.query(`DROP TABLE "workflow_instances"`);
    await queryRunner.query(`DROP TABLE "workflow_definitions"`);
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP CONSTRAINT "UQ_assistant_runs_idempotency_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assistant_runs" DROP COLUMN "idempotencyKey"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."workflow_node_executions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."workflow_instances_status_enum"`,
    );
  }
}
