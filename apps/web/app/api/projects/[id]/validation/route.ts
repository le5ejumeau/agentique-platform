import { NextResponse } from "next/server";
import { background, runtime } from "@/lib/runtime";

export const dynamic = "force-dynamic";

/** Point de validation 1 : le client accepte ou refuse le cahier des charges. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { approve?: unknown; comment?: unknown } | null;
  if (typeof body?.approve !== "boolean") {
    return NextResponse.json({ error: "Indiquez si le cahier des charges est validé." }, { status: 400 });
  }
  const comment = typeof body.comment === "string" ? body.comment : undefined;
  if (!body.approve && !comment?.trim()) {
    return NextResponse.json({ error: "Dites ce qu'il faut corriger." }, { status: 400 });
  }

  const { store, orchestrator } = runtime();
  const project = await store.getProject(id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  if (project.stage !== "validation_specs" || project.activeAgent) {
    return NextResponse.json({ error: "Aucun cahier des charges n'attend de validation." }, { status: 409 });
  }
  background(orchestrator.reviewSpecification(id, { approve: body.approve, comment }));
  return NextResponse.json({ ok: true }, { status: 202 });
}
