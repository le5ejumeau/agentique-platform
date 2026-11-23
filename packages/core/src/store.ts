import type { Deliverable, InterviewMessage, Project, ProjectEvent } from "./domain";

export type StoreChange =
  | { kind: "project"; project: Project }
  | { kind: "event"; event: ProjectEvent }
  | { kind: "message"; message: InterviewMessage }
  | { kind: "deliverable"; deliverable: Deliverable };

export type StoreListener = (change: StoreChange) => void;

/**
 * Accès aux données. `InMemoryStore` sert au mode démo et aux tests ;
 * une implémentation Supabase suivra le même contrat (voir supabase/migrations).
 */
export interface Store {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;

  addEvent(event: ProjectEvent): Promise<void>;
  listEvents(projectId: string): Promise<ProjectEvent[]>;

  addMessage(message: InterviewMessage): Promise<void>;
  listMessages(projectId: string): Promise<InterviewMessage[]>;

  addDeliverable(deliverable: Deliverable): Promise<void>;
  /** Dernière version de chaque type de livrable. */
  listDeliverables(projectId: string): Promise<Deliverable[]>;

  /** Notifie chaque écriture, pour le suivi en temps réel. Renvoie la fonction de désabonnement. */
  subscribe(listener: StoreListener): () => void;
}

export class InMemoryStore implements Store {
  private projects = new Map<string, Project>();
  private events: ProjectEvent[] = [];
  private messages: InterviewMessage[] = [];
  private deliverables: Deliverable[] = [];
  private listeners = new Set<StoreListener>();

  async listProjects() {
    return [...this.projects.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(id: string) {
    return this.projects.get(id) ?? null;
  }

  async saveProject(project: Project) {
    this.projects.set(project.id, { ...project });
    this.emit({ kind: "project", project: { ...project } });
  }

  async addEvent(event: ProjectEvent) {
    this.events.push(event);
    this.emit({ kind: "event", event });
  }

  async listEvents(projectId: string) {
    return this.events.filter((e) => e.projectId === projectId);
  }

  async addMessage(message: InterviewMessage) {
    this.messages.push(message);
    this.emit({ kind: "message", message });
  }

  async listMessages(projectId: string) {
    return this.messages.filter((m) => m.projectId === projectId);
  }

  async addDeliverable(deliverable: Deliverable) {
    this.deliverables.push(deliverable);
    this.emit({ kind: "deliverable", deliverable });
  }

  async listDeliverables(projectId: string) {
    const latest = new Map<string, Deliverable>();
    for (const d of this.deliverables) {
      if (d.projectId !== projectId) continue;
      const current = latest.get(d.kind);
      if (!current || d.version > current.version) latest.set(d.kind, d);
    }
    return [...latest.values()];
  }

  subscribe(listener: StoreListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(change: StoreChange) {
    for (const l of this.listeners) l(change);
  }
}
