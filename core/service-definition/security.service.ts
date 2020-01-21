import { ServiceStorage } from '../engine/service.engine';
import { ConditionBuilder } from '../engine/entity/condition.builder';
import { EntityQuery } from '../engine/entity/entity.query';

const SecurityServices: ServiceStorage = {
    "UserHasPermission": {
        "sync": false,
        "caller": (userLoginId: string, permissionId: string) => {
            return new Promise((resolve, reject) => {
                const ecb = ConditionBuilder.create()
                    .eq("userLoginId", userLoginId)
                    .eq("permissionId", permissionId);

                EntityQuery.from("UserLoginSecurityGroupPermission").where(ecb).queryFirst()
                    .then(ulsgp => { resolve({ hasPermission: !!ulsgp }) }).catch(reject);
            })
        },
        "parameters": [{
            "name": "userLoginId",
            "mode": "in",
            "type": "number"
        }, {
            "name": "permissionId",
            "mode": "in",
            "type": "string"
        }, {
            "name": "hasPermission",
            "mode": "out",
            "type": "boolean",
            "optional": false
        }]
    }
};

export { SecurityServices };
