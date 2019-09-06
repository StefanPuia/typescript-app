import mysql from 'mysql2';
import BaseConfig from '../config/base.config';
import Debug from './debug.util';
import BaseUtil from './base.util';

export default abstract class DatabaseUtil {
    private static mysqlConnection: mysql.Connection;
    private static initialized: boolean = false;
    private static readonly moduleName: string = 'DatabaseUtil';
    private static databaseConfig: DatabaseConnection;
    private static entityDefinitions: Array<EntityDefinition>;
    private static databaseFormatMode: number = 0;
    public static readonly MODE = {
        REBUILD: 3,
        EXTEND: 2,
        CREATE: 1,
        IGNORE: 0
    }
    public static readonly DATA_TYPE = {
        NUMBER: "INT",
        ID_SHORT: "VARCHAR(25)",
        ID_LONG: "VARCHAR(45)",
        DESCRIPTION: "VARCHAR(500)",
        BOOLEAN: "BOOLEAN",
        TIMESTAMP: "TIMESTAMP",
        DATETIME: "DATETIME"
    }
    private static readonly timestampFields: Array<FieldDefinition> = [{
        "name": "created_stamp",
        "type": DatabaseUtil.DATA_TYPE.TIMESTAMP,
        "default": "CURRENT_TIMESTAMP",
        "notNull": true
    }, {
        "name": "last_updated_stamp",
            "type": DatabaseUtil.DATA_TYPE.TIMESTAMP,
        "default": "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        "notNull": true,
    }]

    public static init(databaseConfig: DatabaseConnection, databaseFormatMode: number, entityDefinitions: Array<EntityDefinition>, afterInit?: Function): void {
        if (!this.initialized) {
            DatabaseUtil.databaseConfig = databaseConfig;
            DatabaseUtil.databaseFormatMode = databaseFormatMode;
            DatabaseUtil.entityDefinitions = entityDefinitions;
            if (!DatabaseUtil.databaseConfig) {
                Debug.logFatal("Database config not set");
                return;
            }
            this.handleDisconnect(afterInit);
        } else {
            Debug.logWarning('DatabaseUtil already initialized', this.moduleName);
        }
    }

