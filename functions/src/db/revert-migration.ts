import { getDataSource } from './data-source';

async function run(): Promise<void> {
  const ds = await getDataSource();
  await ds.undoLastMigration();
  await ds.destroy();
}

run().catch((error) => {
  console.error('Failed to revert migration', error);
  process.exit(1);
});
