import { ServiceStorage } from '../engine/service.engine';
import { UserLoginSecurityGroupPermission } from '../entity-definition/view-entity/user_login.security_group_permission';

const SecurityServices: ServiceStorage = {
    "UserHasPermission": {
        "sync": false,
        "caller": (userLoginId: string, permissionId: string) => {
            return new Promise((resolve, reject) => {
                UserLoginSecurityGroupPermission.find("UL.user_login_id = ? AND PE.permission_id = ?",
                    [userLoginId, permissionId]).then(ulsgp => {
                        let hasPermission: boolean = (ulsgp && ulsgp.length !== 0);
                        resolve({
                            hasPermission: hasPermission
                        });
                    }).catch(reject);
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
