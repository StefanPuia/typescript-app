import { Request, Response } from 'express';
import { Screen } from '../core/screen';
import { RenderUtil } from './render.util';
import { DebugUtil } from './debug.util';
import { BaseUtil } from './base.util';

export abstract class ExpressUtil {
    public static renderStaticError(req: Request, res: Response, err: any) {
        DebugUtil.logError(err, undefined, req.path);
        Screen.create(RenderUtil.getDefaultView("static_error"), req, res).appendContext({
            error: BaseUtil.stringify(err)
        }).renderQuietly();
    }

    public static renderGenericError(req: Request, res: Response, err: any) {
        DebugUtil.logError(err, undefined, req.path);
        Screen.create(RenderUtil.getDefaultView("generic_error"), req, res).appendContext({
            error: BaseUtil.stringify(err)
        }).renderQuietly();
    }

    public static sendJsonError(req: Request, res: Response, err: any) {
        DebugUtil.logError(err, undefined, req.path);
        res.status(500).json({
            error: BaseUtil.stringify(err)
        });
    }
}