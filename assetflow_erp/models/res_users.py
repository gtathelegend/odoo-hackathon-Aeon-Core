import re

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError, AccessDenied


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PASSWORD_RE = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$")


class ResUsers(models.Model):
    _inherit = "res.users"

    assetflow_role = fields.Selection(
        [
            ("employee", "Employee"),
            ("department_head", "Department Head"),
            ("asset_manager", "Asset Manager"),
            ("admin", "Admin"),
        ],
        default="employee",
        required=True,
    )
    failed_login_count = fields.Integer(default=0)
    locked_until = fields.Datetime()
    last_activity_at = fields.Datetime()
    employee_id = fields.Many2one("hr.employee", string="Related Employee")
    assetflow_can_login = fields.Boolean(default=True)

    @api.constrains("login")
    def _check_login_email(self):
        for user in self:
            if user.login and not EMAIL_RE.match(user.login):
                raise ValidationError(_("Login email must be a valid email address."))

    def _ensure_password_policy(self, password):
        if password and not PASSWORD_RE.match(password):
            raise ValidationError(
                _("Password must be 8-128 characters and include uppercase, lowercase, digit, and special character.")
            )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("assetflow_role") == "admin" and not self.env.user.has_group("assetflow_erp.group_admin"):
                vals["assetflow_role"] = "employee"
            password = vals.get("password")
            if password:
                self._ensure_password_policy(password)
        users = super().create(vals_list)
        users._sync_assetflow_groups()
        for user in users.filtered(lambda u: u.assetflow_role == "employee" and not u.employee_id):
            employee = self.env["hr.employee"].create(
                {
                    "name": user.name,
                    "work_email": user.login,
                    "user_id": user.id,
                }
            )
            user.employee_id = employee.id
        return users

    def write(self, vals):
        if "password" in vals and vals["password"]:
            self._ensure_password_policy(vals["password"])
        if vals.get("assetflow_role") == "admin" and not self.env.user.has_group("assetflow_erp.group_admin"):
            raise ValidationError(_("Only admins can assign the admin role."))
        result = super().write(vals)
        if "assetflow_role" in vals:
            self._sync_assetflow_groups()
        return result

    def _sync_assetflow_groups(self):
        group_ids = {
            role: self.env.ref(xmlid).id
            for role, xmlid in self.env["assetflow.event.mixin"]._role_group_map().items()
        }
        hierarchy = ["employee", "department_head", "asset_manager", "admin"]
        for user in self:
            selected_index = hierarchy.index(user.assetflow_role or "employee")
            allowed_groups = {group_ids[hierarchy[i]] for i in range(selected_index + 1)}
            all_assetflow_groups = set(group_ids.values())
            user.groups_id = [(3, gid) for gid in all_assetflow_groups - allowed_groups] + [
                (4, gid) for gid in allowed_groups
            ]

    def _check_lockout(self):
        self.ensure_one()
        if self.locked_until and self.locked_until > fields.Datetime.now():
            raise AccessDenied(_("Account is temporarily locked. Please try again later."))

    def action_record_failed_login(self):
        self.ensure_one()
        count = self.failed_login_count + 1
        vals = {"failed_login_count": count}
        if count >= 5:
            vals["locked_until"] = fields.Datetime.add(fields.Datetime.now(), minutes=15)
        self.sudo().write(vals)

    def action_record_successful_login(self):
        self.ensure_one()
        self.sudo().write(
            {
                "failed_login_count": 0,
                "locked_until": False,
                "last_activity_at": fields.Datetime.now(),
            }
        )

    @api.model
    def cron_expire_idle_users(self):
        stale_at = fields.Datetime.add(fields.Datetime.now(), minutes=-30)
        stale = self.search([("last_activity_at", "!=", False), ("last_activity_at", "<", stale_at)])
        stale.write({"last_activity_at": False})
