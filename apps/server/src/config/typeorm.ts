import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: ['dist/**/*.entity{.js,.ts}'],
  migrations: ['dist/database/migrations/*.{js,ts}'],
  synchronize: false,
};

export const typeOrmModuleOptions: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  autoLoadEntities: true,
};
