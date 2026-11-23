import {
  AGENT_LABELS,
  nextStage,
  STAGE_LABELS,
  specificationToMarkdown,
  type AgentRole,
  type Deliverable,
  type Project,
  type ProjectEventType,
  type ProjectKind,
  type Specification,
  type Store,
  type WorkflowAction,
} from "@agentique/core";
import type { AgentModel } from "./model";

export interface OrchestratorOptions {
  now?: () => Date;
  newId?: () => string;
}

export interface NewProject {
  name: string;
  kind: ProjectKind;
  brief: string;
}

/**
 * L'Orchestrateur fait avancer chaque projet d'étape en étape, appelle les agents
 * et publie un événement pour chaque fait marquant (suivi en temps réel).
 *
 * Les méthodes publiques renvoient une promesse qui se résout quand le travail
 * des agents est fini : l'API web ne l'attend pas, les tests l'attendent.
 * Les erreurs d'agent ne sont jamais levées : le projet passe « bloqué ».
 */
export class Orchestrator {
  private now: () => Date;
  private newId: () => string;
  /** Une seule tâche à la fois par projet. */
  private queues = new Map<string, Promise<unknown>>();

  constructor(
    private readonly store: Store,
    private readonly model: AgentModel,
    options: OrchestratorOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.newId = options.newId ?? (() => crypto.randomUUID());
  }

  /** Crée le projet et lance l'entretien ; renvoie le projet dès sa création. */
  async createProject(input: NewProject): Promise<{ project: Project; work: Promise<void> }> {
    const at = this.timestamp();
    const project: Project = {
      id: this.newId(),
      name: input.name.trim(),
      kind: input.kind,
      brief: input.brief.trim(),
      stage: "entretien",
      activeAgent: null,
      blockedReason: null,
      createdAt: at,
      updatedAt: at,
    };
    await this.store.saveProject(project);
    await this.event(project.id, "projet_cree", null, `Projet créé (${input.kind === "mobile" ? "mobile" : "web"})`);
    const work = this.enqueue(project.id, () => this.runAnalyst(project.id));
    return { project, work };
  }

  /** Réponse du client pendant l'entretien. */
  async sendClientMessage(projectId: string, content: string): Promise<void> {
    const project = await this.require(projectId);
    if (project.stage !== "entretien") throw new Error("L'entretien est terminé pour ce projet.");
    await this.store.addMessage({ id: this.newId(), projectId, author: "client", content: content.trim(), at: this.timestamp() });
    await this.event(projectId, "message_entretien", null, "Le client a répondu à l'Analyste");
    await this.enqueue(projectId, () => this.runAnalyst(projectId));
  }

  /** Le client demande à passer à la rédaction sans attendre la fin des questions. */
  async endInterview(projectId: string): Promise<void> {
    await this.enqueue(projectId, async () => {
      const project = await this.require(projectId);
      if (project.stage !== "entretien") return;
      await this.move(project, "terminer_entretien");
      await this.runWriter(projectId);
    });
  }

  /** Point de validation 1 : le client accepte ou refuse le cahier des charges. */
  async reviewSpecification(projectId: string, decision: { approve: boolean; comment?: string }): Promise<void> {
    const current = await this.require(projectId);
    if (current.stage !== "validation_specs") throw new Error("Aucun cahier des charges n'attend de validation.");
    await this.enqueue(projectId, async () => {
      const project = await this.require(projectId);
      if (decision.approve) {
        await this.event(projectId, "validation_donnee", null, "Le client a validé le cahier des charges");
        await this.move(project, "valider_specs");
        await this.event(
          projectId,
          "tache_terminee",
          "orchestrateur",
          "Cahier des charges gelé. La conception et le prototypage arrivent dans le prochain lot.",
        );
        return;
      }
      const feedback = decision.comment?.trim() || "Le client demande une nouvelle version.";
      await this.event(projectId, "validation_donnee", null, `Le client demande des corrections : ${feedback}`);
      await this.move(project, "refuser_specs");
      await this.runWriter(projectId, feedback);
    });
  }

  // --- Agents -------------------------------------------------------------

