import { DatabaseUtil } from '../../../utils/database.util';
export abstract class ViewEntity {
    protected constructor() { }
    public static readonly definition: EntityViewDefinition;

    public static find(condition: EntityCondition): Promise<any>
    public static find(condition: EntityCondition, inserts: Array<any>): Promise<any>
    public static find(condition: EntityCondition, inserts: Array<any>, cache: boolean): Promise<any>
    public static find(condition?: EntityCondition, inserts?: Array<any>, cache: boolean = false): Promise<any> {
        return new Promise((resolve, reject) => {
            let conditionQuery = ViewEntity.buildConditionQuery(condition);
            let entityViewQuery = ViewEntity.buildEntityView(this.definition);
            let queryInserts: Array<any> = entityViewQuery.inserts;
            if (conditionQuery.sql !== "") {
                if (this.definition.condition) {
                    entityViewQuery.sql += " AND " + conditionQuery.sql;
                } else {
                    entityViewQuery.sql += " WHERE " + conditionQuery.sql;
                }
                queryInserts = queryInserts.concat(conditionQuery.inserts);
                if (inserts && inserts.length) {
                    queryInserts = queryInserts.concat(inserts);
                }
            }
            DatabaseUtil.transact(entityViewQuery.sql, queryInserts, reject, resolve, cache);
        })
    }

    private static buildEntityView(definition: EntityViewDefinition): query {
        let inserts: Array<any> = [];
        let fields: Array<string> = [];
        if (definition.fields) {
            for (let field of definition.fields) {
                fields.push(`${field.alias}.${field.name}`);
            }
        }
        if (fields.length === 0) {
            fields.push("*");
        }

        let joins: Array<string> = [];
        if (definition.joins) {
            for (let join of definition.joins) {
                let joinQuery = ViewEntity.buildJoinQuery(join)
                joins.push(joinQuery.sql);
                inserts = inserts.concat(joinQuery.inserts);
            }
        }

        let conditionQuery = ViewEntity.buildConditionQuery(definition.condition);
        inserts = inserts.concat(conditionQuery.inserts);
        if (conditionQuery.sql !== "") {
            conditionQuery.sql = "WHERE " + conditionQuery.sql;
        }

        return {
            sql: `SELECT ${fields.join(", ")} FROM ${definition.table} AS ${definition.alias} ${joins.join(" ")} ${conditionQuery.sql}`,
            inserts: inserts
        };
    }

    private static buildJoinQuery(joinDefinition: ViewEntityJoinDefinition): query {
        let joinString = `${joinDefinition.joinType} JOIN ${joinDefinition.table} AS ${joinDefinition.alias}`;
        let conditionQuery = ViewEntity.buildConditionQuery(joinDefinition.condition);
        if (conditionQuery.sql !== "") {
            joinString += " ON " + conditionQuery.sql;
        }
        return {
            sql: joinString,
            inserts: conditionQuery.inserts
        };
    }

    public static buildConditionQuery(condition: EntityCondition): query {
        if (condition) {
            if (typeof condition === "string") {
                return {
                    sql: `${condition}`,
                    inserts: []
                };
            } else if (condition.hasOwnProperty("joinFields")) {
                return ViewEntity.buildViewFieldConditionGroup(<ViewEntityJoinFieldGroup>condition);
            } else if (condition.hasOwnProperty("from") && condition.hasOwnProperty("to")) {
                return ViewEntity.buildViewFieldCondition(<ViewEntityJoinFieldDefinition>condition);
            } else {
                let inserts: Array<any> = [];
                let conditionGroups = (<Array<ViewEntityJoinFieldGroup>>condition).map(group =>
                    ViewEntity.buildViewFieldConditionGroup(group));
                for (let insert of conditionGroups.map(group => group.inserts)) {
                    inserts = inserts.concat(insert);
                }
                return {
                    sql: conditionGroups.map(group => group.sql).join(" AND "),
                    inserts: inserts
                }
            }
        }
        return {
            sql: "",
            inserts: []
        }
    }

    public static buildViewFieldCondition(fieldCondition: ViewEntityJoinFieldDefinition): query {
        let fromField = ViewEntity.buildField(fieldCondition.from);
        let toField = ViewEntity.buildField(fieldCondition.to);
        return {
            sql: `${fromField.sql} ${fieldCondition.operator} ${toField.sql}`,
            inserts: (<Array<any>>[]).concat(fromField.inserts, toField.inserts)
        };
    }

    public static buildField(field: ViewFieldDefinition): query {
        if (field.hasOwnProperty("value")) {
            return { 
                sql: "?",
                inserts: [field.value]
            };
        }
        return {
            sql: `${field.alias}.${field.name}`,
            inserts: []
        }
    }

    public static buildViewFieldConditionGroup(group: ViewEntityJoinFieldGroup): query {
        let groups: Array<query> = group.joinFields.map(join => ViewEntity.buildViewFieldCondition(join));
        let inserts: Array<any> = [];
        for (let insert of groups.map(group => group.inserts)) {
            inserts = inserts.concat(insert);
        }
        return {
            sql: `(${groups.map(group => group.sql).join(group.condition)})`,
            inserts: inserts
        };
    }
}

type query = {
    sql: string,
    inserts: Array<any>
}