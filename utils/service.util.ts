import { ServiceDefinition, ServiceEngine } from '../core/engine/service.engine';
import { TypeEngine } from '../core/engine/type.engine';
import { DebugUtil } from './debug.util';
export abstract class ServiceUtil {
    private static readonly moduleName = "ServiceUtil";

    public static runSync(serviceName: string): Promise<any>;
    public static runSync(serviceName: string, parameters: GenericObject): Promise<any>;
    public static runSync(serviceName: string, parameters: GenericObject, cache: boolean): Promise<any>;
    public static runSync(serviceName: string, parameters: GenericObject = {}, cache: boolean = false): Promise<any> {
        return ServiceEngine.run(serviceName, parameters, cache);
    }

    public static runAsync(serviceName: string): void;
    public static runAsync(serviceName: string, parameters: GenericObject): void;
    public static runAsync(serviceName: string, parameters: GenericObject, cache: boolean): void;
    public static runAsync(serviceName: string, parameters: GenericObject = {}, cache: boolean = false): void {
        ServiceEngine.run(serviceName, parameters, cache)
        .catch(err => {
            DebugUtil.logError(err, ServiceUtil.moduleName);
        });
    }

    public static validParameters(serviceName: string, parameters: GenericObject): GenericObject {
        const validParameters: GenericObject = {};
        const serviceDefinition: ServiceDefinition = ServiceEngine.getService(serviceName);
        for (let parameterDef of serviceDefinition.parameters!.filter(p => p.mode === "in" || p.mode === "inout")) {
            validParameters[parameterDef.name] = TypeEngine.convert(parameters[parameterDef.name], parameterDef.type, true);
        }
        return validParameters;
    }
}