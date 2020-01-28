import { ServiceStorage } from '../engine/service.engine';
import { ConditionBuilder } from '../engine/entity/condition.builder';
import { EntityQuery } from '../engine/entity/entity.query';
import { GenericValue } from '../engine/entity/generic.value';

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
    },
    "CreateUserLogin": {
        "sync": false,
        "cache": false,
        "caller": (userName: string, fullName: string, password: string, picture: string) => {
            return new Promise((resolve, reject) => {
                new GenericValue("UserLogin", {
                    userName: userName,
                    fullName: fullName,
                    password: password,
                    picture: picture
                }).insert().then(insertId => {
                    resolve({ userLoginId: insertId })
                }).catch(reject);
            })
        },
        "parameters": [{
            "name": "userName",
            "mode": "in",
            "type": "string",
            "optional": true
        }, {
            "name": "fullName",
            "mode": "in",
            "type": "string",
            "optional": true
        }, {
            "name": "password",
            "mode": "in",
            "type": "string",
            "optional": true
        }, {
            "name": "picture",
            "mode": "in",
            "type": "string",
            "optional": true
        },{
            "name": "userLoginId",
            "mode": "out",
            "type": "number"
        }]
    }
};

export { SecurityServices };
