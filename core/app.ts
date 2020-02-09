import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express, { Application } from 'express';
import session from 'express-session';
import { BaseConfig } from '../config/base.config';
import { frameworkController } from '../controllers/framework.controller';
import { BaseUtil } from '../utils/base.util';
import { WSEngine } from './engine/websocket.engine';
import morgan = require('morgan');
import expressWs from 'express-ws';
const MySQLStore = require('connect-mysql')(session);

const app: Application = express();
app.set('port', BaseConfig.port);

app.use(morgan(BaseUtil.morgan, {
    skip: BaseUtil.morganSkip
}));

app.use(cookieParser());
app.use(session({
    secret: BaseConfig.cookieSettings.secret,
    cookie: BaseConfig.cookieSettings.cookie,
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore({
        config: BaseConfig.databaseConfig
    })
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.set('view engine', 'ejs');
app.set('views', BaseConfig.viewsLocation);

if (BaseConfig.enableFrameworkController) {
    app.use("/framework/", frameworkController);
}

WSEngine.init(expressWs(app).app);

export { app };