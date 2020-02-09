import dateFormat from 'dateformat';
import { Request, Response } from 'express';
import path from 'path';
import { DebugUtil } from './debug.util';
import { LabelUtil } from './label.util';
import { BaseUtil } from './base.util';

export abstract class RenderUtil {
    private static readonly moduleName: string = 'RenderUtil';
    private static readonly staticError: string = RenderUtil.getDefaultView('static_error');

    public static getDefaultView(viewName: string) {
        return path.join(__dirname, '../views/' + viewName + '.ejs');
    }

    public static render(viewName: string, req: Request, res: Response,
        context: GenericObject = {}, status: number = 200, beforeRender: RenderModifier = this.blankRenderFunction,
        afterRender: RenderModifier = this.blankRenderFunction): Promise<Function> {

        return new Promise((resolve: any, reject: any) => {
            const timeStart = new Date().getTime();
            this.renderPromise(viewName, req, res, context, status, beforeRender, afterRender)
            .then(html => {
                res.send(html).end(() => {
                    DebugUtil.logTiming(`Rendered ${viewName}`, timeStart, undefined, this.moduleName);
                    resolve(html);
                });
            }).catch(error => {
                DebugUtil.logError(`In '${viewName}': ${error}`, this.moduleName);
                res.status(500).render(RenderUtil.staticError, {
                    error: error
                });
                reject(error);
            });
        });
    }

    public static renderWithHandler(viewName: string, req: Request, res: Response, errorHandler: Function,
            context: GenericObject = {}, status: number = 200, beforeRender: RenderModifier = this.blankRenderFunction,
            afterRender: RenderModifier = this.blankRenderFunction): void {
        this.render(viewName, req, res, context, status, beforeRender, afterRender)
        .catch(err => {
            errorHandler(err);
        });
    }

    public static renderQuietly(viewName: string, req: Request, res: Response,
            context: GenericObject = {}, status: number = 200, beforeRender: RenderModifier = this.blankRenderFunction,
            afterRender: RenderModifier = this.blankRenderFunction): void {
        this.render(viewName, req, res, context, status, beforeRender, afterRender)
        .catch(err => {
            DebugUtil.logError(`In '${viewName}': ${err}`, this.moduleName);
        })
    }

    public static defaultErrorHandler(req: Request, res: Response, error: any, reject: Function) {
        res.status(500).render(RenderUtil.staticError, {
            error: error
        });
        reject(error);
    }

    public static blankRenderFunction(req: Request, res: Response, context: GenericObject): Promise<Function> {
        return new Promise((resolve) => {
            resolve();
        })
    }

    private static handleRenderModifier(func: RenderModifier, req: Request, res: Response, context: GenericObject) {
        return new Promise((resolve, reject) => {
            let modifierResult = func(req, res, context);

            if (modifierResult instanceof Promise) {
                modifierResult.then(resolve).catch(reject);
            } else {
                resolve();
            }
        });
    }

    private static renderPromise(viewName: string, req: Request, res: Response, context: GenericObject, 
            status: number, beforeRender: RenderModifier, afterRender: RenderModifier): Promise<Function> {
        context.defaultView = RenderUtil.getDefaultView;
        context.dateFormat = dateFormat;
        context.baseUrl = req.baseUrl;
        context.uiLabel = LabelUtil.get;
        context.stringify = BaseUtil.stringify;
        context.hostName = req.headers.host;

        context.context = context;
        return new Promise((resolve: any, reject: any) => {
            this.handleRenderModifier(beforeRender, req, res, context)
            .then(() => {
                res.render(viewName, context, (error, html) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    this.handleRenderModifier(afterRender, req, res, context)
                    .then(() => {
                        res.status(status);
                        resolve(html);
                    }).catch(reject);
                });
            }).catch(reject);
        });
    }
}

export interface RenderModifier {
    (req: Request, res: Response, context: GenericObject): Promise<any> | void
}