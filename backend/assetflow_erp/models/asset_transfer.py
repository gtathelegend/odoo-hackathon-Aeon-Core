from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class AssetTransfer(models.Model):
    _name = "asset.transfer"
    _description = "Asset Transfer Request"
    _inherit = ["mail.thread", "assetflow.event.mixin"]
    _order = "request_date desc, id desc"

    asset_id = fields.Many2one("asset.asset", required=True, ondelete="restrict")
    current_holder_id = fields.Many2one("hr.employee", required=True)
    requested_holder_id = fields.Many2one("hr.employee", required=True)
    requester_id = fields.Many2one("res.users", default=lambda self: self.env.user, required=True)
    reason = fields.Text(required=True)
    status = fields.Selection(
        [("requested", "Requested"), ("approved", "Approved"), ("re_allocated", "Re-allocated"), ("rejected", "Rejected")],
        default="requested",
        required=True,
        tracking=True,
    )
    request_date = fields.Datetime(default=fields.Datetime.now, required=True)
    reviewed_by_id = fields.Many2one("res.users")
    review_date = fields.Datetime()
    rejection_reason = fields.Text()

    @api.constrains("reason")
    def _check_reason(self):
        for record in self:
            if not record.reason or not (1 <= len(record.reason) <= 500):
                raise ValidationError(_("Reason must be between 1 and 500 characters."))

    @api.constrains("current_holder_id", "requested_holder_id")
    def _check_holders(self):
        for record in self:
            if record.current_holder_id == record.requested_holder_id:
                raise ValidationError(_("Requested holder must be different from the current holder."))
            if not record.requested_holder_id.active or not record.requested_holder_id.user_id.assetflow_can_login:
                raise ValidationError(_("Requested holder must be active."))

    @api.constrains("asset_id", "current_holder_id", "requester_id")
    def _check_asset_context(self):
        for record in self:
            active_alloc = self.env["asset.allocation"].search(
                [("asset_id", "=", record.asset_id.id), ("status", "in", ("active", "overdue", "pending_reassignment"))],
                limit=1,
            )
            if not active_alloc:
                raise ValidationError(_("Transfer can only be requested for allocated assets."))
            if active_alloc.employee_id and active_alloc.employee_id != record.current_holder_id:
                raise ValidationError(_("Current holder does not match the active allocation."))
            if record.requester_id == record.requested_holder_id.user_id:
                raise ValidationError(_("Requester and recipient cannot be the same user."))

    def write(self, vals):
        status_map = {
            "requested": {"approved", "rejected"},
            "approved": {"re_allocated"},
            "re_allocated": set(),
            "rejected": set(),
        }
        if "status" in vals:
            target = vals["status"]
            for record in self:
                if target not in status_map.get(record.status, set()) and target != record.status:
                    raise ValidationError(
                        _("Invalid transfer transition from %(current)s to %(target)s.")
                        % {"current": record.status, "target": target}
                    )
        return super().write(vals)

    def action_approve(self):
        for record in self:
            if record.status != "requested":
                raise ValidationError(_("Only requested transfers can be approved."))
            if record.requester_id == self.env.user:
                raise ValidationError(_("Self-approval is not allowed."))
            record.write(
                {
                    "status": "approved",
                    "reviewed_by_id": self.env.user.id,
                    "review_date": fields.Datetime.now(),
                }
            )
            users = record.requester_id | record.requested_holder_id.user_id | record.current_holder_id.user_id
            record._notify_users(users, "transfer", _("Transfer approved"), _("Transfer approved for %s") % record.asset_id.asset_tag)
            record.action_reallocate()

    def action_reallocate(self):
        for record in self:
            if record.status != "approved":
                raise ValidationError(_("Only approved transfers can be re-allocated."))
            active_alloc = self.env["asset.allocation"].search(
                [("asset_id", "=", record.asset_id.id), ("status", "in", ("active", "overdue", "pending_reassignment"))],
                limit=1,
            )
            if not active_alloc:
                raise ValidationError(_("No active allocation exists for this asset."))
            active_alloc.action_return(active_alloc.asset_id.condition)
            new_alloc = self.env["asset.allocation"].create(
                {
                    "asset_id": record.asset_id.id,
                    "holder_type": "employee",
                    "employee_id": record.requested_holder_id.id,
                }
            )
            record.write(
                {
                    "status": "re_allocated",
                }
            )
            users = record.requester_id | record.requested_holder_id.user_id | record.current_holder_id.user_id
            record._notify_users(
                users,
                "transfer",
                _("Transfer completed"),
                _("Asset %s was re-allocated.") % record.asset_id.asset_tag,
            )
            record._log_activity("transfer_reallocated", "approved", "re_allocated", metadata=str(new_alloc.id))

    def action_reject(self, reason):
        for record in self:
            if record.status != "requested":
                raise ValidationError(_("Only requested transfers can be rejected."))
            record.write(
                {
                    "status": "rejected",
                    "reviewed_by_id": self.env.user.id,
                    "review_date": fields.Datetime.now(),
                    "rejection_reason": reason,
                }
            )
            record._notify_users(record.requester_id, "transfer", _("Transfer rejected"), reason)
