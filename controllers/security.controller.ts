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
    const userLoginId = req.body.userLoginId;
    const userName = req.body.userName;
    const securityGroupId = req.body.securityGroupId;
    const permissionId = req.body.permissionId;

    let havingClause = "";
    let whereClause: Array<string> = [];
    let inserts: Array<string> = [];

    let permissionClause = "";
    if (permissionId) {
        havingClause = "where sec.permissions > 0";
        permissionClause = "where permission_id = ?";
        inserts.push(permissionId);
    }

    if (userLoginId) {
        whereClause.push("ulsg.user_login_id = ?");
        inserts.push(userLoginId);
    }

    if (userName) {
        whereClause.push("ul.user_name = ?");
        inserts.push(userName);
    }

    if (securityGroupId) {
        havingClause = "where sec.groups > 0";
        whereClause.push("ulsg.security_group_id = ?");
        inserts.push(securityGroupId);
    }

    let result = {
        users: [],
        error: undefined
    };
    DatabaseUtil.transactPromise(`
        select ul.user_login_id, ul.user_name, sec.groups as security_groups, sec.permissions
        from user_login as ul
        left outer join (
            select user_login_id, count(1) as groups, perm.permissions
            from user_login_security_group as ulsg
            left outer join ( 
                select user_login_id, count(1) as permissions 
                from user_login_security_group
                left outer join security_group_permission using(security_group_id)
                ${permissionClause}
                group by user_login_id
            ) as perm using(user_login_id)
            ${whereClause.length ? "where " + whereClause.join(" and ") : ""} 
            group by ulsg.user_login_id
        ) as sec using(user_login_id)
        ${havingClause}`, inserts)
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