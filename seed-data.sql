insert into permission(permission_id, description) values
    ('SUPER_ADMIN', 'All permissions for the SUPER permission group');

insert into security_group(security_group_id, description) values
    ('SUPER', 'Superuser');

insert into security_group_permission(security_group_id, permission_id) values
    ('SUPER', 'SUPER_ADMIN');