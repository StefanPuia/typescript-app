///<reference path='./core/types.d.ts'/>

import { BaseConfig } from './config/base.config';
import { EntityLoad } from './config/entity.load.config';
import { ServiceLoad } from './config/service.load.config';
import { app } from './core/app';
import { ServiceEngine } from './core/engine/service.engine';
import { DatabaseUtil } from './utils/database.util';
import { DebugUtil } from './utils/debug.util';
import { LabelUtil } from './utils/label.util';
import { BaseLabels } from './config/base.labels';

LabelUtil.append(BaseLabels);
DatabaseUtil.init(BaseConfig.databaseConfig, BaseConfig.databaseMode, EntityLoad);
ServiceEngine.append(ServiceLoad);

const server = app.listen(app.get('port'), () => {
    DebugUtil.logInfo(`App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`, 'Deploy');
});

export { server };
