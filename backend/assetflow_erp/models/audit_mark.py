from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class AuditMark(models.Model):
    _name = "audit.mark"
    _description = "Audit Mark"
    _inherit = ["assetflow.event.mixin"]

    cycle_id = fields.Many2one("audit.cycle", required=True, ondelete="cascade")
    asset_id = fields.Many2one("asset.asset", required=True, ondelete="restrict")
    auditor_id = fields.Many2one("hr.employee", default=lambda self: self.env.user.employee_id, required=True)
    mark = fields.Selection([("verified", "Verified"), ("missing", "Missing"), ("damaged", "Damaged")], required=True)
    mark_date = fields.Datetime(default=fields.Datetime.now, required=True)
    notes = fields.Text()

    _sql_constraints = [
        ("audit_mark_unique", "unique(cycle_id, asset_id)", "Each asset can be marked only once per audit cycle."),
    ]

    @api.constrains("cycle_id", "asset_id")
    def _check_scope_and_status(self):
        for mark in self:
            if mark.cycle_id.status != "open":
                raise ValidationError(_("Cannot mark assets in a closed audit cycle."))
            if mark.asset_id not in mark.cycle_id._get_in_scope_assets():
                raise ValidationError(_("This asset is not in scope for the selected audit cycle."))
