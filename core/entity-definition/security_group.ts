import { GenericValue } from '../engine/entity/generic.value';
import { EntityEngine } from '../engine/entity/entity.engine';

export class SecurityGroup extends GenericValue {
    public static readonly entity: string = "security_group";
    protected entity: string = SecurityGroup.entity;
    protected primaryKeyField: string = "security_group_id";
    protected data?: securityGroupData;

    public static readonly definition: EntityDefinition = {
        "name": "security_group",
        "fields": [{
            "name": "security_group_id",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true
        }, {
            "name": "description",
            "type": EntityEngine.DATA_TYPE.DESCRIPTION
        }]
    };

    public find(id: string): Promise<SecurityGroup> {
        return this.doSelect(id);
    }
}

interface securityGroupData {
    security_group_id: string,
    description: string
}