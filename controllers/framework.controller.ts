import express, { Request, Response, Router } from 'express';
import BaseConfig from '../config/base.config';
import entityController from '../controllers/entity.controller';
import loginController from '../controllers/login.controller';
import Screen from '../core/screen';
import RenderUtil from '../utils/render.util';
import SecurityUtil from '../utils/security.util';

const router: Router = Router();


router.use('/static', express.static(BaseConfig.staticLocation));
router.use("/", loginController);
router.use(SecurityUtil.ensureLogin);
router.use("/entity", entityController);

router.get('/', (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('index'), req, res).renderQuietly();
});

export default router;