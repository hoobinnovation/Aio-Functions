import { DataSource } from 'typeorm';
import { getDataSource } from '../core/db';
import PROD from "../utils/PROD";

export type AppDbDriver = 'mysql' | 'sqlite';


export interface AppDataSourceConfig {
  driver?: AppDbDriver;
  synchronize?: boolean;
}

export function createAppDataSource(config: AppDataSourceConfig = {}): DataSource {
  const driver = config.driver ?? 'mysql';
  if (driver === 'mysql') {
      // return getDataSource(config.synchronize);
      return getDataSource(config.synchronize ?? !PROD);
  }

  throw new Error('SQLite driver is not configured yet.');
}

export async function getInitializedDataSource(config: AppDataSourceConfig = {}): Promise<DataSource> {
  const source = createAppDataSource(config);
  if (!source.isInitialized) {
    await source.initialize();
  }
  return source;
}
