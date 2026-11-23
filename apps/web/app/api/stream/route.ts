import type { StoreChange } from "@agentique/core";
import { runtime } from "@/lib/runtime";

export const dynamic = "force-dynamic";

function projectIdOf(change: StoreChange): string {
  switch (change.kind) {
    case "project":
      return change.project.id;
    case "event":
      return change.event.projectId;
    case "message":
      return change.message.projectId;
    case "deliverable":
      return change.deliverable.projectId;
  }
}

/**
 * Flux temps réel (Server-Sent Events). `?projectId=` limite aux changements d'un projet.
 * Chaque message signale quel projet a changé ; l'interface relit alors l'instantané.
 */
export async function GET(request: Request) {
  const filter = new URL(request.url).searchParams.get("projectId");
  const { store } = runtime();
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          cleanup();
        }
      };
      const cleanup = () => {
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
      };
      unsubscribe = store.subscribe((change) => {
        const projectId = projectIdOf(change);
        if (filter && projectId !== filter) return;
        send(`data: ${JSON.stringify({ kind: change.kind, projectId })}\n\n`);
      });
      heartbeat = setInterval(() => send(": ping\n\n"), 15000);
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // déjà fermé
        }
      });
      send(": connecté\n\n");
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
