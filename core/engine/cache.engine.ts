import sha256 from 'sha256';

export class CacheEngine {
    private static instance: CacheEngine;
    private static ttl: number = 1000 * 60 * 10;
    private static checkPeriod: number = 1000 * 30;
    private static deleteOnExpire: boolean = true;
    private storage: CacheStorage;
    private interval: NodeJS.Timeout;

    private constructor() {
        this.storage = {
            service: {},
            entity: {},
            method: {},
            generic: {}
        }
        this.interval = setInterval(this.cleanup, CacheEngine.checkPeriod);
    }

    private restartCleanupInterval() {
        clearInterval(this.interval);
        this.interval = setInterval(this.cleanup, CacheEngine.checkPeriod);
    }

    private cleanup(): void {
        const now = new Date().getTime();
        let typeGroup: CacheType;
        for (typeGroup in this.storage) {
            let cacheTypeGroup: GenericCache = this.storage[typeGroup];
            for (let key of Object.keys(cacheTypeGroup)) {
                let cacheGroup = cacheTypeGroup[key];
                for (let subKey of Object.keys(cacheGroup)) {
                    const cache = cacheGroup[subKey];
                    const expired = cache.expires < now;
                    const deleteCache = typeof cache.doe !== "undefined" ? cache.doe : CacheEngine.deleteOnExpire;
                    if (expired && deleteCache) {
                        delete cacheGroup[subKey];
                    }
                }
            }
        }
    }

    private static getInstance() {
        if (!CacheEngine.instance) {
            CacheEngine.instance = new CacheEngine();
        }
        return CacheEngine.instance;
    }

    public static setDefaultTTL(ttl: number) {
        CacheEngine.ttl = ttl;
    }

    public static setDefaultCheckPeriod(checkPeriod: number) {
        CacheEngine.checkPeriod = checkPeriod;
        CacheEngine.getInstance().restartCleanupInterval();
    }

    public static setDefaultDeleteOnExpire(deleteOnExpire: boolean) {
        CacheEngine.deleteOnExpire = deleteOnExpire;
    }

    public static store(type: CacheType, key: string, value: any, subKey: string = "default", ttl?: number, deleteOnExpire?: boolean): void {
        const cache: CacheObject = {
            value: value,
            expires: new Date().getTime() + (typeof ttl !== "undefined" ? ttl : CacheEngine.ttl)
        }
        if (typeof deleteOnExpire !== "undefined") cache.doe = deleteOnExpire;
        if (typeof CacheEngine.getInstance().storage[type][key] === "undefined") {
            CacheEngine.getInstance().storage[type][key] = {};
        }
        CacheEngine.getInstance().storage[type][key][subKey] = cache;
    }

    public static get(): CacheStorage;
    public static get(type: CacheType): GenericCache;
    public static get(type: CacheType, key: string): SubCache;
    public static get(type: CacheType, key: string, subKey: string): CacheObject;
    public static get(type?: CacheType, key?: string, subKey?: string): CacheStorage | GenericCache | SubCache | CacheObject | undefined {
        if (typeof type !== "undefined") {
            if (typeof key !== "undefined") {
                if (typeof subKey !== "undefined") {
                    if (typeof CacheEngine.getInstance().storage[type][key] === "undefined") {
                        return undefined;
                    }
                    let cacheObject: CacheObject =  CacheEngine.getInstance().storage[type][key][subKey];
                    if (cacheObject && cacheObject.expires < new Date().getTime()) {
                        return undefined;
                    }
                    return cacheObject;
                }
                return CacheEngine.getInstance().storage[type][key];
            }
            return CacheEngine.getInstance().storage[type];
        }
        return CacheEngine.getInstance().storage;
    }

    public static clear(): void;
    public static clear(type: CacheType): void;
    public static clear(type: CacheType, key: string): void;
    public static clear(type: CacheType, key: string, subKey: string): void;
    public static clear(type?: CacheType, key?: string, subKey?: string): void {
        if (typeof type !== "undefined") {
            if (typeof key !== "undefined") {
                if (typeof subKey !== "undefined") {
                    delete CacheEngine.getInstance().storage[type][key][subKey];
                } else {
                    for (let cacheSubKey in CacheEngine.getInstance().storage[type][key]) {
                        delete CacheEngine.getInstance().storage[type][key][cacheSubKey];
                    }
                }
            } else {
                for (let cacheKey in CacheEngine.getInstance().storage[type]) {
                    CacheEngine.clear(type, cacheKey);
                }
            }
        } else {
            let cacheType: CacheType;
            for (cacheType in CacheEngine.getInstance().storage) {
                CacheEngine.clear(cacheType);
            }
        }
    }

    public static buildParameterSubKey(parameters: Array<any> = []): string {
        let stringList: Array<string> = [];
        for (let parameter of parameters) {
            if (typeof parameter === "string") {
                stringList.push(parameter);
            } else if (parameter.hasOwnProperty("toString")) {
                stringList.push(parameter.toString());
            } else {
                stringList.push(JSON.stringify(parameter));
            }
        }
        return sha256(stringList.join(" "));
    }
}

export type CacheType = "service" | "entity" | "method" | "generic";
export type CacheStorage = {
    [type in CacheType]: GenericCache;
};
export interface GenericCache {
    [key: string]: SubCache
};
export interface SubCache {
    [subKey: string]: CacheObject
};
export interface CacheObject {
    value: any,
    expires: number,
    doe?: boolean
};