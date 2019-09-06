import { GenericValue } from '../generic.value';
import SecurityUtil from '../../utils/security.util';
import DatabaseUtil from '../../utils/database.util';
export class User extends GenericValue {
    public static readonly entity: string = 'user';
    public readonly entity: string = User.entity;
    protected readonly primaryKeyField: string = 'username';
    protected data?: userData;

    public static create(): User {
        return new User();
    }

    public static readonly definition: EntityDefinition = {
        "name": "user",
        "fields": [{
            "name": "username",
            "type": DatabaseUtil.DATA_TYPE.ID_LONG,
            "primaryKey": true,
            "notNull": true,
            "unique": true
        }, {
            "name": "password",
            "type": DatabaseUtil.DATA_TYPE.DESCRIPTION
        }]
    };

    public find(id: string): Promise<User> {
        return this.doSelect(id, false);
    }

    public static findAll(condition: string = "", inserts: any[] = []): Promise<User[]> {
        return new Promise((resolve, reject) => {
            this.doSelectAll(User.entity, condition, inserts).then(results => {
                let users: Array<User> = [];
                for (let user of results) {
                    let userObject = new User();
                    userObject.setData(user);
                    users.push(userObject);
                }
                resolve(users);
            }).catch(reject);
        });
    }

    public findLogin(username: string, password: string): Promise<User> {
        let hashedPassword = SecurityUtil.hashPassword(password);
        return new Promise((resolve, reject) => {
            this.doSelectAll(`upper(username) = upper(?) and password = ?`, [username, hashedPassword])
            .then(users => {
                if (users.length === 0) {
                    reject("User not found.");
                } else {
                    this.setData(users[0]);
                    resolve(this);
                }
            })
        })
    }

    public get username() {
        return this.get("username");
    }

    public get password() {
        return this.get("password");
    }

    public set password(password: string) {
        this.set("password", password);
    }
}

interface userData {
    username: string,
    password: string
}