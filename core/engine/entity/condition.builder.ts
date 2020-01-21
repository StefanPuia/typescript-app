import { EntityEngine } from './entity.engine';
import { TypeEngine } from '../type.engine';
import { CaseUtil } from '../../../utils/case.util';

export class ConditionBuilder {
    private entityName: string | undefined;
    private parent: ECGroup;
    private groups: Array<ECGroup> = [];
    private validateOnBuild: boolean = false;
    private validationPairs: Array<Array<any>> = [];

    private constructor(entityName: string | undefined, joinOperator: JoinOperator) {
        if (typeof entityName === "undefined") {
            this.validateOnBuild = true;
            this.entityName = undefined;
        } else {
            this.entityName = entityName;
        }
        this.parent = new ECGroup(joinOperator);

        if (this.entityName) {
            const definition = EntityEngine.getEntityDefinition(this.entityName);
            if (!definition) {
                throw new Error(`Entity '${this.entityName}' is not defined.`);
            }
        }
    }

    private appendCondition(condition: string, value: any): ConditionBuilder {
        this.currentGroup().add(EntityEngine.makeCondition([{
            clause: condition,
            inserts: [value]
        }]));
        return this;
    }

    private queueForValidation(field: string, value: any, nullCheck: boolean = false) {
        if (this.validateOnBuild) {
            this.validationPairs.push([field, value, nullCheck]);
        } else {
            this.validatePairs(field, value, nullCheck);
        }
    }

    private validatePairs(field: string, value: any, nullCheck: boolean = false) {
        if (this.entityName) {
            const fieldDefinition = EntityEngine.validateField(this.entityName, field);
            TypeEngine.convert(value, fieldDefinition.type, nullCheck);
        } else {
            throw new Error(`Condition pairs cannot be validated: No entity name was given.`);
        }
    }

    public static create(): ConditionBuilder;
    public static create(joinOperator: JoinOperator): ConditionBuilder;
    public static create(entityName: string): ConditionBuilder;
    public static create(entityName: string, joinOperator: JoinOperator): ConditionBuilder;
    public static create(): ConditionBuilder {
        let entityName: undefined | string | JoinOperator = arguments[0];
        let joinOperator: JoinOperator = arguments[1] || "AND";
        return new ConditionBuilder(entityName, joinOperator);
    }

    private currentGroup(): ECGroup {
        const group = this.groups.slice().pop();
        return group || this.parent;
    }

    private beginGroup(joinOperator: JoinOperator): ConditionBuilder {
        this.groups.push(new ECGroup(joinOperator));
        return this;
    }

    private endGroup(ejo: JoinOperator): ConditionBuilder {
        const group = this.groups.pop();
        if (group) {
            if (group.getEjo() !== ejo) {
                throw new Error("Closing group does not match the latest opened one");
            }
            this.currentGroup().add(group.build());
            return this;
        } else {
            throw new Error("There is no group on the stack");
        }
    }

    public or(): ConditionBuilder {
        return this.beginGroup("OR");
    }

    public endOr(): ConditionBuilder {
        return this.endGroup("OR");
    }

    public and(): ConditionBuilder {
        return this.beginGroup("AND");
    }

    public endAnd(): ConditionBuilder {
        return this.endGroup("AND");
    }

    public eq(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} = ?`, value);
    }

    public gt(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} > ?`, value);
    }

    public gtEq(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} >= ?`, value);
    }

    public lt(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} < ?`, value);
    }

    public ltEq(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} <= ?`, value);
    }

    public like(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} like ?`, value);
    }

    public contains(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} like ?`, `%${value}%`);
    }

    public startsWith(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} like ?`, `${value}%`);
    }

    public endsWith(field: string, value: any): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} like ?`, `%${value}`);
    }

    public in(field: string, value: Array<any>): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} in ?`, value);
    }

    public notIn(field: string, value: Array<any>): ConditionBuilder {
        this.queueForValidation(field, value, true);
        field = CaseUtil.camelToSnake(field);
        return this.appendCondition(`${field} not in ?`, value);
    }

    public setEntity(entityName: string): ConditionBuilder {
        if (typeof this.entityName === "undefined") {
            this.entityName = entityName;
            return this;
        } else {
            throw new Error("Cannot change the entity after initialisation.")
        }
    }

    public build(): string {
        if (this.groups.length > 0) {
            throw new Error("There are unclosed groups");
        }
        if (this.validateOnBuild) {
            for (const pair of this.validationPairs) {
                this.validatePairs(pair[0], pair[1], pair[2]);
            }
        }
        return this.parent.build();
    }
}

class ECGroup {
    private ejo: JoinOperator = "AND";
    private conditions: Array<string> = [];

    public constructor(joinOperator: JoinOperator) {
        this.ejo = joinOperator;
    }

    public add(condition: string) {
        this.conditions.push(condition);
    }

    public build(): string {
        return `(${this.conditions.join(` ${this.ejo} `)})`;
    }

    public getEjo(): JoinOperator {
        return this.ejo;
    }
}