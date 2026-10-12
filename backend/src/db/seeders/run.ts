import { sequelize } from '../index.js';
import { runMigrations } from '../migrator.js';
import { seedMballaFamily } from './mballaFamily.js';

async function main() {
  await sequelize.authenticate();
  await runMigrations(sequelize);
  await seedMballaFamily();
  await sequelize.close();
}

main().catch((err) => {
  console.error('[Seeder] Échec :', err);
  process.exit(1);
});
