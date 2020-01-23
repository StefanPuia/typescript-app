import { NextFunction, Request, Response } from 'express';
import sha256 from 'sha256';
import { BaseConfig } from '../config/base.config';
import { ExpressUtil } from './express.util';
import { ServiceUtil } from './service.util';
import { ConditionBuilder } from '../core/engine/entity/condition.builder';
import { EntityQuery } from '../core/engine/entity/entity.query';
import { GenericValue } from '../core/engine/entity/generic.value';

export abstract class SecurityUtil {
    public static hash(input: string): string {
        return sha256(input);
    }

    public static hashPassword(password: string): string {
        return this.hash(password + BaseConfig.passwordSalt);
    }

    /* TODO move this to the project */
    public static socialLogin(req:Request, res: Response, userData: GenericObject) {
        return new Promise((resolve, reject) => {
            const ecb = ConditionBuilder.create();
            if (userData.google_id) { ecb.eq("googleId", userData.google_id); }
            if (userData.discord_id) { ecb.eq("discordId", userData.discordId); }
            EntityQuery.from("UserLogin").where(ecb).queryList()
            .then(users => {
                if(users.length) {
                    req.session!.userLoginId = users[0].get("userLoginId");
                    req.session!.userName = users[0].get("name");
                    resolve();
                } else {
                    let userLogin = new GenericValue("UserLogin", userData)
                    userLogin.store().then((user: any) => {
                        req.session!.userLoginId = user.insertId;
                        req.session!.userName = userData.name;
                        resolve();
                    }).catch(reject);
                }
            }).catch(reject);
        })
    }

    public static userLoggedIn(req: Request): boolean {
        return req.session && req.session.userLoginId && req.session.cookie.expires > new Date();
    }

    public static ensureLogin(req: Request, res: Response, next: NextFunction) {
        if (SecurityUtil.userLoggedIn(req)) {
            next();
        } else {
            res.redirect(req.baseUrl + "/login");
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
}