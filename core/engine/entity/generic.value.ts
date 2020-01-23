import { DebugUtil } from '../../../utils/debug.util';
import { EntityEngine } from './entity.engine';
import { TypeEngine } from '../type.engine';

export class GenericValue {
    private static readonly moduleName = "GenericValue";
    private readonly entityName: string;
    private data: GenericObject;

    public constructor(entityName: string, data: GenericObject) {
        this.entityName = entityName;
        this.data = {};
        this.setData(data);
    }

    public create(): void { }

    public setData(data: any): void {
        if (data) {
            for (const field of Object.keys(data)) {
                EntityEngine.validateField(this.entityName, field);
                this.data[field] = data[field];
            }
        }
    }

    public get(field: string): any {
        EntityEngine.validateField(this.entityName, field);
        return this.data[field];
    }

    public set(field: string, value: any): void {
        EntityEngine.validateFieldValuePair(this.entityName, field, value);
        this.data[field] = value;
    }

    public insert(): Promise<any> {
        return EntityEngine.insert(this.entityName, [this]);
    }

    public update(): Promise<any> {
        return EntityEngine.update(this.entityName, [this]);
    }

    public store(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.insert()
            .then(resolve)
            .catch(err => {
                DebugUtil.logWarning(err, GenericValue.moduleName);
                this.update().then(resolve).catch(reject);
            })
        })
    }
}