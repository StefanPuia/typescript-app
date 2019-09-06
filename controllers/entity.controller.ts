import { Router, Request, Response } from 'express';
import Screen from '../core/screen';
import RenderUtil from '../utils/render.util';
import DatabaseUtil from '../utils/database.util';
import ExpressUtil from '../utils/express.util';

const router: Router = Router();

router.get('/list', (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('entity/list'), req, res).appendContext({
        entities: DatabaseUtil.getEntityDefinitions()
    }).renderQuietly();
});

router.get('/find/:entityName', (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinitions().find(x => x.name == req.params.entityName);
    if (entity) {
        Screen.create(RenderUtil.getDefaultView('entity/find'), req, res).appendContext({
            headerTitle: "Entity Find: " + entity.name,
            entity: entity
        }).renderQuietly();
    } else {
        ExpressUtil.renderStaticError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

router.post('/find/:entityName', (req: Request, res: Response) => {
    let entity = DatabaseUtil.getEntityDefinitions().find(x => x.name == req.params.entityName);
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
                results: results
            }).renderQuietly();
        }).catch(err => {
            ExpressUtil.renderStaticError(req, res, err);
        })
    } else {
        ExpressUtil.renderStaticError(req, res, `Entity '${req.params.entityName}' not defined.`);
    }
});

router.get("/sqlProcessor", (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('entity/sqlProcessor'), req, res).renderQuietly();
});

router.post("/sqlProcessor", (req: Request, res: Response) => {
    DatabaseUtil.transactPromise(req.body.query).then(results => {
        res.json(results);
    }).catch(err => {
        res.status(500).json({
            error: err
        })
    })
});

export default router;