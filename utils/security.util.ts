import { NextFunction, Request, Response } from 'express';
import sha256 from 'sha256';
import { BaseConfig } from '../config/base.config';
import { ExpressUtil } from './express.util';
import { ServiceUtil } from './service.util';
import { ConditionBuilder } from '../core/engine/entity/condition.builder';
import { EntityQuery } from '../core/engine/entity/entity.query';
import { GenericValue } from '../core/engine/entity/generic.value';
import { EntityDynamicQuery } from '../core/engine/entity/entity.dynamic.query';

export abstract class SecurityUtil {
    public static hash(input: string): string {
        return sha256(input);
    }

    public static hashPassword(password: string): string {
        return this.hash(password + BaseConfig.passwordSalt);
    }

    public static userLoggedIn(req: Request): boolean {
        return req.session && req.session.userLoginId && req.session.cookie.expires > new Date();
    }

    public static ensureLogin(req: Request, res: Response, next: NextFunction) {
        if (SecurityUtil.userLoggedIn(req)) {
            next();
        } else {
            res.redirect(req.baseUrl + "/login?r=" + encodeURIComponent(req.baseUrl + req.url));
        }
    }

    public static sessionHasPermission(sessionUser: string, permissionId: string) {
        return new Promise((resolve, reject) => {
            if (!sessionUser) {
                resolve(false);
            } else {
                SecurityUtil.userLoginHasPermission(sessionUser, permissionId).then(resolve).catch(reject);
            }
        })
    }

    public static userHasPermission(user: GenericValue, permissionId: string) {
        return SecurityUtil.userLoginHasPermission(user.get("userLoginId"), permissionId);
    }

    public static userLoginHasPermission(userLoginId: string, permissionId: string) {
        return new Promise((resolve, reject) => {
            ServiceUtil.runSync("UserHasPermission", {
                userLoginId: userLoginId,
                permissionId: permissionId
            }, true).then(data => {
                resolve(data.hasPermission);
            }).catch(reject);
        })
    }

    public static ensureSuperUser(req: Request, res: Response, next: NextFunction) {
        SecurityUtil.sessionHasPermission(req.session!.userLoginId, "SUPER_ADMIN")
        .then(hasPermission => {
            if (hasPermission) {
                next();
            } else {
                ExpressUtil.renderGenericError(req, res, "You are not allowed to view this screen");
            }
        }).catch(err => {
            ExpressUtil.renderGenericError(req, res, err);
        });
    }

    public static ensurePermission(permissionId: string) {
        return (req: Request, res: Response, next: NextFunction) => {
            SecurityUtil.sessionHasPermission(req.session!.userLoginId, permissionId)
            .then(hasPermission => {
                if (hasPermission) {
                    next();
                } else {
                    ExpressUtil.renderGenericError(req, res, "You are not allowed to view this screen");
                }
            }).catch(err => {
                ExpressUtil.renderGenericError(req, res, err);
            });
        }
    }

    public static socialLogin(req:Request, res: Response, userData: GenericObject) {
        return new Promise((resolve, reject) => {
            const ecb = ConditionBuilder.create()
                .eq("OA.provider", userData.provider)
                .eq("OA.id", userData.socialId)
            
            EntityDynamicQuery.select("UL.*", "OA.*")
                .from("UL", "UserLogin")
                .innerJoin("OA", "Oauth", "userLoginId", "UL.userLoginId")
                .where(ecb).queryFirst()
            .then(user => {
                if(user) {
                    req.session!.userLoginId = user.get("userLoginId");
                    req.session!.userName = user.get("fullName") || user.get("userName");
                    resolve();
                } else {
                    const userLogin = new GenericValue("UserLogin", {
                        fullName: userData.name,
                        userName: userData.userName || "",
                        picture: userData.picture
                    })
                    userLogin.insert().then(userLoginId => {
                        const oauth = new GenericValue("Oauth", {
                            userLoginId: userLoginId,
                            provider: userData.provider,
                            id: userData.socialId
                        })
                        oauth.insert().then(() => {
                            req.session!.userLoginId = userLoginId;
                            req.session!.userName = userData.name;
                            resolve();
                        }).catch(reject);
                    }).catch(reject);
                }
            }).catch(reject);
        })
    }
}