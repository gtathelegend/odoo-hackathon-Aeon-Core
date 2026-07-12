from odoo import api, fields, models


class AssetflowEventMixin(models.AbstractModel):
    _name = "assetflow.event.mixin"
    _description = "AssetFlow Event Helpers"

    def _log_activity(self, action_type, previous_state=None, new_state=None, metadata=None):
        self.ensure_one()
        return self.env["asset.activity.log"].sudo().create(
            {
                "actor_id": self.env.user.id,
                "action_type": action_type,
                "target_model": self._name,
                "target_res_id": self.id,
                "previous_state": previous_state or "",
                "new_state": new_state or "",
                "metadata_json": metadata or "",
                "occurred_at": fields.Datetime.now(),
            }
        )

    def _notify_users(self, users, event_type, title, body):
        notifications = self.env["asset.notification"].sudo()
        for user in users.filtered(lambda u: u):
            notifications.create(
                {
                    "recipient_id": user.id,
                    "event_type": event_type,
                    "title": title,
                    "body": body,
                    "target_model": self._name,
                    "target_res_id": self.id,
                }
            )

    @api.model
    def _role_group_map(self):
        return {
            "employee": "assetflow_erp.group_employee",
            "department_head": "assetflow_erp.group_department_head",
            "asset_manager": "assetflow_erp.group_asset_manager",
            "admin": "assetflow_erp.group_admin",
        }
