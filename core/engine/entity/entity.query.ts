import { EntityEngine } from './entity.engine';
import { GenericValue } from './generic.value';
import { ConditionBuilder } from './condition.builder';

export class EntityQuery {
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

    public where(condition: Condition): EntityQuery;
    public where(condition: ConditionBuilder): EntityQuery;
    public where(condition: string): EntityQuery;
    public where(condition: GenericObject): EntityQuery;
    public where(condition: Array<string>): EntityQuery;
    public where(condition: Condition | ConditionBuilder | string | GenericObject | Array<string>): EntityQuery {
        if (condition instanceof Array) {
            if (condition.length % 2 !== 0) {
                throw new Error("Parameters must be even.")
            }
            const ecb = ConditionBuilder.create();
            for (let i = 0; i < condition.length; i = i + 2) {
                ecb.eq(condition[i], condition[i + 1]);
            }
            return this.where(ecb);
        } else if (condition instanceof ConditionBuilder) {
            this.condition = condition.setEntity(this.entityName).build();
        } else if (typeof condition === "string") {
            this.condition = condition;
        } else if (typeof condition.clause !== "undefined" && typeof condition.inserts !== "undefined") {
            this.condition = condition.clause;
            this.inserts = condition.inserts;
        } else {
            const ecb = ConditionBuilder.create();
            const condObject: any = condition;
            for (const key of Object.keys(condObject)) {
                ecb.eq(key, condObject[key]);
            }
            return this.where(ecb);
        }
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
        return new Promise((resolve, reject) => {
            EntityEngine.transact(this.buildQuery(), this.inserts, reject, (results: any) => {
                const values: Array<GenericValue> = [];
                for (const result of results) {
                    values.push(new GenericValue(this.entityName, result));
                }
                resolve(values);
            }, this.doCache);
        });
    }

    public queryFirst(): Promise<GenericValue> {
        return new Promise((resolve, reject) => {
            EntityEngine.transact(`${this.buildQuery()} limit 1`, this.inserts, reject, (results: any) => {
                resolve(results[0] ? new GenericValue(this.entityName, results[0]) : undefined);
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
        if (this.condition.replace(/[() ]/g, "") !== "") {
            query += `where ${this.condition} `;
        }
        if (this.orderByFields.length) {
            query += `order by ${this.orderByFields.map(
                field => field.substr(0, 1) === "-" ? `${field.substr(1)} DESC` : field).join(", ")} `;
        }
        return query;
    }
}