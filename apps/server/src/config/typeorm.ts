import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import configuration from './configuration';

const { database } = configuration();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: database.url,
  entities: ['dist/**/*.entity{.js,.ts}'],
  migrations: ['dist/database/migrations/*.{js,ts}'],
  synchronize: false,
};

export const typeOrmModuleOptions: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  autoLoadEntities: true,
};
