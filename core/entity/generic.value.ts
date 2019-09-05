import DatabaseUtil from '../../utils/database.util';

export abstract class GenericValue {
    protected abstract readonly entity: string;
    protected abstract readonly primaryKeyField: string;
    protected abstract data?: any;
    private primaryFieldValue: any;

    protected constructor() { }

    public abstract find(id: any): any;
    public static create(): void { }

    protected doSelect(id: any, caseSensitive: boolean = true): Promise<any> {
        this.primaryFieldValue = id;
        return new Promise((resolve, reject) => {
            let whereClause = `${this.primaryKeyField} = ?`;
            if (!caseSensitive) {
                whereClause = `upper(${this.primaryKeyField}) = upper(?)`;
            }
            DatabaseUtil.transactPromise(`select * from ${this.entity} where ${whereClause} limit 1`, [this.primaryFieldValue])
            .then((data: any) => {
                if (data && data[0]) {
                    this.setData(data[0]);
                    resolve(this);
                } else {
                    reject(`"${this.entity}" record does not exist for ${this.primaryKeyField} = '${this.primaryFieldValue}'`);
                }
            }).catch(reject);
        })
    }

    protected doSelectAll(condition: string = "", inserts: any[] = []): Promise<any[]> {
        return GenericValue.doSelectAll(this.entity, condition, inserts);
    }

    protected static doSelectAll(entity: string, condition: string = "", inserts: any[] = []): Promise<any[]> {
        let whereClause = condition ? "where " + condition : "";
        return new Promise((resolve, reject) => {
            DatabaseUtil.transactPromise(`select * from ${entity} ${whereClause}`, inserts)
            .then((data: any) => {
                resolve(data);
            }).catch(reject);
        })
    }

    public setData(data: any): void {
        this.data = data;
    }

    public get(key: string): any {
        if (!this.data) throw new Error(`"${this.entity}" record not initialized`);
        return this.data[key];
    }

    public set(key: string, value: any): void {
        if (this.data) {
            this.data[key] = value;
        } else {
            throw new Error(`"${this.entity}" record not initialized`);
        }
    }

    public update(): Promise<Function> {
        return DatabaseUtil.transactPromise(`update ${this.entity} set ? where ${this.primaryKeyField} = ?`, [this.data, this.primaryFieldValue]);
    }

    public store(): Promise<Function> {
        return new Promise((resolve, reject) => {
            DatabaseUtil.transactPromise(`insert into ${this.entity} set ?`, [this.data])
            .then(resolve)
            .catch(err => {
                this.update().then(resolve).catch(reject);
            })
        })
    }
}