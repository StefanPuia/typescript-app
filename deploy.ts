///<reference path='./core/types.d.ts'/>

import app from './core/app';
import Debug from './utils/debug.util';
import DatabaseUtil from './utils/database.util';
import Config from './config/base.config';

DatabaseUtil.init(Config.databaseConfig, Config.databaseMode, Config.entities);

const server = app.listen(app.get('port'), () => {
    Debug.logInfo(`App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`, 'Deploy');
});

export default server;