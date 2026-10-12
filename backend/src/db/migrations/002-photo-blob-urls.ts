import { DataTypes, QueryInterface } from 'sequelize';

/** Les URL des photos Vercel Blob sont plus longues que les anciens noms de fichiers. */
export async function up(qi: QueryInterface): Promise<void> {
  await qi.changeColumn('persons', 'photo_path', {
    type: DataTypes.STRING(512),
    allowNull: true,
  });
}

/** Conserver la colonne élargie évite de tronquer des URL Blob lors d'un retour arrière. */
export async function down(): Promise<void> {
  // Migration volontairement irréversible.
}
