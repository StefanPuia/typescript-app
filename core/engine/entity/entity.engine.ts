import { DebugUtil } from '../../../utils/debug.util';
import { BaseUtil } from '../../../utils/base.util';
import { BaseConfig } from '../../../config/base.config';
import { CacheEngine } from '../cache.engine';
import { Connection, createConnection, escape as mysqlEscape, ConnectionConfig } from 'mysql';
import { CaseUtil } from '../../../utils/case.util';
import { GenericValue } from './generic.value';
import { TypeEngine } from '../type.engine';
import { DynamicEntity } from './dynamic.entity';
import { EntityQuery } from './entity.query';

export class EntityEngine {
    private static readonly moduleName: string = "EntityEngine";
    private mysqlConnection!: Connection;
    private initialized: boolean = false;

    private static databaseFormatMode: number = 0;
    private static databaseConfig: ConnectionConfig;
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

    public static initSettings(databaseConfig: ConnectionConfig, entityDefinitions: Array<EntityDefinition>,
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
                        "type": field.type,
                        "primaryKey": field.primaryKey === true
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
        const self = this;
        self.mysqlConnection = createConnection(EntityEngine.databaseConfig);

        self.mysqlConnection.connect((err: any) => {
            if (err) {
                DebugUtil.logFatal(err, 'EntityEngine');
                setTimeout(self.handleDisconnect, 2000);
            } else {
                if (!self.initialized) {
                    self.initialized = true;
                    DebugUtil.logInfo('Entity Engine initialized successfully', EntityEngine.moduleName);
                    self.reformatTables().then((reformatted: any) => {
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

    public static getPublicEntityDefinition(entityName: string): EntityDefinition {
        const entity = this.getPublicEntityDefinitions().find(x => x.name == entityName);
        if (entity) return entity;
        throw new Error(`Entity '${entityName}' not defined.`);
    }

    public static getEntityDefinition(_entityName: string): EntityDefinition {
        const entityName = CaseUtil.pascalToSnake(_entityName);
        const entity = this.getEntityDefinitions().find(x => x.name == entityName);
        if (entity) return entity;
        throw new Error(`Entity '${_entityName}' not defined.`);
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

    public static execute(query: string = '', inserts: Array<any> = [], cache: boolean = false, applyCase: boolean = false): Promise<any> {
        return new Promise((resolve, reject) => {
            let queryStart = new Date().getTime();
            query = query.replace(/\s+/gm, ' ');
            let sql = EntityEngine.getInstance().mysqlConnection.format(query, inserts);
            let logSql = BaseConfig.logFullQuery ? sql : query;

            let func: Function = EntityEngine.getInstance().query;
            if (cache) func = EntityEngine.getInstance().cacheQuery;
            func.apply(EntityEngine.getInstance(), [sql, inserts]).then((result: any) => {
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
            }).catch((err: any) => {
                DebugUtil.logError(err, 'EntityEngine.Execute');
                return EntityEngine.getInstance().mysqlConnection.rollback(() => {
                    DebugUtil.logError('Rolling back transaction. ' + logSql, 'EntityEngine.Transact');
                    reject(err);
                });
            })
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

    public static validateField(entity: string | DynamicEntity, _field: string): FieldDefinition {
        const field = EntityEngine.parseField(_field);
        if (entity instanceof DynamicEntity) {
            const dynamicDef = entity.fieldExists(_field);
            if (dynamicDef) {
                const entityDef = this.getPublicEntityDefinition(entity.getEntity(dynamicDef.alias || entity.getBaseAlias()).def.name);
                if (!entityDef) {
                    throw new Error(`Could not find the entity definition for field '${_field}'`);
                }
                const definition = entityDef.fields.find(f => f.name === dynamicDef.name);
                if (!definition) {
                    throw new Error(`Could not find the field definition for '${_field}' on '${entityDef.name}' entity.`);
                }
                return definition;
            } else {
                throw new Error(`Could not find the definition for the field '${_field}'`);
            }
        } else {
            return this.validateFields(entity, [field.name])[0];
        }
    }

    public static validateFieldValuePair(entity: string | DynamicEntity, field: string, value: any): void;
    public static validateFieldValuePair(entity: string | DynamicEntity, field: string, value: any, nullCheck: boolean): void;
    public static validateFieldValuePair(entity: string | DynamicEntity, field: string, value: any, nullCheck: boolean = false): void {
        let fieldDefinition = EntityEngine.validateField(entity, field);
        if (fieldDefinition) {
            TypeEngine.convert(value, fieldDefinition.type, nullCheck);
        } else {
            throw new Error(`Could not find the definition for the field '${field}'`);
        }
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
                    throw new Error(`Field '${fieldName}' of entity '${entityName}' is not defined.`);
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

    public static async store(values: Array<GenericValue>): Promise<any> {
        for (const value of values) {
            const entity = value.getEntity();
            if (entity instanceof DynamicEntity) {
                throw new Error(`Cannot perform a store statement on a dynamic entity ${BaseUtil.stringify(value)}`);
            }
            const { entityDef, setData, pkData } = EntityEngine.getGenericValueSQLFields(value);
            const valueExists = await EntityQuery.from(entity).where(EntityEngine.makeValueWhereClause(pkData)).queryFirst();
            if (valueExists) {
                EntityEngine.update([value]);
            } else {
                EntityEngine.insert([value]);
            }
        }
    }

    public static insert(values: Array<GenericValue>): Promise<any> {
        return new Promise((resolve, reject) => {
            const statements: Array<SQLStatement> = values.map(EntityEngine.makeInsertStatement);
            EntityEngine.transact(statements.join(";"), [], reject, (results: any) => {
                if (results instanceof Array) {
                    resolve(results.map(res => res.insertid));
                } else {
                    resolve(results.insertid);
                }
            });
        })
    }

    public static update(values: Array<GenericValue>): Promise<any> {
        return new Promise((resolve, reject) => {
            const statements: Array<SQLStatement> = values.map(EntityEngine.makeUpdateStatement);
            EntityEngine.transact(statements.join(";"), [], reject, (results: any) => {
                if (results instanceof Array) {
                    resolve(results.map(res => res.affectedrows));
                } else {
                    resolve(results.affectedrows);
                }
            });
        })
    }

    public static delete(values: Array<GenericValue>): Promise<any> {
        return new Promise((resolve, reject) => {
            const statements: Array<SQLStatement> = values.map(EntityEngine.makeRemoveStatement);
            EntityEngine.transact(statements.join(";"), [], reject, (results: any) => {
                if (results instanceof Array) {
                    resolve(results.map(res => res.affectedrows));
                } else {
                    resolve(results.affectedrows);
                }
            });
        })
    }

    public static parseField(_field: string): DynamicDefinition {
        let match = _field.trim().match(/^(?:([\w\d]+)\.)?([\w\d*]+)(?: [aA][sS] ([\w\d]+))?$/);
        if (match && match[2]) {
            return { alias: match[1], name: match[2], fieldAlias: match[3] };
        }
        throw new Error(`'${_field}' is not a valid field definition.`);
    }

    public static parseOrderBy(_field: string): OrderByField {
        const field = EntityEngine.parseField(_field);
        const orderBy: OrderByField = {
            name: field.name,
            asc: true
        }
        if (field.alias) orderBy.alias = field.alias;
        const parts = orderBy.name.split(" ").filter(f => f.trim() !== "");
        if (parts.length === 2) {
            orderBy.name = parts[0];
            const modifIndex = ["asc", "desc"].indexOf(parts[1].toLowerCase());
            if (modifIndex > -1) {
                orderBy.asc = modifIndex === 0;
            } else {
                throw new Error(`Order by modifier '${parts[0]}' for field '${_field}' not supported`);
            }
        } else if(parts.length === 1) {
            if (orderBy.name.substr(0, 1) === "-") {
                orderBy.asc = false;
                orderBy.name = orderBy.name.substr(1);
            }
        } else {
            throw new Error(`Field '${_field}' not supported for order by clause`);
        }
        return orderBy;
    }

    private static getGenericValueSQLFields(value: GenericValue) {
        const entity = value.getEntity();

        if (entity instanceof DynamicEntity) {
            throw new Error(`Cannot get value fields for view entity ${BaseUtil.stringify(value)}`);
        }

        const entityDef = EntityEngine.getEntityDefinition(entity);
        if (!entityDef) {
            throw new Error(`Entity '${entity}' not defined.`);
        }
        const data = value.getData();
        delete data.createdStamp;
        delete data.lastUpdatedStamp;
        const setData: GenericObject = {};
        const pkData: GenericObject = {};
        for (const key of Object.keys(data)) {
            const sqlKey = CaseUtil.camelToSnake(key);
            const fieldDef = entityDef.fields.find(f => f.name === sqlKey);
            if (!fieldDef) {
                throw new Error(`Field '${key}' is not valid for entity '${entity}'`);
            }
            if (!fieldDef.primaryKey) {
                setData[sqlKey] = data[key];
            } else {
                pkData[sqlKey] = data[key];
            }
        }

        return {
            entityDef: entityDef,
            pkData: pkData,
            setData: setData
        }
    }

    private static makeValueWhereClause(value: GenericValue) : string;
    private static makeValueWhereClause(pkData: object) : string;
    private static makeValueWhereClause(pkDataOrValue: GenericValue | object): string {
        let _pkData: any = pkDataOrValue;
        if (pkDataOrValue instanceof GenericValue) {
            const { pkData } = EntityEngine.getGenericValueSQLFields(
                pkDataOrValue
            );
            _pkData = pkData;
            
        }
        return Object.keys(_pkData)
            .map((key) => `${key} = ${mysqlEscape(_pkData[key])}`)
            .join(" AND ");
    }

    private static makeInsertStatement(value: GenericValue): SQLStatement {
        const entity = value.getEntity();
        if (entity instanceof DynamicEntity) {
            throw new Error(`Cannot perform an insert statement on a dynamic entity ${BaseUtil.stringify(value)}`);
        }
        const entityDef = EntityEngine.getEntityDefinition(entity);
        if (!entityDef) {
            throw new Error(`Entity '${entity}' not defined.`);
        }
        const data = value.getData();
        return `insert into ${entityDef.name} (${Object.keys(data).map(CaseUtil.camelToSnake).join(",")})
            values (${Object.values(data).map(x => mysqlEscape(x))})`;
    }

    private static makeUpdateStatement(value: GenericValue): SQLStatement {
        const entity = value.getEntity();
        if (entity instanceof DynamicEntity) {
            throw new Error(`Cannot perform an update statement on a dynamic entity ${BaseUtil.stringify(value)}`);
        }
        
        const { entityDef, setData, pkData } = EntityEngine.getGenericValueSQLFields(value);
        const setDataSQL = Object.keys(setData).map(key => `${key} = ${mysqlEscape(setData[key])}`).join(", ");
        return `update ${entityDef.name} set ${setDataSQL} where ${EntityEngine.makeValueWhereClause(pkData)}`;
    }

    private static makeRemoveStatement(value: GenericValue): SQLStatement {
        const entity = value.getEntity();
        if (entity instanceof DynamicEntity) {
            throw new Error(`Cannot perform an delete statement on a dynamic entity ${BaseUtil.stringify(value)}`);
        }
        const { entityDef, pkData } = EntityEngine.getGenericValueSQLFields(value);
        return `delete from ${entityDef.name} where ${EntityEngine.makeValueWhereClause(pkData)}`;
    }
}

type SQLStatement = string