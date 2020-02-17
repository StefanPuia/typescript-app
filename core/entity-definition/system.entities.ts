import { EntityEngine } from '../engine/entity/entity.engine';

const SystemEntities: Array<EntityDefinition> = [{
    "name": "sessions",
    "type": "TABLE",
    "ignore": true,
    "fields": [{
        "name": "sid",
        "type": EntityEngine.DATA_TYPE.ID_VLONG,
        "primaryKey": true
    }, {
        "name": "session",
        "type": EntityEngine.DATA_TYPE.TEXT
    }, {
        "name": "expires",
        "type": "INT(11)"
    }]
}, {
    "name": "system_property",
    "type": "TABLE",
    "fields": [{
        "name": "system_resource_id",
        "type": EntityEngine.DATA_TYPE.ID_LONG,
        "primaryKey": true
    }, {
        "name": "system_property_id",
        "type": EntityEngine.DATA_TYPE.ID_LONG,
        "primaryKey": true
    },{
        "name": "system_property_value",
        "type": EntityEngine.DATA_TYPE.DESCRIPTION
    }]
}, {
    "name": "job_sandbox",
    "type": "TABLE",
    "fields": [{
        "name": "job_id",
        "type": EntityEngine.DATA_TYPE.NUMBER,
        "primaryKey": true,
        "autoIncrement": true
    }, {
        "name": "parent_job_id",
        "type": EntityEngine.DATA_TYPE.NUMBER
    }, {
        "name": "status_id",
        "type": EntityEngine.DATA_TYPE.ID_SHORT
    }, {
        "name": "service",
        "type": EntityEngine.DATA_TYPE.ID_LONG
    }, {
        "name": "data",
        "type": EntityEngine.DATA_TYPE.TEXT
    }, {
        "name": "run_time",
        "type": EntityEngine.DATA_TYPE.DATETIME
    }, {
        "name": "max_retries",
        "type": EntityEngine.DATA_TYPE.NUMBER
    }, {
        "name": "result",
        "type": EntityEngine.DATA_TYPE.TEXT
    }]
}];

export { SystemEntities };
