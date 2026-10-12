import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index.js';
import { Gender } from '../../shared/index.js';

interface PersonAttributes {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date: string | null;
  death_date: string | null;
  is_deceased: boolean;
  role_label: string | null;
  photo_path: string | null;
  parent_union_id: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type PersonCreationAttributes = Optional<
  PersonAttributes,
  'id' | 'birth_date' | 'death_date' | 'is_deceased' | 'role_label' | 'photo_path' | 'parent_union_id'
>;

export class Person extends Model<PersonAttributes, PersonCreationAttributes> implements PersonAttributes {
  declare id: string;
  declare family_id: string;
  declare first_name: string;
  declare last_name: string;
  declare gender: Gender;
  declare birth_date: string | null;
  declare death_date: string | null;
  declare is_deceased: boolean;
  declare role_label: string | null;
  declare photo_path: string | null;
  declare parent_union_id: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Person.init(
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
    first_name: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('M', 'F'),
      allowNull: false,
    },
    birth_date: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    death_date: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    is_deceased: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    role_label: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    photo_path: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    parent_union_id: {
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
    tableName: 'persons',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['family_id'],
      },
      {
        fields: ['parent_union_id'],
      },
    ],
  }
);
