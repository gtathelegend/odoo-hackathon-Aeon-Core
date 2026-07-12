# AssetFlow Frontend Architecture & Pages Documentation

This document provides a detailed overview of the two frontend architectures implemented in the AssetFlow ERP system:
1.  **Odoo-Native Frontend (OWL + QWeb XML views)** - The officially specified native stack.
2.  **Next.js Standalone Frontend (React + Tailwind CSS)** - The premium custom stack designed in Stitch UI.

---

## 1. Odoo-Native Frontend Architecture (OWL + QWeb)

The native frontend is served directly by the Odoo Web Client and utilizes Odoo's native view controllers, OWL Javascript framework, and QWeb XML templates.

### 1.1 Native Dashboard Component
*   **JS Controller:** [dashboard.js](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/static/src/components/dashboard/dashboard.js)
    *   Defines the OWL Component `AssetflowDashboard` extending `Component` from `@odoo/owl`.
    *   Uses Odoo's standard `useService("orm")` hook to fetch data asynchronously from the Python model method `kpi.dashboard.get_kpis()`.
    *   Uses the `useService("action")` service to trigger navigation actions (switching views or opening specific list/form views) natively when clicking cards or quick actions.
    *   Registered in Odoo's action registry with tag `assetflow_dashboard_action`.
*   **QWeb Template:** [dashboard.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/static/src/components/dashboard/dashboard.xml)
    *   Renders a fully responsive KPI layout displaying key metrics: Available Assets, Allocated Assets, Maintenance Today, Active Bookings, Overdue Returns, Pending Transfers, and Upcoming Returns.
    *   Provides quick-action buttons to directly access forms and directories.
*   **Action Mapping:** Registered in Odoo under [kpi_dashboard.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/views/kpi_dashboard.xml) as an `ir.actions.client` targeting the client tag.

### 1.2 Native Views & UI Templates
Odoo automatically handles the layout rendering for all other pages via XML definitions:
*   **Assets Directory:** [asset_views.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/views/asset_views.xml) renders the default tree (list) list of assets and detail sheets (forms) including support for multi-file attachments.
*   **Allocation & Transfer:** [allocation_views.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/views/allocation_views.xml) provides forms for assigning assets to departments/employees.
*   **Resource Booking (Calendar):** [booking_views.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/views/booking_views.xml) defines a `<calendar>` view mapping bookings along a dynamic timeline using `start_time` and `end_time`.
*   **Maintenance Kanban Board:** [maintenance_views.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/views/maintenance_views.xml) groups maintenance requests in a visual `<kanban>` board grouped by `status`.
*   **Audit Cycles:** [audit_views.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/views/audit_views.xml) coordinates auditing marks and discrepancy logs.
*   **Organization Setup:** [department_views.xml](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/backend/assetflow_erp/views/department_views.xml) supports managing active/inactive departments in hierarchies.

---

## 2. Next.js Standalone Frontend (React + Tailwind CSS)

Located in the [frontend/](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/frontend) directory. This is a decoupled Next.js web application built with React, styled using Tailwind CSS, and typed in TypeScript.

### 2.1 Decoupled UI Pages (11 Routes)
*   **Login (`/login`):** Validates email format (Requirement 1.9) and runs password policy checking. Connects to Odoo Auth controllers.
*   **Signup (`/signup`):** Creates default employee accounts with validation limits.
*   **Dashboard (`/dashboard`):** 6 styled metrics cards, overdue returns alerts, and a recent activity log feed.
*   **Assets Directory (`/assets`):** List table supporting search, filtering by state/location, and view details.
*   **Allocation & Transfer (`/allocation`):** Form layout with conflict resolution suggestions.
*   **Resource Booking (`/booking`):** Standard timeline calendar grid displaying bookable items.
*   **Maintenance (`/maintenance`):** Dynamic 5-column Kanban board displaying card items.
*   **Audit Checklist (`/audit`):** Cycle verification log with custom verification states (Verified, Missing, Damaged).
*   **Reports & Analytics (`/reports`):** Renders departmental utilization bar charts and maintenance frequency charts.
*   **Activity Log (`/activity`):** Interactive event log timeline with color coding based on event types.
*   **Settings (`/settings`):** Manage profile data, role badge rendering, and system notification preferences.

### 2.2 Frontend API Client (`lib/api.ts`)
*   **Path:** [api.ts](file:///d:/odoo%20hackathon/odoo-hackathon-Aeon-Core/frontend/lib/api.ts)
*   **Connection Protocol:** Connects to Odoo via JSON-RPC 2.0 requests over HTTP POST (`makeJsonRpcRequest`).
*   **Session Maintenance:** Configured with `credentials: "include"` to automatically forward cookie sessions.
*   **Auto-Unwrapping Engine:** Fully inspects incoming payloads:
    *   Extracts `result` on success.
    *   Parses Odoo Python trace exceptions and custom error codes (`result.ok === false` or `data.error`) and returns them as clean user-friendly validation messages.
*   **CORS Compatibility:** Communicates with Odoo's local server port `8069`.

---

## 3. Technology Stack Summary

| Feature / Page | Odoo-Native Stack | Next.js Standalone Stack |
| :--- | :--- | :--- |
| **Framework** | Odoo Web client + OWL JS | Next.js (React 18) |
| **Styling** | Bootstrap 5 + SCSS | Tailwind CSS 3 |
| **Type Checking** | Javascript Linting | TypeScript 5.6 |
| **Routing** | Odoo Action manager | Next.js App Router |
| **Dashboard** | OWL Client Action (`AssetflowDashboard`) | `/dashboard` React Page |
| **Calendar View** | Native `<calendar>` view | Custom React calendar timeline |
| **Kanban View** | Native `<kanban>` view | Custom Tailwind kanban board |
| **Security / Auth** | Built-in Session Authentication | Session sync via JSON-RPC Cookies |

---

## 4. Run & Build Instructions

### Next.js Standalone:
```bash
# Install dependencies
cd frontend
npm install

# Start development server (Access at http://localhost:3000)
npm run dev

# Production Build
npm run build
```

### Odoo-Native Stack:
1.  Add the `backend/` directory path to your Odoo server config add-ons path.
2.  Install/Upgrade the `assetflow_erp` module.
3.  Access all native views, menus, and the new OWL Dashboard directly inside Odoo Web Client (`http://localhost:8069/web`).
