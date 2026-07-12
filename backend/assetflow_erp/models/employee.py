from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class HrEmployee(models.Model):
    _inherit = "hr.employee"

    assetflow_role = fields.Selection(related="user_id.assetflow_role", store=True, readonly=False)
    active = fields.Boolean(default=True)
    pending_reassignment_asset_ids = fields.Many2many(
        "asset.asset",
        compute="_compute_pending_reassignment_assets",
        string="Pending Reassignment Assets",
    )

    @api.depends("user_id")
    def _compute_pending_reassignment_assets(self):
        allocation_model = self.env["asset.allocation"]
        for employee in self:
            allocations = allocation_model.search(
                [("employee_id", "=", employee.id), ("status", "=", "pending_reassignment")]
            )
            employee.pending_reassignment_asset_ids = allocations.mapped("asset_id")

    @api.constrains("department_id")
    def _check_active_department(self):
        for employee in self:
            if employee.department_id and not employee.department_id.active:
                raise ValidationError(_("Employees cannot be assigned to inactive departments."))

    def action_deactivate_employee(self):
        for employee in self:
            if employee.user_id == self.env.user:
                raise ValidationError(_("Self-deactivation is not permitted."))
            employee.active = False
            if employee.user_id:
                employee.user_id.assetflow_can_login = False
            bookings = self.env["asset.booking"].search(
                [("booker_id", "=", employee.id), ("status", "=", "upcoming")]
            )
            bookings.action_cancel()
            allocations = self.env["asset.allocation"].search(
                [("employee_id", "=", employee.id), ("status", "=", "active")]
            )
            allocations.write({"status": "pending_reassignment"})
