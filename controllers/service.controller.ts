import { Request, Response, Router } from 'express';
import { ServiceEngine } from '../core/engine/service.engine';
import { Screen } from '../core/screen';
import { RenderUtil } from '../utils/render.util';
import { ServiceUtil } from '../utils/service.util';

const serviceController: Router = Router();

serviceController.get("/list", (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView("service/list"), req, res).appendContext({
        services: ServiceEngine.getService(),
        headerTitle: "Service list"
    }).renderQuietly();
});

serviceController.get("/run/:serviceName", (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView("service/run"), req, res).appendContext({
        service: ServiceEngine.getService(req.params.serviceName),
        headerTitle: "Run service: " + req.params.serviceName
    }).renderQuietly();
});

serviceController.post("/run/:serviceName", (req: Request, res: Response) => {
    let serviceResult: any;
    let serviceError: any;
    ServiceUtil.runSync(req.params.serviceName, ServiceUtil.validParameters(req.params.serviceName, req.body))
    .then((result: any) => { serviceResult = result; })
    .catch(err => { serviceError = err; })
    .finally(() => {
        Screen.create(RenderUtil.getDefaultView("service/run"), req, res).appendContext({
            service: ServiceEngine.getService(req.params.serviceName),
            headerTitle: "Run service: " + req.params.serviceName,
            result: serviceResult,
            error: serviceError
        }).renderQuietly();
    });
});

export { serviceController };
