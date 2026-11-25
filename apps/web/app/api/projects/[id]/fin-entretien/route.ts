import { NextResponse } from "next/server";
import { background, runtime } from "@/lib/runtime";

export const dynamic = "force-dynamic";

/** Le client passe directement à la rédaction du cahier des charges. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store, orchestrator } = runtime();
  const project = await store.getProject(id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  if (project.stage !== "entretien") {
    return NextResponse.json({ error: "L'entretien est déjà terminé." }, { status: 409 });
  }
  background(orchestrator.endInterview(id));
  return NextResponse.json({ ok: true }, { status: 202 });
}
