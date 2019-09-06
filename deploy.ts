///<reference path='./core/types.d.ts'/>

import app from './core/app';
import Debug from './utils/debug.util';
import DatabaseUtil from './utils/database.util';
import BaseConfig from './config/base.config';
import EntityLoad from './config/entity.load.config';

DatabaseUtil.init(BaseConfig.databaseConfig, BaseConfig.databaseMode, EntityLoad);

const server = app.listen(app.get('port'), () => {
    Debug.logInfo(`App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`, 'Deploy');
});

export default server;