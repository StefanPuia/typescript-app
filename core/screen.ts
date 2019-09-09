import { RenderModifier } from '../utils/render.util';
import { Request, Response } from 'express';
import { RenderUtil } from '../utils/render.util';
import { BaseConfig } from '../config/base.config';

export class Screen {
    protected viewName: string;
    protected request: Request;
    protected response: Response;
    protected errorHandlerFunction: Function;
    protected contextObject: GenericObject;
    protected statusId: number;
    protected beforeRenderFunction: RenderModifier;
    protected afterRenderFunction: RenderModifier;
    protected quiet: boolean = false;
    protected hasHandler: boolean = false;
    protected cacheView: boolean = BaseConfig.cacheViews;

    protected constructor(viewName: string, req: Request, res: Response, errorHandler?: Function,
            context?: GenericObject, status?: number, beforeRender?: RenderModifier,
            afterRender?: RenderModifier) {
        this.viewName = viewName;
        this.request = req;
        this.response = res;
        this.errorHandlerFunction = errorHandler || BaseConfig.screenErrorHandler || RenderUtil.defaultErrorHandler;
        this.contextObject = context || {};
        this.statusId = status || 200;
        this.beforeRenderFunction = beforeRender || RenderUtil.blankRenderFunction;
        this.afterRenderFunction = afterRender || RenderUtil.blankRenderFunction;
        this.hasHandler = !!errorHandler;

        this.contextObject.parameters = {};
        if (req.params) {
            Object.assign(this.contextObject.parameters, req.params);
        }

        this.contextObject.query = {};
        if (req.query) {
            Object.assign(this.contextObject.parameters, req.query);
        }

        this.contextObject.body = {};
        if (req.body) {
            Object.assign(this.contextObject.body, req.body);
        }

        this.contextObject.session = {};
        if (req.session) {
            Object.assign(this.contextObject.session, req.session);
        }
        return this;
    }

    public static create(viewName: string, req: Request, res: Response, context?: GenericObject, status?: number): Screen {
        return new Screen(viewName, req, res, undefined, context, status);
    }

    public errorHandler(errorHandler: Function): Screen {
        this.errorHandlerFunction = errorHandler;
        this.hasHandler = true;
        return this;
    }

    public appendContext(extraContext: GenericObject): Screen {
        Object.assign(this.contextObject, extraContext);
        return this;
    }

    public status(status: number) {
        this.statusId = status;
        return this;
    }

    public beforeRender(beforeRender: RenderModifier): Screen {
        this.beforeRenderFunction = beforeRender;
        return this;
    }

    public afterRender(afterRender: RenderModifier): Screen {
        this.afterRenderFunction = afterRender;
        return this;
    }

    public cache(cacheView: boolean): Screen {
        this.cacheView = cacheView;
        return this;
    }

    public render(): void | Promise<Function> {
        this.contextObject.cache = this.cacheView;
        if(this.quiet) {
            return RenderUtil.renderQuietly(this.viewName, this.request, this.response, 
                this.contextObject, this.statusId, this.beforeRenderFunction, this.afterRenderFunction);
        }
        if(this.hasHandler) {
            return RenderUtil.renderWithHandler(this.viewName, this.request, this.response, this.errorHandlerFunction,
                this.contextObject, this.statusId, this.beforeRenderFunction, this.afterRenderFunction);
        }
        return new Promise((resolve, reject) => {
            RenderUtil.render(this.viewName, this.request, this.response,
                this.contextObject, this.statusId, this.beforeRenderFunction, this.afterRenderFunction)
            .then(html => {
                resolve(html);
            }).catch(err => {
                this.errorHandlerFunction(err);
            })
        })
    }

    public renderQuietly(): void {
        this.quiet = true;
        this.render();
    }
}