import { z } from "zod";

/**
 * Format structuré du cahier des charges produit par le Rédacteur.
 * Il est lu tel quel par le Designer UX à l'étape suivante.
 */
export const UserStorySchema = z.object({
  id: z.string().describe("Identifiant court, par exemple US-01"),
  persona: z.string(),
  besoin: z.string().describe("Ce que la personne veut faire"),
  benefice: z.string().describe("Pourquoi elle le veut"),
  priorite: z.enum(["must", "should", "could", "wont"]),
  criteres: z.array(z.string()).describe("Critères d'acceptation vérifiables"),
});

export const SpecificationSchema = z.object({
  titre: z.string(),
  contexte: z.string().describe("Le problème à résoudre et pour qui, en quelques phrases"),
  objectifs: z.array(z.string()),
  personas: z.array(z.object({ nom: z.string(), description: z.string() })),
  parcours: z.array(z.object({ nom: z.string(), etapes: z.array(z.string()) })),
  reglesMetier: z.array(z.string()),
  contraintes: z.array(z.string()).describe("Plateforme, délais, intégrations, réglementation"),
  horsPerimetre: z.array(z.string()),
  userStories: z.array(UserStorySchema),
  questionsOuvertes: z.array(z.string()),
});

export type UserStory = z.infer<typeof UserStorySchema>;
export type Specification = z.infer<typeof SpecificationSchema>;

const PRIORITY_LABELS: Record<UserStory["priorite"], string> = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};

/** Une cellule de tableau Markdown ne doit contenir ni barre verticale ni retour à la ligne. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
}

function list(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "_Aucun_";
}

/** Version lisible du cahier des charges, montrée au client pour validation. */
export function specificationToMarkdown(spec: Specification): string {
  const personas = spec.personas.map((p) => `- **${p.nom}** : ${p.description}`).join("\n");
  const parcours = spec.parcours
    .map((p) => `### ${p.nom}\n\n${p.etapes.map((e, i) => `${i + 1}. ${e}`).join("\n")}`)
    .join("\n\n");
  const stories = spec.userStories
    .map(
      (s) =>
        `| ${cell(s.id)} | ${PRIORITY_LABELS[s.priorite]} | ${cell(`En tant que ${s.persona}, je veux ${s.besoin} afin de ${s.benefice}`)} | ${cell(s.criteres.join(" ; "))} |`,
    )
    .join("\n");

  return [
    `# ${spec.titre}`,
    `## Contexte\n\n${spec.contexte}`,
    `## Objectifs\n\n${list(spec.objectifs)}`,
    `## Personas\n\n${personas || "_Aucun_"}`,
    `## Parcours clés\n\n${parcours || "_Aucun_"}`,
    `## Règles métier\n\n${list(spec.reglesMetier)}`,
    `## Contraintes\n\n${list(spec.contraintes)}`,
    `## Hors périmètre\n\n${list(spec.horsPerimetre)}`,
    `## User stories\n\n| Id | Priorité | Story | Critères d'acceptation |\n| --- | --- | --- | --- |\n${stories}`,
    `## Questions ouvertes\n\n${list(spec.questionsOuvertes)}`,
  ].join("\n\n");
}
