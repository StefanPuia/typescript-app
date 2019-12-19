import { GenericValue } from '../engine/entity/generic.value';
import { EntityEngine } from '../engine/entity/entity.engine';

export class Session extends GenericValue {
    public static readonly entity: string = "session";
    protected entity: string = Session.entity;
    protected primaryKeyField: string = "sid";
    protected data?: sessionData;

    public static readonly definition: EntityDefinition = {
        "name": "sessions",
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
    };

    public find(id: string): Promise<Session> {
        return this.doSelect(id);
    }
}

interface sessionData {
    sid: string,
    session: string,
    expires: number
}