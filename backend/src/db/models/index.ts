import { Family } from './Family.js';
import { Person } from './Person.js';
import { Union } from './Union.js';

Family.hasMany(Person, { foreignKey: 'family_id', as: 'persons', onDelete: 'CASCADE' });
Person.belongsTo(Family, { foreignKey: 'family_id', as: 'family' });

Family.hasMany(Union, { foreignKey: 'family_id', as: 'unions', onDelete: 'CASCADE' });
Union.belongsTo(Family, { foreignKey: 'family_id', as: 'family' });

Person.belongsTo(Union, { foreignKey: 'parent_union_id', as: 'parentUnion', onDelete: 'SET NULL' });
Union.hasMany(Person, { foreignKey: 'parent_union_id', as: 'children' });

Union.belongsTo(Person, { foreignKey: 'partner1_id', as: 'partner1' });
Union.belongsTo(Person, { foreignKey: 'partner2_id', as: 'partner2' });

export { Family, Person, Union };
