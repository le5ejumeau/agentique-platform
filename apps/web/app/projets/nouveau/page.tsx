"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Target } from "@agentique/core";
import { postJson } from "@/lib/live";

export default function NewProject() {
  const router = useRouter();
  const [targets, setTargets] = useState<Target[]>([]);
  const toggle = (target: Target) =>
    setTargets((current) => (current.includes(target) ? current.filter((t) => t !== target) : [...current, target]));
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(form: FormData) {
    setSending(true);
    setError(null);
    try {
      const { project } = await postJson("/api/projects", {
        name: form.get("name"),
        brief: form.get("brief"),
        targets,
      });
      router.push(`/projets/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Nouveau projet</h1>
      <p className="mt-1 text-sm text-gray-600">
        Décrivez votre idée avec vos mots. L&apos;Analyste vous posera ensuite quelques questions pour la préciser.
      </p>

      <form action={submit} className="mt-6 space-y-5 rounded-lg border border-gray-200 bg-white p-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Nom du projet
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={200}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Plateformes visées</legend>
          <p className="text-xs text-gray-500">Cochez tout ce qui vous intéresse, vous pourrez en ajouter plus tard.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["web", "Application web", "Dans un navigateur, sur ordinateur et téléphone"],
                ["ios", "Mobile iOS", "Application installée sur iPhone et iPad"],
                ["android", "Mobile Android", "Application installée sur téléphones Android"],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 ${targets.includes(value) ? "border-indigo-500 bg-indigo-50" : "border-gray-300"}`}
              >
                <input
                  type="checkbox"
                  checked={targets.includes(value)}
                  onChange={() => toggle(value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-gray-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="brief" className="block text-sm font-medium">
            Votre besoin
          </label>
          <textarea
            id="brief"
            name="brief"
            required
            rows={6}
            placeholder="Par exemple : une application pour que les clients de mon salon de coiffure réservent un créneau et reçoivent un rappel."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={sending || targets.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? "Création…" : "Lancer l'entretien"}
        </button>
      </form>
    </div>
  );
}
