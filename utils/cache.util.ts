import { CacheEngine, CacheType } from '../core/engine/cache.engine';
import { DatabaseUtil } from './database.util';

export abstract class CacheUtil {
    public static run(type: CacheType, key: string, value: any, subKey: string = "default", ttl?: number, deleteOnExpire?: boolean): any {
        let cacheObject = CacheEngine.get(type, key, subKey);
        if (typeof cacheObject !== "undefined") {
            return cacheObject;
        }
        CacheEngine.store(type, key, value, subKey, ttl, deleteOnExpire);
        return value;
    }

    public static runMethod(method: Function, parameters: Array<any>): Promise<any>;
    public static runMethod(method: Function, parameters: Array<any>, overrideName: string): Promise<any>;
    public static runMethod(method: Function, parameters: Array<any>, overrideName: string, ttl: number): Promise<any>;
    public static runMethod(method: Function, parameters: Array<any>, overrideName: string, ttl: number, deleteOnExpire: boolean): Promise<any>;
    public static runMethod(method: Function, parameters: Array<any> = [], overrideName?: string, ttl?: number, deleteOnExpire?: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            let methodName = overrideName || method.name || "anonymous";
            let parameterSubKey = CacheEngine.buildParameterSubKey(parameters) || "default";
            let cacheObject = CacheEngine.get("method", methodName, parameterSubKey);
            if (typeof cacheObject !== "undefined") {
                return resolve(cacheObject.value);
            }
            let returnValue = method.apply(null, parameters);
            if (returnValue instanceof Promise) {
                returnValue.then(value => {
                    CacheEngine.store("method", methodName, value, parameterSubKey, ttl, deleteOnExpire);
                    resolve(returnValue);
                }).catch(reject);
            } else {
                CacheEngine.store("method", methodName, returnValue, parameterSubKey, ttl, deleteOnExpire);
            };
        });
    }

    public static runEntityQuery(sql: string): Promise<any>
    public static runEntityQuery(sql: string, inserts: Array<any>): Promise<any>
    public static runEntityQuery(sql: string, inserts: Array<any>, overrideName: string): Promise<any>
    public static runEntityQuery(sql: string, inserts: Array<any>, overrideName: string, ttl: number): Promise<any>
    public static runEntityQuery(sql: string, inserts: Array<any>, overrideName: string, ttl: number, deleteOnExpire: boolean): Promise<any>
    public static runEntityQuery(sql: string, inserts: Array<any> = [], overrideName?: string, ttl?: number, deleteOnExpire?: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            let cacheName = overrideName || CacheEngine.buildParameterSubKey([sql]) || "anonymous";
            let parameterSubKey = CacheEngine.buildParameterSubKey(inserts) || "default";
            let cacheObject = CacheEngine.get("entity", cacheName, parameterSubKey);
            if (typeof cacheObject !== "undefined") {
                return resolve(cacheObject.value);
            }
            DatabaseUtil.transactPromise(sql, inserts).then(value => {
                CacheEngine.store("entity", cacheName, value, parameterSubKey, ttl, deleteOnExpire);
                resolve(value);
            }).catch(reject);
        });
    }
}