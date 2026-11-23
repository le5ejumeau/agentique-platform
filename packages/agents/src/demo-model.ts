import type { InterviewMessage, Project, Specification } from "@agentique/core";
import type { AgentModel, AnalystTurn, SpecificationRequest } from "./model";

const QUESTIONS = [
  "Bonjour, je suis l'Analyste qui va cadrer votre projet avec vous.\n\n1. Quel problème principal votre application doit-elle résoudre ?\n2. Qui va l'utiliser au quotidien ?",
  "Merci. 1. Pouvez-vous décrire, étape par étape, ce que fait un utilisateur lors de sa visite la plus courante ?\n2. Y a-t-il plusieurs types d'utilisateurs avec des droits différents ?",
  "Très clair. 1. Quelles règles métier importantes doit-on respecter (statuts, calculs, notifications) ?\n2. Avez-vous des contraintes de délai, de budget ou d'outils existants à connecter ?",
  "Dernière question : qu'est-ce qui peut attendre une deuxième version ?",
];

/**
 * Modèle scripté utilisé sans clé API (démonstration et tests).
 * Il suit le même contrat que ClaudeModel pour exercer tout le parcours.
 */
export class DemoModel implements AgentModel {
  readonly name = "demo";

  constructor(private readonly delayMs = 0) {}

  async analystTurn(_project: Project, transcript: InterviewMessage[]): Promise<AnalystTurn> {
    await this.wait();
    const asked = transcript.filter((m) => m.author === "analyste").length;
    const question = QUESTIONS[asked];
    if (question) return { reponse: question, entretienTermine: false };
    return {
      reponse:
        "Merci, j'ai ce qu'il me faut. Je transmets l'entretien au Rédacteur, qui prépare votre cahier des charges.",
      entretienTermine: true,
    };
  }

  async writeSpecification({ project, transcript, revision }: SpecificationRequest): Promise<Specification> {
    await this.wait();
    const answers = transcript.filter((m) => m.author === "client").map((m) => m.content);
    const spec: Specification = {
      titre: `Cahier des charges : ${project.name}`,
      contexte: project.brief,
      objectifs: answers.slice(0, 1),
      personas: [{ nom: "Utilisateur principal", description: answers[0] ?? "À préciser" }],
      parcours: [{ nom: "Parcours principal", etapes: answers[1] ? [answers[1]] : ["À préciser"] }],
      reglesMetier: answers[2] ? [answers[2]] : [],
      contraintes: [project.kind === "mobile" ? "Application mobile iOS et Android" : "Application web responsive"],
      horsPerimetre: answers[3] ? [answers[3]] : [],
      userStories: [
        {
          id: "US-01",
          persona: "utilisateur principal",
          besoin: "accomplir le parcours principal",
          benefice: "répondre au besoin décrit dans le brief",
          priorite: "must",
          criteres: ["Le parcours se termine sans erreur", "Le résultat est visible à l'écran"],
        },
      ],
      questionsOuvertes: ["Ce cahier des charges est généré en mode démo, sans modèle d'IA."],
    };
    if (revision) spec.questionsOuvertes.push(`Commentaires pris en compte : ${revision.feedback}`);
    return spec;
  }

  private wait() {
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }
}
