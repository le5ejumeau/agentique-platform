import { AGENT_LABELS, STAGES, STAGE_LABELS, type Project } from "@agentique/core";

/** Frise des étapes : faites, en cours, à venir. */
export function StageTimeline({ project }: { project: Project }) {
  const current = STAGES.indexOf(project.stage);
  return (
    <ol className="flex flex-wrap gap-2">
      {STAGES.map((stage, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        const style =
          state === "done"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : state === "current"
              ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-900"
              : "border-gray-200 bg-white text-gray-400";
        return (
          <li key={stage} className={`rounded-full border px-3 py-1 text-xs ${style}`}>
            {i + 1}. {STAGE_LABELS[stage]}
          </li>
        );
      })}
    </ol>
  );
}

/** Pastille d'état : agent au travail, attente du client, ou blocage. */
export function StatusBadge({ project, pendingAction }: { project: Project; pendingAction: string | null }) {
  if (project.blockedReason) {
    return <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">Bloqué</span>;
  }
  if (project.activeAgent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-800">
        <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        {AGENT_LABELS[project.activeAgent]} travaille
      </span>
    );
  }
  if (pendingAction) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
        À vous : {pendingAction}
      </span>
    );
  }
  return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">En attente</span>;
}
