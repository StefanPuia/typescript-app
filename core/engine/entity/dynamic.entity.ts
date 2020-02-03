import { EntityEngine } from './entity.engine';
import { TypeEngine } from '../type.engine';

export class DynamicEntity {
    private entities: EntityJoinStore;
    private fields: Array<DynamicDefinition> = [];
    private baseAlias: string = "";

    public constructor();
    public constructor(entities: EntityJoinStore);
    public constructor(entities: EntityJoinStore = {}) {
        this.entities = entities;
    }

    public setBaseAlias(alias: string) {
        this.baseAlias = alias;
    }

    public appendEntity(alias: string, entity: EntityJoin) {
        if (!EntityEngine.getEntityDefinition(entity.def.name)) {
            throw new Error(`Entity '${entity.def.name}' not defined.`);
        }
        this.entities[alias] = entity;
    }

    public appendFields(fields: Array<DynamicDefinition>) {
        for(const field of fields) {
            this.appendField(field);
        }
    }

    public appendField(field: DynamicDefinition) {
        if (field.name === "*") {
            const entityName = this.getEntity(field.alias || this.baseAlias).def.name;
            const entityDef = EntityEngine.getPublicEntityDefinition(entityName);
            if (entityDef) {
                this.appendFields(entityDef.fields.map(f => { return { alias: field.alias, name: f.name }}));
            } else {
                throw new Error(`Entity '${entityName}' not defined.`);
            }
        } else {
            this.validateField(field.name, field.alias || this.baseAlias);
            this.fields = this.fields.filter(f => f.name !== field.name);
            this.fields.push(field);
        }
    }

    public validateField(field: string): FieldDefinition
    public validateField(field: string, entityAlias: string): FieldDefinition
    public validateField(field: string, entityAlias: string | undefined = undefined): FieldDefinition {
        if (entityAlias) {
            return EntityEngine.validateField(this.getEntity(entityAlias).def.name, field);
        } else {
            let fieldDefinition;
            try {
                for (const entity of Object.values(this.entities)) {
                    fieldDefinition = EntityEngine.validateField(entity.def.name, field)
                }
            } finally {
                if (!fieldDefinition) {
                    throw new Error(`Field '${field}' is not valid for the dynamic entity.`)
                }
                return fieldDefinition;
            }
        }
    }

    public fieldExists(_field: string): DynamicDefinition {
        const field = EntityEngine.parseField(_field);
        const validField = this.fields.find(f => f.name === field.name);
        if (!validField) {
            throw new Error(`Field '${_field}' does not exist on the dynamic entity.`);
        }
        return validField;
    }

    public getBaseEntity(): string {
        return this.entities[this.baseAlias].def.name;
    }

    public getBaseAlias(): string {
        return this.baseAlias;
    }

    public getJoinEntities(): EntityJoinStore {
        return this.entities;
    }

    public getFields(): Array<DynamicDefinition> {
        return this.fields;
    }

    public getEntity(alias: string): EntityJoin {
        return this.entities[alias];
    }

    public validateFieldValuePair(field: string, value: any, nullCheck: boolean) {
        return EntityEngine.validateFieldValuePair(this, field, value, nullCheck);
    }
}