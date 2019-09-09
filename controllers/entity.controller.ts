import { Request, Response, Router } from 'express';
import { Screen } from '../core/screen';
import { DatabaseUtil } from '../utils/database.util';
import { ExpressUtil } from '../utils/express.util';
import { RenderUtil } from '../utils/render.util';

const entityController: Router = Router();

entityController.get('/list', (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('entity/list'), req, res).appendContext({
        entities: DatabaseUtil.getEntityDefinitions(),
        headerTitle: "Entity List"
    }).renderQuietly();
});

entityController.get('/find/:entityName', (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinition(req.params.entityName);
    if (entity) {
        Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
            headerTitle: "Entity Find: " + entity.name,
            entity: entity,
            requestType: "find"
        }).renderQuietly();
    } else {
        ExpressUtil.renderGenericError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

entityController.post('/find/:entityName', (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinition(req.params.entityName);
    if (entity) {
        let whereClause: Array<string> = [];
        let inserts: Array<any> = [];

        for (let field of entity.fields) {
            if (req.body[field.name]) {
                whereClause.push(`${field.name} = ?`);
                inserts.push(req.body[field.name]);
            }
        }

        DatabaseUtil.transactPromise(`select * from ${entity.name} ${whereClause.length ? "where " + whereClause.join(' and ') : ""}`, inserts)
        .then(results => {
            Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
                headerTitle: "Entity Find: " + entity!.name,
                entity: entity,
                results: results,
                requestType: "find"
            }).renderQuietly();
        }).catch(err => {
            ExpressUtil.renderGenericError(req, res, err);
        })
    } else {
        ExpressUtil.renderGenericError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

entityController.get("/edit/:entityName", (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinition(req.params.entityName);
    if (entity) {
        DatabaseUtil.transactPromise(`select * from ${entity.name} where ? limit 1`, [req.query])
        .then((results: any) => {
            Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
                headerTitle: "Entity Edit: " + entity!.name,
                entity: entity,
                result: results[0],
                requestType: "edit"
            }).renderQuietly();
        }).catch(err => {
            ExpressUtil.renderGenericError(req, res, err);
        })
    } else {
        ExpressUtil.renderGenericError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

entityController.post("/edit/:entityName", (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinition(req.params.entityName);
    if (entity) {
        DatabaseUtil.transactPromise(`update ${entity.name} set ? where ? limit 1`, [req.body, req.query])
        .then((results: any) => {
            DatabaseUtil.transactPromise(`select * from ${entity!.name} where ?`, req.query)
            .then((results: any) => {
                Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
                    headerTitle: "Entity Find: " + entity!.name,
                    entity: entity,
                    result: results[0],
                    requestType: "edit",
                    success: "Entry saved"
                }).renderQuietly();
            }).catch(err => { throw err; });
        }).catch(err => {
            ExpressUtil.renderGenericError(req, res, err);
        });
    } else {
        ExpressUtil.renderGenericError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

entityController.get("/delete/:entityName", (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinition(req.params.entityName);
    if (entity) {
        DatabaseUtil.transactPromise(`select * from ${entity.name} where ? limit 1`, [req.query])
        .then((results: any) => {
            DatabaseUtil.transactPromise(`delete from ${entity!.name} where ?`, [req.query])
            .then((deleteResult: any) => {
                Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
                    headerTitle: "Entity Create: " + entity!.name,
                    entity: entity,
                    result: results[0],
                    requestType: "delete",
                    success: "Entry deleted"
                }).renderQuietly();
            }).catch(err => { throw err; });
        }).catch(err => {
            ExpressUtil.renderGenericError(req, res, err);
        });
    } else {
        ExpressUtil.renderGenericError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

entityController.post("/insert/:entityName", (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinition(req.params.entityName);
    if (entity) {
        DatabaseUtil.transactPromise(`insert into ${entity.name} set ?`, [req.body.inserts])
        .then(results => {
            res.json({status: "ok"});
        }).catch(err => {
            ExpressUtil.sendJsonError(req, res, err);
        })
    } else {
        ExpressUtil.sendJsonError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

entityController.get("/sqlProcessor", (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('entity/sqlProcessor'), req, res).appendContext({
        headerTitle: "Entity SQL Processor"
    }).renderQuietly();
});

entityController.post("/sqlProcessor", (req: Request, res: Response) => {
    DatabaseUtil.transactPromise(req.body.query).then(data => {
        let results: Array<Array<any>> = [];
        let resultData: any = data;

        if (!(resultData instanceof Array)) {
            resultData = [data];
        }

        for (let resultPart of resultData) {
            if (!(resultPart instanceof Array)) {
                results.push([resultPart]);
            } else {
                results.push(resultPart);
            }
        }

        res.json(results);
    }).catch(err => {
        res.status(500).json({
            error: err
        })
    })
});

export { entityController };
