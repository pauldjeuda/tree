import { DataTypes, QueryInterface } from 'sequelize';

// DATETIME(3) : précision à la milliseconde. Sous MySQL, un DATETIME simple est tronqué à la seconde :
// des membres créés dans la même seconde auraient la même date, et l'ordre de création (qui détermine
// l'ordre des frères et sœurs et des conjoints sur l'affiche) deviendrait aléatoire.
const timestamps = {
  created_at: { type: DataTypes.DATE(3), allowNull: false },
  updated_at: { type: DataTypes.DATE(3), allowNull: false },
};

export async function up(qi: QueryInterface): Promise<void> {
  await qi.createTable('families', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING(80), allowNull: false },
    subtitle: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'Arbre généalogique' },
    edit_token_hash: { type: DataTypes.CHAR(64), allowNull: false },
    share_id: { type: DataTypes.CHAR(12), allowNull: true, unique: true },
    share_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ...timestamps,
  });

  // Les unions référencent les personnes (partenaires) et les personnes référencent
  // leur union parente : on crée donc les tables, puis on ajoute les clés étrangères.
  await qi.createTable('unions', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    family_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'families', key: 'id' },
      onDelete: 'CASCADE',
    },
    partner1_id: { type: DataTypes.UUID, allowNull: true },
    partner2_id: { type: DataTypes.UUID, allowNull: true },
    ...timestamps,
  });
  await qi.addIndex('unions', ['family_id']);
  await qi.addIndex('unions', ['partner1_id']);
  await qi.addIndex('unions', ['partner2_id']);

  await qi.createTable('persons', {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    family_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'families', key: 'id' },
      onDelete: 'CASCADE',
    },
    first_name: { type: DataTypes.STRING(60), allowNull: false },
    last_name: { type: DataTypes.STRING(60), allowNull: false },
    gender: { type: DataTypes.ENUM('M', 'F'), allowNull: false },
    birth_date: { type: DataTypes.STRING(10), allowNull: true },
    death_date: { type: DataTypes.STRING(10), allowNull: true },
    is_deceased: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    role_label: { type: DataTypes.STRING(40), allowNull: true },
    /** Nom local ou URL publique Vercel Blob. */
    photo_path: { type: DataTypes.STRING(512), allowNull: true },
    parent_union_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'unions', key: 'id' },
      onDelete: 'SET NULL',
    },
    ...timestamps,
  });
  await qi.addIndex('persons', ['family_id']);
  await qi.addIndex('persons', ['parent_union_id']);

  for (const column of ['partner1_id', 'partner2_id']) {
    await qi.addConstraint('unions', {
      fields: [column],
      type: 'foreign key',
      name: `fk_unions_${column}`,
      references: { table: 'persons', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.removeConstraint('unions', 'fk_unions_partner1_id');
  await qi.removeConstraint('unions', 'fk_unions_partner2_id');
  await qi.dropTable('persons');
  await qi.dropTable('unions');
  await qi.dropTable('families');
}
