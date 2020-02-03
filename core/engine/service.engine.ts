import { DebugUtil } from '../../utils/debug.util';
import { CacheEngine } from './cache.engine';

export class ServiceEngine {
    private static readonly moduleName = "ServiceEngine";
    private static instance: ServiceEngine;
    private serviceStorage: ServiceStorage;

    private constructor() {
        this.serviceStorage = {};
    }

    private static getInstance() {
        if (!ServiceEngine.instance) {
            ServiceEngine.instance = new ServiceEngine();
        }
        return ServiceEngine.instance;
    }

    public static append(serviceStorage: ServiceStorage): void {
        for (let serviceName of Object.keys(serviceStorage)) {
            ServiceEngine.create(serviceName, serviceStorage[serviceName]);
        }
    }

    public static create(serviceName: string, definition: ServiceDefinition): void {
        definition.parameters = typeof definition.parameters !== "undefined" ? definition.parameters : [];
        definition.auth = typeof definition.auth !== "undefined" ? definition.auth : true;
        definition.maxRetries = typeof definition.maxRetries !== "undefined" ? definition.maxRetries : -1;
        definition.cache = typeof definition.cache !== "undefined" ? definition.cache : false;
        ServiceEngine.getInstance().serviceStorage[serviceName] = definition;
    }

    public static getService(): ServiceStorage;
    public static getService(serviceName: string): ServiceDefinition;
    public static getService(serviceName?: string): ServiceDefinition | ServiceStorage {
        if (typeof serviceName !== "undefined") {
            return ServiceEngine.getInstance().serviceStorage[serviceName];
        }
        return ServiceEngine.getInstance().serviceStorage;
    }

    public static run(serviceName: string): Promise<any>;
    public static run(serviceName: string, parameters: GenericObject): Promise<any>;
    public static run(serviceName: string, parameters: GenericObject, cache: boolean): Promise<any>;
    public static run(serviceName: string, parameters: GenericObject = {}, cache?: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            let service = this.getService(serviceName);
            let serviceStart = new Date().getTime();
            let runServiceFunction = ServiceEngine.runService;
            if (typeof cache !== "undefined" ? cache : service.cache) runServiceFunction = ServiceEngine.runServiceCache;
            let parameterList: Array<any> = ServiceEngine.validateInParameters(serviceName, parameters);
            runServiceFunction.apply(this, [serviceName, parameterList])
            .then((data: any) => {
                if (!data.cached) {
                    DebugUtil.logTiming(`Ran service ${serviceName}`, serviceStart, undefined, ServiceEngine.moduleName);
                }
                let outData = {};
                Object.assign(outData, data.data);
                ServiceEngine.validateOutParameters(serviceName, outData);
                resolve(data.data);
            }).catch(reject);
        });
    }

    private static runServiceCache(serviceName: string, parameters: Array<any>): Promise<any> {
        return new Promise((resolve, reject) => {
            let cacheName = serviceName;
            let parameterSubKey = CacheEngine.buildParameterSubKey(Object.values(parameters)) || "default";
            let cacheObject = CacheEngine.get("service", cacheName, parameterSubKey);
            if (typeof cacheObject !== "undefined") {
                cacheObject.value.cached = true;
                return resolve(cacheObject.value);
            }
            ServiceEngine.runService(serviceName, parameters).then(value => {
                CacheEngine.store("service", cacheName, value, parameterSubKey);
                value.cached = true;
                resolve(value);
            }).catch(reject);
        });
    }

    private static runService(serviceName: string, parameters: Array<any>): Promise<any> {
        return new Promise((resolve, reject) => {
            let service: ServiceDefinition = ServiceEngine.getInstance().serviceStorage[serviceName];
            if (service) {
                if (service.sync) {
                    resolve({
                        data: service.caller.apply(null, parameters),
                        cached: false
                    });
                } else {
                    service.caller.apply(null, parameters)
                    .then((data: any) => {
                        resolve({
                            data: data,
                            cached: false
                        })
                    }).catch(reject);
                }
            } else {
                reject(`Service '${serviceName}' not defined`);
            }
        });
    }

    private static validateInParameters(serviceName: string, parameters: GenericObject): Array<any> {
        let service = ServiceEngine.getService(serviceName);
        if (!service) {
            throw new Error(`Service '${serviceName}' does not exist.`);
        }
        let parameterList: Array<any> = [];
        for (let parameterDef of service.parameters!.filter(p => p.mode === "in" || p.mode === "inout")) {
            let parameter = parameters[parameterDef.name];
            if (typeof parameter === "undefined" && !parameterDef.optional) {
                throw new Error(`Missing [IN] parameter '${parameterDef.name}' for service '${serviceName}'`);
            }
            if (typeof parameter !== "undefined" && typeof parameter !== parameterDef.type) {
                throw new Error(`Type mismatch for [IN] parameter '${parameterDef.name}' for service '${serviceName}'. Expecting '${parameterDef.type}', instead got '${typeof parameter}'`)
            }
            parameterList.push(parameter);
            delete parameters[parameterDef.name];
        }
        if (Object.keys(parameters).length > 0) {
            throw new Error(`Unexpected [IN] parameter '${Object.keys(parameters)[0]}' for service '${serviceName}'`);
        }
        return parameterList;
    }

    private static validateOutParameters(serviceName: string, parameters: GenericObject): void {
        let service = ServiceEngine.getService(serviceName);
        for (let parameterDef of service.parameters!.filter(p => p.mode === "out" || p.mode === "inout")) {
            let parameter = parameters[parameterDef.name];
            if (typeof parameter === "undefined" && !parameterDef.optional) {
                throw new Error(`Missing [OUT] parameter '${parameterDef.name}' for service '${serviceName}'`);
            }
            if (typeof parameter !== "undefined" && typeof parameter !== parameterDef.type) {
                throw new Error(`Type mismatch for [OUT] parameter '${parameterDef.name}' for service '${serviceName}'. Expecting '${parameterDef.type}', instead got '${typeof parameter}'`)
            }
            delete parameters[parameterDef.name];
        }
        if (Object.keys(parameters).length > 0) {
            throw new Error(`Unexpected [OUT] parameter '${Object.keys(parameters)[0]}' for service '${serviceName}'`);
        }
    }
}

export interface ServiceStorage {
    [name: string]: ServiceDefinition
}

export interface ServiceDefinition {
    caller: Function,
    sync: boolean,
    maxRetries?: number,
    parameters?: Array<ServiceParameter>,
    auth?: boolean,
    cache?: boolean
}

export interface ServiceParameter {
    name: string,
    type: string,
    mode: "in" | "out" | "inout",
    optional?: boolean
}