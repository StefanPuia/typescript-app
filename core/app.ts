import express from 'express';
import bodyParser from 'body-parser';
import BaseConfig from '../config/base.config';

const app = express();
app.set('port', BaseConfig.port);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');
app.set('views', BaseConfig.viewsLocation);

export default app;