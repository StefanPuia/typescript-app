import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Screen } from '../core/screen';
import { RenderUtil } from './render.util';
import { DebugUtil } from './debug.util';
import { BaseUtil } from './base.util';

export abstract class ExpressUtil {
    public static renderStaticError(req: Request, res: Response, err: any) {
        DebugUtil.logError(err, "ExpressUtil.Static", req.path);
        Screen.create(RenderUtil.getDefaultView("static_error"), req, res).appendContext({
            error: BaseUtil.stringify(err)
        }).renderQuietly();
    }

    public static renderGenericError(req: Request, res: Response, err: any) {
        DebugUtil.logError(err, "ExpressUtil.Generic", req.path);
        Screen.create(RenderUtil.getDefaultView("generic_error"), req, res).appendContext({
            error: BaseUtil.stringify(err)
        }).renderQuietly();
    }

    public static sendJsonError(req: Request, res: Response, err: any) {
        DebugUtil.logError(err, "ExpressUtil.JSON", req.path);
        res.status(500).json({
            error: BaseUtil.stringify(err)
        });
    }

    public static safeMiddleware(caller: Function): RequestHandler {
        return (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = caller(req, res, next);
                if (result instanceof Promise) {
                    result.catch(err => {
                        ExpressUtil.renderGenericError(req, res, err);
                    })
                }
            } catch (err) {
                ExpressUtil.renderGenericError(req, res, err);
            }
        }
    }

    public static safeJSONMiddleware(caller: Function): RequestHandler {
        return (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = caller(req, res, next);
                if (result instanceof Promise) {
                    result.catch(err => {
                        ExpressUtil.sendJsonError(req, res, err);
                    })
                }
            } catch (err) {
                ExpressUtil.sendJsonError(req, res, err);
            }
        }
    }
}