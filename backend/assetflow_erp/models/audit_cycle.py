from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError


class AuditCycle(models.Model):
    _name = "audit.cycle"
    _description = "Asset Audit Cycle"
    _inherit = ["mail.thread", "assetflow.event.mixin"]
    _order = "start_date desc, id desc"

    name = fields.Char(required=True)
    scope_type = fields.Selection([("department", "Department"), ("location", "Location"), ("all", "All Assets")], default="all", required=True)
    department_ids = fields.Many2many("hr.department")
    location = fields.Char()
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    auditor_ids = fields.Many2many("hr.employee", required=True)
    status = fields.Selection([("open", "Open"), ("closed", "Closed")], default="open", required=True)
    audit_mark_ids = fields.One2many("audit.mark", "cycle_id")
    discrepancy_report = fields.Text(readonly=True)
    locked = fields.Boolean(default=False)

    def _get_in_scope_assets(self):
        self.ensure_one()
        domain = []
        if self.scope_type == "department":
            domain.append(("department_id", "in", self.department_ids.ids))
        elif self.scope_type == "location":
            domain.append(("location", "=", self.location))
        return self.env["asset.asset"].search(domain)

    def action_close(self):
        for cycle in self:
            if cycle.status != "open":
                raise ValidationError(_("Only open audit cycles can be closed."))
            assets = cycle._get_in_scope_assets()
            marked_assets = cycle.audit_mark_ids.mapped("asset_id")
            missing = cycle.audit_mark_ids.filtered(lambda m: m.mark == "missing")
            damaged = cycle.audit_mark_ids.filtered(lambda m: m.mark == "damaged")
            unverified = assets - marked_assets
            report_lines = []
            if missing:
                report_lines.append("Missing: %s" % ", ".join(missing.mapped("asset_id.asset_tag")))
            if damaged:
                report_lines.append("Damaged: %s" % ", ".join(damaged.mapped("asset_id.asset_tag")))
            if unverified:
                report_lines.append("Unverified: %s" % ", ".join(unverified.mapped("asset_tag")))
            cycle.discrepancy_report = "\n".join(report_lines)
            for mark in missing:
                if mark.asset_id.state in ("available", "allocated"):
                    mark.asset_id.action_transition_state("lost", "audit_marked_missing")
            for mark in damaged:
                mark.asset_id.condition = "damaged"
            cycle.write({"status": "closed", "locked": True})
            cycle._notify_users(cycle.auditor_ids.mapped("user_id") | self.env.user, "audit", _("Audit closed"), cycle.name)

    def unlink(self):
        closed = self.filtered(lambda c: c.status == "closed")
        if closed:
            raise UserError(_("Closed audit cycles cannot be deleted."))
        return super().unlink()
