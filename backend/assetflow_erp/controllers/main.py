import re

from odoo import fields, http
from odoo.exceptions import AccessDenied, ValidationError
from odoo.http import request


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AssetflowAuthController(http.Controller):
    @http.route("/assetflow/health", type="http", auth="public", methods=["GET"], csrf=False, cors="*")
    def assetflow_health(self, **_kwargs):
        return request.make_json_response({"ok": True, "service": "assetflow-backend"})

    @http.route("/assetflow/signup", type="json", auth="public", methods=["POST"], csrf=False)
    def assetflow_signup(self, **payload):
        login = payload.get("email")
        password = payload.get("password")
        name = payload.get("name") or login
        if not login or not EMAIL_RE.match(login):
            return {"ok": False, "error": "Please enter a valid email address."}
        existing = request.env["res.users"].sudo().search([("login", "=", login)], limit=1)
        if existing:
            return {"ok": False, "error": "Email is already in use."}
        try:
            user = request.env["res.users"].sudo().create(
                {
                    "name": name,
                    "login": login,
                    "password": password,
                    "assetflow_role": "employee",
                }
            )
        except ValidationError as exc:
            return {"ok": False, "error": str(exc)}
        return {"ok": True, "user_id": user.id}

    @http.route("/assetflow/login", type="json", auth="public", methods=["POST"], csrf=False)
    def assetflow_login(self, **payload):
        login = payload.get("email")
        password = payload.get("password")
        generic_error = "Invalid email or password."
        if not login or not password or not EMAIL_RE.match(login):
            return {"ok": False, "error": generic_error}

        user = request.env["res.users"].sudo().search([("login", "=", login)], limit=1)
        if user:
            try:
                user._check_lockout()
            except AccessDenied:
                return {"ok": False, "error": "Account is temporarily locked. Please try again later."}

        try:
            uid = request.session.authenticate(request.db, login, password)
        except Exception:
            uid = False

        if not uid:
            if user:
                user.action_record_failed_login()
                if user.locked_until and user.locked_until > fields.Datetime.now():
                    return {"ok": False, "error": "Account is temporarily locked. Please try again later."}
            return {"ok": False, "error": generic_error}

        auth_user = request.env["res.users"].sudo().browse(uid)
        auth_user.action_record_successful_login()
        return {
            "ok": True,
            "user_id": auth_user.id,
            "role": auth_user.assetflow_role,
            "name": auth_user.name,
        }

    @http.route("/assetflow/logout", type="json", auth="user", methods=["POST"], csrf=False)
    def assetflow_logout(self):
        request.session.logout(keep_db=True)
        return {"ok": True}

    @http.route("/assetflow/session", type="json", auth="user", methods=["GET", "POST"], csrf=False)
    def assetflow_session(self):
        user = request.env.user.sudo()
        stale_at = fields.Datetime.add(fields.Datetime.now(), minutes=-30)
        if user.last_activity_at and user.last_activity_at < stale_at:
            request.session.logout(keep_db=True)
            return {"ok": False, "expired": True, "error": "Session expired due to inactivity."}
        user.last_activity_at = fields.Datetime.now()
        return {"ok": True, "expired": False}

    @http.route("/assetflow/ping_session", type="json", auth="user", methods=["POST"], csrf=False)
    def assetflow_ping_session(self):
        return self.assetflow_session()
