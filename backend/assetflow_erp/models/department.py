from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class HrDepartment(models.Model):
    _inherit = "hr.department"

    assetflow_head_user_id = fields.Many2one("res.users", string="Department Head")
    active = fields.Boolean(default=True)
    hierarchy_depth = fields.Integer(compute="_compute_hierarchy_depth", store=True)
    asset_ids = fields.One2many("asset.asset", "department_id")

    _sql_constraints = [
        ("assetflow_department_name_uniq", "unique(name)", "Department name must be unique."),
    ]

    @api.depends("parent_id", "parent_id.hierarchy_depth")
    def _compute_hierarchy_depth(self):
        for department in self:
            depth = 1
            parent = department.parent_id
            while parent:
                depth += 1
                parent = parent.parent_id
            department.hierarchy_depth = depth

    @api.constrains("parent_id")
    def _check_parent_chain(self):
        for department in self:
            seen = set()
            parent = department.parent_id
            depth = 1
            while parent:
                if parent.id in seen or parent == department:
                    raise ValidationError(_("Circular department hierarchy is not allowed."))
                seen.add(parent.id)
                parent = parent.parent_id
                depth += 1
            if depth > 5:
                raise ValidationError(_("Department hierarchy cannot exceed 5 levels."))

    def write(self, vals):
        previous_states = {record.id: record.active for record in self}
        result = super().write(vals)
        if "active" in vals:
            for record in self:
                previous = previous_states.get(record.id)
                if previous != record.active:
                    self.env["asset.activity.log"].sudo().create(
                        {
                            "actor_id": self.env.user.id,
                            "action_type": "department_status_changed",
                            "target_model": record._name,
                            "target_res_id": record.id,
                            "previous_state": "active" if previous else "inactive",
                            "new_state": "active" if record.active else "inactive",
                        }
                    )
        return result
