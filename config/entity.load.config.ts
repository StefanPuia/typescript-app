import { JobSandbox } from '../core/entity-definition/job_sandbox';
import { Permission } from '../core/entity-definition/permission';
import { SecurityGroup } from '../core/entity-definition/security_group';
import { SecurityGroupPermission } from '../core/entity-definition/security_group.permission';
import { Session } from '../core/entity-definition/session';
import { UserLogin } from '../core/entity-definition/user_login';
import { UserLoginSecurityGroup } from '../core/entity-definition/user_login.security_group';
import { SystemProperty } from '../core/entity-definition/system_property';
import { UserLoginSecurityGroupPermission } from '../core/entity-definition/view-entity/user_login.security_group_permission';

const EntityLoad: Array<EntityDefinition> = [
    SystemProperty.definition,
    Permission.definition,
    SecurityGroup.definition,
    SecurityGroupPermission.definition,
    UserLogin.definition,
    UserLoginSecurityGroup.definition,
    JobSandbox.definition,
    Session.definition,
    UserLoginSecurityGroupPermission.definition
];

export { EntityLoad };
