import { DatabaseUtil } from '../../utils/database.util';
import { SecurityUtil } from '../../utils/security.util';
import { GenericValue } from '../generic.value';

export class UserLogin extends GenericValue {
    public static readonly entity: string = 'user_login';
    public readonly entity: string = UserLogin.entity;
    protected readonly primaryKeyField: string = 'user_login_id';
    protected data?: userData;

    public static create(): UserLogin {
        return new UserLogin();
    }

    public static readonly definition: EntityDefinition = {
        "name": "user_login",
        "fields": [{
            "name": "user_login_id",
            "type": DatabaseUtil.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true,
            "unique": true
        }, {
            "name": "password",
            "type": DatabaseUtil.DATA_TYPE.DESCRIPTION,
            "notNull": true,
            "unique": true
        }]
    };

    public find(id: string): Promise<UserLogin> {
        return this.doSelect(id, false);
    }

    public static findAll(condition: string = "", inserts: any[] = []): Promise<UserLogin[]> {
        return new Promise((resolve, reject) => {
            this.doSelectAll(UserLogin.entity, condition, inserts).then(results => {
                let users: Array<UserLogin> = [];
                for (let user of results) {
                    let userObject = new UserLogin();
                    userObject.setData(user);
                    users.push(userObject);
                }
                resolve(users);
            }).catch(reject);
        });
    }

    public findLogin(user_login_id: string, password: string): Promise<UserLogin> {
        let hashedPassword = SecurityUtil.hashPassword(password);
        return new Promise((resolve, reject) => {
            this.doSelectAll(`upper(user_login_id) = upper(?) and password = ?`, [user_login_id, hashedPassword])
            .then(users => {
                if (users.length === 0) {
                    reject("UserLogin not found.");
                } else {
                    this.setData(users[0]);
                    resolve(this);
                }
            })
        })
    }

    public get userLoginId() {
        return this.get("user_login_id");
    }

    public get password() {
        return this.get("password");
    }

    public set password(password: string) {
        this.set("password", password);
    }
}

interface userData {
    user_login_id: string,
    password: string
}