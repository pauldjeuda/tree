import { app } from './app.js';
import { env } from './config/env.js';
import { sequelize } from './db/index.js';
import './db/models/index.js';
import { runMigrations } from './db/migrator.js';

async function start() {
  try {
    await sequelize.authenticate();
    console.log(`[Database] Connexion réussie (${env.DB_DIALECT})`);

    if (env.AUTO_MIGRATE) {
      const applied = await runMigrations(sequelize);
      if (applied.length) console.log(`[Database] Migrations appliquées : ${applied.join(', ')}`);
    }

    const server = app.listen(env.PORT, () => {
      console.log(`[API] Serveur prêt sur http://localhost:${env.PORT}`);
    });

    const shutdown = (signal: string) => {
      console.log(`[API] ${signal} reçu, arrêt en cours…`);
      server.close(() => {
        sequelize.close().finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[API] Échec du démarrage du serveur :', error);
    process.exit(1);
  }
}

start();
