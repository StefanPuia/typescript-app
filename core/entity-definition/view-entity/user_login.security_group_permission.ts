import { EntityEngine } from '../../engine/entity/entity.engine';
import { GenericValue } from '../../engine/entity/generic.value';

export class UserLoginSecurityGroupPermission extends GenericValue {
    protected entity: string = "user_login_security_group_permission";
    protected primaryKeyField: string | string[] = ["user_login_id", "security_group_id", "permission_id"];
    protected data?: any;

    public find(...fields: any) {
        throw new Error("Method not implemented.");
    }

    public static readonly definition: EntityDefinition = {
        "name": "user_login_security_group_permission",
        "type": "VIEW",
        "fields": [{
            "name": "user_login_id",
            "type": EntityEngine.DATA_TYPE.NUMBER,
            "primaryKey": true
        }, {
            "name": "security_group_id",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true
        }, {
            "name": "permission_id",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true
        }],
        "viewDefinition": `select UL.user_login_id, SG.security_group_id, PE.permission_id
            from user_login as UL
            inner join user_login_security_group as ULSG using(user_login_id)
            inner join security_group as SG using(security_group_id)
            inner join security_group_permission as SGP using(security_group_id)
            inner join permission as PE using(permission_id)`
    };
}