import { DebugUtil } from '../../../utils/debug.util';
import { BaseUtil } from '../../../utils/base.util';
import { BaseConfig } from '../../../config/base.config';
import { CacheEngine } from '../cache.engine';
import { Connection, createConnection } from "mysql2";
import { CaseUtil } from '../../../utils/case.util';
import { GenericValue } from './generic.value';
import { TypeEngine } from '../type.engine';

export class EntityEngine {
    private static readonly moduleName: string = "EntityEngine";
    private mysqlConnection!: Connection;
    private initialized: boolean = false;

    private static databaseFormatMode: number = 0;
    private static databaseConfig: DatabaseConnection;
    private static entityDefinitions: Array<EntityDefinition>;
    private static publicEntityDefinitions: Array<EntityDefinition>;
    private static initCallback: Function;
    private static instance: EntityEngine;
    
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
        ID_VLONG: "VARCHAR(255)",
        DESCRIPTION: "VARCHAR(500)",
        BOOLEAN: "BOOLEAN",
        UNIX_TIMESTAMP: "INT(13)",
        TIMESTAMP: "TIMESTAMP",
        DATETIME: "DATETIME",
        TEXT: "TEXT"
    }
    private static readonly timestampFields: Array<FieldDefinition> = [{
        "name": "created_stamp",
        "type": EntityEngine.DATA_TYPE.TIMESTAMP,
        "default": "CURRENT_TIMESTAMP",
        "notNull": true
    }, {
        "name": "last_updated_stamp",
        "type": EntityEngine.DATA_TYPE.TIMESTAMP,
        "default": "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        "notNull": true,
    }]

    private constructor() {
        if (!this.initialized) {
            this.handleDisconnect();
        }
    }

    public static initSettings(databaseConfig: DatabaseConnection, entityDefinitions: Array<EntityDefinition>,
            databaseFormatMode: number, initCallback: Function) {
        EntityEngine.databaseConfig = databaseConfig;
        for (const entity of entityDefinitions) {
            if (entity.type !== "VIEW") {
                entity.fields = entity.fields.concat(EntityEngine.timestampFields);
            }
        }
        EntityEngine.entityDefinitions = entityDefinitions;
        EntityEngine.publicEntityDefinitions = entityDefinitions.map(entity => {
            return {
                "name": CaseUtil.snakeToPascal(entity.name),
                "type": entity.type,
                "fields": entity.fields.map(field => {
                    return {
                        "name": CaseUtil.snakeToCamel(field.name),
                        "type": field.type
                    }
                })
            }
        })
        EntityEngine.initCallback = initCallback;
        EntityEngine.databaseFormatMode = databaseFormatMode;
        EntityEngine.getInstance();
    }

    private static getInstance() {
        if (!EntityEngine.instance) {
            EntityEngine.instance = new EntityEngine();
        }
        return EntityEngine.instance;
    }

    private static getConnection() {
        return this.getInstance().mysqlConnection;
    }

    private handleDisconnect(): void {
        this.mysqlConnection = createConnection(EntityEngine.databaseConfig);

        this.mysqlConnection.connect((err: any) => {
            if (err) {
                DebugUtil.logFatal(err, 'EntityEngine');
                setTimeout(this.handleDisconnect, 2000);
            } else {
                if (!this.initialized) {
                    this.initialized = true;
                    DebugUtil.logInfo('Entity Engine initialized successfully', EntityEngine.moduleName);
                    this.reformatTables().then((reformatted: any) => {
                        if (reformatted) {
                            DebugUtil.logInfo('Table reformat complete', EntityEngine.moduleName);
                        }
                        EntityEngine.initCallback();
                    }).catch(err => {
                        DebugUtil.logError(err, EntityEngine.moduleName);
                    });
                }
            }
        });

        this.mysqlConnection.on('error', (err: any) => {
            DebugUtil.logFatal(err, EntityEngine.moduleName);
            setTimeout(this.handleDisconnect, 10000);
        });
    }

    public static getEntityNames(): Array<string> {
        return EntityEngine.entityDefinitions.map(entity => CaseUtil.snakeToPascal(entity.name));
    }

    public static getPublicEntityDefinitions(): Array<EntityDefinition> {
        return EntityEngine.publicEntityDefinitions;
    }

    public static getEntityDefinitions(): Array<EntityDefinition> {
        return EntityEngine.entityDefinitions;
    }

    public static getPublicEntityDefinition(entityName: string): EntityDefinition | undefined {
        return this.getPublicEntityDefinitions().find(x => x.name == entityName);
    }

    public static getEntityDefinition(entityName: string): EntityDefinition | undefined {
        entityName = CaseUtil.pascalToSnake(entityName);
        return this.getEntityDefinitions().find(x => x.name == entityName);
    }

    private reformatTables() {
        return new Promise((resolve, reject) => {
            if (EntityEngine.databaseFormatMode == EntityEngine.MODE.IGNORE) {
                DebugUtil.logInfo("Ignoring table structure", EntityEngine.moduleName);
                resolve(false);
            } else {
                let promiseQueue: Array<Function> = [];
                if (EntityEngine.databaseFormatMode >= EntityEngine.MODE.REBUILD) {
                    promiseQueue.push(this.dropTables);
                } else if (EntityEngine.databaseFormatMode >= EntityEngine.MODE.EXTEND) {
                    promiseQueue.push(this.extendTables);
                }
                if (EntityEngine.databaseFormatMode >= EntityEngine.MODE.CREATE) {
                    promiseQueue.push(this.createTables);
                }

                BaseUtil.queuePromises(promiseQueue, this).then(() => {
                    resolve(true);
                }).catch(reject);
            }
        })
    }

    private dropTables(): Promise<any> {
        return new Promise((resolve: any, reject: any) => {
            let droppedTables: Array<string> = [];
            let tableDrops: Array<Function> = [];
            if (EntityEngine.entityDefinitions) {
                // reversing definitions to resolve dependencies
                let reversedDefinitions = EntityEngine.entityDefinitions.slice().reverse();
                for (let entity of reversedDefinitions) {
                    if (entity.ignore) {
                        DebugUtil.logInfo(`Ignoring entity '${entity.name}'`, EntityEngine.moduleName);
                        continue;
                    }
                    tableDrops.push(() => {
                        return new Promise((resolve, reject) => {
                            Promise.all([
                                EntityEngine.transactPromise(`SELECT table_name FROM information_schema.TABLES WHERE TABLE_NAME = ?`, [entity.name])
                            ]).then(entityInfo => {
                                let existingEntity: any = entityInfo[0];

                                if (!existingEntity || existingEntity.length === 0) {
                                    DebugUtil.logInfo(`Entity '${entity.name}' does not exist. Not dropping.`, EntityEngine.moduleName);
                                    return resolve();
                                }

                                droppedTables.push(entity.name);
                                EntityEngine.transactPromise(`drop ${entity.type} if exists ${entity.name}`).then(resolve).catch(reject);
                            }).catch(reject);
                        });
                    });
                }
            }

            BaseUtil.queuePromises(tableDrops, this).then(() => {
                if (droppedTables.length) {
                    DebugUtil.logInfo(`Dropped ${droppedTables.length} table(s): ['${droppedTables.join("','")}']`, EntityEngine.moduleName);
                }
                resolve();
            }).catch(reject);
        });
    }

    private createTables() {
        return new Promise((resolve: any, reject: any) => {
            let createdTables: Array<string> = [];
            let tableCreates: Array<Function> = [];
            if (EntityEngine.entityDefinitions) {
                for (let entity of EntityEngine.entityDefinitions) {
                    if (entity.ignore) {
                        DebugUtil.logInfo(`Ignoring entity '${entity.name}'`, EntityEngine.moduleName);
                        continue;
                    }
                    tableCreates.push(() => {
                        return new Promise((resolve, reject) => {
                            this.getCreateStatement(entity).then((statement: any) => {
                                if (typeof statement === "string") {
                                    createdTables.push(entity.name);
                                    EntityEngine.transactPromise(statement).then(resolve).catch(reject);
                                } else {
                                    resolve();
                                }
                            }).catch(reject);
                        })
                    })
                }
            }

            BaseUtil.queuePromises(tableCreates, this).then(() => {
                if (createdTables.length) {
                    DebugUtil.logInfo(`Created ${createdTables.length} table(s): ['${createdTables.join("','")}']`, EntityEngine.moduleName);
                }
                resolve();
            }).catch(reject);
        });
    }

    private getCreateStatement(entity: EntityDefinition) {
        return new Promise((resolve, reject) => {
            Promise.all([
                EntityEngine.transactPromise(`SELECT table_name FROM information_schema.TABLES WHERE TABLE_NAME = ?`, [entity.name]),
            ]).then(entityInfo => {
                let existingEntity: any = entityInfo[0];

                if (existingEntity && existingEntity.length !== 0) {
                    DebugUtil.logInfo(`Entity '${entity.name}' already exists. Not creating.`, EntityEngine.moduleName);
                    return resolve();
                }

                let primaryKeys: Array<string> = [];
                let uniqueKeys: Array<string> = [];
                let fields: Array<string> = [];
                for (let field of entity.fields) {
                    this.getFieldDefinition(field, primaryKeys, uniqueKeys, fields);
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
                if (entity.type === "TABLE") {
                    resolve(`create table if not exists ${entity.name} (${constraints.filter(x => x.trim() !== "").join(", ")})`);
                } else {
                    resolve(`create view ${entity.name} as ${entity.viewDefinition}`);
                }
            }).catch(reject);
        })
    }

    private getFieldDefinition(field: FieldDefinition, primaryKeys: Array<string>, uniqueKeys: Array<string>, fields: Array<string>) {
        let nullType = field.notNull ? "not null" : "";
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

    private extendTables() {
        return new Promise((resolve: any, reject: any) => {
            let extendedTables: Array<string> = [];
            let tableExtensions: Array<Function> = [];
            if (EntityEngine.entityDefinitions) {
                for (let entity of EntityEngine.entityDefinitions) {
                    if (entity.ignore || entity.type === "VIEW") {
                        DebugUtil.logInfo(`Ignoring entity '${entity.name}'`, EntityEngine.moduleName);
                        continue;
                    }
                    tableExtensions.push(() => {
                        return new Promise((resolve, reject) => {
                            this.getExtendStatement(entity).then((statement: any) => {
                                if (typeof statement === "string") {
                                    extendedTables.push(entity.name);
                                    EntityEngine.transactPromise(statement).then(resolve).catch(reject);
                                } else {
                                    resolve();
                                }
                            }).catch(reject);
                        })
                    })
                }
            }

            BaseUtil.queuePromises(tableExtensions, this).then(() => {
                if (extendedTables.length) {
                    DebugUtil.logInfo(`Extended ${extendedTables.length} table(s): ['${extendedTables.join("','")}']`, EntityEngine.moduleName);
                }
                resolve();
            }).catch(reject);
        });
    }

    private getExtendStatement(entity: EntityDefinition) {
        return new Promise((resolve, reject) => {
            Promise.all([
                EntityEngine.transactPromise(`SELECT table_name FROM information_schema.TABLES WHERE TABLE_NAME = ?`, [entity.name]),
                EntityEngine.transactPromise(`SELECT column_name FROM information_schema.COLUMNS WHERE TABLE_NAME = ?`, [entity.name]),
                EntityEngine.transactPromise(`SELECT constraint_name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = ?`, [entity.name])
            ])
            .then(entityInfo => {
                let existingEntity: any = entityInfo[0];
                let existingFields: any = entityInfo[1];
                let existingConstraints: any = entityInfo[2];

                if (!existingEntity || existingEntity.length === 0) {
                    DebugUtil.logInfo(`Entity '${entity.name}' does not exist. Not extending.`, EntityEngine.moduleName);
                    return resolve();
                }

                existingFields = existingFields.map((x: any) => x.column_name);
                existingConstraints = existingConstraints.map((x: any) => x.constraint_name);

                let fields: Array<string> = [];
                for (let field of entity.fields) {
                    if (existingFields.indexOf(field.name) > -1) continue;
                    fields.push(this.getFieldExtension(field));
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
                    DebugUtil.logInfo(`Nothing to extend on '${entity.name}'.`, EntityEngine.moduleName);
                    resolve();
                }
            }).catch(reject);
        })
    }
    
    private getFieldExtension(field: FieldDefinition) {
        let nullType = field.notNull ? "not null" : "null";
        let autoIncrement = field.autoIncrement ? "auto_increment" : "";
        let defaultExpression = field.default ? "DEFAULT " + field.default : "";
        return `add column ${field.name} ${field.type} ${nullType} ${defaultExpression || autoIncrement}`;
    }

    public static transactPromise(query: string = '', inserts: Array<any> = [], cache: boolean = false, applyCase: boolean = true): Promise<any> {
        return new Promise((resolve, reject) => {
            this.transact(query, inserts, reject, resolve, cache, applyCase);
        })
    }

    public static transact(query: string = '', inserts: Array<any> = [], reject: Function = DebugUtil.logInfo,
        resolve: Function = DebugUtil.logError, cache: boolean = false, applyCase: boolean = true): void {

        if (!EntityEngine.getInstance().initialized) {
            return reject('Entity Engine not initialized');
        }
        let queryStart = new Date().getTime();
        query = query.replace(/\s+/gm, ' ');
        let sql = EntityEngine.getInstance().mysqlConnection.format(query, inserts);
        let logSql = BaseConfig.logFullQuery ? sql : query;
        EntityEngine.getInstance().mysqlConnection.beginTransaction((err: any) => {
            if (err) {
                DebugUtil.logError(err, 'EntityEngine.TransactBegin');
                reject(err);
            } else {
                let func: Function = EntityEngine.getInstance().query;
                if (cache) func = EntityEngine.getInstance().cacheQuery;
                func.apply(EntityEngine.getInstance(), [sql, inserts]).then((result: any) => {
                    EntityEngine.getInstance().mysqlConnection.commit((err: any) => {
                        if (err) {
                            DebugUtil.logError(err, 'EntityEngine.TransactCommit');
                            return EntityEngine.getInstance().mysqlConnection.rollback(() => {
                                DebugUtil.logError('Rolling back transaction. ' + logSql, 'EntityEngine.Transact');
                                reject(err);
                            });
                        } else {
                            if (!result.cached) {
                                DebugUtil.logTiming(`Ran query ${logSql}`, queryStart, undefined, 'EntityEngine.Transact');
                            }
                            if (applyCase) {
                                if (result.data instanceof Array) {
                                    resolve(result.data.map((obj: any) => EntityEngine.resultsCaseChange(obj)));
                                } else {
                                    resolve(EntityEngine.resultsCaseChange(result.data));
                                }
                            } else {
                                resolve(result.data);
                            }
                        }
                    });
                }).catch((err: any) => {
                    return EntityEngine.getInstance().mysqlConnection.rollback(() => {
                        DebugUtil.logError('Rolling back transaction. ' + logSql, 'EntityEngine.Transact');
                        reject(err);
                    });
                });
            }
        });
    }

    private static resultsCaseChange(object: any): GenericObject {
        const output: GenericObject = {};
        const converter = CaseUtil.from(CaseUtil.SNAKE).to(CaseUtil.CAMEL);
        for (const key of Object.keys(object)) {
            output[converter.convert(key)] = object[key];
        }
        return output;
    }

    private cacheQuery(sql: string, inserts: Array<any> = []): Promise<any> {
        return new Promise((resolve, reject) => {
            let cacheName = CacheEngine.buildParameterSubKey([sql]);
            let parameterSubKey = CacheEngine.buildParameterSubKey(inserts) || "default";
            let cacheObject = CacheEngine.get("entity", cacheName, parameterSubKey);
            if (typeof cacheObject !== "undefined") {
                return resolve({
                    data: cacheObject.value,
                    cached: true
                });
            }
            this.query(sql).then(value => {
                CacheEngine.store("entity", cacheName, value.data, parameterSubKey);
                resolve({
                    data: value.data,
                    cached: false
                });
            }).catch(reject);
        });
    }

    private query(sql: string, inserts?: Array<any>): Promise<any> {
        return new Promise((resolve, reject) => {
            this.mysqlConnection.query(sql, inserts, (err: any, data: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        data: data,
                        cached: false
                    });
                }
            });
        });
    }

    public static validateField(entityName: string, field: string): FieldDefinition {
        return this.validateFields(entityName, [field])[0];
    }

    public static validateFieldValuePair(entityName: string, field: string, value: any): void;
    public static validateFieldValuePair(entityName: string, field: string, value: any, nullCheck: boolean): void;
    public static validateFieldValuePair(entityName: string, field: string, value: any, nullCheck: boolean = false): void {
        const fieldDefinition = EntityEngine.validateField(entityName, field);
        TypeEngine.convert(value, fieldDefinition.type, nullCheck);
    }

    public static validateFields(entityName: string, fields: Array<string>): Array<FieldDefinition> {
        entityName = CaseUtil.pascalToSnake(entityName);
        const entity = this.getEntityDefinition(entityName);
        const definitions: Array<FieldDefinition> = [];
        if (entity) {
            for (const field of fields) {
                const fieldName = CaseUtil.camelToSnake(field);
                const fieldDefinition = entity.fields.find(f => f.name === fieldName);
                if (!fieldDefinition) {
                    throw new Error(`Field '${field}' of entity '${entityName}' is not defined.`);
                } else {
                    definitions.push(fieldDefinition);
                }
            }
        } else {
            throw new Error(`Entity '${entityName}' is not defined.`);
        }
        return definitions;
    }

    public static makeCondition(conditions: Array<Condition>): string;
    public static makeCondition(conditions: Array<Condition>, ejo: JoinOperator): string;
    public static makeCondition(conditions: Array<Condition>, ejo: JoinOperator = "AND"): string {
        const final: Array<string> = [];
        for (const cond of conditions) {
            let i = 0;
            final.push(cond.clause.replace(/\?/g, () => {
                return this.getConnection().escape(cond.inserts[i++]);
            }))
        }
        return final.join(` ${ejo} `);
    }

    public static insert(entity: string, values: Array<GenericValue>) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    public static update(entity: string, values: Array<GenericValue>) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
}