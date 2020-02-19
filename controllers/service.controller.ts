import { Request, Response, Router } from 'express';
import { ServiceEngine } from '../core/engine/service.engine';
import { Screen } from '../core/screen';
import { RenderUtil } from '../utils/render.util';
import { ServiceUtil } from '../utils/service.util';
import { ExpressUtil } from '../utils/express.util';

const serviceController: Router = Router();
const safe = ExpressUtil.safeMiddleware;

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

serviceController.post("/run/:serviceName", async (req: Request, res: Response) => {
    let serviceResult = {};
    let serviceError = undefined;
    try {
        const params = ServiceUtil.validParameters(req.params.serviceName, req.body);
        serviceResult = await ServiceUtil.runSync(req.params.serviceName, params);
    } catch (err) {
        serviceError = err;
    } finally {
        Screen.create(RenderUtil.getDefaultView("service/run"), req, res).appendContext({
            service: ServiceEngine.getService(req.params.serviceName),
            headerTitle: "Run service: " + req.params.serviceName,
            result: serviceResult,
            error: serviceError
        }).renderQuietly();
    }
});

export { serviceController };
