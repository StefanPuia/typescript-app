export abstract class TypeEngine {
    public static convert(value: any, toType: string): any;
    public static convert(value: any, toType: string, nullCheck: boolean): any;
    public static convert(value: any, toType: string, nullCheck: boolean = false): any {
        const converter = new Converter(value, nullCheck);
        switch (toType) {
            case "boolean":
                return converter.toBoolean();

            case "number":
                return converter.toNumber();

            case "object":
            case "GenericObject":
                return converter.toGenericObject();

            case "string":
            default:
                return converter.toString();
        }
    }
}

export class Converter {
    private value: any;
    private nullCheck: boolean;

    constructor(value: any);
    constructor(value: any, nullCheck: boolean);
    constructor(value: any, nullCheck: boolean = false) {
        this.value = value;
        this.nullCheck = nullCheck;
    }

    private isNull(): boolean {
        if (typeof this.value === "string" && this.value === "") {
            return true;
        }
        return false;
    }

    public toString(): string | undefined {
        if (this.nullCheck && this.isNull()) return undefined;
        return new String(this.value).valueOf();
    }

    public toBoolean(): boolean | undefined {
        if (this.nullCheck && this.isNull()) return undefined;
        if (typeof this.value === "string") {
            if (["true", "false"].indexOf(this.value) > -1) {
                return this.value === "true";
            }
            throw new Error(`'${this.value}' cannot be converted into a boolean`);
        }
        return new Boolean(this.value).valueOf();
    }

    public toNumber(): number | undefined {
        if (this.nullCheck && this.isNull()) return undefined;
        if (typeof this.value === "string") {
            let intValue = parseInt(this.value);
            if (!isNaN(intValue)) {
                return intValue;
            } else {
                throw new Error(`'${this.value}' cannot be converted into a number`);
            }
        }
        return new Number(this.value).valueOf();
    }

    public toGenericObject(): GenericObject | undefined {
        if (this.nullCheck && this.isNull()) return undefined;
        let temp: GenericObject = {};
        if (typeof this.value === typeof temp) {
            return <GenericObject>this.value;
        }
        if (typeof this.value === "string") {
            if (this.value !== "") {
                let parsed = JSON.parse(this.value);
                if (typeof parsed !== "object") {
                    throw new Error(`'${this.value}' cannot be converted into a GenericObject`);
                }
                Object.assign(temp, parsed);
                return temp;
            }
            throw new Error(`An empty string cannot be converted into a GenericObject`);
        }
        throw new Error(`'${this.value}' cannot be converted into a GenericObject`);
    }
}