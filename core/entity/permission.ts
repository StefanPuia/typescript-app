import { DatabaseUtil } from '../../utils/database.util';
import { GenericValue } from '../generic.value';

export class Permission extends GenericValue {
    public static readonly entity: string = "permission";
    protected entity: string = Permission.entity;
    protected primaryKeyField: string = "permission_id";
    protected data?: permissionData;

    public static readonly definition: EntityDefinition = {
        "name": "permission",
        "fields": [{
            "name": "permission_id",
            "type": DatabaseUtil.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true
        }, {
            "name": "description",
            "type": DatabaseUtil.DATA_TYPE.DESCRIPTION
        }]
    };

    public find(id: string): Promise<Permission> {
        return this.doSelect(id);
    }
}

interface permissionData {
    permission_id: string,
    description: string
}