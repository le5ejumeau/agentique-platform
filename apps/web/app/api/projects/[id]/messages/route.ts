import { NextResponse } from "next/server";
import { background, runtime } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Le message est vide." }, { status: 400 });

  const { store, orchestrator } = runtime();
  const project = await store.getProject(id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  if (project.stage !== "entretien") {
    return NextResponse.json({ error: "L'entretien est terminé pour ce projet." }, { status: 409 });
  }
  background(orchestrator.sendClientMessage(id, content));
  return NextResponse.json({ ok: true }, { status: 202 });
}
