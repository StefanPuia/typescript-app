import { Request, Response, Router, NextFunction } from 'express';
import { Screen } from '../core/screen';
import { ExpressUtil } from '../utils/express.util';
import { RenderUtil } from '../utils/render.util';
import { EntityEngine } from '../core/engine/entity/entity.engine';
import { EntityQuery } from '../core/engine/entity/entity.query';
import { GenericValue } from '../core/engine/entity/generic.value';
import { ConditionBuilder } from '../core/engine/entity/condition.builder';

const entityController: Router = Router();
const safe = ExpressUtil.safeMiddleware;
const safeJSON = ExpressUtil.safeJSONMiddleware;

entityController.get('/list', safe((req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('entity/list'), req, res).appendContext({
        entities: EntityEngine.getPublicEntityDefinitions().sort((a, b) => { if (a.name < b.name) return -1; return 1; }),
        headerTitle: "Entity List"
    }).renderQuietly();
}));

entityController.get('/find/:entityName', safe((req: Request, res: Response) => {
    let entity = EntityEngine.getPublicEntityDefinition(req.params.entityName);
    Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
        headerTitle: "Entity Find: " + entity.name,
        entity: entity,
        requestType: "find"
    }).renderQuietly();
}));

entityController.post('/find/:entityName', safe(async (req: Request, res: Response) => {
    let entity = EntityEngine.getPublicEntityDefinition(req.params.entityName);
    let ecb = ConditionBuilder.create()
    for (let field of entity.fields) {
        if (req.body[field.name]) {
            ecb.eq(field.name, req.body[field.name]);
        }
    }
    const results = await EntityQuery.from(req.params.entityName).where(ecb).queryList()
    Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
        headerTitle: "Entity Find: " + entity!.name,
        entity: entity,
        results: results,
        requestType: "find"
    }).renderQuietly();
}));

entityController.get("/edit/:entityName", safe(async (req: Request, res: Response) => {
    let entity = EntityEngine.getPublicEntityDefinition(req.params.entityName);
    const result = await EntityQuery.from(entity.name).where(req.query).queryFirst()
    if (result) {
        Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
            headerTitle: "Entity Update: " + entity!.name,
            entity: entity,
            result: result.getData(),
            requestType: "edit"
        }).renderQuietly();
    } else {
        throw new Error(`No results found for entity ${entity.name}`);
    }
}));

entityController.post("/edit/:entityName", safe(async (req: Request, res: Response) => {
    const entity = EntityEngine.getPublicEntityDefinition(req.params.entityName);
    let value = await EntityQuery.from(entity.name).where(req.query).queryFirst();
    for (const key of Object.keys(req.body)) {
        value.set(key, req.body[key] || null);
    }
    await value.update();
    value = await EntityQuery.from(entity.name).where(req.query).queryFirst();
    Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
        headerTitle: "Entity Update: " + entity!.name,
        entity: entity,
        result: value.getData(),
        requestType: "edit",
        success: "Entry saved"
    }).renderQuietly();
}));

entityController.get("/delete/:entityName", safe(async (req: Request, res: Response) => {
    let entity = EntityEngine.getPublicEntityDefinition(req.params.entityName);
    const value = await EntityQuery.from(entity.name).where(req.query).queryFirst();
    const results = await value.delete();
    Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
        headerTitle: "Entity Delete: " + entity!.name,
        entity: entity,
        result: results,
        requestType: "delete",
        success: "Entry deleted"
    }).renderQuietly();
}));

entityController.post("/insert/:entityName", safeJSON(async (req: Request, res: Response) => {
    let entity = EntityEngine.getEntityDefinition(req.params.entityName);
    const value = new GenericValue(entity.name, req.body.inserts);
    await value.insert();
    res.json({ status: "ok" });
}));

entityController.get("/sqlProcessor", safe((req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('entity/sqlProcessor'), req, res).appendContext({
        headerTitle: "Entity SQL Processor"
    }).renderQuietly();
}));

entityController.post("/sqlProcessor", safeJSON(async (req: Request, res: Response) => {
    let query = req.body.query;
    query = `select 1;\n` + query
    query = query.split("\n").map((line: any) => {
        return line.replace(/(.*?)--.+/, "$1");
    }).join("\n");
    const data = await EntityEngine.transactPromise(query, [], false, false)
    res.json(data.slice(1));
}));

export { entityController };
