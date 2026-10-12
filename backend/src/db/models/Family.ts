import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index.js';

interface FamilyAttributes {
  id: string;
  name: string;
  subtitle: string;
  edit_token_hash: string;
  share_id: string | null;
  share_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type FamilyCreationAttributes = Optional<FamilyAttributes, 'id' | 'share_id' | 'share_active'>;

export class Family extends Model<FamilyAttributes, FamilyCreationAttributes> implements FamilyAttributes {
  declare id: string;
  declare name: string;
  declare subtitle: string;
  declare edit_token_hash: string;
  declare share_id: string | null;
  declare share_active: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Family.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: 'Arbre généalogique',
    },
    edit_token_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
    },
    share_id: {
      type: DataTypes.STRING(12),
      allowNull: true,
      unique: true,
    },
    share_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Précision à la milliseconde : sans elle, Sequelize écrit les dates à la seconde sous MySQL
    // et l'ordre de création des membres devient aléatoire (voir la migration 001-init).
    createdAt: { type: DataTypes.DATE(3), allowNull: false },
    updatedAt: { type: DataTypes.DATE(3), allowNull: false },
  },
  {
    sequelize,
    tableName: 'families',
    underscored: true,
    timestamps: true,
  }
);
