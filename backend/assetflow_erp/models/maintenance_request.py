from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class MaintenanceRequest(models.Model):
    _name = "maintenance.request"
    _description = "Asset Maintenance Request"
    _inherit = ["mail.thread", "assetflow.event.mixin"]
    _order = "request_date desc, id desc"

    asset_id = fields.Many2one("asset.asset", required=True, ondelete="restrict")
    requester_id = fields.Many2one("hr.employee", default=lambda self: self.env.user.employee_id, required=True)
    issue_description = fields.Text(required=True)
    priority = fields.Selection(
        [("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")],
        default="medium",
        required=True,
    )
    status = fields.Selection(
        [
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("technician_assigned", "Technician Assigned"),
            ("in_progress", "In Progress"),
            ("resolved", "Resolved"),
            ("rejected", "Rejected"),
        ],
        default="pending",
        required=True,
        tracking=True,
    )
    technician_id = fields.Many2one("hr.employee")
    resolution_notes = fields.Text()
    request_date = fields.Datetime(default=fields.Datetime.now, required=True)
    resolution_date = fields.Datetime()
    attachment_ids = fields.Many2many("ir.attachment")

    @api.constrains("issue_description")
    def _check_issue_description(self):
        for request in self:
            if not request.issue_description or not (10 <= len(request.issue_description) <= 2000):
                raise ValidationError(_("Issue description must be between 10 and 2000 characters."))

    @api.constrains("asset_id", "status")
    def _check_open_request(self):
        open_states = ("pending", "approved", "technician_assigned", "in_progress")
        for request in self:
            if request.status in open_states:
                duplicates = self.search(
                    [("asset_id", "=", request.asset_id.id), ("status", "in", open_states), ("id", "!=", request.id)],
                    limit=1,
                )
                if duplicates:
                    raise ValidationError(_("There is already an open maintenance request for this asset."))
            if request.asset_id.state not in ("available", "allocated", "under_maintenance"):
                raise ValidationError(_("This asset's current state does not permit maintenance requests."))

    def action_approve(self):
        for request in self:
            request.status = "approved"
            if request.asset_id.state in ("available", "allocated"):
                request.asset_id.action_transition_state("under_maintenance", "maintenance_approved")
            request._notify_users(request.requester_id.user_id, "maintenance", _("Maintenance approved"), request.issue_description)

    def action_reject(self, reason):
        for request in self:
            request.status = "rejected"
            request._notify_users(request.requester_id.user_id, "maintenance", _("Maintenance rejected"), reason)

    def action_assign_technician(self, technician_id):
        self.write({"technician_id": technician_id, "status": "technician_assigned"})
        self._notify_users(self.technician_id.user_id, "maintenance", _("Technician assigned"), self.issue_description)

    def action_start(self):
        self.write({"status": "in_progress"})

    def action_resolve(self, notes):
        if not notes or len(notes) < 10:
            raise ValidationError(_("Resolution notes must be at least 10 characters."))
        for request in self:
            request.write(
                {
                    "status": "resolved",
                    "resolution_notes": notes,
                    "resolution_date": fields.Datetime.now(),
                }
            )
            if request.asset_id.state == "under_maintenance":
                request.asset_id.action_transition_state("available", "maintenance_resolved")
            request._notify_users(request.requester_id.user_id | request.technician_id.user_id, "maintenance", _("Maintenance resolved"), notes)
