import { Router, Request, Response } from 'express';

import stringify from 'json-stringify-safe';

const securityController: Router = Router();

securityController.get("/req", (req: Request, res: Response) => {
    res.send(stringify(req));
});

export { securityController };