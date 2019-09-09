import { NextFunction, Request, Response } from 'express';
import sha256 from 'sha256';
import { BaseConfig } from '../config/base.config';
import { UserLogin } from '../core/entity/user_login';
import { CacheUtil } from './cache.util';
import { ExpressUtil } from './express.util';

export abstract class SecurityUtil {
    public static hash(input: string): string {
        return sha256(input);
    }

    public static hashPassword(password: string): string {
        return this.hash(password + BaseConfig.passwordSalt);
    }

    public static userLoggedIn(req: Request): boolean {
        return req.session && req.session.user && req.session.cookie.expires > new Date();
    }

    public static ensureLogin(req: Request, res: Response, next: NextFunction) {
        if (SecurityUtil.userLoggedIn(req)) {
            next();
        } else {
            res.redirect(req.baseUrl + "/login");
        }
    }

    public static sessionHasPermission(sessionUser: GenericObject, permissionId: string) {
        return SecurityUtil.userLoginHasPermission(sessionUser.data.user_login_id, permissionId);
    }

    public static userHasPermission(user: UserLogin, permissionId: string) {
        return SecurityUtil.userLoginHasPermission(user.userLoginId, permissionId);
    }

    public static userLoginHasPermission(userLoginId: string, permissionId: string) {
        return new Promise((resolve, reject) => {
            CacheUtil.runEntityQuery(`
                select * from 
                user_login_security_group as ulsg
                inner join security_group_permission as sgp using(security_group_id)
                where ulsg.user_login_id = ? and sgp.permission_id = ?
                limit 1
            `, [userLoginId, permissionId]).then(results => {
                resolve((results.length !== 0));
            }).catch(reject);
        })
    }

    public static ensureSuperUser(req: Request, res: Response, next: NextFunction) {
        SecurityUtil.sessionHasPermission(req.session!.user, "SUPER_ADMIN")
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
            SecurityUtil.sessionHasPermission(req.session!.user, permissionId)
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