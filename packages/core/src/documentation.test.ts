import { describe, expect, it } from "vitest";
import { buildDocumentation, sameDocumentation } from "./documentation";
import type { Deliverable, Project } from "./domain";

const project: Project = {
  id: "p1",
  name: "Salon",
  targets: ["ios", "android"],
  brief: "Réserver un créneau",
  stage: "entretien",
  activeAgent: null,
  blockedReason: null,
  createdAt: "2026-11-23T10:00:00Z",
  updatedAt: "2026-11-23T10:00:00Z",
};

const spec: Deliverable = {
  id: "d1",
  projectId: "p1",
  kind: "cahier_des_charges",
  version: 2,
  title: "Cahier",
  markdown: "# Cahier des charges",
  data: {},
  createdAt: "2026-11-23T10:05:00Z",
};

describe("buildDocumentation", () => {
  it("documente un projet dès sa création, sans cahier des charges", () => {
    const doc = buildDocumentation({ project, messages: [], events: [], deliverables: [] });
    expect(doc.pages.map((p) => p.path)).toEqual(["docs/README.md", "docs/besoin.md", "docs/decisions.md"]);
    expect(doc.pages[0]?.markdown).toContain("mobile iOS et Android");
  });

  it("ajoute le cahier des charges avec sa version et son statut", () => {
    const doc = buildDocumentation({
      project: { ...project, stage: "conception" },
      messages: [],
      events: [],
      deliverables: [spec],
    });
    const page = doc.pages.find((p) => p.path === "docs/specifications.md");
    expect(page?.markdown).toContain("Version 2, validé par le client");
  });

  it("ne garde que les décisions dans le journal", () => {
    const doc = buildDocumentation({
      project,
      messages: [],
      deliverables: [],
      events: [
        {
          id: "e1",
          projectId: "p1",
          type: "validation_donnee",
          agent: null,
          message: "Validé",
          at: "2026-11-23T10:00:00Z",
        },
        {
          id: "e2",
          projectId: "p1",
          type: "tache_demarree",
          agent: "analyste",
          message: "Travaille",
          at: "2026-11-23T10:00:00Z",
        },
      ],
    });
    const journal = doc.pages.find((p) => p.path === "docs/decisions.md")?.markdown ?? "";
    expect(journal).toContain("Validé");
    expect(journal).not.toContain("Travaille");
  });

  it("détecte une documentation inchangée", () => {
    const a = buildDocumentation({ project, messages: [], events: [], deliverables: [] });
    const b = buildDocumentation({ project, messages: [], events: [], deliverables: [] });
    expect(sameDocumentation(a, b)).toBe(true);
  });
});
