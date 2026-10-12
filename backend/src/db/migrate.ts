import { sequelize } from './index.js';
import { createMigrator } from './migrator.js';

async function main() {
  await sequelize.authenticate();
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const migrator = createMigrator(sequelize);
  const done = direction === 'up' ? await migrator.up() : await migrator.down();
  console.log(
    done.length
      ? `[Migrations] ${direction === 'up' ? 'appliquées' : 'annulées'} : ${done.map((m) => m.name).join(', ')}`
      : '[Migrations] Base déjà à jour.',
  );
  await sequelize.close();
}

main().catch((err) => {
  console.error('[Migrations] Échec :', err);
  process.exit(1);
});
