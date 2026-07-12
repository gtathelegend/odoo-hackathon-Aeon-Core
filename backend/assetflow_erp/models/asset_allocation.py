from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class AssetAllocation(models.Model):
    _name = "asset.allocation"
    _description = "Asset Allocation"
    _inherit = ["mail.thread", "assetflow.event.mixin"]
    _order = "allocation_date desc, id desc"

    asset_id = fields.Many2one("asset.asset", required=True, ondelete="restrict")
    holder_type = fields.Selection([("employee", "Employee"), ("department", "Department")], required=True)
    employee_id = fields.Many2one("hr.employee")
    department_id = fields.Many2one("hr.department")
    allocated_by_id = fields.Many2one("res.users", default=lambda self: self.env.user, required=True)
    allocation_date = fields.Datetime(default=fields.Datetime.now, required=True)
    expected_return_date = fields.Date()
    actual_return_date = fields.Datetime()
    return_condition = fields.Selection([("good", "Good"), ("fair", "Fair"), ("poor", "Poor"), ("damaged", "Damaged")])
    status = fields.Selection(
        [
            ("active", "Active"),
            ("overdue", "Overdue"),
            ("closed", "Closed"),
            ("pending_reassignment", "Pending Reassignment"),
        ],
        default="active",
        required=True,
        index=True,
    )
    is_overdue = fields.Boolean(compute="_compute_is_overdue", store=True)

    @api.depends("expected_return_date", "status")
    def _compute_is_overdue(self):
        today = fields.Date.today()
        for allocation in self:
            allocation.is_overdue = bool(
                allocation.expected_return_date
                and allocation.status in ("active", "overdue")
                and allocation.expected_return_date < today
            )

    @api.constrains("holder_type", "employee_id", "department_id")
    def _check_holder(self):
        for allocation in self:
            if allocation.holder_type == "employee" and not allocation.employee_id:
                raise ValidationError(_("Employee holder is required."))
            if allocation.holder_type == "department" and not allocation.department_id:
                raise ValidationError(_("Department holder is required."))

    @api.constrains("expected_return_date")
    def _check_expected_return_date(self):
        today = fields.Date.today()
        for allocation in self:
            if allocation.expected_return_date and allocation.expected_return_date <= today:
                raise ValidationError(_("Expected return date must be in the future."))

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            asset = self.env["asset.asset"].browse(vals.get("asset_id"))
            if asset.state != "available":
                active_allocation = self.search(
                    [("asset_id", "=", asset.id), ("status", "in", ("active", "overdue", "pending_reassignment"))],
                    limit=1,
                )
                holder_name = (
                    active_allocation.employee_id.name
                    or active_allocation.department_id.name
                    or _("Unknown holder")
                )
                allocation_date = active_allocation.allocation_date and fields.Datetime.to_string(active_allocation.allocation_date) or _("N/A")
                raise ValidationError(
                    _(
                        "Allocation conflict: this asset is currently held by %(holder)s since %(date)s. "
                        "Use a transfer request to reassign it."
                    )
                    % {"holder": holder_name, "date": allocation_date}
                )
            active_allocation = self.search([("asset_id", "=", asset.id), ("status", "in", ("active", "overdue", "pending_reassignment"))], limit=1)
            if active_allocation:
                raise ValidationError(_("This asset already has an active allocation."))
        records = super().create(vals_list)
        for record in records:
            holder_active = True
            if record.employee_id:
                holder_active = record.employee_id.active and record.employee_id.user_id.assetflow_can_login
            if record.department_id:
                holder_active = record.department_id.active
            if not holder_active:
                raise ValidationError(_("The selected holder is inactive."))
            asset.action_transition_state("allocated", "asset_allocated")
            title = _("Asset allocated: %s") % asset.asset_tag
            users = record.employee_id.user_id | record.allocated_by_id
            record._notify_users(users, "allocation", title, title)
        return records

    def action_return(self, return_condition):
        for record in self:
            if record.status not in ("active", "overdue", "pending_reassignment"):
                continue
            record.write(
                {
                    "status": "closed",
                    "actual_return_date": fields.Datetime.now(),
                    "return_condition": return_condition,
                }
            )
            record.asset_id.condition = return_condition
            if record.asset_id.state == "allocated":
                record.asset_id.action_transition_state("available", "asset_returned")
            record._log_activity("allocation_closed", "allocated", "available")

    @api.model
    def cron_check_overdue_allocations(self):
        overdue = self.search(
            [("status", "=", "active"), ("expected_return_date", "!=", False), ("expected_return_date", "<", fields.Date.today())]
        )
        for record in overdue:
            record.status = "overdue"
            users = record.employee_id.user_id | record.allocated_by_id
            record._notify_users(users, "overdue", _("Overdue asset"), _("Asset %s is overdue.") % record.asset_id.asset_tag)
