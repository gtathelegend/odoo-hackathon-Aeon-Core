from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError


VALID_TRANSITIONS = {
    "available": {"allocated", "reserved", "under_maintenance", "lost", "retired"},
    "allocated": {"available", "under_maintenance", "lost"},
    "reserved": {"allocated", "available"},
    "under_maintenance": {"available", "retired"},
    "lost": {"available", "disposed"},
    "retired": {"disposed"},
    "disposed": set(),
}


class AssetAsset(models.Model):
    _name = "asset.asset"
    _description = "Asset"
    _inherit = ["mail.thread", "assetflow.event.mixin"]
    _order = "asset_tag, id"

    name = fields.Char(required=True, size=150, tracking=True)
    asset_tag = fields.Char(readonly=True, copy=False, index=True)
    serial_number = fields.Char(required=True, size=100, index=True)
    category_id = fields.Many2one("asset.category", required=True)
    state = fields.Selection(
        [
            ("available", "Available"),
            ("allocated", "Allocated"),
            ("reserved", "Reserved"),
            ("under_maintenance", "Under Maintenance"),
            ("lost", "Lost"),
            ("retired", "Retired"),
            ("disposed", "Disposed"),
        ],
        default="available",
        required=True,
        tracking=True,
        index=True,
    )
    condition = fields.Selection(
        [("good", "Good"), ("fair", "Fair"), ("poor", "Poor"), ("damaged", "Damaged")],
        default="good",
        required=True,
    )
    acquisition_date = fields.Date(required=True)
    acquisition_cost = fields.Float(required=True, digits=(16, 2))
    location = fields.Char(required=True)
    department_id = fields.Many2one("hr.department")
    current_holder_id = fields.Many2one("hr.employee", compute="_compute_current_holder", store=True)
    current_holder_department_id = fields.Many2one("hr.department", compute="_compute_current_holder", store=True)
    is_bookable = fields.Boolean(default=False)
    active = fields.Boolean(default=True)
    attachment_ids = fields.Many2many("ir.attachment", string="Attachments")
    allocation_ids = fields.One2many("asset.allocation", "asset_id")
    booking_ids = fields.One2many("asset.booking", "asset_id")
    maintenance_request_ids = fields.One2many("maintenance.request", "asset_id")
    audit_mark_ids = fields.One2many("audit.mark", "asset_id")
    custom_field_payload = fields.Text()

    _sql_constraints = [
        ("asset_tag_uniq", "unique(asset_tag)", "Asset tag must be unique."),
        ("asset_serial_uniq", "unique(serial_number)", "Serial number must be unique."),
    ]

    @api.depends("allocation_ids.status", "allocation_ids.employee_id", "allocation_ids.department_id")
    def _compute_current_holder(self):
        for asset in self:
            active_allocation = asset.allocation_ids.filtered(lambda a: a.status in ("active", "overdue"))[:1]
            asset.current_holder_id = active_allocation.employee_id
            asset.current_holder_department_id = active_allocation.department_id or active_allocation.employee_id.department_id

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get("asset_tag"):
                vals["asset_tag"] = self.env["ir.sequence"].next_by_code("asset.asset.tag") or "AF-0001"
        records = super().create(vals_list)
        for record in records:
            record._log_activity("asset_created", "", record.state)
        return records

    @api.constrains("acquisition_cost")
    def _check_cost(self):
        for asset in self:
            if asset.acquisition_cost < 0.01 or asset.acquisition_cost > 999999999.99:
                raise ValidationError(_("Acquisition cost must be between 0.01 and 999,999,999.99."))

    @api.constrains("attachment_ids")
    def _check_attachments(self):
        allowed = {"image/jpeg", "image/png", "application/pdf"}
        for asset in self:
            if len(asset.attachment_ids) > 5:
                raise ValidationError(_("An asset can have at most 5 attachments."))
            for attachment in asset.attachment_ids:
                if attachment.mimetype and attachment.mimetype not in allowed:
                    raise ValidationError(_("Only JPEG, PNG, or PDF attachments are allowed."))
                if attachment.file_size and attachment.file_size > 10 * 1024 * 1024:
                    raise ValidationError(_("Attachments must be 10 MB or smaller."))

    def _check_state_transition(self, target_state):
        self.ensure_one()
        if target_state not in VALID_TRANSITIONS.get(self.state, set()):
            raise ValidationError(
                _("Cannot move asset from %s to %s.") % (self.state, target_state)
            )

    def action_transition_state(self, target_state, action_label):
        for asset in self:
            previous = asset.state
            asset._check_state_transition(target_state)
            asset.write({"state": target_state})
            asset._log_activity(action_label, previous, target_state)

    def unlink(self):
        raise UserError(_("Assets cannot be deleted; retire or dispose them instead."))
