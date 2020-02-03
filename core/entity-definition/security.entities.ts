import { EntityEngine } from '../engine/entity/entity.engine';

const SecurityEntities: Array<EntityDefinition> = [{
    "name": "permission",
    "type": "TABLE",
    "fields": [{
        "name": "permission_id",
        "type": EntityEngine.DATA_TYPE.ID_LONG,
        "primaryKey": true,
        "notNull": true
    }, {
        "name": "description",
        "type": EntityEngine.DATA_TYPE.DESCRIPTION
    }]
}, {
    "name": "security_group",
    "type": "TABLE",
    "fields": [{
        "name": "security_group_id",
        "type": EntityEngine.DATA_TYPE.ID_LONG,
        "primaryKey": true,
        "notNull": true
    }, {
        "name": "description",
        "type": EntityEngine.DATA_TYPE.DESCRIPTION
    }]
}, {
    "name": "security_group_permission",
    "type": "TABLE",
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
}];

export { SecurityEntities };
