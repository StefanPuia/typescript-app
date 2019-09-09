import { JobSandbox } from '../core/entity/job_sandbox';
import { Permission } from '../core/entity/permission';
import { SecurityGroup } from '../core/entity/security_group';
import { SecurityGroupPermission } from '../core/entity/security_group.permission';
import { Session } from '../core/entity/session';
import { UserLogin } from '../core/entity/user_login';
import { UserLoginSecurityGroup } from '../core/entity/user_login.security_group';

const EntityLoad: Array<EntityDefinition> = [
    Permission.definition,
    SecurityGroup.definition,
    SecurityGroupPermission.definition,
    UserLogin.definition,
    UserLoginSecurityGroup.definition,
    JobSandbox.definition,
    Session.definition
];

export { EntityLoad };
