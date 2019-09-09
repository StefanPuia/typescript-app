import { Request, Response, Router } from 'express';
import { CacheEngine } from '../core/engine/cache.engine';
import { Screen } from '../core/screen';
import { BaseUtil } from '../utils/base.util';
import { DebugUtil } from '../utils/debug.util';
import { ExpressUtil } from '../utils/express.util';
import { RenderUtil } from '../utils/render.util';

const cacheController: Router = Router();

cacheController.get("/list", (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView("cache/types"), req, res).appendContext({
        headerTitle: "Cache List",
        recurse: true,
        storage: CacheEngine.get(),
        sizeOf: BaseUtil.sizeOf
    }).renderQuietly();
});

cacheController.get("/list/:cacheType", (req: Request, res: Response) => {
    let cacheTypeParam: any = req.params.cacheType;
    let cacheStorage = CacheEngine.get(cacheTypeParam);
    if (cacheStorage) {
        Screen.create(RenderUtil.getDefaultView("cache/keys"), req, res).appendContext({
            headerTitle: `Cache List - ${cacheTypeParam}`,
            recurse: true,
            storage: cacheStorage,
            cacheGroup: cacheTypeParam,
            sizeOf: BaseUtil.sizeOf
        }).renderQuietly();
    } else {
        ExpressUtil.renderGenericError(req, res, "Cache type does not exist");
    }
});

cacheController.get("/list/:cacheType/:cacheKey", (req: Request, res: Response) => {
    let cacheTypeParam: any = req.params.cacheType;
    try {
        let cacheStorage = CacheEngine.get(cacheTypeParam, req.params.cacheKey);
        if (cacheStorage) {
            Screen.create(RenderUtil.getDefaultView("cache/subkeys"), req, res).appendContext({
                headerTitle: "Cache List",
                recurse: false,
                cacheGroup: cacheTypeParam,
                cacheKey: req.params.cacheKey,
                storage: cacheStorage,
                sizeOf: BaseUtil.sizeOf
            }).renderQuietly();
        } else {
            ExpressUtil.renderGenericError(req, res, "Cache key does not exist");
        }
    } catch (err) {
        DebugUtil.logError(err, "Controller.Cache");
        ExpressUtil.renderGenericError(req, res, err);
    }
});

export { cacheController };
