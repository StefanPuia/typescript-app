import { DebugUtil } from '../../../utils/debug.util';
import { EntityEngine } from './entity.engine';
import { DynamicEntity } from './dynamic.entity';

export class GenericValue {
    private static readonly moduleName = "GenericValue";
    private readonly entity: string | DynamicEntity;
    private data: GenericObject;

    public constructor(entityName: string | DynamicEntity, data: GenericObject) {
        this.entity = entityName;
        this.data = {};
        this.setData(data);
    }

    public setData(data: any): void {
        if (data) {
            for (const field of Object.keys(data)) {
                EntityEngine.validateField(this.entity, field);
                this.data[field] = data[field];
            }
        }
    }

    public getEntity() {
        return this.entity;
    }

    public get(field: string): any {
        EntityEngine.validateField(this.entity, field);
        return this.data[field];
    }

    public getData(): GenericObject {
        return this.data;
    }

    public set(field: string, value: any): void {
        EntityEngine.validateFieldValuePair(this.entity, field, value);
        this.data[field] = value;
    }

    public insert(): Promise<any> {
        if (this.entity instanceof DynamicEntity) {
            throw new Error(`Insert method not available for dynamic entities.`);
        }
        return EntityEngine.insert([this]);
    }

    public update(): Promise<any> {
        if (this.entity instanceof DynamicEntity) {
            throw new Error(`Update method not available for dynamic entities.`);
        }
        return EntityEngine.update([this]);
    }

    public delete(): Promise<any> {
        if (this.entity instanceof DynamicEntity) {
            throw new Error(`Delete method not available for dynamic entities.`);
        }
        return EntityEngine.delete([this]);
    }

    public store(): Promise<any> {
        if (this.entity instanceof DynamicEntity) {
            throw new Error(`Store method not available for dynamic entities.`);
        }
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