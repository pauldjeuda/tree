import { SequelizeStorage, Umzug } from 'umzug';
import type { Sequelize } from 'sequelize';
import * as m001 from './migrations/001-init.js';

/** Liste explicite des migrations (compatible avec un build tsc, sans glob dynamique). */
export function createMigrator(sequelize: Sequelize) {
  const qi = sequelize.getQueryInterface();
  return new Umzug({
    migrations: [{ name: '001-init', up: () => m001.up(qi), down: () => m001.down(qi) }],
    context: qi,
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  });
}

export async function runMigrations(sequelize: Sequelize): Promise<string[]> {
  const done = await createMigrator(sequelize).up();
  return done.map((m) => m.name);
}
