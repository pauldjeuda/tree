import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index.js';

interface UnionAttributes {
  id: string;
  family_id: string;
  partner1_id: string | null;
  partner2_id: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type UnionCreationAttributes = Optional<UnionAttributes, 'id' | 'partner1_id' | 'partner2_id'>;

export class Union extends Model<UnionAttributes, UnionCreationAttributes> implements UnionAttributes {
  declare id: string;
  declare family_id: string;
  declare partner1_id: string | null;
  declare partner2_id: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Union.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    family_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    partner1_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    partner2_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // Précision à la milliseconde : sans elle, Sequelize écrit les dates à la seconde sous MySQL
    // et l'ordre de création des membres devient aléatoire (voir la migration 001-init).
    createdAt: { type: DataTypes.DATE(3), allowNull: false },
    updatedAt: { type: DataTypes.DATE(3), allowNull: false },
  },
  {
    sequelize,
    tableName: 'unions',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['family_id'],
      },
    ],
  }
);
