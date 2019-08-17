import path from 'path';

export default abstract class Config {
    public static logFullQuery: boolean = false;
    public static viewsLocation: string = path.join(__dirname, '../views');
    public static port = 8080;
    public static logLevel: number = 0;
    public static cacheViews: boolean = false;
    public static screenErrorHandler?: Function;
    public static databaseConfig: DatabaseConnection;
    public static cookieSettings: CookieSettings;
}