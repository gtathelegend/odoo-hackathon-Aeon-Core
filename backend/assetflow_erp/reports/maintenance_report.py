from odoo import api, fields, models


class AssetMaintenanceReport(models.AbstractModel):
    _name = "report.assetflow_erp.maintenance_service"
    _description = "Asset Maintenance Service"

    @api.model
    def get_due_for_maintenance(self):
        today = fields.Date.today()
        assets = self.env["asset.asset"].search([])
        due = []
        for asset in assets:
            last_request = asset.maintenance_request_ids.filtered(lambda r: r.status == "resolved")[:1]
            if last_request and last_request.resolution_date:
                last_date = fields.Date.to_date(last_request.resolution_date)
                if (today - last_date).days > asset.category_id.maintenance_interval_days:
                    due.append(asset.id)
            elif asset.acquisition_date and (today - asset.acquisition_date).days > 90:
                due.append(asset.id)
        return self.env["asset.asset"].browse(due)
