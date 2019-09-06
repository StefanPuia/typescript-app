import sha256 from 'sha256';
import { Request, Response, NextFunction } from 'express';
import BaseConfig from '../config/base.config';
export default abstract class SecurityUtil {
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
            res.redirect("/framework/login");
        }
    }
}