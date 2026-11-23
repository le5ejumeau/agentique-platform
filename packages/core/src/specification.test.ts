import { describe, expect, it } from "vitest";
import { specificationToMarkdown, type Specification } from "./specification";

const spec: Specification = {
  titre: "Réservations",
  contexte: "Un salon veut des réservations en ligne.",
  objectifs: ["Réduire les appels"],
  personas: [{ nom: "Cliente", description: "Réserve depuis son téléphone" }],
  parcours: [{ nom: "Réserver", etapes: ["Choisir une prestation", "Choisir un créneau"] }],
  reglesMetier: [],
  contraintes: [],
  horsPerimetre: ["Paiement"],
  userStories: [
    {
      id: "US-01",
      persona: "cliente",
      besoin: "choisir un créneau | une heure",
      benefice: "venir quand je peux",
      priorite: "must",
      criteres: ["Le créneau est confirmé", "Un rappel part\nla veille"],
    },
  ],
  questionsOuvertes: [],
};

describe("specificationToMarkdown", () => {
  const md = specificationToMarkdown(spec);

  it("contient les sections attendues", () => {
    for (const heading of ["## Contexte", "## Parcours clés", "## User stories", "## Hors périmètre"]) {
      expect(md).toContain(heading);
    }
  });

  it("garde chaque user story sur une ligne de tableau valide", () => {
    const row = md.split("\n").find((l) => l.startsWith("| US-01"));
    expect(row).toContain("choisir un créneau \\| une heure");
    expect(row).toContain("Un rappel part la veille");
  });

  it("signale les listes vides", () => {
    expect(md).toContain("## Règles métier\n\n_Aucun_");
  });
});
