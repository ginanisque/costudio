import React from "react";

export type Step = { key: string; label: string };

export default function FlowProgress({
  current,
  onNavigate,
  steps,
  completed,
  onReset,
}: {
  current: string;
  onNavigate: (k: string) => void;
  steps?: Step[];
  completed?: string[];
  onReset?: () => void;
}) {
  const defaultSteps: Step[] = [
    { key: "profile", label: "Profile" },
    { key: "collection", label: "Collection" },
    { key: "generate", label: "Generate" },
    { key: "export", label: "Export" },
    { key: "social", label: "Social" },
  ];
  const items = steps && steps.length ? steps : defaultSteps;
  const idx = Math.max(
    0,
    items.findIndex((s) => s.key === current)
  );
  const completedSet = new Set(completed || []);

  return (
    <div className="sticky top-0 z-40 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 border-b">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            {items.map((s, i) => {
              const done = completedSet.has(s.key) || i < idx;
              const active = i === idx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <button
                    className={`px-2 py-1 rounded-full border transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-muted text-foreground/70"
                    } hover:opacity-90`}
                    onClick={() => onNavigate(s.key)}
                  >
                    {s.label}
                  </button>
                  {i < items.length - 1 && (
                    <span className="text-muted-foreground">›</span>
                  )}
                </div>
              );
            })}
          </div>
          {onReset && (
            <button
              className="px-2 py-1 rounded border text-xs hover:bg-muted"
              onClick={onReset}
              title="Reset flow progress"
            >
              Reset
            </button>
          )}
        </div>
        <div className="h-1 mt-2 w-full bg-muted rounded">
          <div
            className="h-1 bg-primary rounded"
            style={{ width: `${((idx + 1) / items.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
