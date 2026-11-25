import { NextResponse } from "next/server";
import { pendingClientAction } from "@agentique/core";
import { runtime } from "@/lib/runtime";

export const dynamic = "force-dynamic";

/** Instantané complet d'un projet, relu par l'interface à chaque événement temps réel. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = runtime();
  const project = await store.getProject(id);
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const [events, messages, deliverables] = await Promise.all([
    store.listEvents(id),
    store.listMessages(id),
    store.listDeliverables(id),
  ]);
  return NextResponse.json({ project, events, messages, deliverables, pendingAction: pendingClientAction(project) });
}
