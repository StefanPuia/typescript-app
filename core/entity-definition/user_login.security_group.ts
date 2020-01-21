import { GenericValue } from '../engine/entity/generic.value';
import { EntityEngine } from '../engine/entity/entity.engine';

export class UserLoginSecurityGroup extends GenericValue {
    public static readonly entity: string = "user_login_security_group";
    protected entity: string = UserLoginSecurityGroup.entity;
    protected primaryKeyField: Array<string> = ["user_login_id", "security_group_id"];
    protected data?: securityGroupPermissionData;

    public static readonly definition: EntityDefinition = {
        "name": "user_login_security_group",
        "type": "TABLE",
        "fields": [{
            "name": "user_login_id",
            "type": EntityEngine.DATA_TYPE.NUMBER,
            "primaryKey": true,
            "notNull": true
        }, {
            "name": "security_group_id",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true
        }],
        "foreignKeys": [{
            "field": "user_login_id",
            "name": "user_login_security_group_user_login_id",
            "reference": {
                "field": "user_login_id",
                "table": "user_login"
            },
            "onDelete": "restrict",
            "onUpdate": "restrict"
        }, {
            "field": "security_group_id",
            "name": "user_login_security_group_security_group_id",
            "reference": {
                "field": "security_group_id",
                "table": "security_group"
            },
            "onDelete": "restrict",
            "onUpdate": "restrict"
        }]
    };

    public find(securityGroupId: string, permissionId: string): Promise<UserLoginSecurityGroup> {
        return this.doSelect([securityGroupId, permissionId]);
    }
}

interface securityGroupPermissionData {
    security_group_id: string,
    permission_id: string
}