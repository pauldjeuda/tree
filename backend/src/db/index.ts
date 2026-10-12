import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';
import fs from 'fs';
import path from 'path';

let sequelize: Sequelize;

if (env.DB_DIALECT === 'mysql') {
  sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00',
    dialectOptions: {
      charset: 'utf8mb4',
      ...(env.DB_SSL ? { ssl: { require: true, rejectUnauthorized: true } } : {}),
    },
    pool: {
      max: env.DB_POOL_MAX,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  const dir = path.dirname(path.resolve(env.DB_STORAGE));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: env.DB_STORAGE,
    logging: false,
  });
}

export { sequelize };
