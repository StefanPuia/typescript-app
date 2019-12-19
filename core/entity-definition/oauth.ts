import { GenericValue } from '../engine/entity/generic.value';
import { EntityEngine } from '../engine/entity/entity.engine';

export class Oauth extends GenericValue {
    public static readonly entity: string = "oauth";
    protected entity: string = Oauth.entity;
    protected primaryKeyField: Array<string> = ["user_login_id", "provider"];
    protected data?: oauthData;

    public static create(): Oauth {
        return new Oauth();
    }

    public static readonly definition: EntityDefinition = {
        "name": "oauth",
        "fields": [{
            "name": "user_login_id",
            "type": EntityEngine.DATA_TYPE.NUMBER,
            "primaryKey": true,
            "notNull": true
        }, {
            "name": "provider",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "primaryKey": true
        }, {
            "name": "id",
            "type": EntityEngine.DATA_TYPE.ID_LONG
        }],
        "foreignKeys": [{
            "field": "user_login_id",
            "name": "oauth_user_login_id",
            "reference": {
                "field": "user_login_id",
                "table": "user_login"
            },
            "onDelete": "restrict",
            "onUpdate": "restrict"
        }]
    };

    public find(userLoginId: string, provider: string): Promise<Oauth> {
        return this.doSelect([userLoginId, provider]);
    }
}

interface oauthData {
    user_login_id: number,
    provider: string,
    id: string
}