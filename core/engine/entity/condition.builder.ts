import { GenericValue } from './generic.value';
import { EntityEngine } from './entity.engine';
import { TypeEngine } from '../type.engine';

export class ConditionBuilder {
    private entityName: string;
    private parent: ECGroup;
    private groups: Array<ECGroup> = [];

    private constructor(entityName: string, joinOperator: JoinOperator) {
        this.entityName = entityName;
        this.parent = new ECGroup(joinOperator);

        const definition = EntityEngine.getEntityDefinition(this.entityName);
        if (!definition) {
            throw new Error(`Entity '${this.entityName}' is not defined.`);
        }
    }

    private appendCondition(condition: string, value: any): ConditionBuilder {
        this.currentGroup().add(EntityEngine.makeCondition([{
            clause: condition,
            inserts: [value]
        }]));
        return this;
    }

    private validatePairs(field: string, value: any, nullCheck: boolean = false) {
        const fieldDefinition = EntityEngine.validateField(this.entityName, field);
        TypeEngine.convert(value, fieldDefinition.type, nullCheck);
    }

    public static create(entityName: string): ConditionBuilder;
    public static create(entityName: string, joinOperator: JoinOperator): ConditionBuilder;
    public static create(entityName: string, joinOperator: JoinOperator = "AND"): ConditionBuilder {
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
        this.validatePairs(field, value, true);
        return this.appendCondition(`${field} = ?`, value);
    }

    public gt(field: string, value: any): ConditionBuilder {
        this.validatePairs(field, value, true);
        return this.appendCondition(`${field} > ?`, value);
    }

    public gtEq(field: string, value: any): ConditionBuilder {
        this.validatePairs(field, value, true);
        return this.appendCondition(`${field} >= ?`, value);
    }

    public lt(field: string, value: any): ConditionBuilder {
        this.validatePairs(field, value, true);
        return this.appendCondition(`${field} < ?`, value);
    }

    public ltEq(field: string, value: any): ConditionBuilder {
        this.validatePairs(field, value, true);
        return this.appendCondition(`${field} <= ?`, value);
    }

    public build(): string {
        if (this.groups.length > 0) {
            throw new Error("There are unclosed groups");
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