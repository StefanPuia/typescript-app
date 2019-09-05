export default abstract class BaseUtil {
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
}