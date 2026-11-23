import { TARGET_LABELS, type Target } from "@agentique/core";

/** Étiquettes des plateformes visées par un projet. */
export function TargetBadges({ targets }: { targets: readonly Target[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {targets.map((t) => (
        <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
          {TARGET_LABELS[t]}
        </span>
      ))}
    </span>
  );
}
