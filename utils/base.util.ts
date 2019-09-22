import { Request, Response } from 'express';
import { BaseConfig } from '../config/base.config';
import { DebugUtil } from './debug.util';
import morgan = require('morgan');

export abstract class BaseUtil {
    public static stringify(value: any): string {
        if (typeof value === 'string') {
            return value;
        }
        else if (value instanceof Error) {
            return value.message;
        }
        try {
            return JSON.stringify(value);
        } catch(e) {
            return value.toString();
        }
    }

    public static groupBy(array: Array<GenericObject>, field: string, groupname: string = field, keep: Array<string> = []): Array<GenericObject> {
        let result: Array<GenericObject> = [];
        array.forEach(el => {
            let temp = Object.assign({}, el);

            let found = -1;
            for (let i = 0; i < result.length; i++) {
                if (result[i][field] == el[field]) {
                    found = i;
                    break;
                }
            }

            if (found != -1) {
                keep.forEach(k => {
                    delete temp[k];
                })
                delete temp[field];

                let group: GenericObject = {};
                for (let key in temp) {
                    group[key] = temp[key];
                }
                result[found][groupname].push(group);
            } else {
                let n: GenericObject = {};
                n[field] = el[field];
                keep.forEach(k => {
                    n[k] = el[k];
                    delete temp[k];
                })
                delete temp[field];
                let group: GenericObject = {};
                for (let key in temp) {
                    group[key] = temp[key];
                }
                n[groupname] = [group];
                result.push(n);
            }
        })

        return result;
    }

    public static queuePromises(functions: Array<Function>, thisArg: any, args: Array<any> = []) {
        return new Promise((resolve, reject) => {
            let promiseFactories: Array<Function> = [];
            let results: Array<any> = [];

            for (let i = 0; i < functions.length; i++) {
                promiseFactories.push(() => {
                    return new Promise((resolve, reject) => {
                        functions[i].call(thisArg, args[i] || []).then((r: any) => {
                            results.push(r);
                            resolve();
                        }).catch(reject);
                    })
                });
            }

            let loop = () => {
                return new Promise((resolve, reject) => {
                    let current = promiseFactories.shift();
                    if (current) {
                        current().then(() => {
                            loop().then(resolve).catch(reject);
                        }).catch(reject);
                    } else {
                        resolve();
                    }
                })
            }
            loop().then(() => {
                resolve(results);
            }).catch(reject);
        });
    }

    public static morgan(tokens: morgan.TokenIndexer, req: Request, res: Response) {
        return DebugUtil.formatLogText([
            tokens.url(req, res),
            tokens.method(req, res),
            tokens.status(req, res),
            `[${req.ip || req.ip || (req.connection && req.connection.remoteAddress) || "0.0.0.0"}]`
        ].join(' '), "INFO", "Request");
    }

    public static morganSkip(req: Request, res: Response) {
        let ignore = ['/framework/static'].concat(BaseConfig.morganExtraIgnore);
        for (let url of ignore) {
            if (req.baseUrl && req.baseUrl.toLowerCase().indexOf(url.toLowerCase()) == 0) {
                return true;
            }
        }
        return false;
    }

    public static sizeOf(object: any) {
        let objectList: Array<any> = [];
        let stack: Array<any> = [object];
        let bytes: number = 0;

        while (stack.length) {
            let value: any = stack.pop();
            if (typeof value === 'boolean') {
                bytes += 4;
            } else if (typeof value === 'string') {
                bytes += value.length * 2;
            } else if (typeof value === 'number') {
                bytes += 8;
            } else if (typeof value === 'object' && objectList.indexOf(value) === -1 ) {
                objectList.push(value);
                for (let i in value) {
                    stack.push(value[i]);
                }
            }
        }
        return BaseUtil.compactSize(bytes);
    }

    public static compactSize(size: number) {
        let output = "";

        if (size > Math.pow(10, 9)) {
            output += size / Math.pow(10, 9) + "GB ";
            size = size % Math.pow(10, 9);
        }
        if (size > Math.pow(10, 6)) {
            output += size / Math.pow(10, 6) + "MB ";
            size = size % Math.pow(10, 6);
        }
        if (size > Math.pow(10, 3)) {
            output += size / Math.pow(10, 3) + "KB ";
            size = size % Math.pow(10, 3);
        }
        output += size + 'B';
        return output;
    }
}