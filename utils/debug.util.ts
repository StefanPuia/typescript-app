import dateFormat from 'dateformat';
import { BaseConfig } from '../config/base.config';
import { BaseUtil } from './base.util';

export abstract class DebugUtil {
    public static readonly TIMING: number = 0;
    public static readonly DEBUG: number = 1;
    public static readonly INFO: number = 2;
    public static readonly WARNING: number = 3;
    public static readonly ERROR: number = 4;
    public static readonly FATAL: number = 5;

    public static logTiming(message: any, timeStart: number, timeEnd: number = new Date().getTime(), errModule?: string, path?: string): void {
        if (BaseConfig.logLevel <= this.TIMING) DebugUtil.log(message + ` (${timeEnd - timeStart}ms)`, 'TIMING', errModule, path);
    }

    public static logDebug(message: any, errModule?: string, path?: string): void {
        if (BaseConfig.logLevel <= this.DEBUG) DebugUtil.log(message, 'DEBUG', errModule, path);
    }

    public static logInfo(message: any, errModule?: string, path?: string): void {
        if (BaseConfig.logLevel <= this.INFO) DebugUtil.log(message, 'INFO', errModule, path);
    }

    public static logWarning(message: any, errModule?: string, path?: string): void {
        if (BaseConfig.logLevel <= this.WARNING) DebugUtil.log(message, 'WARNING', errModule, path);
    }

    public static logError(message: any, errModule?: string, path?: string): void {
        if (BaseConfig.logLevel <= this.ERROR) DebugUtil.log(message, 'ERROR', errModule, path, true);
    }

    public static logFatal(message: any, errModule?: string, path?: string): void {
        if (BaseConfig.logLevel <= this.FATAL) DebugUtil.log(message, 'FATAL', errModule, path, true);
    }

    private static log(message: any = '', type: string = 'DEBUG', errModule: string = 'NoModule', path: string = '', trace: boolean = false): void {
        console.log(DebugUtil.formatLogText(message, type, errModule, path));
        if (trace) {
            console.trace(message);
        }
    }

    public static formatLogText(message: any = '', type: string = 'DEBUG', errModule: string = 'NoModule', path: string = ''): string {
        errModule = errModule.length > 25 ? errModule.split('.').pop() || errModule : errModule;
        errModule = errModule.length > 25 ? errModule.substr(-25) : errModule;
        errModule = errModule + ' '.repeat(25).substr(0, 25 - errModule.length);
        type = type + ' '.repeat(10).substr(0, 10 - type.length);
        return `${dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss')} | ${type} | ${errModule} | ${path ? path + ' ' : ''}${BaseUtil.stringify(message)}`;
    }
}