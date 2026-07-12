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

    def unlink(self):
        raise UserError("Activity log records are immutable and cannot be deleted.")

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        return records
