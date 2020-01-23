import { DebugUtil } from './debug.util';
import { EntityQuery } from '../core/engine/entity/entity.query';
export abstract class LocalizationUtil {
    public static readonly moduleName: string = "LocalizationUtil";
    public static readonly localeSystemProperty: string = "default.locale";
    public static defaultLocale: Locale = "en_GB";

    public static assignDefaultLocale(): void {
        EntityQuery.from("SystemProperty").where(["systemPropertyId", this.localeSystemProperty]).queryFirst()
        .then(systemProperty => {
            LocalizationUtil.defaultLocale = systemProperty.get("value") || LocalizationUtil.defaultLocale;
        }).catch(err => {
            DebugUtil.logError(err, this.moduleName);
        });
    }
}

export type Locale = "en_GB" | "en_US"