import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
const MySQLStore = require('connect-mysql')(session);
import Config from '../config/base.config';

const app = express();
app.set('port', Config.port);

// app.use(cookieParser());
// app.use(session({
//     secret: Config.cookieSettings.secret,
//     cookie: Config.cookieSettings.cookie,
//     store: new MySQLStore({
//         config: Config.database
//     })
// }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');
app.set('views', Config.viewsLocation);

export default app;