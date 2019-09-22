import { Request, Response, Router } from 'express';
import { UserLogin } from '../core/entity/user_login';
import { Screen } from '../core/screen';
import { RenderUtil } from '../utils/render.util';
import { SecurityUtil } from '../utils/security.util';

const loginController: Router = Router();

loginController.get("/login", (req: Request, res: Response) => {
    if (SecurityUtil.userLoggedIn(req)) {
        res.redirect(req.baseUrl);
    } else {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res).appendContext({
            headerTitle: "Login"
        }).renderQuietly();
    }
});

loginController.post("/login", (req: Request, res: Response) => {
    const userLoginId = req.body.userLoginId;
    const password = req.body.password;

    if (!userLoginId || !password) {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res).appendContext({
            error: "No username or password provided"
        }).renderQuietly();
    }

    UserLogin.create().findLogin(userLoginId, password).then(user => {
        if (req.session) {
            req.session.userLoginId = user.userLoginId;
        }
        res.redirect(req.baseUrl);
    }).catch(err => {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res).appendContext({
            error: err
        }).renderQuietly();
    });
});

loginController.get("/logout", (req: Request, res: Response) => {
    if (req.session) {
        req.session.destroy(() => {
            res.redirect(req.baseUrl + "/login");
        });
    } else {
        delete req.session;
        res.redirect(req.baseUrl + "/login");
    }
});

export { loginController };
