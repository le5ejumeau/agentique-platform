"use client";

import Link from "next/link";
import { useState } from "react";
import { STAGE_LABELS, type Project, type ProjectEvent } from "@agentique/core";
import { StatusBadge } from "@/components/stage";
import { formatTime, useLiveData } from "@/lib/live";

interface DashboardData {
  model: string;
  projects: { project: Project; lastEvent: ProjectEvent | null; pendingAction: string | null }[];
}

export default function Dashboard() {
  const { data, error, connected } = useLiveData<DashboardData>("/api/projects");
  const [onlyMine, setOnlyMine] = useState(false);

  const rows = (data?.projects ?? []).filter((p) => !onlyMine || p.pendingAction);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Projets</h1>
          <p className="text-sm text-gray-500">
            {connected ? "Suivi en direct" : "Connexion au suivi en direct…"}
            {data?.model === "demo" && " · mode démo, sans IA"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />À traiter par moi
        </label>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {data && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-600">{onlyMine ? "Rien ne vous attend." : "Aucun projet pour l'instant."}</p>
          {!onlyMine && (
            <Link
              href="/projets/nouveau"
              className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Décrire un premier projet
            </Link>
          )}
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ project, lastEvent, pendingAction }) => (
          <li key={project.id}>
            <Link
              href={`/projets/${project.id}`}
              className="block h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{project.name}</h2>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 uppercase">
                  {project.kind}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{STAGE_LABELS[project.stage]}</p>
              <div className="mt-3">
                <StatusBadge project={project} pendingAction={pendingAction} />
              </div>
              {lastEvent && (
                <p className="mt-3 truncate text-xs text-gray-500">
                  {formatTime(lastEvent.at)} · {lastEvent.message}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
