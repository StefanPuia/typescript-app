import express from 'express';
import bodyParser from 'body-parser';
import Config from '../config/base.config';

const app = express();
app.set('port', Config.port);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');
app.set('views', Config.viewsLocation);

export default app;