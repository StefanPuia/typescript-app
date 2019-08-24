import { RenderModifier } from '../utils/render.util';
import { Request, Response } from 'express';
import RenderUtil from '../utils/render.util';
import Config from '../config/base.config';

export default class Screen {
    private viewName: string;
    private request: Request;
    private response: Response;
    private errorHandlerFunction: Function;
    private contextObject: GenericObject;
    private statusId: number;
    private beforeRenderFunction: RenderModifier;
    private afterRenderFunction: RenderModifier;
    private quiet: boolean = false;
    private hasHandler: boolean = false;
    private cacheView: boolean = Config.cacheViews;

    private constructor(viewName: string, req: Request, res: Response, errorHandler?: Function,
            context?: GenericObject, status?: number, beforeRender?: RenderModifier,
            afterRender?: RenderModifier) {
        this.viewName = viewName;
        this.request = req;
        this.response = res;
        this.errorHandlerFunction = errorHandler || Config.screenErrorHandler || RenderUtil.defaultErrorHandler;
        this.contextObject = context || {};
        this.statusId = status || 200;
        this.beforeRenderFunction = beforeRender || RenderUtil.blankRenderFunction;
        this.afterRenderFunction = afterRender || RenderUtil.blankRenderFunction;
        this.hasHandler = !!errorHandler;

        if(req.params) {
            this.contextObject.parameters = {};
            Object.assign(this.contextObject.parameters, req.params);
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