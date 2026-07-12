from odoo import api, models


class AssetBookingHeatmapReport(models.AbstractModel):
    _name = "report.assetflow_erp.booking_heatmap_service"
    _description = "Asset Booking Heatmap Service"

    @api.model
    def get_heatmap(self, date_from, date_to):
        bookings = self.env["asset.booking"].search(
            [("start_time", ">=", date_from), ("end_time", "<=", date_to), ("status", "!=", "cancelled")]
        )
        heatmap = {}
        for booking in bookings:
            day = booking.start_time.strftime("%A")
            hour = booking.start_time.hour
            heatmap.setdefault(day, {})
            heatmap[day][hour] = heatmap[day].get(hour, 0) + 1
        return heatmap
