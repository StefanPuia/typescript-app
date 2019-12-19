import { GenericValue } from '../engine/entity/generic.value';
import { EntityEngine } from '../engine/entity/entity.engine';

export class SystemProperty extends GenericValue {
    public static readonly entity: string = "system_property";
    protected entity: string = SystemProperty.entity;
    protected primaryKeyField: string = "system_property_id";
    protected data?: systemPropertyData;

    public static readonly definition: EntityDefinition = {
        "name": "system_property",
        "fields": [{
            "name": "system_property_id",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true
        }, {
            "name": "value",
            "type": EntityEngine.DATA_TYPE.DESCRIPTION
        }]
    };

    public static create(): SystemProperty {
        return new SystemProperty();
    }

    public find(id: string): Promise<SystemProperty> {
        return this.doSelect(id);
    }

    public get systemPropertyId() {
        return this.get("system_property_id");
    }

    public get value() {
        return this.get("value");
    }
}

interface systemPropertyData {
    system_property_id: string,
    value: string
}