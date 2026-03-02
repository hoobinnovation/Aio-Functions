import { getDataSource } from './data-source';

async function run(): Promise<void> {
  const ds = await getDataSource();
  await ds.runMigrations();
  await ds.destroy();
}

run().catch((error) => {
  console.error('Failed to run migrations', error);
  process.exit(1);
});
