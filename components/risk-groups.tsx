import { AlertTriangle, CircleAlert, Info } from "lucide-react";

import type { AnalysisResult } from "@/lib/ai/schemas";
import { Badge } from "@/components/ui/badge";

type Risk = AnalysisResult["risks"][number];

const severityOrder = ["high", "medium", "low"] as const;
const severityMeta = {
  high: {
    label: "High severity",
    tone: "red" as const,
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium severity",
    tone: "amber" as const,
    icon: CircleAlert,
  },
  low: {
    label: "Low severity",
    tone: "green" as const,
    icon: Info,
  },
};

export function RiskGroups({ risks }: { risks: Risk[] }) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No specific risk flags were identified from the submitted text.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {severityOrder.map((severity) => {
        const group = risks.filter((risk) => risk.severity === severity);
        if (group.length === 0) {
          return null;
        }

        const meta = severityMeta[severity];
        const Icon = meta.icon;

        return (
          <div
            key={severity}
            className="space-y-3"
            data-testid={`risk-group-${severity}`}
          >
            <div className="flex items-center gap-2">
              <Icon aria-hidden="true" className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                {meta.label}
              </h3>
              <Badge tone={meta.tone}>{group.length}</Badge>
            </div>
            <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
              {group.map((risk, index) => (
                <article key={`${risk.title}-${index}`} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {risk.source_reference ? (
                      <span className="text-xs text-slate-500">
                        {risk.source_reference}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-slate-950">
                    {risk.title}
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {risk.explanation}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    <span className="font-medium text-slate-950">
                      Why it matters:{" "}
                    </span>
                    {risk.why_it_matters}
                  </p>
                  {risk.suggested_negotiation ? (
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      <span className="font-medium text-slate-950">
                        Negotiation:{" "}
                      </span>
                      {risk.suggested_negotiation}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
