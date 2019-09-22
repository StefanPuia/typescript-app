import { Locale } from './localization.util';
export abstract class LabelUtil {
    private static labelStorage: LabelStorage = {};

    public static get(key: string, locale?: Locale) {
        let label = LabelUtil.labelStorage[key];
        let localized = (label && label.value[locale || "en_GB"]) ? label.value[locale || "en_GB"] : key;
        return localized;
    }

    public static set(label: Label) {
        this.labelStorage[label.key] = label;
    }

    public static append(labels: Array<Label> | LabelStorage) {
        if (labels instanceof Array) {
            for (let label of labels) {
                this.labelStorage[label.key] = label;
            }
        } else {
            Object.assign(this.labelStorage, labels);
        }
    }
}

export type Label = {
    key: string,
    value: {
        [locale in Locale]?: string
    }
}

export type LabelStorage = {
    [key: string]: Label
}