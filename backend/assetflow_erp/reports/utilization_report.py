from odoo import api, fields, models


class AssetUtilizationReport(models.AbstractModel):
    _name = "report.assetflow_erp.utilization_service"
    _description = "Asset Utilization Service"

    @api.model
    def get_report_data(self, date_from, date_to):
        assets = self.env["asset.asset"].search([])
        total_days = max((date_to - date_from).days, 1)
        rows = []
        for asset in assets:
            alloc_days = len(asset.allocation_ids.filtered(lambda a: a.allocation_date and a.allocation_date.date() >= date_from and a.allocation_date.date() <= date_to))
            booking_days = len(asset.booking_ids.filtered(lambda b: b.start_time and b.start_time.date() >= date_from and b.start_time.date() <= date_to))
            utilization = round(((alloc_days + booking_days) / total_days) * 100, 1)
            rows.append({"asset_tag": asset.asset_tag, "utilization": utilization})
        return rows
