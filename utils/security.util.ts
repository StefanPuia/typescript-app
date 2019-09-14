import { NextFunction, Request, Response } from 'express';
import sha256 from 'sha256';
import { BaseConfig } from '../config/base.config';
import { UserLogin } from '../core/entity/user_login';
import { ExpressUtil } from './express.util';
import { UserLoginSecurityGroupPermission } from '../core/view-entity/user_login.security_group_permission';

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

    public static userHasPermission(user: UserLogin, permissionId: string) {
        return SecurityUtil.userLoginHasPermission(user.userLoginId, permissionId);
    }

    public static userLoginHasPermission(userLoginId: string, permissionId: string) {
        return new Promise((resolve, reject) => {
            UserLoginSecurityGroupPermission.find("UL.user_login_id = ? AND PE.permission_id = ?" , 
                    [userLoginId, permissionId], true).then(results => {
                resolve((results.length !== 0));
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