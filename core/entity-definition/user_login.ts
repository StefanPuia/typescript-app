import { SecurityUtil } from '../../utils/security.util';
import { GenericValue } from '../engine/entity/generic.value';
import { EntityEngine } from '../engine/entity/entity.engine';

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
            "type": EntityEngine.DATA_TYPE.NUMBER,
            "primaryKey": true,
            "autoIncrement": true,
            "notNull": true,
            "unique": true
        }, {
            "name": "user_name",
            "type": EntityEngine.DATA_TYPE.ID_LONG,
            "unique": true,
        }, {
            "name": "password",
            "type": EntityEngine.DATA_TYPE.DESCRIPTION
        }, {
            "name": "name",
            "type": EntityEngine.DATA_TYPE.ID_VLONG
        }, {
            "name": "picture",
            "type": EntityEngine.DATA_TYPE.DESCRIPTION
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

    public findLoginByUserName(user_name: string, password: string): Promise<UserLogin> {
        let hashedPassword = SecurityUtil.hashPassword(password);
        return new Promise((resolve, reject) => {
            this.doSelectAll(`upper(user_name) = upper(?) and password = ?`, [user_name, hashedPassword])
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

    public get userName() {
        return this.get("user_name");
    }

    public get password() {
        return this.get("password");
    }

    public set password(password: string) {
        this.set("password", password);
    }

    public get name() {
        return this.get("name");
    }

    public get picture() {
        return this.get("picture");
    }
}

interface userData {
    user_login_id: string,
    user_name: string,
    password: string,
    name: string,
    picture: string
}