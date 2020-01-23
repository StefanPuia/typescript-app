import { EntityEngine } from '../engine/entity/entity.engine';

const UserEntities: Array<EntityDefinition> = [{
    "name": "user_login",
    "type": "TABLE",
    "fields": [{
        "name": "user_login_id",
        "type": EntityEngine.DATA_TYPE.NUMBER,
        "primaryKey": true,
        "autoIncrement": true,
        "notNull": true,
        "unique": true
    }, {
        "name": "user_name",
        "type": EntityEngine.DATA_TYPE.ID_LONG,
        "unique": true,
    }, {
        "name": "password",
        "type": EntityEngine.DATA_TYPE.DESCRIPTION
    }, {
        "name": "name",
        "type": EntityEngine.DATA_TYPE.ID_VLONG
    }, {
        "name": "picture",
        "type": EntityEngine.DATA_TYPE.DESCRIPTION
    }]
}, {
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
}, {
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
}, {
    "name": "oauth",
    "type": "TABLE",
    "fields": [{
        "name": "user_login_id",
        "type": EntityEngine.DATA_TYPE.NUMBER,
        "primaryKey": true
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
}];

export { UserEntities };
