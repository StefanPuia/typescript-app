import { Request, Response } from 'express';
import { Screen } from '../core/screen';
import { RenderUtil } from './render.util';

export abstract class ExpressUtil {
    public static renderStaticError(req: Request, res: Response, err: any) {
        Screen.create(RenderUtil.getDefaultView("static_error"), req, res).appendContext({
            error: err
        }).renderQuietly();
    }

    public static renderGenericError(req: Request, res: Response, err: any) {
        Screen.create(RenderUtil.getDefaultView("generic_error"), req, res).appendContext({
            error: err
        }).renderQuietly();
    }

    public static sendJsonError(req: Request, res: Response, err: any) {
        res.status(500).json({
            error: err
        });
    }
}