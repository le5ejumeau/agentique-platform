import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SpecificationSchema, type InterviewMessage, type Project } from "@agentique/core";
import type { AgentModel, AnalystTurn, SpecificationRequest } from "./model";
import { ANALYSTE_SYSTEM, REDACTEUR_SYSTEM, projectContext, transcriptToText } from "./prompts";

const AnalystTurnSchema = z.object({
  reponse: z.string(),
  entretienTermine: z.boolean(),
});

export interface ClaudeModelOptions {
  client?: Anthropic;
  model?: string;
}

/** Agents Analyste et Rédacteur appuyés sur l'API Claude, avec sortie structurée. */
export class ClaudeModel implements AgentModel {
  readonly name = "claude";
  private client: Anthropic;
  private model: string;

  constructor(options: ClaudeModelOptions = {}) {
    this.client = options.client ?? new Anthropic();
    this.model = options.model ?? "claude-opus-5-5";
  }

  async analystTurn(project: Project, transcript: InterviewMessage[]): Promise<AnalystTurn> {
    const content = transcript.length
      ? `${projectContext(project)}\n\nEntretien jusqu'ici :\n\n${transcriptToText(transcript)}\n\nRédige ton prochain message au client.`
      : `${projectContext(project)}\n\nL'entretien commence. Accueille le client en une phrase et pose tes premières questions.`;

    return this.parse(ANALYSTE_SYSTEM, content, AnalystTurnSchema, "low");
  }

  async writeSpecification({ project, transcript, revision }: SpecificationRequest) {
    let content = `${projectContext(project)}\n\nEntretien complet :\n\n${transcriptToText(transcript)}`;
    if (revision) {
      content += `\n\nVersion précédente refusée par le client :\n${JSON.stringify(revision.previous)}\n\nCommentaires du client :\n${revision.feedback}`;
    }
    return this.parse(REDACTEUR_SYSTEM, content, SpecificationSchema, "medium");
  }

  private async parse<T extends z.ZodType>(
    system: string,
    content: string,
    schema: T,
    effort: "low" | "medium",
  ): Promise<z.infer<T>> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content }],
      output_config: { effort, format: betaZodOutputFormat(schema) },
      // En cas de refus par les filtres de sécurité, l'API relance sur un modèle de repli.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") {
      throw new Error("Le modèle a refusé de répondre à cette demande.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("La réponse du modèle a été tronquée (max_tokens atteint).");
    }
    if (response.parsed_output == null) {
      throw new Error("Réponse du modèle illisible : format structuré non respecté.");
    }
    return response.parsed_output as z.infer<T>;
  }
}
