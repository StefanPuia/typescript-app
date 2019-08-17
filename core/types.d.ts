type GenericObject = { [key: string]: any };

type DatabaseConnection = {
    host: string,
    database: string,
    user: string,
    password: string,
    multipleStatements?: boolean
}

type CookieSettings = {
    secret: string,
    cookie: {
        secure: boolean,
        maxAge: number
    }
}