from datetime import timedelta

from odoo import fields
from odoo.exceptions import ValidationError
from odoo.tests.common import SavepointCase


class TestAssetflowCore(SavepointCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.category = cls.env["asset.category"].create({"name": "Electronics"})
        cls.department = cls.env["hr.department"].create({"name": "Engineering"})
        cls.user = cls.env["res.users"].create(
            {
                "name": "Employee One",
                "login": "employee1@example.com",
                "password": "Password1!",
                "assetflow_role": "employee",
            }
        )
        cls.employee = cls.user.employee_id
        cls.asset = cls.env["asset.asset"].create(
            {
                "name": "Dell Laptop",
                "serial_number": "SN-001",
                "category_id": cls.category.id,
                "acquisition_date": fields.Date.today(),
                "acquisition_cost": 1500.00,
                "condition": "good",
                "location": "HQ",
                "department_id": cls.department.id,
                "is_bookable": True,
            }
        )

    def test_asset_tag_generated(self):
        self.assertTrue(self.asset.asset_tag.startswith("AF-"))

    def test_allocation_requires_available_asset(self):
        self.env["asset.allocation"].create(
            {
                "asset_id": self.asset.id,
                "holder_type": "employee",
                "employee_id": self.employee.id,
                "expected_return_date": fields.Date.today() + timedelta(days=2),
            }
        )
        with self.assertRaises(ValidationError):
            self.env["asset.allocation"].create(
                {
                    "asset_id": self.asset.id,
                    "holder_type": "employee",
                    "employee_id": self.employee.id,
                    "expected_return_date": fields.Date.today() + timedelta(days=3),
                }
            )

    def test_booking_overlap_rejected(self):
        asset = self.env["asset.asset"].create(
            {
                "name": "Room 101",
                "serial_number": "ROOM-001",
                "category_id": self.category.id,
                "acquisition_date": fields.Date.today(),
                "acquisition_cost": 100.00,
                "condition": "good",
                "location": "Floor 1",
                "is_bookable": True,
            }
        )
        start = fields.Datetime.now() + timedelta(hours=2)
        end = start + timedelta(hours=1)
        self.env["asset.booking"].create(
            {"asset_id": asset.id, "booker_id": self.employee.id, "start_time": start, "end_time": end}
        )
        with self.assertRaises(ValidationError):
            self.env["asset.booking"].create(
                {
                    "asset_id": asset.id,
                    "booker_id": self.employee.id,
                    "start_time": start + timedelta(minutes=15),
                    "end_time": end + timedelta(minutes=15),
                }
            )

    def test_user_lockout_after_five_failures(self):
        user = self.env["res.users"].create(
            {
                "name": "Locked Candidate",
                "login": "locked@example.com",
                "password": "Password1!",
                "assetflow_role": "employee",
            }
        )
        for _ in range(5):
            user.action_record_failed_login()
        self.assertEqual(user.failed_login_count, 5)
        self.assertTrue(user.locked_until)

    def test_password_policy_rejects_weak_password(self):
        with self.assertRaises(ValidationError):
            self.env["res.users"].create(
                {
                    "name": "Weak Password",
                    "login": "weak@example.com",
                    "password": "password",
                    "assetflow_role": "employee",
                }
            )
