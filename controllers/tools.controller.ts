import { Request, Response, Router } from 'express';
import { Script, Context } from 'vm';
import { Screen } from '../core/screen';
import { RenderUtil } from '../utils/render.util';
import { BaseUtil } from '../utils/base.util';
import { EntityQuery } from '../core/engine/entity/entity.query';
import { EntityDynamicQuery } from '../core/engine/entity/entity.dynamic.query';
import { ConditionBuilder } from '../core/engine/entity/condition.builder';
import { GenericValue } from '../core/engine/entity/generic.value';
import { EntityEngine } from '../core/engine/entity/entity.engine';

const toolsController: Router = Router();

toolsController.get("/jsProcessor", (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView('tools/jsProcessor'), req, res).appendContext({
        headerTitle: "Javascript Processor"
    }).renderQuietly();
});

toolsController.post("/jsProcessor", (req: Request, res: Response) => {
    const context: Context = {
        EntityEngine: EntityEngine,
        EntityQuery: EntityQuery,
        EntityDynamicQuery: EntityDynamicQuery,
        ConditionBuilder: ConditionBuilder,
        GenericValue: GenericValue,
        console: console,
        __dirname: process.cwd()
    };
    const script = new Script(`(async function(require){${req.body.query}\n})`);
    try {
        const vmResult: Promise<any> = script.runInNewContext(context)(require);
        vmResult.then(result => {
            res.send(BaseUtil.stringify(result, true));
        }).catch(err => {
            res.send(err.message + "\n" + err.stack);
        })
    } catch (err) {
        res.send(err.message + "\n" + err.stack);
    }
});

export { toolsController };
