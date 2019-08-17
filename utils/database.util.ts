import mysql from 'mysql2';
import Config from '../config/base.config';
import Debug from './debug.util';

export default abstract class DatabaseUtil {
    private static mysqlConnection: mysql.Connection;
    private static initialized: boolean = false;
    private static readonly moduleName: string = 'DatabaseUtil';
    private static databaseConfig: DatabaseConnection;

    public static init(): void {
        if (!this.initialized) {
            DatabaseUtil.databaseConfig = Config.databaseConfig;
            if (!DatabaseUtil.databaseConfig) {
                Debug.logFatal("Database config not set");
                return;
            }
            this.initialized = true;
            this.handleDisconnect();
            Debug.logInfo('DatabaseUtil initialized successfully', this.moduleName);
        } else {
            Debug.logWarning('DatabaseUtil already initialized', this.moduleName);
        }
    }

    private static handleDisconnect(): void {
        this.mysqlConnection = mysql.createConnection(DatabaseUtil.databaseConfig);

        this.mysqlConnection.connect((err: any) => {
            if (err) {
                Debug.logFatal(err, 'DatabaseUtil');
                setTimeout(this.handleDisconnect, 2000);
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

    public static transactPromise(query: string = '', inserts?: Array<any>) {
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
        let logSql = Config.logFullQuery ? sql : query;
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
}