  private async runAnalyst(projectId: string) {
    const turn = await this.task(projectId, "analyste", "Prépare ses questions", async (project) => {
      const transcript = await this.store.listMessages(projectId);
      return this.model.analystTurn(project, transcript);
    });
    if (!turn) return;
    await this.store.addMessage({ id: this.newId(), projectId, author: "analyste", content: turn.reponse, at: this.timestamp() });
    await this.event(projectId, "message_entretien", "analyste", turn.entretienTermine ? "Entretien terminé" : "Nouvelles questions pour le client");
    if (turn.entretienTermine) {
      await this.move(await this.require(projectId), "terminer_entretien");
      await this.runWriter(projectId);
    }
  }

  private async runWriter(projectId: string, feedback?: string) {
    const previous = feedback ? await this.latestSpecification(projectId) : undefined;
    const spec = await this.task(projectId, "redacteur", "Rédige le cahier des charges", async (project) => {
      const transcript = await this.store.listMessages(projectId);
      return this.model.writeSpecification({
        project,
        transcript,
        revision: previous && feedback ? { previous: previous.data as Specification, feedback } : undefined,
      });
    });
    if (!spec) return;

    const version = (previous?.version ?? 0) + 1;
    const at = this.timestamp();
    const deliverables: Deliverable[] = [
      {
        id: this.newId(),
        projectId,
        kind: "cahier_des_charges",
        version,
        title: spec.titre,
        markdown: specificationToMarkdown(spec),
        data: spec,
        createdAt: at,
      },
      {
        id: this.newId(),
        projectId,
        kind: "backlog",
        version,
        title: `Backlog (${spec.userStories.length} user stories)`,
        markdown: spec.userStories.map((s) => `- **${s.id}** [${s.priorite}] ${s.besoin}`).join("\n"),
        data: spec.userStories,
        createdAt: at,
      },
    ];
    for (const d of deliverables) {
      await this.store.addDeliverable(d);
      await this.event(projectId, "livrable_publie", "redacteur", `${d.title} (version ${version})`);
    }
    await this.move(await this.require(projectId), "specs_pretes");
    await this.event(projectId, "validation_demandee", "orchestrateur", "Le cahier des charges attend la validation du client");
  }

  // --- Outils internes ----------------------------------------------------

  /** Exécute le travail d'un agent : agent actif, événements de début et fin, blocage si erreur. */
  private async task<T>(projectId: string, agent: AgentRole, label: string, work: (project: Project) => Promise<T>): Promise<T | null> {
    const project = await this.require(projectId);
    await this.store.saveProject({ ...project, activeAgent: agent, blockedReason: null, updatedAt: this.timestamp() });
    await this.event(projectId, "tache_demarree", agent, `${AGENT_LABELS[agent]} : ${label.toLowerCase()}`);
    try {
      const result = await work(project);
      await this.store.saveProject({ ...(await this.require(projectId)), activeAgent: null, updatedAt: this.timestamp() });
      await this.event(projectId, "tache_terminee", agent, `${AGENT_LABELS[agent]} : terminé`);
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.store.saveProject({ ...(await this.require(projectId)), activeAgent: null, blockedReason: reason, updatedAt: this.timestamp() });
      await this.event(projectId, "erreur", agent, `${AGENT_LABELS[agent]} bloqué : ${reason}`);
      return null;
    }
  }

  private async move(project: Project, action: WorkflowAction) {
    const stage = nextStage(project.stage, action);
    await this.store.saveProject({ ...project, stage, updatedAt: this.timestamp() });
    await this.event(project.id, "etape_changee", "orchestrateur", `Étape : ${STAGE_LABELS[stage]}`);
  }

  private async latestSpecification(projectId: string) {
    const all = await this.store.listDeliverables(projectId);
    return all.find((d) => d.kind === "cahier_des_charges");
  }

  private async event(projectId: string, type: ProjectEventType, agent: AgentRole | null, message: string) {
    await this.store.addEvent({ id: this.newId(), projectId, type, agent, message, at: this.timestamp() });
  }

  private async require(projectId: string): Promise<Project> {
    const project = await this.store.getProject(projectId);
    if (!project) throw new Error(`Projet introuvable : ${projectId}`);
    return project;
  }

  private enqueue(projectId: string, job: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(projectId) ?? Promise.resolve();
    const next = previous.then(job, job);
    this.queues.set(projectId, next.catch(() => undefined));
    return next;
  }

  private timestamp() {
    return this.now().toISOString();
  }
}
