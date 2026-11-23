import { describe, expect, it } from "vitest";
import { InMemoryStore } from "@agentique/core";
import { DemoModel } from "./demo-model";
import { Orchestrator } from "./orchestrator";
import type { AgentModel } from "./model";

function setup(model: AgentModel = new DemoModel()) {
  const store = new InMemoryStore();
  let n = 0;
  const orchestrator = new Orchestrator(store, model, { newId: () => `id-${++n}` });
  return { store, orchestrator };
}

async function interviewToTheEnd(orchestrator: Orchestrator, projectId: string) {
  for (const answer of [
    "Gérer les réservations",
    "Le client choisit un créneau puis paie",
    "Annulation 24 h avant",
    "Le programme de fidélité",
  ]) {
    await orchestrator.sendClientMessage(projectId, answer);
  }
}

describe("Orchestrator", () => {
  it("ouvre l'entretien avec une première question de l'Analyste", async () => {
    const { store, orchestrator } = setup();
    const { project, work } = await orchestrator.createProject({
      name: "Résa",
      kind: "web",
      brief: "Un site de réservation",
    });
    await work;

    const messages = await store.listMessages(project.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.author).toBe("analyste");
    const saved = await store.getProject(project.id);
    expect(saved?.stage).toBe("entretien");
    expect(saved?.activeAgent).toBeNull();
  });

  it("rédige le cahier des charges et demande la validation à la fin de l'entretien", async () => {
    const { store, orchestrator } = setup();
    const { project, work } = await orchestrator.createProject({
      name: "Résa",
      kind: "mobile",
      brief: "Une app de réservation",
    });
    await work;
    await interviewToTheEnd(orchestrator, project.id);

    expect((await store.getProject(project.id))?.stage).toBe("validation_specs");
    const deliverables = await store.listDeliverables(project.id);
    expect(deliverables.map((d) => d.kind).sort()).toEqual(["backlog", "cahier_des_charges"]);
    const events = await store.listEvents(project.id);
    expect(events.at(-1)?.type).toBe("validation_demandee");
  });

  it("produit une version 2 quand le client refuse, puis gèle à la validation", async () => {
    const { store, orchestrator } = setup();
    const { project, work } = await orchestrator.createProject({ name: "Résa", kind: "web", brief: "Réservations" });
    await work;
    await orchestrator.endInterview(project.id);

    await orchestrator.reviewSpecification(project.id, { approve: false, comment: "Ajouter le paiement" });
    const spec = (await store.listDeliverables(project.id)).find((d) => d.kind === "cahier_des_charges");
    expect(spec?.version).toBe(2);
    expect(spec?.markdown).toContain("Ajouter le paiement");

    await orchestrator.reviewSpecification(project.id, { approve: true });
    expect((await store.getProject(project.id))?.stage).toBe("conception");
  });

  it("refuse une validation quand rien n'attend le client", async () => {
    const { orchestrator } = setup();
    const { project, work } = await orchestrator.createProject({ name: "Résa", kind: "web", brief: "Réservations" });
    await work;
    await expect(orchestrator.reviewSpecification(project.id, { approve: true })).rejects.toThrow();
  });

  it("bloque le projet avec la raison quand un agent échoue", async () => {
    const failing: AgentModel = {
      name: "panne",
      analystTurn: async () => {
        throw new Error("clé API invalide");
      },
      writeSpecification: async () => {
        throw new Error("inutilisé");
      },
    };
    const { store, orchestrator } = setup(failing);
    const { project, work } = await orchestrator.createProject({ name: "Résa", kind: "web", brief: "Réservations" });
    await work;

    const saved = await store.getProject(project.id);
    expect(saved?.blockedReason).toBe("clé API invalide");
    expect((await store.listEvents(project.id)).some((e) => e.type === "erreur")).toBe(true);
  });
});
