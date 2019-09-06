import { Router, Request, Response } from 'express';
import Screen from '../core/screen';
import RenderUtil from '../utils/render.util';
import SecurityUtil from '../utils/security.util';
import { User } from '../core/entity/user';

const router: Router = Router();

router.get("/login", (req: Request, res: Response) => {
    if (SecurityUtil.userLoggedIn(req)) {
        res.redirect("/framework");
    } else {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res).appendContext({
            headerTitle: "Login"
        }).renderQuietly();
    }
});

router.post("/login", (req: Request, res: Response) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res).appendContext({
            error: "No username or password provided"
        }).renderQuietly();
    }

    User.create().findLogin(username, password).then(user => {
        if (req.session) {
            req.session.user = user;
        }
        res.redirect("/framework");
    }).catch(err => {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res).appendContext({
            error: err
        }).renderQuietly();
    });
});

router.get("/logout", (req: Request, res: Response) => {
    if (req.session) {
        req.session.destroy(() => {
            res.redirect("/framework/login");
        });
    } else {
        delete req.session;
        res.redirect("/framework/login");
    }
});

export default router;