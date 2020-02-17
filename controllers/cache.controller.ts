import { Request, Response, Router } from 'express';
import { CacheEngine } from '../core/engine/cache.engine';
import { Screen } from '../core/screen';
import { BaseUtil } from '../utils/base.util';
import { ExpressUtil } from '../utils/express.util';
import { RenderUtil } from '../utils/render.util';

const cacheController: Router = Router();
const safe = ExpressUtil.safeMiddleware;

cacheController.get("/list", safe((req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView("cache/types"), req, res).appendContext({
        headerTitle: "Cache List",
        recurse: true,
        storage: CacheEngine.get(),
        sizeOf: BaseUtil.sizeOf
    }).renderQuietly();
}));

cacheController.get("/list/:cacheType", safe((req: Request, res: Response) => {
    let cacheTypeParam: any = req.params.cacheType;
    let cacheStorage = CacheEngine.get(cacheTypeParam);
    if (!cacheStorage) {
        throw new Error("Cache type does not exist");
    }
    Screen.create(RenderUtil.getDefaultView("cache/keys"), req, res).appendContext({
        headerTitle: `Cache List - ${cacheTypeParam}`,
        recurse: true,
        storage: cacheStorage,
        cacheGroup: cacheTypeParam,
        sizeOf: BaseUtil.sizeOf
    }).renderQuietly();
}));

cacheController.get("/list/:cacheType/:cacheKey", safe((req: Request, res: Response) => {
    let cacheTypeParam: any = req.params.cacheType;
    let cacheStorage = CacheEngine.get(cacheTypeParam, req.params.cacheKey);
    if (!cacheStorage) {
        throw new Error("Cache key does not exist");
    }
    Screen.create(RenderUtil.getDefaultView("cache/subkeys"), req, res).appendContext({
        headerTitle: "Cache List",
        recurse: false,
        cacheGroup: cacheTypeParam,
        cacheKey: req.params.cacheKey,
        storage: cacheStorage,
        sizeOf: BaseUtil.sizeOf
    }).renderQuietly();
}));

cacheController.get("/clear/:type", safe((req: Request, res: Response) => {
    let cacheTypeParam: any = req.params.type;
    CacheEngine.clear(cacheTypeParam);
    res.redirect(`${req.baseUrl}/list`);
}));

cacheController.get("/clear/:type/:subType", safe((req: Request, res: Response) => {
    let cacheTypeParam: any = req.params.type;
    let cacheSubTypeParam: any = req.params.subType;
    CacheEngine.clear(cacheTypeParam, cacheSubTypeParam);
    res.redirect(`${req.baseUrl}/list/${cacheTypeParam}`);
}));

cacheController.get("/clear/:type/:subType/:key", safe((req: Request, res: Response) => {
    let cacheTypeParam: any = req.params.type;
    let cacheSubTypeParam: any = req.params.subType;
    let cacheSubTypeKeyParam: any = req.params.key;
    CacheEngine.clear(cacheTypeParam, cacheSubTypeParam, cacheSubTypeKeyParam);
    res.redirect(`${req.baseUrl}/list/${cacheTypeParam}/${cacheSubTypeParam}`);
}));

export { cacheController };
