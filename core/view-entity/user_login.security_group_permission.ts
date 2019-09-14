import { ViewEntity } from '../view.entity';

export class UserLoginSecurityGroupPermission extends ViewEntity {
    public static readonly definition: EntityViewDefinition = {
        "name": "user_login_security_group_permission",
        "table": "user_login",
        "alias": "UL",
        "fields": [
            { "alias": "ULSG", "name": "*" },
            { "alias": "SG", "name": "*" },
            { "alias": "PE", "name": "*" }
        ],
        "joins": [{
            "table": "user_login_security_group",
            "alias": "ULSG",
            "joinType": "INNER",
            "condition": {
                "from": { "alias": "UL", "name": "user_login_id" },
                "to": { "alias": "ULSG", "name": "user_login_id" },
                "operator": "="
            }
        }, {
            "table": "security_group",
            "alias": "SG",
            "joinType": "INNER",
            "condition": {
                "from": { "alias": "ULSG", "name": "security_group_id" },
                "to": { "alias": "SG", "name": "security_group_id" },
                "operator": "="
            }
        }, {
            "table": "security_group_permission",
            "alias": "SGP",
            "joinType": "INNER",
            "condition": {
                "from": { "alias": "SG", "name": "security_group_id" },
                "to": { "alias": "SGP", "name": "security_group_id" },
                "operator": "="
            }
        }, {
            "table": "permission",
            "alias": "PE",
            "joinType": "INNER",
            "condition": {
                "from": { "alias": "SGP", "name": "permission_id" },
                "to": { "alias": "PE", "name": "permission_id" },
                "operator": "="
            }
        }]
    };
}