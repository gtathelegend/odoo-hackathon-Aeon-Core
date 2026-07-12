from odoo import api, fields, models
from odoo.exceptions import UserError


class AssetActivityLog(models.Model):
    _name = "asset.activity.log"
    _description = "AssetFlow Activity Log"
    _order = "occurred_at desc, id desc"
    _rec_name = "action_type"

    actor_id = fields.Many2one("res.users", required=True, readonly=True)
    action_type = fields.Char(required=True, readonly=True)
    target_model = fields.Char(required=True, readonly=True)
    target_res_id = fields.Integer(required=True, readonly=True)
    previous_state = fields.Char(readonly=True)
    new_state = fields.Char(readonly=True)
    metadata_json = fields.Text(readonly=True)
    occurred_at = fields.Datetime(required=True, readonly=True, default=fields.Datetime.now)

    event_type = fields.Char(related="action_type", string="Event Type", readonly=True, store=True)
    user_id = fields.Many2one("res.users", related="actor_id", string="User", readonly=True, store=True)
    asset_id = fields.Many2one("asset.asset", compute="_compute_asset_id", store=True, string="Asset", compute_sudo=True)
    description = fields.Text(compute="_compute_description", store=True, string="Description", compute_sudo=True)

    @api.depends("target_model", "target_res_id")
    def _compute_asset_id(self):
        for log in self:
            if not log.target_model or not log.target_res_id:
                log.asset_id = False
                continue
            try:
                if log.target_model == "asset.asset":
                    log.asset_id = log.target_res_id
                elif log.target_model in ("asset.allocation", "asset.booking", "asset.transfer", "maintenance.request"):
                    record = self.env[log.target_model].browse(log.target_res_id)
                    if record.exists():
                        log.asset_id = record.asset_id.id
                    else:
                        log.asset_id = False
                else:
                    log.asset_id = False
            except Exception:
                log.asset_id = False

    @api.depends("action_type", "previous_state", "new_state", "metadata_json", "target_model", "target_res_id")
    def _compute_description(self):
        for log in self:
            actor_name = log.actor_id.name or "System"
            action = log.action_type or ""
            
            if action == "asset_created":
                log.description = "Asset was registered in the system."
            elif action == "transfer_reallocated":
                log.description = "Asset was reallocated via transfer request."
            elif action == "allocation_closed":
                log.description = "Asset allocation was closed (returned)."
            elif action == "asset_reserved":
                log.description = "Asset was reserved for a booking."
            elif action == "booking_cancelled":
                log.description = "Booking was cancelled."
            elif action == "booking_started":
                log.description = "Booking period started."
            elif action == "booking_completed":
                log.description = "Booking period completed."
            elif action == "maintenance_approved":
                log.description = "Maintenance request was approved."
            elif action == "maintenance_resolved":
                log.description = "Maintenance request was resolved."
            elif log.previous_state and log.new_state:
                log.description = f"Asset state changed from {log.previous_state} to {log.new_state}."
            else:
                action_label = action.replace("_", " ").title()
                log.description = f"{action_label} action was performed by {actor_name}."

    def unlink(self):
        raise UserError("Activity log records are immutable and cannot be deleted.")

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        return records
