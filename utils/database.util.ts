import { DebugUtil } from './debug.util';
import { EntityEngine } from '../core/engine/entity.engine';

export abstract class DatabaseUtil {
    public static init(databaseConfig: DatabaseConnection, databaseFormatMode: number, 
            entityDefinitions: Array<EntityDefinition>, afterInit: Function = () => {}): void {
        EntityEngine.initSettings(databaseConfig, entityDefinitions, databaseFormatMode, afterInit);
    }

    public static transactPromise(query: string): Promise<Function>;
    public static transactPromise(query: string, inserts: Array<any>): Promise<Function>;
    public static transactPromise(query: string, inserts: Array<any>, cache: boolean): Promise<Function>;
    public static transactPromise(query: string = '', inserts: Array<any> = [], cache: boolean = false): Promise<Function> {
        return new Promise((resolve, reject) => {
            this.transact(query, inserts, reject, resolve, cache);
        })
    }

    public static transact(query: string): void;
    public static transact(query: string, inserts: Array<any>): void;
    public static transact(query: string, inserts: Array<any>, reject: Function, resolve: Function): void;
    public static transact(query: string, inserts: Array<any>, reject: Function, resolve: Function, cache: boolean): void;
    public static transact(query: string = '', inserts: Array<any> = [], reject: Function = DebugUtil.logInfo,
            resolve: Function = DebugUtil.logError, cache: boolean = false): void {
        EntityEngine.transact(query, inserts, reject, resolve, cache);
    }
}