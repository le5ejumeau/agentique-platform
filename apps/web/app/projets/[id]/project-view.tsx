"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AGENT_LABELS,
  type Deliverable,
  type Documentation,
  type InterviewMessage,
  type Project,
  type ProjectEvent,
} from "@agentique/core";
import { StageTimeline, StatusBadge } from "@/components/stage";
import { TargetBadges } from "@/components/targets";
import { formatTime, postJson, useLiveData } from "@/lib/live";

interface Snapshot {
  project: Project;
  events: ProjectEvent[];
  messages: InterviewMessage[];
  deliverables: Deliverable[];
  pendingAction: string | null;
}

type Tab = "entretien" | "livrables" | "documentation";

export function ProjectView({ id }: { id: string }) {
  const { data, error } = useLiveData<Snapshot>(`/api/projects/${id}`, id);
  const stage = data?.project.stage;
  // Onglet par défaut selon l'étape : le cahier des charges s'affiche dès qu'il existe.
  // Un choix du client vaut jusqu'au prochain changement d'étape.
  const [choice, setChoice] = useState<{ tab: Tab; stage: string | undefined } | null>(null);
  const tab: Tab =
    choice && choice.stage === stage ? choice.tab : stage && stage !== "entretien" ? "livrables" : "entretien";
  const setTab = (value: Tab) => setChoice({ tab: value, stage });

  if (error && !data) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          Retour aux projets
        </Link>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-gray-500">Chargement…</p>;

  const { project, events, messages, pendingAction } = data;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          ← Projets
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <TargetBadges targets={project.targets} />
          <StatusBadge project={project} pendingAction={pendingAction} />
        </div>
        <StageTimeline project={project} />
      </div>

      {project.blockedReason && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Le projet est bloqué : {project.blockedReason}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-gray-200 bg-white">
          <nav className="flex border-b border-gray-200 text-sm">
            {(
              [
                ["entretien", `Entretien (${messages.length})`],
                ["livrables", "Cahier des charges"],
                ["documentation", "Documentation"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`px-4 py-2.5 ${tab === value ? "border-b-2 border-indigo-600 font-medium text-indigo-700" : "text-gray-600"}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="p-4">
            {tab === "entretien" && <Interview snapshot={data} />}
            {tab === "livrables" && <Deliverables snapshot={data} />}
            {tab === "documentation" && <DocumentationView snapshot={data} />}
          </div>
        </section>

        <ActivityFeed events={events} />
      </div>
    </div>
  );
}

function Interview({ snapshot }: { snapshot: Snapshot }) {
  const { project, messages } = snapshot;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const open = project.stage === "entretien";
  const analystBusy = project.activeAgent === "analyste";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, analystBusy]);

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setError(null);
    try {
      await postJson(`/api/projects/${project.id}/messages`, { content });
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function finish() {
    setError(null);
    try {
      await postJson(`/api/projects/${project.id}/fin-entretien`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-gray-50 p-3 text-sm">
        <p className="text-xs font-medium text-gray-500 uppercase">Votre brief</p>
        <p className="mt-1 whitespace-pre-wrap">{project.brief}</p>
      </div>

      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.author === "client" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.author === "client" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.author === "analyste" && <p className="mb-1 text-xs font-medium text-gray-500">Analyste</p>}
              {m.content}
            </div>
          </li>
        ))}
        {analystBusy && <li className="text-sm text-gray-500">L&apos;Analyste écrit…</li>}
      </ul>
      <div ref={bottom} />

      {open ? (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
            }}
            rows={3}
            placeholder="Votre réponse (Ctrl + Entrée pour envoyer)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <button
              onClick={finish}
              disabled={analystBusy}
              className="text-sm text-gray-600 hover:underline disabled:opacity-50"
            >
              J&apos;ai tout dit, rédigez le cahier des charges
            </button>
            <button
              onClick={send}
              disabled={!draft.trim()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        </div>
      ) : (
        <p className="border-t border-gray-100 pt-3 text-sm text-gray-500">L&apos;entretien est terminé.</p>
      )}
    </div>
  );
}

/** Documentation vivante : les pages du dossier docs/ de l'application, à jour en direct. */
function DocumentationView({ snapshot }: { snapshot: Snapshot }) {
  const doc = snapshot.deliverables.find((d) => d.kind === "documentation");
  const pages = (doc?.data as Documentation | undefined)?.pages ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const page = pages.find((p) => p.path === selected) ?? pages[0];

  if (!doc || !page) {
    return <p className="text-sm text-gray-500">Le Documentaliste prépare la documentation…</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <nav aria-label="Pages de la documentation">
        <ul className="space-y-1 text-sm">
          {pages.map((p) => (
            <li key={p.path}>
              <button
                onClick={() => setSelected(p.path)}
                className={`w-full rounded px-2 py-1 text-left ${p.path === page.path ? "bg-indigo-50 font-medium text-indigo-800" : "text-gray-700 hover:bg-gray-50"}`}
              >
                {p.title}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-2 text-xs text-gray-500">
          Version {doc.version} · {formatTime(doc.createdAt)}
        </p>
      </nav>
      <div>
        <p className="mb-2 font-mono text-xs text-gray-400">{page.path}</p>
        <article className="markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

function Deliverables({ snapshot }: { snapshot: Snapshot }) {
  const { project, deliverables } = snapshot;
  const spec = deliverables.find((d) => d.kind === "cahier_des_charges");
  const awaitingReview = project.stage === "validation_specs" && !project.activeAgent;

  if (!spec) {
    return (
      <p className="text-sm text-gray-500">
        {project.activeAgent === "redacteur"
          ? "Le Rédacteur prépare le cahier des charges…"
          : "Le cahier des charges sera rédigé à la fin de l'entretien."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {awaitingReview && <Review projectId={project.id} />}
      <p className="text-xs text-gray-500">
        Version {spec.version} · {formatTime(spec.createdAt)}
      </p>
      <article className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.markdown}</ReactMarkdown>
      </article>
    </div>
  );
}

function Review({ projectId }: { projectId: string }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function decide(approve: boolean) {
    setSending(true);
    setError(null);
    try {
      await postJson(`/api/projects/${projectId}/validation`, { approve, comment });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">Ce cahier des charges vous convient-il ?</p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Ce qu'il faut corriger (obligatoire pour demander une nouvelle version)"
        className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => decide(true)}
          disabled={sending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Valider
        </button>
        <button
          onClick={() => decide(false)}
          disabled={sending || !comment.trim()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Demander une nouvelle version
        </button>
      </div>
    </div>
  );
}

function ActivityFeed({ events }: { events: ProjectEvent[] }) {
  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold">Activité en direct</h2>
      <ol className="mt-3 space-y-3">
        {[...events].reverse().map((e) => (
          <li key={e.id} className="text-sm">
            <p
              className={
                e.type === "erreur"
                  ? "text-red-700"
                  : e.type === "validation_demandee"
                    ? "font-medium text-amber-800"
                    : ""
              }
            >
              {e.message}
            </p>
            <p className="text-xs text-gray-500">
              {formatTime(e.at)}
              {e.agent && ` · ${AGENT_LABELS[e.agent]}`}
            </p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
