"use client";
import { useState } from "react";
import { assistantService, type SummaryResponse } from "../../services/assistant.service";

type InsightType = "executive" | "weekly" | "insights";

export function DashboardAssistant() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [activeType, setActiveType] = useState<InsightType | null>(null);

  const generate = async (type: InsightType) => {
    setLoading(true);
    setActiveType(type);
    setResult(null);
    try {
      const data = await assistantService.generateSummary(type);
      setResult(data);
    } catch {
      setResult({ type, content: "Failed to generate. Please try again.", generatedAt: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[22px] text-ink">smart_toy</span>
        <h3 className="text-body-lg font-medium text-on-surface">AI Insights</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { type: "executive" as InsightType, label: "Executive Summary", icon: "summarize" },
          { type: "weekly" as InsightType, label: "Weekly Report", icon: "calendar_today" },
          { type: "insights" as InsightType, label: "Dashboard Insights", icon: "lightbulb" },
        ]).map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => generate(type)}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-body-sm transition-colors ${
              activeType === type
                ? "bg-ink text-on-primary"
                : "bg-surface-container text-on-surface/70 hover:bg-surface-container/80"
            } disabled:opacity-50`}
          >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-on-surface/50">
          <div className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
          <span className="text-body-sm">Generating...</span>
        </div>
      )}

      {result && !loading && (
        <div className="prose prose-sm max-w-none">
          <div className="bg-surface-container rounded-xl p-4 text-body-sm text-on-surface whitespace-pre-wrap">
            {result.content}
          </div>
          <p className="text-label-caps text-on-surface/40 mt-2">
            Generated at {new Date(result.generatedAt).toLocaleString()}
            {result.tokens && ` • ${result.tokens} tokens`}
          </p>
        </div>
      )}
    </div>
  );
}
