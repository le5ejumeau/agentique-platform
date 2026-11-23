import { NextResponse } from "next/server";
import { parseTargets, pendingClientAction } from "@agentique/core";
import { background, runtime } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const { store } = runtime();
  const projects = await store.listProjects();
  const withActivity = await Promise.all(
    projects.map(async (project) => {
      const events = await store.listEvents(project.id);
      return { project, lastEvent: events.at(-1) ?? null, pendingAction: pendingClientAction(project) };
    }),
  );
  return NextResponse.json({ projects: withActivity, model: runtime().model.name });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    targets?: unknown;
    brief?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
  const targets = parseTargets(body?.targets);
  if (!name || !brief || !targets) {
    return NextResponse.json(
      { error: "Nom, description et au moins une cible (web, iOS ou Android) sont obligatoires." },
      { status: 400 },
    );
  }
  const { project, work } = await runtime().orchestrator.createProject({ name, targets, brief });
  background(work);
  return NextResponse.json({ project }, { status: 201 });
}
