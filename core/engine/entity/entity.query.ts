import { EntityEngine } from './entity.engine';
import { GenericValue } from './generic.value';

export class EntityQuery {
    private static instance: EntityQuery;
    private entityName: string;
    private entity: EntityDefinition;
    private fields: Array<string> = [];
    private condition: string = "";
    private orderByFields: Array<string> = [];
    private inserts: Array<any> = [];
    private doCache: boolean = false;

    private constructor(entityName: string) {
        this.entityName = entityName;

        const definition = EntityEngine.getEntityDefinition(this.entityName);
        if (definition) {
            this.entity = definition;
        } else {
            throw new Error(`Entity '${this.entityName}' is not defined.`);
        }
    }

    public static from(entityName: string) {
        return new EntityQuery(entityName);
    }

    public select(...fields: Array<string>): EntityQuery {
        EntityEngine.validateFields(this.entityName, fields);
        this.fields = fields;
        return this;
    }

    public where(condition: Condition): EntityQuery {
        this.condition = condition.clause;
        this.inserts = condition.inserts;
        return this;
    }

    public orderBy(...fields: Array<string>) {
        EntityEngine.validateFields(this.entityName, fields.map(
            field => field.substr(0, 1) === "-" ? field.substr(1) : field));
        this.orderByFields = fields;
        return this;
    }

    public cache(cache: boolean): EntityQuery {
        this.doCache = cache;
        return this;
    }

    public queryList(): Promise<Array<GenericValue>> {
        return EntityEngine.transactPromise(this.buildQuery(), this.inserts, this.doCache);
    }

    public queryFirst(): Promise<GenericValue> {
        return new Promise((resolve, reject) => {
            EntityEngine.transact(`${this.buildQuery()} limit 1`, this.inserts, reject, (results: any) => {
                resolve(results[0]);
            }, this.doCache);
        });
    }

    public queryCount(): Promise<number> {
        return new Promise((resolve, reject) => {
            EntityEngine.transact(`select count(1) as c from (${this.buildQuery()}) e`,
                    this.inserts, reject, (results: any) => {
                resolve(results[0].c);
            }, this.doCache)
        });
    }

    private buildQuery() {
        const fields = this.fields.length ? this.fields.join(", ") : "*";
        let query = `select ${fields} from ${this.entity.name} `;
        if (this.condition) {
            query += `where ${this.condition} `;
        }
        if (this.orderByFields.length) {
            query += `order by ${this.orderByFields.map(
                field => field.substr(0, 1) === "-" ? `${field.substr(1)} DESC` : field).join(", ")} `;
        }
        return query;
    }
}