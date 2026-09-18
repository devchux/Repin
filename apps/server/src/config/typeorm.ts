import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'node:path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const isTypeScriptRuntime = __filename.endsWith('.ts');

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: isTypeScriptRuntime
    ? [join(__dirname, '..', '**', '*.entity.ts')]
    : [],
  migrations: [
    join(
      __dirname,
      '..',
      'database',
      'migrations',
      isTypeScriptRuntime ? '*.ts' : '*.js',
    ),
  ],
  synchronize: false,
};

export const typeOrmModuleOptions: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  autoLoadEntities: true,
};
