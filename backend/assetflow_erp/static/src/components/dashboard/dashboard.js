/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
const { Component, onWillStart, useState } = owl;

export class AssetflowDashboard extends Component {
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.state = useState({
            kpis: {}
        });

        onWillStart(async () => {
            await this.loadKPIs();
        });
    }

    async loadKPIs() {
        try {
            const kpis = await this.orm.call("kpi.dashboard", "get_kpis", []);
            this.state.kpis = kpis;
        } catch (error) {
            console.error("Failed to load KPIs", error);
        }
    }

    onKpiClick(actionXmlId) {
        this.action.doAction(actionXmlId);
    }
}

AssetflowDashboard.template = "assetflow_erp.Dashboard";
registry.category("actions").add("assetflow_dashboard_action", AssetflowDashboard);
