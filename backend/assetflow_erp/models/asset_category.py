from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class AssetCategory(models.Model):
    _name = "asset.category"
    _description = "Asset Category"
    _inherit = ["mail.thread"]

    name = fields.Char(required=True, tracking=True)
    active = fields.Boolean(default=True, tracking=True)
    custom_field_ids = fields.One2many("asset.category.field", "category_id")
    maintenance_interval_days = fields.Integer(default=90)
    useful_life_years = fields.Integer(default=4)

    _sql_constraints = [
        ("asset_category_name_uniq", "unique(name)", "Category name must be unique."),
    ]

    @api.constrains("custom_field_ids")
    def _check_custom_field_count(self):
        for category in self:
            if len(category.custom_field_ids) > 20:
                raise ValidationError(_("A category can have at most 20 custom fields."))


class AssetCategoryField(models.Model):
    _name = "asset.category.field"
    _description = "Asset Category Field"

    name = fields.Char(required=True)
    category_id = fields.Many2one("asset.category", required=True, ondelete="cascade")
    field_type = fields.Selection(
        [("char", "Text"), ("date", "Date"), ("float", "Number"), ("boolean", "Checkbox")],
        default="char",
        required=True,
    )
    required = fields.Boolean(default=False)
