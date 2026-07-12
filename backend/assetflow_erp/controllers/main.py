from odoo import fields, http
from odoo.http import request


class AssetflowAuthController(http.Controller):
    @http.route("/assetflow/health", type="http", auth="public", methods=["GET"], csrf=False, cors="*")
    def assetflow_health(self, **_kwargs):
        return request.make_json_response({"ok": True, "service": "assetflow-backend"})

    @http.route("/assetflow/signup", type="json", auth="public", methods=["POST"], csrf=False)
    def assetflow_signup(self, **payload):
        login = payload.get("email")
        password = payload.get("password")
        name = payload.get("name") or login
        existing = request.env["res.users"].sudo().search([("login", "=", login)], limit=1)
        if existing:
            return {"ok": False, "error": "Email is already in use."}
        user = request.env["res.users"].sudo().create(
            {
                "name": name,
                "login": login,
                "password": password,
                "assetflow_role": "employee",
            }
        )
        return {"ok": True, "user_id": user.id}

    @http.route("/assetflow/ping_session", type="json", auth="user", methods=["POST"], csrf=False)
    def assetflow_ping_session(self):
        request.env.user.sudo().write({"last_activity_at": fields.Datetime.now()})
        return {"ok": True}
