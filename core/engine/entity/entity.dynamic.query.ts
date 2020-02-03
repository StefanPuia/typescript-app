import { EntityEngine } from './entity.engine';
import { ConditionBuilder } from './condition.builder';
import { CaseUtil } from '../../../utils/case.util';
import { BaseUtil } from '../../../utils/base.util';
import { GenericValue } from './generic.value';
import { DynamicEntity } from './dynamic.entity';

export class EntityDynamicQuery {
    private fields: Array<string> = [];
    private doCache: boolean = false;
    private condition: string = "";
    private inserts: Array<any> = [];
    private orderByFields: Array<OrderByField> = [];
    private dynamicEntity: DynamicEntity;
    private conditionBuilder: ConditionBuilder | undefined;

    private constructor() {
        this.dynamicEntity = new DynamicEntity();
    }

    public static from(alias: string, entity: string) {
        const edq = new EntityDynamicQuery();
        edq.from(alias, entity);
        return edq;
    }

    public static select(...fields: Array<string>): EntityDynamicQuery {
        const edq = new EntityDynamicQuery();
        edq.select.apply(edq, fields);
        return edq;
    }

    public from(alias: string, entityName: string): EntityDynamicQuery {
        this.dynamicEntity.setBaseAlias(alias);
        this.dynamicEntity.appendEntity(alias, {
            type: "BASE",
            def: {
                alias: alias,
                name: entityName
            },
            condition: []
        });
        return this;
    }

    public select(...fields: Array<string>): EntityDynamicQuery {
        this.fields = fields;
        return this;
    }

    public innerJoin(alias: string, entity: string, usingField: string): EntityDynamicQuery;
    public innerJoin(alias: string, entity: string, tableField: string, relField: string): EntityDynamicQuery;
    public innerJoin(alias: string, entity: string, conditions: Array<JoinCondition>): EntityDynamicQuery;
    public innerJoin(alias: string, entity: string, cond: any, relField?: string): EntityDynamicQuery {
        return this.join("INNER", alias, entity, cond, relField);
    }

    public outerJoin(alias: string, entity: string, usingField: string): EntityDynamicQuery;
    public outerJoin(alias: string, entity: string, tableField: string, relField: string): EntityDynamicQuery;
    public outerJoin(alias: string, entity: string, conditions: Array<JoinCondition>): EntityDynamicQuery;
    public outerJoin(alias: string, entity: string, cond: any, relField?: string): EntityDynamicQuery {
        return this.join("OUTER", alias, entity, cond, relField);
    }

    private join(type: "INNER" | "OUTER", alias: string, entity: string, cond: any, relField?: string): EntityDynamicQuery {
        const entityJoin: EntityJoin = {
            type: type,
            def: { alias: alias, name: entity },
            condition: []
        }
        if (typeof cond === "string") {
            const field = EntityEngine.parseField(cond);
            if (!field.alias) field.alias = alias;
            const builtField = this.buildField(field);
            if (typeof relField !== "undefined") {
                entityJoin.condition.push({ field: builtField, relField: this.buildField(EntityEngine.parseField(relField)) });
            } else {
                throw new Error(`No relation field given as right-hand side argument for '${builtField}'`);
            }
        } else {
            entityJoin.condition = cond;
        }
        this.dynamicEntity.appendEntity(alias, entityJoin);
        return this;
    }

    public where(condition: Condition): EntityDynamicQuery;
    public where(condition: ConditionBuilder): EntityDynamicQuery;
    public where(condition: string): EntityDynamicQuery;
    public where(condition: GenericObject): EntityDynamicQuery;
    public where(condition: Array<string>): EntityDynamicQuery;
    public where(condition: Condition | ConditionBuilder | string | GenericObject | Array<string>): EntityDynamicQuery {
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
            this.conditionBuilder = condition;
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
        this.orderByFields = fields.map(EntityEngine.parseOrderBy);
        return this;
    }

    public cache(cache: boolean): EntityDynamicQuery {
        this.doCache = cache;
        return this;
    }

    public queryList(): Promise<Array<GenericValue>> {
        return new Promise((resolve, reject) => {
            EntityEngine.transact(this.buildQuery(), this.inserts, reject, (results: any) => {
                const values: Array<GenericValue> = [];
                for (const result of results) {
                    values.push(new GenericValue(this.dynamicEntity, result));
                }
                resolve(values);
            }, this.doCache);
        });
    }

    public queryFirst(): Promise<GenericValue> {
        return new Promise((resolve, reject) => {
            EntityEngine.transact(`${this.buildQuery()} limit 1`, this.inserts, reject, (results: any) => {
                resolve(results[0] ? new GenericValue(this.dynamicEntity, results[0]) : undefined)
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
        this.dynamicEntity.appendFields(this.fields.map(EntityEngine.parseField));
        const fields = this.dynamicEntity.getFields().map(this.buildField).join(", ")
        let query = `select ${fields ? fields : "*"} from ${CaseUtil.pascalToSnake(this.dynamicEntity.getBaseEntity())} as ${this.dynamicEntity.getBaseAlias()} `;
        for (const entity of Object.values(this.dynamicEntity.getJoinEntities())) {
            if (entity.type !== "BASE") {
                query += `${entity.type} join ${CaseUtil.camelToSnake(entity.def.name)} as ${entity.def.alias} ${this.buildCondition(entity.condition)}`;
            }
        }
        if (this.conditionBuilder) {
            this.condition = this.conditionBuilder.setEntity(this.dynamicEntity).build();
        }
        if (this.condition.replace(/[() ]/g, "") !== "") {
            query += `where ${this.condition} `;
        }
        if (this.orderByFields.length) {
            query += `order by ${this.orderByFields.map(this.buildField).join(", ")} `;
        }
        return query;
    }

    private buildCondition(conditions: Array<JoinCondition>): string {
        let joinCond: Array<string> = [];
        for (const cond of conditions) {
            let rightSide;
            if (cond.relField) {
                rightSide = cond.relField;
            } else if (cond.value) {
                rightSide = "?";
                this.inserts.push(cond.value);
            } else {
                throw new Error(`No right-side argument has been given for the condition '${BaseUtil.stringify(cond)}'`);
            }
            joinCond.push(`${this.buildField(EntityEngine.parseField(cond.field))} = ${rightSide}`)
        }
        return joinCond.length ? `on (${joinCond.join(" and ")})` : "";
    }

    private buildField(field: DynamicDefinition | OrderByField): string {
        return (field.alias ? field.alias : this.dynamicEntity.getBaseAlias()) + "." + CaseUtil.camelToSnake(field.name);
    }
}