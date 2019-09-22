import { SystemProperty } from '../core/entity/system_property';
import { DebugUtil } from './debug.util';
export abstract class LocalizationUtil {
    public static readonly moduleName: string = "LocalizationUtil";
    public static readonly localeSystemProperty: string = "default.locale";
    public static defaultLocale: Locale = "en_GB";

    public static assignDefaultLocale(): void {
        SystemProperty.create().find(this.localeSystemProperty)
        .then(systemProperty => {
            LocalizationUtil.defaultLocale = systemProperty.value || LocalizationUtil.defaultLocale;
        }).catch(err => {
            DebugUtil.logError(err, this.moduleName);
        });
    }
}

export type Locale = "en_GB" | "en_US"