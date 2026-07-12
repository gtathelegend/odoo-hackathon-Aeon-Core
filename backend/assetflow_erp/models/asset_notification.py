from odoo import api, fields, models


class AssetNotification(models.Model):
    _name = "asset.notification"
    _description = "AssetFlow Notification"
    _order = "create_date desc, id desc"

    recipient_id = fields.Many2one("res.users", required=True, index=True)
    event_type = fields.Selection(
        [
            ("allocation", "Allocation"),
            ("transfer", "Transfer"),
            ("maintenance", "Maintenance"),
            ("overdue", "Overdue"),
            ("booking", "Booking"),
            ("role_promotion", "Role Promotion"),
            ("audit", "Audit"),
            ("system", "System"),
        ],
        required=True,
        default="system",
    )
    title = fields.Char(required=True)
    body = fields.Text(required=True)
    target_model = fields.Char()
    target_res_id = fields.Integer()
    status = fields.Selection(
        [("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed")],
        default="pending",
        required=True,
        index=True,
    )
    read_at = fields.Datetime()
    retry_count = fields.Integer(default=0)
    is_read = fields.Boolean(compute="_compute_is_read", store=True)

    @api.depends("read_at")
    def _compute_is_read(self):
        for record in self:
            record.is_read = bool(record.read_at)

    def action_mark_read(self):
        for record in self.filtered(lambda r: not r.read_at):
            record.read_at = fields.Datetime.now()

    @api.model
    def cron_retry_failed_notifications(self):
        pending = self.search([("status", "in", ["pending", "failed"]), ("retry_count", "<", 3)], limit=200)
        for notification in pending:
            try:
                notification.write({"status": "sent", "retry_count": notification.retry_count + 1})
            except Exception:
                notification.write({"status": "failed", "retry_count": notification.retry_count + 1})
                self.env["asset.activity.log"].sudo().create(
                    {
                        "actor_id": self.env.user.id,
                        "action_type": "notification_failed",
                        "target_model": notification._name,
                        "target_res_id": notification.id,
                        "previous_state": "pending",
                        "new_state": "failed",
                        "metadata_json": notification.title or "",
                    }
                )
