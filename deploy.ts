///<reference path='./core/types.d.ts'/>

import { BaseConfig } from './config/base.config';
import { EntityLoad } from './config/entity.load.config';
import { app } from './core/app';
import { DatabaseUtil } from './utils/database.util';
import { DebugUtil } from './utils/debug.util';

DatabaseUtil.init(BaseConfig.databaseConfig, BaseConfig.databaseMode, EntityLoad);

const server = app.listen(app.get('port'), () => {
    DebugUtil.logInfo(`App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`, 'Deploy');
});

export { server };
