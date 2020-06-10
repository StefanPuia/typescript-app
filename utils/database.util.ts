import { DebugUtil } from './debug.util';
import { EntityEngine } from '../core/engine/entity/entity.engine';
import { ConnectionConfig } from 'mysql';
import fs from 'fs';
import path from 'path';

export abstract class DatabaseUtil {
    public static init(databaseConfig: ConnectionConfig, databaseFormatMode: number, 
            entityDefinitions: Array<EntityDefinition>, afterInit: Function = () => {}): void {
        EntityEngine.initSettings(databaseConfig, entityDefinitions, databaseFormatMode, async () => {
            if (databaseFormatMode === EntityEngine.MODE.REBUILD) {
                try {
                    const seedData = fs.readFileSync(path.join(__dirname, "../seed-data.sql"), "utf-8");
                    await EntityEngine.execute(seedData);
                    DebugUtil.logInfo("Seed data loaded", "DatabaseUtil.init");
                } catch (err) {
                    DebugUtil.logError(err, "DatabaseUtil.init");
                }
            }
            afterInit();
        });
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