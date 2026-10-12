declare module 'umzug' {
  import type { QueryInterface, Sequelize } from 'sequelize';

  export interface UmzugMigration {
    name: string;
  }

  export class SequelizeStorage {
    constructor(options: { sequelize: Sequelize });
  }

  export class Umzug {
    constructor(options: {
      migrations: Array<{
        name: string;
        up: () => Promise<unknown>;
        down?: () => Promise<unknown>;
      }>;
      context?: QueryInterface;
      storage?: SequelizeStorage;
      logger?: undefined;
    });

    up(): Promise<UmzugMigration[]>;
    down(): Promise<UmzugMigration[]>;
  }
}
