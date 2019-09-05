import path from 'path';

export default abstract class BaseConfig {
    public static logFullQuery: boolean = false;
    public static viewsLocation: string = path.join(__dirname, '../views');
    public static port = 8080;
    public static logLevel: number = 0;
    public static cacheViews: boolean = false;
    public static screenErrorHandler?: Function;
    public static databaseConfig: DatabaseConnection;
    public static cookieSettings: CookieSettings;
    public static entities: Array<EntityDefinition>;
    public static databaseMode: number = 0; // 0 - ignore, 1 - create, 2 - extend, 3 - rebuild
}