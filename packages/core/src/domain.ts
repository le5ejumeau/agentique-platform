/**
 * Modèle métier de la plateforme : projets, étapes, agents, événements et livrables.
 * Ces types sont partagés par l'interface, les agents et la base de données.
 */

export type ProjectKind = "web" | "mobile";

/** Étapes d'un projet, dans l'ordre du parcours (voir docs/architecture.md). */
export const STAGES = [
  "entretien",
  "specification",
  "validation_specs",
  "conception",
  "prototypage",
  "revue_prototype",
  "valide",
] as const;

export type ProjectStage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  entretien: "Entretien",
  specification: "Spécification",
  validation_specs: "Validation du cahier des charges",
  conception: "Conception",
  prototypage: "Prototypage",
  revue_prototype: "Revue du prototype",
  valide: "Validé",
};

export type AgentRole =
  "orchestrateur" | "analyste" | "redacteur" | "designer_ux" | "developpeur_prototype" | "controleur_qualite";

export const AGENT_LABELS: Record<AgentRole, string> = {
  orchestrateur: "Orchestrateur",
  analyste: "Analyste fonctionnel",
  redacteur: "Rédacteur de spécifications",
  designer_ux: "Designer UX",
  developpeur_prototype: "Développeur prototype",
  controleur_qualite: "Contrôleur qualité",
};

export interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  /** Description libre du besoin, saisie à la création. */
  brief: string;
  stage: ProjectStage;
  /** Agent en train de travailler, ou null si le projet attend le client. */
  activeAgent: AgentRole | null;
  /** Renseigné quand le projet est bloqué (erreur, intervention humaine requise). */
  blockedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectEventType =
  | "projet_cree"
  | "etape_changee"
  | "tache_demarree"
  | "tache_terminee"
  | "message_entretien"
  | "livrable_publie"
  | "validation_demandee"
  | "validation_donnee"
  | "erreur";

export interface ProjectEvent {
  id: string;
  projectId: string;
  type: ProjectEventType;
  agent: AgentRole | null;
  /** Phrase courte affichée dans le fil d'activité. */
  message: string;
  at: string;
}

export interface InterviewMessage {
  id: string;
  projectId: string;
  author: "client" | "analyste";
  content: string;
  at: string;
}

export type DeliverableKind = "cahier_des_charges" | "backlog";

export interface Deliverable {
  id: string;
  projectId: string;
  kind: DeliverableKind;
  version: number;
  title: string;
  /** Version lisible par le client. */
  markdown: string;
  /** Version structurée, lue par l'agent suivant. */
  data: unknown;
  createdAt: string;
}

/** Ce que le client doit faire à cette étape, ou null si les agents travaillent. */
export function pendingClientAction(project: Project): string | null {
  if (project.blockedReason) return "Projet bloqué : " + project.blockedReason;
  if (project.activeAgent) return null;
  switch (project.stage) {
    case "entretien":
      return "Répondre à l'Analyste";
    case "validation_specs":
      return "Valider le cahier des charges";
    case "revue_prototype":
      return "Valider le prototype";
    default:
      return null;
  }
}