    private static handleDisconnect(afterInit?: Function): void {
        this.mysqlConnection = mysql.createConnection(DatabaseUtil.databaseConfig);

        this.mysqlConnection.connect((err: any) => {
            if (err) {
                Debug.logFatal(err, 'DatabaseUtil');
                setTimeout(this.handleDisconnect, 2000);
            } else {
                if (!this.initialized) {
                    this.initialized = true;
                    Debug.logInfo('DatabaseUtil initialized successfully', this.moduleName);
                    this.reformatTables().then(() => {
                        Debug.logInfo('Table reformat complete', this.moduleName);
                        if (afterInit) {
                            afterInit();
                        }
                    }).catch(err => {
                        Debug.logError(err, this.moduleName);
                    });
                }
            }
        });

        this.mysqlConnection.on('error', (err: any) => {
            Debug.logFatal(err, 'DatabaseUtil');
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                this.handleDisconnect();
            } else {
                Debug.logError(err, 'DatabaseUtil');
            }
        });
    }

    public static transactPromise(query: string = '', inserts?: Array<any>): Promise<Function> {
        return new Promise((resolve, reject) => {
            this.transact(query, inserts, reject, resolve);
        })
    }

    public static transact(query: string = '', inserts: Array<any> = [], reject: Function = Debug.logInfo, resolve: Function = Debug.logError): void {
        if (!this.initialized) {
            reject('DatabaseUtil not initialized');
        }
        let queryStart = new Date().getTime();
        query = query.replace(/\s+/gm, ' ');
        let sql = this.mysqlConnection.format(query, inserts);
        let logSql = BaseConfig.logFullQuery ? sql : query;
        this.mysqlConnection.beginTransaction((err: any) => {
            if (err) {
                Debug.logError(err, 'DatabaseUtil.TransactBegin');
                reject(err);
            } else {
                this.mysqlConnection.query(sql, (err: any, data: any) => {
                    if (err) {
                        return this.mysqlConnection.rollback(() => {
                            Debug.logError('Rolling back transaction. ' + logSql, 'DatabaseUtil.Transact');
                            reject(err);
                        });
                    } else {
                        this.mysqlConnection.commit((err: any) => {
                            if (err) {
                                Debug.logError(err, 'DatabaseUtil.TransactCommit');
                                return this.mysqlConnection.rollback(() => {
                                    Debug.logError('Rolling back transaction. ' + logSql, 'DatabaseUtil.Transact');
                                    reject(err);
                                });
                            } else {
                                Debug.logTiming(`Ran query ${logSql}`, queryStart, undefined, 'DatabaseUtil.Transact');
                                resolve(data);
                            }
                        });
                    }
                });
            }
        });
    }

    private static reformatTables() {
        return new Promise((resolve, reject) => {
            if (DatabaseUtil.databaseFormatMode == DatabaseUtil.MODE.IGNORE) {
                Debug.logInfo("Ignoring table structure", DatabaseUtil.moduleName);
                resolve();
            } else {
                let promiseQueue: Array<Function> = [];
                if (DatabaseUtil.databaseFormatMode >= DatabaseUtil.MODE.REBUILD) {
                    promiseQueue.push(DatabaseUtil.dropTables);
                } else if (DatabaseUtil.databaseFormatMode >= DatabaseUtil.MODE.EXTEND) {
                    promiseQueue.push(DatabaseUtil.extendTables);
                }
                if (DatabaseUtil.databaseFormatMode >= DatabaseUtil.MODE.CREATE) {
                    promiseQueue.push(DatabaseUtil.createTables);
                }

                BaseUtil.queuePromises(promiseQueue).then(resolve).catch(reject);
            }
        })
    }

    private static dropTables(): Promise<Function> {
        return new Promise((resolve: any, reject: any) => {
            let droppedTables: Array<string> = [];
            let tableDrops: Array<Function> = [];
            if (DatabaseUtil.entityDefinitions) {
                // reversing definitions to resolve dependencies
                let reversedDefinitions = DatabaseUtil.entityDefinitions.slice().reverse();
                for (let entity of reversedDefinitions) {
                    tableDrops.push(() => {
                        return new Promise((resolve, reject) => {
                            Promise.all([
                                DatabaseUtil.transactPromise(`SELECT table_name FROM information_schema.TABLES WHERE TABLE_NAME = ?`, [entity.name])
                            ]).then(entityInfo => {
                                let existingEntity: any = entityInfo[0];

                                if (!existingEntity || existingEntity.length === 0) {
                                    Debug.logInfo(`Entity '${entity.name}' does not exist. Not dropping.`, DatabaseUtil.moduleName);
                                    return resolve();
                                }

                                droppedTables.push(entity.name);
                                DatabaseUtil.transactPromise(`drop table if exists ${entity.name}`).then(resolve).catch(reject);
                            }).catch(reject);
                        });
                    });
                }
            }

            BaseUtil.queuePromises(tableDrops).then(() => {
                if (droppedTables.length) {
                    Debug.logInfo(`Dropped ${droppedTables.length} table(s): ['${droppedTables.join("','")}']`, DatabaseUtil.moduleName);
                }
                resolve();
            }).catch(reject);
        });
    }

    private static createTables() {
        return new Promise((resolve: any, reject: any) => {
            let createdTables: Array<string> = [];
            let tableCreates: Array<Function> = [];
            if (DatabaseUtil.entityDefinitions) {
                for (let entity of DatabaseUtil.entityDefinitions) {
                    tableCreates.push(() => {
                        return new Promise((resolve, reject) => {
                            DatabaseUtil.getCreateStatement(entity).then((statement: any) => {
                                if (typeof statement === "string") {
                                    createdTables.push(entity.name);
                                    DatabaseUtil.transactPromise(statement).then(resolve).catch(reject);
                                } else {
                                    resolve();
                                }
                            }).catch(reject);
                        })
                    })
                }
            }

            BaseUtil.queuePromises(tableCreates).then(() => {
                if (createdTables.length) {
                    Debug.logInfo(`Created ${createdTables.length} table(s): ['${createdTables.join("','")}']`, DatabaseUtil.moduleName);
                }
                resolve();
            }).catch(reject);
        });
    }

    private static getCreateStatement(entity: EntityDefinition) {
        return new Promise((resolve, reject) => {
            Promise.all([
                DatabaseUtil.transactPromise(`SELECT table_name FROM information_schema.TABLES WHERE TABLE_NAME = ?`, [entity.name]),
            ]).then(entityInfo => {
                let existingEntity: any = entityInfo[0];

                if (existingEntity && existingEntity.length !== 0) {
                    Debug.logInfo(`Entity '${entity.name}' already exists. Not creating.`, DatabaseUtil.moduleName);
                    return resolve();
                }

                let primaryKeys: Array<string> = [];
                let uniqueKeys: Array<string> = [];
                let fields: Array<string> = [];
                for (let field of entity.fields) {
                    DatabaseUtil.getFieldDefinition(field, primaryKeys, uniqueKeys, fields);
                }
                for (let timestampField of DatabaseUtil.timestampFields) {
                    DatabaseUtil.getFieldDefinition(timestampField, primaryKeys, uniqueKeys, fields);
                }
                let primaryKeysDef = primaryKeys.length ? `primary key (${primaryKeys.join(", ")})` : "";
                let constraints = [fields.length ? `${fields.join(", ")}` : "", primaryKeysDef].concat(uniqueKeys);
                if (entity.foreignKeys) {
                    for (let fk of entity.foreignKeys) {
                        constraints.push(`constraint ${fk.name} 
                            foreign key (${fk.field})
                            references ${fk.reference.table}(${fk.reference.field})
                            on delete ${fk.onDelete}
                            on update ${fk.onUpdate}`);
                    }
                }
                resolve(`create table if not exists ${entity.name} (${constraints.filter(x => x.trim() !== "").join(", ")})`);
            }).catch(reject);
        })
    }

    private static getFieldDefinition(field: FieldDefinition, primaryKeys: Array<string>, uniqueKeys: Array<string>, fields: Array<string>) {
        let nullType = field.notNull ? "not null" : "null";
        let autoIncrement = field.autoIncrement ? "auto_increment" : "";
        let defaultExpression = field.default ? "DEFAULT " + field.default : "";
        if (field.primaryKey === true) {
            primaryKeys.push(field.name);
        }
        if (field.unique === true) {
            uniqueKeys.push(`unique index ${field.name}_unique (${field.name} asc)`);
        }
        fields.push(`${field.name} ${field.type} ${nullType} ${defaultExpression || autoIncrement}`);
    }

    private static extendTables() {
        return new Promise((resolve: any, reject: any) => {
            let extendedTables: Array<string> = [];
            let tableExtensions: Array<Function> = [];
            if (DatabaseUtil.entityDefinitions) {
                for (let entity of DatabaseUtil.entityDefinitions) {
                    tableExtensions.push(() => {
                        return new Promise((resolve, reject) => {
                            DatabaseUtil.getExtendStatement(entity).then((statement: any) => {
                                if (typeof statement === "string") {
                                    extendedTables.push(entity.name);
                                    DatabaseUtil.transactPromise(statement).then(resolve).catch(reject);
                                } else {
                                    resolve();
                                }
                            }).catch(reject);
                        })
                    })
                }
            }

            BaseUtil.queuePromises(tableExtensions).then(() => {
                if (extendedTables.length) {
                    Debug.logInfo(`Extended ${extendedTables.length} table(s): ['${extendedTables.join("','")}']`, DatabaseUtil.moduleName);
                }
                resolve();
            }).catch(reject);
        });
    }

    private static getExtendStatement(entity: EntityDefinition) {
        return new Promise((resolve, reject) => {
            Promise.all([
                DatabaseUtil.transactPromise(`SELECT table_name FROM information_schema.TABLES WHERE TABLE_NAME = ?`, [entity.name]),
                DatabaseUtil.transactPromise(`SELECT column_name FROM information_schema.COLUMNS WHERE TABLE_NAME = ?`, [entity.name]),
                DatabaseUtil.transactPromise(`SELECT constraint_name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = ?`, [entity.name])
            ])
            .then(entityInfo => {
                let existingEntity: any = entityInfo[0];
                let existingFields: any = entityInfo[1];
                let existingConstraints: any = entityInfo[2];

                if (!existingEntity || existingEntity.length === 0) {
                    Debug.logInfo(`Entity '${entity.name}' does not exist. Not extending.`, DatabaseUtil.moduleName);
                    return resolve();
                }

                existingFields = existingFields.map((x: any) => x.column_name);
                existingConstraints = existingConstraints.map((x: any) => x.constraint_name);

                let fields: Array<string> = [];
                for (let field of entity.fields) {
                    if (existingFields.indexOf(field.name) > -1) continue;
                    fields.push(DatabaseUtil.getFieldExtension(field));
                }
                let constraints = fields;
                if (entity.foreignKeys) {
                    for (let fk of entity.foreignKeys) {
                        if (existingConstraints.indexOf(fk.name) > -1) continue;
                        constraints.push(`add constraint ${fk.name} 
                            foreign key (${fk.field})
                            references ${fk.reference.table}(${fk.reference.field})
                            on delete ${fk.onDelete}
                            on update ${fk.onUpdate}`);
                    }
                }
                constraints = constraints.filter(x => x.trim() !== "");
                if (constraints.length) {
                    resolve(`alter table ${entity.name} ${constraints.join(", ")}`);
                } else {
                    Debug.logInfo(`Nothing to extend on '${entity.name}'.`, DatabaseUtil.moduleName);
                    resolve();
                }
            }).catch(reject);
        })
    }
    
    private static getFieldExtension(field: FieldDefinition) {
        let nullType = field.notNull ? "not null" : "null";
        let autoIncrement = field.autoIncrement ? "auto_increment" : "";
        let defaultExpression = field.default ? "DEFAULT " + field.default : "";
        return `add column ${field.name} ${field.type} ${nullType} ${defaultExpression || autoIncrement}`;
    }
}