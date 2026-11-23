import { describe, expect, it } from "vitest";
import { allowedActions, nextStage, TransitionError } from "./workflow";
import { pendingClientAction, type Project } from "./domain";

describe("workflow", () => {
  it("suit le parcours nominal jusqu'à la validation", () => {
    let stage = nextStage("entretien", "terminer_entretien");
    stage = nextStage(stage, "specs_pretes");
    stage = nextStage(stage, "valider_specs");
    stage = nextStage(stage, "conception_terminee");
    stage = nextStage(stage, "prototype_pret");
    stage = nextStage(stage, "valider_prototype");
    expect(stage).toBe("valide");
  });

  it("renvoie à l'étape précédente quand le client refuse", () => {
    expect(nextStage("validation_specs", "refuser_specs")).toBe("specification");
    expect(nextStage("revue_prototype", "refuser_prototype")).toBe("prototypage");
  });

  it("refuse une validation hors de l'étape de validation", () => {
    expect(() => nextStage("entretien", "valider_specs")).toThrow(TransitionError);
  });

  it("liste les actions possibles à une étape", () => {
    expect(allowedActions("validation_specs").sort()).toEqual(["refuser_specs", "valider_specs"]);
  });
});

describe("pendingClientAction", () => {
  const base: Project = {
    id: "p1",
    name: "Test",
    kind: "web",
    brief: "",
    stage: "validation_specs",
    activeAgent: null,
    blockedReason: null,
    createdAt: "2026-11-23T00:00:00Z",
    updatedAt: "2026-11-23T00:00:00Z",
  };

  it("demande une validation quand aucun agent ne travaille", () => {
    expect(pendingClientAction(base)).toBe("Valider le cahier des charges");
  });

  it("ne demande rien pendant qu'un agent travaille", () => {
    expect(pendingClientAction({ ...base, activeAgent: "redacteur" })).toBeNull();
  });

  it("signale un blocage en priorité", () => {
    expect(pendingClientAction({ ...base, blockedReason: "clé API absente" })).toContain("bloqué");
  });
});
