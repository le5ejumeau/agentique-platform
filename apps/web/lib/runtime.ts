import "server-only";
import { InMemoryStore, type Store } from "@agentique/core";
import { ClaudeModel, DemoModel, Orchestrator, type AgentModel } from "@agentique/agents";

interface Runtime {
  store: Store;
  orchestrator: Orchestrator;
  model: AgentModel;
}

function chooseModel(): AgentModel {
  const forced = process.env.AGENTIQUE_MODEL;
  if (forced === "demo") return new DemoModel(800);
  if (forced === "claude" || process.env.ANTHROPIC_API_KEY) return new ClaudeModel();
  return new DemoModel(800);
}

/**
 * Une seule instance par processus serveur, conservée entre les rechargements à chaud.
 * Les données sont en mémoire pour l'instant : elles disparaissent au redémarrage.
 * Le passage à Supabase remplacera InMemoryStore sans toucher au reste.
 */
const globalRuntime = globalThis as typeof globalThis & { __agentique?: Runtime };

export function runtime(): Runtime {
  if (!globalRuntime.__agentique) {
    const store = new InMemoryStore();
    const model = chooseModel();
    globalRuntime.__agentique = { store, model, orchestrator: new Orchestrator(store, model) };
  }
  return globalRuntime.__agentique;
}

/** Lance un travail d'agents sans le faire attendre par la requête HTTP. */
export function background(work: Promise<unknown>) {
  work.catch((error) => console.error("[agents]", error));
}
