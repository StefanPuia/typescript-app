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

type EntityDefinition = {
    name: string,
    ignore?: boolean,
    foreignKeys?: Array<ForeignKeyDefinition>,
    fields: Array<FieldDefinition>
}

type FieldDefinition = {
    name: string,
    type: string,
    primaryKey?: boolean,
    notNull?: boolean,
    unique?: boolean,
    autoIncrement?: boolean,
    default?: string
}

type ForeignKeyDefinition = {
    name: string,
    field: string,
    reference: {
        table: string,
        field: string
    },
    onUpdate: "no action" | "restrict" | "cascade" | "set null",
    onDelete: "no action" | "restrict" | "cascade" | "set null"
}