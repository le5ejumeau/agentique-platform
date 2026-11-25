import {
  STAGE_LABELS,
  describeTargets,
  type Deliverable,
  type InterviewMessage,
  type Project,
  type ProjectEvent,
} from "./domain";

/**
 * Documentation vivante d'une application générée.
 * Chaque page correspond à un fichier Markdown du dossier `docs/` du dépôt de l'application ;
 * la plateforme affiche la dernière version en direct.
 */
export interface DocPage {
  /** Chemin du fichier dans le dépôt de l'application, par exemple `docs/README.md`. */
  path: string;
  title: string;
  markdown: string;
}

export interface Documentation {
  pages: DocPage[];
}

export interface DocumentationSources {
  project: Project;
  messages: InterviewMessage[];
  events: ProjectEvent[];
  /** Dernière version de chaque livrable. */
  deliverables: Deliverable[];
}

/** Types d'événements qui marquent une décision et vont dans le journal. */
const DECISION_EVENTS = new Set<ProjectEvent["type"]>(["projet_cree", "etape_changee", "validation_donnee"]);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
}

/** Assemble la documentation à partir de l'état du projet. Pure : mêmes entrées, même sortie. */
export function buildDocumentation({ project, messages, events, deliverables }: DocumentationSources): Documentation {
  const spec = deliverables.find((d) => d.kind === "cahier_des_charges");
  const specStatus = !spec
    ? null
    : project.stage === "validation_specs" || project.stage === "specification"
      ? "en attente de validation"
      : "validé par le client";

  const pages: DocPage[] = [];

  pages.push({
    path: "docs/README.md",
    title: "Présentation",
    markdown: [
      `# ${project.name}`,
      `**Plateformes visées** : ${describeTargets(project.targets)}  \n**Étape actuelle** : ${STAGE_LABELS[project.stage]}`,
      `## Le besoin en bref\n\n${project.brief}`,
      "## Sommaire",
      [
        "- [Expression du besoin](besoin.md)",
        spec ? `- [Cahier des charges](specifications.md), version ${spec.version}, ${specStatus}` : null,
        "- [Journal des décisions](decisions.md)",
      ]
        .filter(Boolean)
        .join("\n"),
    ].join("\n\n"),
  });

  const interview = messages.length
    ? messages.map((m) => `**${m.author === "client" ? "Client" : "Analyste"}** : ${m.content}`).join("\n\n")
    : "_L'entretien n'a pas encore commencé._";
  pages.push({
    path: "docs/besoin.md",
    title: "Expression du besoin",
    markdown: `# Expression du besoin\n\n## Brief initial\n\n${project.brief}\n\n## Entretien avec l'Analyste\n\n${interview}`,
  });

  if (spec) {
    pages.push({
      path: "docs/specifications.md",
      title: "Cahier des charges",
      markdown: `> Version ${spec.version}, ${specStatus}.\n\n${spec.markdown}`,
    });
  }

  const decisions = events.filter((e) => DECISION_EVENTS.has(e.type));
  pages.push({
    path: "docs/decisions.md",
    title: "Journal des décisions",
    markdown: `# Journal des décisions\n\n| Date | Décision |\n| --- | --- |\n${decisions
      .map((e) => `| ${formatDate(e.at)} | ${e.message.replace(/\|/g, "\\|")} |`)
      .join("\n")}`,
  });

  return { pages };
}

/** Vrai si deux versions de la documentation ont exactement le même contenu. */
export function sameDocumentation(a: Documentation, b: Documentation): boolean {
  return JSON.stringify(a.pages) === JSON.stringify(b.pages);
}
