"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/live";

export default function NewProject() {
  const router = useRouter();
  const [kind, setKind] = useState<"web" | "mobile">("web");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(form: FormData) {
    setSending(true);
    setError(null);
    try {
      const { project } = await postJson("/api/projects", {
        name: form.get("name"),
        brief: form.get("brief"),
        kind,
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
          <legend className="text-sm font-medium">Type d&apos;application</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(
              [
                ["web", "Application web", "Utilisée dans un navigateur, sur ordinateur et mobile"],
                ["mobile", "Application mobile", "Installée sur iPhone et Android"],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`rounded-md border p-3 text-left ${kind === value ? "border-indigo-500 bg-indigo-50" : "border-gray-300"}`}
              >
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-gray-500">{hint}</span>
              </button>
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
          disabled={sending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? "Création…" : "Lancer l'entretien"}
        </button>
      </form>
    </div>
  );
}
