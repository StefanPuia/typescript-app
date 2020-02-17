import { Request, Response, Router } from 'express';
import { Screen } from '../core/screen';
import { RenderUtil } from '../utils/render.util';
import { SecurityUtil } from '../utils/security.util';
import { EntityQuery } from '../core/engine/entity/entity.query';
import { GenericValue } from '../core/engine/entity/generic.value';

const loginController: Router = Router();

loginController.get("/login", (req: Request, res: Response) => {
    if (SecurityUtil.userLoggedIn(req)) {
        res.redirect(req.baseUrl);
    } else {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res).appendContext({
            headerTitle: "Login",
            redirect: req.query.r
        }).renderQuietly();
    }
});

loginController.post("/login", async (req: Request, res: Response) => {
    const context: GenericObject = {
        redirect: req.body.redirect
    };
    try {
        const userName = req.body.userName;
        const password = SecurityUtil.hashPassword(req.body.password);
        if (!userName || !password) {
            throw new Error("No username or password provided");
        }
        const user: GenericValue = await EntityQuery.from("UserLogin")
                .where(["userName", userName, "password", password]).queryFirst();
        if (!user) {
            throw new Error("Username or password not found.");
        }
        if (req.session) {
            req.session.userLoginId = user.get("userLoginId");
            req.session.userName = user.get("fullName") || user.get("userName");
        }
        return res.redirect(req.body.redirect || req.baseUrl);
    } catch (err) {
        context.error = err.message;
    } finally {
        Screen.create(RenderUtil.getDefaultView("login/index"), req, res)
            .appendContext(context).renderQuietly();
    }
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
