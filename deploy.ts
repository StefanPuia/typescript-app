///<reference path='./core/types.d.ts'/>

import app from './core/app';
import Debug from './utils/debug.util';
import DatabaseUtil from './utils/database.util';

DatabaseUtil.init();

const server = app.listen(app.get('port'), () => {
    Debug.logInfo(`App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`, 'Deploy');
});

export default server;