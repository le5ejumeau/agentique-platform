import type { InterviewMessage, Project, Specification } from "@agentique/core";

export interface AnalystTurn {
  /** Message de l'Analyste au client : une ou plusieurs questions, ou la conclusion. */
  reponse: string;
  /** Vrai quand l'Analyste estime avoir assez d'éléments pour rédiger le cahier des charges. */
  entretienTermine: boolean;
}

export interface SpecificationRequest {
  project: Project;
  transcript: InterviewMessage[];
  /** Version refusée par le client et ses commentaires, pour une nouvelle version. */
  revision?: { previous: Specification; feedback: string };
}

/**
 * Ce que les agents demandent au modèle. Deux implémentations :
 * ClaudeModel (API Claude) et DemoModel (réponses scriptées, sans clé API).
 */
export interface AgentModel {
  readonly name: string;
  analystTurn(project: Project, transcript: InterviewMessage[]): Promise<AnalystTurn>;
  writeSpecification(request: SpecificationRequest): Promise<Specification>;
}
