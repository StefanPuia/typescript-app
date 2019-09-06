import { User } from '../core/entity/user';
import { JobSandbox } from '../core/entity/jobsandbox';
import { Session } from '../core/entity/session';

const entitiesToLoad: Array<EntityDefinition> = [
    User.definition,
    JobSandbox.definition,
    Session.definition
];
export default entitiesToLoad;