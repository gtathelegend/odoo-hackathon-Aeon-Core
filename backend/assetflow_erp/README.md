# AssetFlow ERP Module

This module is the first backend implementation pass for AssetFlow on Odoo 17.

## Implemented in this pass

- module scaffold and manifest
- AssetFlow security groups, access rules, and starter record rules
- user, employee, and department extensions for roles and hierarchy
- core asset, category, allocation, transfer, booking, maintenance, audit, log, notification, and KPI models
- conflict resolver wizard
- scheduled jobs for overdue allocations, booking transitions, booking reminders, notification retries, and idle-session cleanup
- starter Odoo views and menus for the main backend flows
- baseline report service classes
- baseline Savepoint tests for asset tags, allocation gating, and booking overlap validation

## Important notes

- This is a strong backend foundation, not a finished production module yet.
- The implementation is intentionally Odoo-native and keeps business logic in models, wizards, and cron jobs.
- Some advanced UI integrations, richer report exports, and deeper auth/session controller behavior will still need refinement in a running Odoo environment.
