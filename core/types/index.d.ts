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

type SocialAuth = {
    clientID: string,
    clientSecret: string
}

type EntityDefinition = {
    name: string,
    type: "VIEW" | "TABLE",
    ignore?: boolean,
    foreignKeys?: Array<ForeignKeyDefinition>,
    fields: Array<FieldDefinition>,
    viewDefinition?: string
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

type EntityCondition = string | ViewEntityJoinFieldDefinition | ViewEntityJoinFieldGroup | Array<ViewEntityJoinFieldGroup> | undefined;

type EntityViewDefinition = {
    name: string,
    table: string,
    alias: string,
    joins?: Array<ViewEntityJoinDefinition>,
    fields?: Array<ViewFieldDefinition>,
    condition?: EntityCondition
}

type ViewEntityJoinDefinition = {
    table: string,
    alias: string,
    joinType: "INNER" | "LEFT" | "RIGHT" | "OUTER",
    condition?: EntityCondition
}

type ViewFieldDefinition = {
    name?: string,
    alias?: string,
    value?: any
}

type ViewEntityJoinFieldDefinition = {
    from: ViewFieldDefinition,
    to: ViewFieldDefinition,
    operator: string
}

type ViewEntityJoinFieldGroup = {
    joinFields: Array<ViewEntityJoinFieldDefinition>,
    condition: "AND" | "OR"
}

type Condition = {
    clause: string,
    inserts: Array<any>
}

type JoinOperator = "AND" | "OR";

type DynamicDefinition = {
    alias?: string,
    name: string,
    fieldAlias?: string
}

type JoinCondition = {
    field: string,
    relField?: string,
    value?: any
}

type EntityJoin = {
    type: "BASE" | "INNER" | "OUTER",
    def: DynamicDefinition,
    condition: Array<JoinCondition>
}

type EntityJoinStore = {
    [alias: string]: EntityJoin
}

type OrderByField = {
    alias?: string,
    name: string,
    asc: boolean
}