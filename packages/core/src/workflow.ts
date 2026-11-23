import type { ProjectStage } from "./domain";

/**
 * Actions qui font avancer un projet. Seul l'Orchestrateur les applique ;
 * les validations (`valider_*`, `refuser_*`) viennent toujours du client.
 */
export type WorkflowAction =
  | "terminer_entretien"
  | "specs_pretes"
  | "valider_specs"
  | "refuser_specs"
  | "conception_terminee"
  | "prototype_pret"
  | "valider_prototype"
  | "refuser_prototype";

const TRANSITIONS: Record<WorkflowAction, { from: ProjectStage; to: ProjectStage }> = {
  terminer_entretien: { from: "entretien", to: "specification" },
  specs_pretes: { from: "specification", to: "validation_specs" },
  valider_specs: { from: "validation_specs", to: "conception" },
  // Un refus renvoie au Rédacteur avec les commentaires du client.
  refuser_specs: { from: "validation_specs", to: "specification" },
  conception_terminee: { from: "conception", to: "prototypage" },
  prototype_pret: { from: "prototypage", to: "revue_prototype" },
  valider_prototype: { from: "revue_prototype", to: "valide" },
  // Un refus renvoie au Développeur prototype avec les retours par écran.
  refuser_prototype: { from: "revue_prototype", to: "prototypage" },
};

export class TransitionError extends Error {
  constructor(
    readonly action: WorkflowAction,
    readonly stage: ProjectStage,
  ) {
    super(`Action « ${action} » impossible à l'étape « ${stage} »`);
    this.name = "TransitionError";
  }
}

/** Étape suivante après `action`, ou TransitionError si l'action n'est pas permise. */
export function nextStage(stage: ProjectStage, action: WorkflowAction): ProjectStage {
  const t = TRANSITIONS[action];
  if (t.from !== stage) throw new TransitionError(action, stage);
  return t.to;
}

export function allowedActions(stage: ProjectStage): WorkflowAction[] {
  return (Object.keys(TRANSITIONS) as WorkflowAction[]).filter((a) => TRANSITIONS[a].from === stage);
}
