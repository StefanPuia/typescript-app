import { Router, Request, Response } from 'express';
import { Screen } from '../core/screen';
import { RenderUtil } from '../utils/render.util';
import { DatabaseUtil } from '../utils/database.util';

const securityController: Router = Router();

securityController.get("/user/list", (req: Request, res: Response) => {
    Screen.create(RenderUtil.getDefaultView("security/user/list"), req, res).appendContext({
        headerTitle: "User Manager"
    }).renderQuietly();
});

securityController.post("/user/list", (req: Request, res: Response) => {
    let userLoginId = req.body.userLoginId;
    let securityGroupId = req.body.securityGroupId;
    let permissionId = req.body.permissionId;

    let whereClause: Array<string> = [];
    let inserts: Array<string> = [];

    let permissionClause = "";
    if (permissionId) {
        permissionClause = "where permission_id = ?";
        inserts.push(permissionId);
    }

    if (userLoginId) {
        whereClause.push("ulsg.user_login_id = ?");
        inserts.push(userLoginId);
    }

    if (securityGroupId) {
        whereClause.push("ulsg.security_group_id = ?");
        inserts.push(securityGroupId);
    }

    let result = {
        users: [],
        error: undefined
    };
    DatabaseUtil.transactPromise(`
        select ulsg.user_login_id, count(1) as security_groups, perm.permissions
        from user_login_security_group as ulsg
        inner join (
            select user_login_id, count(1) as permissions
            from user_login_security_group
            inner join security_group_permission using(security_group_id)
            ${permissionClause}
            group by user_login_id
        ) as perm on ulsg.user_login_id = perm.user_login_id
        ${whereClause.length ? "where " + whereClause.join(" and ") : ""} 
        group by ulsg.user_login_id`, inserts)
    .then((users: any) => { result.users = users; })
    .catch(err => { result.error = err; })
    .finally(() => {
        Screen.create(RenderUtil.getDefaultView("security/user/list"), req, res).appendContext({
            headerTitle: "User Manager",
            users: result.users,
            error: result.error
        }).renderQuietly();
    })

    
});

export { securityController };