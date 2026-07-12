from odoo import _, fields, models


class ConflictResolver(models.TransientModel):
    _name = "conflict.resolver"
    _description = "AssetFlow Conflict Resolver"

    conflict_type = fields.Selection([("allocation", "Allocation"), ("booking", "Booking")], required=True)
    asset_id = fields.Many2one("asset.asset", required=True)
    current_holder_id = fields.Many2one("hr.employee")
    conflicting_booking_id = fields.Many2one("asset.booking")
    requested_start = fields.Datetime()
    requested_end = fields.Datetime()
    suggested_slot_start = fields.Datetime()
    suggested_slot_end = fields.Datetime()
    resolution_action = fields.Selection(
        [
            ("request_transfer", "Request Transfer"),
            ("choose_different_asset", "Choose Different Asset"),
            ("select_suggested_slot", "Select Suggested Slot"),
        ]
    )

    def action_prefill_transfer(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": _("Transfer Request"),
            "res_model": "asset.transfer",
            "view_mode": "form",
            "target": "current",
            "context": {
                "default_asset_id": self.asset_id.id,
                "default_current_holder_id": self.current_holder_id.id,
            },
        }

    def action_prefill_booking(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": _("Booking"),
            "res_model": "asset.booking",
            "view_mode": "form",
            "target": "current",
            "context": {
                "default_asset_id": self.asset_id.id,
                "default_start_time": self.suggested_slot_start,
                "default_end_time": self.suggested_slot_end,
            },
        }
