import express, { Request, Response, Router } from 'express';
import { BaseConfig } from '../config/base.config';
import { Screen } from '../core/screen';
import { RenderUtil } from '../utils/render.util';
import { SecurityUtil } from '../utils/security.util';
import { cacheController } from './cache.controller';
import { entityController } from './entity.controller';
import { loginController } from './login.controller';
import { securityController } from './security.controller';
import { serviceController } from './service.controller';
import { toolsController } from './tools.controller';

const frameworkController: Router = Router();

frameworkController.use('/static', express.static(BaseConfig.staticLocation));
frameworkController.use("/", loginController);
frameworkController.use(SecurityUtil.ensureLogin, SecurityUtil.ensurePermission("SUPER_ADMIN"));
frameworkController.use("/entity", entityController);
frameworkController.use("/security", securityController);
frameworkController.use("/cache", cacheController);
frameworkController.use("/service", serviceController);
frameworkController.use("/tools", toolsController);

frameworkController.get('/', (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('index'), req, res).appendContext({
        headerTitle: "Main"
    }).renderQuietly();
});

export { frameworkController };
