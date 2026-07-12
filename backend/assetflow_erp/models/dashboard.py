from odoo import api, fields, models


class KpiDashboard(models.TransientModel):
    _name = "kpi.dashboard"
    _description = "AssetFlow KPI Dashboard"

    assets_available = fields.Integer(compute="_compute_kpis")
    assets_allocated = fields.Integer(compute="_compute_kpis")
    maintenance_today = fields.Integer(compute="_compute_kpis")
    active_bookings = fields.Integer(compute="_compute_kpis")
    pending_transfers = fields.Integer(compute="_compute_kpis")
    upcoming_returns = fields.Integer(compute="_compute_kpis")
    overdue_returns = fields.Integer(compute="_compute_kpis")

    @api.model
    def get_kpis(self):
        """Return the seven dashboard KPI values as a plain dict.

        Exposed to the frontend via /web/dataset/call_kw so a single round trip
        yields computed values (role-scoped) rather than a transient record id.
        """
        record = self.create({})
        return {
            "assets_available": record.assets_available,
            "assets_allocated": record.assets_allocated,
            "maintenance_today": record.maintenance_today,
            "active_bookings": record.active_bookings,
            "pending_transfers": record.pending_transfers,
            "upcoming_returns": record.upcoming_returns,
            "overdue_returns": record.overdue_returns,
        }

    def _get_asset_scope_domain(self):
        user = self.env.user
        if user.has_group("assetflow_erp.group_admin") or user.has_group("assetflow_erp.group_asset_manager"):
            return []
        if user.has_group("assetflow_erp.group_department_head") and user.employee_id.department_id:
            return [("department_id", "=", user.employee_id.department_id.id)]
        return [("current_holder_id", "=", user.employee_id.id)]

    @api.depends()
    def _compute_kpis(self):
        asset_model = self.env["asset.asset"]
        allocation_model = self.env["asset.allocation"]
        booking_model = self.env["asset.booking"]
        transfer_model = self.env["asset.transfer"]
        maintenance_model = self.env["maintenance.request"]
        today = fields.Date.today()
        soon = fields.Date.add(today, days=7)
        for record in self:
            domain = record._get_asset_scope_domain()
            record.assets_available = asset_model.search_count(domain + [("state", "=", "available")])
            record.assets_allocated = asset_model.search_count(domain + [("state", "=", "allocated")])
            day_start = fields.Datetime.to_string(fields.Datetime.now().replace(hour=0, minute=0, second=0, microsecond=0))
            record.maintenance_today = maintenance_model.search_count([("create_date", ">=", day_start)])
            record.active_bookings = booking_model.search_count([("status", "in", ("upcoming", "ongoing"))])
            record.pending_transfers = transfer_model.search_count([("status", "=", "requested")])
            record.upcoming_returns = allocation_model.search_count(
                [("status", "in", ("active", "overdue")), ("expected_return_date", ">=", today), ("expected_return_date", "<=", soon)]
            )
            record.overdue_returns = allocation_model.search_count([("status", "=", "overdue")])

    @api.model
    def get_kpis(self):
        dashboard = self.create({})
        return {
            "assets_available": dashboard.assets_available,
            "assets_allocated": dashboard.assets_allocated,
            "maintenance_today": dashboard.maintenance_today,
            "active_bookings": dashboard.active_bookings,
            "pending_transfers": dashboard.pending_transfers,
            "upcoming_returns": dashboard.upcoming_returns,
            "overdue_returns": dashboard.overdue_returns,
        }
