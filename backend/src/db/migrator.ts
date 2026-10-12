import { SequelizeStorage, Umzug } from 'umzug';
import type { Sequelize } from 'sequelize';
import * as m001 from './migrations/001-init.js';
import * as m002 from './migrations/002-photo-blob-urls.js';

/** Liste explicite des migrations (compatible avec un build tsc, sans glob dynamique). */
export function createMigrator(sequelize: Sequelize) {
  const qi = sequelize.getQueryInterface();
  return new Umzug({
    migrations: [
      { name: '001-init', up: () => m001.up(qi), down: () => m001.down(qi) },
      { name: '002-photo-blob-urls', up: () => m002.up(qi), down: () => m002.down() },
    ],
    context: qi,
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  });
}

export async function runMigrations(sequelize: Sequelize): Promise<string[]> {
  const done = await createMigrator(sequelize).up();
  return done.map((m) => m.name);
}
