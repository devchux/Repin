import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from '../config/typeorm';

export default new DataSource(dataSourceOptions as DataSourceOptions);
