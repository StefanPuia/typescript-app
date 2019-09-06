import { Request, Response } from 'express';
import RenderUtil from './render.util';
import Screen from '../core/screen';

export default abstract class ExpressUtil {
    public static renderStaticError(req: Request, res: Response, err: any) {
        Screen.create(RenderUtil.getDefaultView("static_error"), req, res).appendContext({
            error: err
        }).renderQuietly();
    }
}