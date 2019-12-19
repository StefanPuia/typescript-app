import { GenericValue } from '../engine/entity/generic.value';
import { EntityEngine } from '../engine/entity/entity.engine';

export class SecurityGroupPermission extends GenericValue {
    public static readonly entity: string = "security_group_permission";
    protected entity: string = SecurityGroupPermission.entity;
    protected primaryKeyField: Array<string> = ["security_group_id", "permission_id"];
    protected data?: securityGroupPermissionData;

    public static readonly definition: EntityDefinition = {
        "name": "security_group_permission",
        "fields": [{
            "name": "security_group_id",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true
        }, {
            "name": "permission_id",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true
        }],
        "foreignKeys": [{
            "field": "security_group_id",
            "name": "security_group_permission_security_group_id",
            "reference": {
                "field": "security_group_id",
                "table": "security_group"
            },
            "onDelete": "restrict",
            "onUpdate": "restrict"
        }, {
            "field": "permission_id",
            "name": "security_group_permission_permission_id",
            "reference": {
                "field": "permission_id",
                "table": "permission"
            },
            "onDelete": "restrict",
            "onUpdate": "restrict"
        }]
    };

    public find(securityGroupId: string, permissionId: string): Promise<SecurityGroupPermission> {
        return this.doSelect([securityGroupId, permissionId]);
    }
}

interface securityGroupPermissionData {
    security_group_id: string,
    permission_id: string
}