from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class AssetBooking(models.Model):
    _name = "asset.booking"
    _description = "Asset Booking"
    _inherit = ["mail.thread", "assetflow.event.mixin"]
    _order = "start_time, id"

    asset_id = fields.Many2one("asset.asset", required=True, domain=[("is_bookable", "=", True)])
    booker_id = fields.Many2one("hr.employee", default=lambda self: self.env.user.employee_id, required=True)
    start_time = fields.Datetime(required=True)
    end_time = fields.Datetime(required=True)
    purpose = fields.Text()
    status = fields.Selection(
        [("upcoming", "Upcoming"), ("ongoing", "Ongoing"), ("completed", "Completed"), ("cancelled", "Cancelled")],
        default="upcoming",
        required=True,
        index=True,
    )
    duration_minutes = fields.Integer(compute="_compute_duration_minutes", store=True)
    reminder_sent = fields.Boolean(default=False)

    @api.depends("start_time", "end_time")
    def _compute_duration_minutes(self):
        for booking in self:
            if booking.start_time and booking.end_time:
                booking.duration_minutes = int((booking.end_time - booking.start_time).total_seconds() / 60)
            else:
                booking.duration_minutes = 0

    @api.constrains("start_time", "end_time")
    def _check_time_window(self):
        now = fields.Datetime.now()
        for booking in self:
            if booking.end_time <= booking.start_time:
                raise ValidationError(_("Booking end time must be later than the start time."))
            if booking.duration_minutes < 15:
                raise ValidationError(_("Minimum booking duration is 15 minutes."))
            if booking.start_time < now:
                raise ValidationError(_("Bookings must start in the future."))

    @api.constrains("asset_id")
    def _check_bookable_asset(self):
        for booking in self:
            if booking.asset_id and not booking.asset_id.is_bookable:
                raise ValidationError(_("Only bookable assets can be reserved."))

    def _check_overlap(self, asset_id, start_time, end_time, exclude_id=None):
        domain = [
            ("asset_id", "=", asset_id),
            ("status", "in", ("upcoming", "ongoing")),
            ("start_time", "<", end_time),
            ("end_time", ">", start_time),
        ]
        if exclude_id:
            domain.append(("id", "!=", exclude_id))
        return self.search(domain, limit=1)

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for record in records:
            overlap = record._check_overlap(record.asset_id.id, record.start_time, record.end_time, exclude_id=record.id)
            if overlap:
                slot = _("%(start)s to %(end)s") % {
                    "start": fields.Datetime.to_string(overlap.start_time),
                    "end": fields.Datetime.to_string(overlap.end_time),
                }
                holder = overlap.booker_id.name or _("Unknown holder")
                raise ValidationError(
                    _("Booking conflict: slot %(slot)s is already held by %(holder)s.")
                    % {"slot": slot, "holder": holder}
                )
            if record.asset_id.state == "available":
                record.asset_id.action_transition_state("reserved", "asset_reserved")
            record._notify_users(record.booker_id.user_id, "booking", _("Booking created"), _("Booking created for %s") % record.asset_id.asset_tag)
        return records

    def write(self, vals):
        result = super().write(vals)
        for record in self:
            overlap = record._check_overlap(record.asset_id.id, record.start_time, record.end_time, exclude_id=record.id)
            if overlap:
                slot = _("%(start)s to %(end)s") % {
                    "start": fields.Datetime.to_string(overlap.start_time),
                    "end": fields.Datetime.to_string(overlap.end_time),
                }
                holder = overlap.booker_id.name or _("Unknown holder")
                raise ValidationError(
                    _("Booking conflict: slot %(slot)s is already held by %(holder)s.")
                    % {"slot": slot, "holder": holder}
                )
        return result

    def action_cancel(self):
        for record in self.filtered(lambda r: r.status == "upcoming"):
            record.status = "cancelled"
            if record.asset_id.state == "reserved":
                record.asset_id.action_transition_state("available", "booking_cancelled")

    @api.model
    def cron_transition_bookings(self):
        now = fields.Datetime.now()
        upcoming = self.search([("status", "=", "upcoming"), ("start_time", "<=", now)])
        for booking in upcoming:
            booking.status = "ongoing"
            if booking.asset_id.state == "reserved":
                booking.asset_id.action_transition_state("allocated", "booking_started")
        finished = self.search([("status", "=", "ongoing"), ("end_time", "<=", now)])
        for booking in finished:
            booking.status = "completed"
            if booking.asset_id.state == "allocated":
                booking.asset_id.action_transition_state("available", "booking_completed")

    @api.model
    def cron_send_booking_reminders(self):
        now = fields.Datetime.now()
        upper = fields.Datetime.add(now, minutes=30)
        reminders = self.search(
            [("status", "=", "upcoming"), ("reminder_sent", "=", False), ("start_time", ">=", now), ("start_time", "<=", upper)]
        )
        for booking in reminders:
            booking.reminder_sent = True
            booking._notify_users(
                booking.booker_id.user_id,
                "booking",
                _("Booking reminder"),
                _("Booking for %s starts soon.") % booking.asset_id.asset_tag,
            )
