import { logger } from "./logger";

const SIGNAL_CATEGORIES = [
  "comprehension",
  "surface_understanding",
  "definitional_gap",
  "causal_reasoning_gap",
  "applied_transfer_difficulty",
  "pacing_concern",
  "support_need",
] as const;

export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

export interface ClassificationResult {
  signal: SignalCategory;
  confidence: number;
  rationale: string;
}

function heuristicClassify(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  if (
    lower.match(/don't know|no idea|lost|overwhelmed|too fast|behind|rush|can't keep up|struggling|where do i start/)
  ) {
    if (lower.match(/start|help|resource|confused|lost/)) {
      return { signal: "support_need", confidence: 0.75, rationale: "Explicit request for help or resources" };
    }
    return { signal: "pacing_concern", confidence: 0.7, rationale: "Student feels rushed or behind" };
  }

  if (lower.match(/what is|definition|define|term|vocabulary|mean by|what does .* mean/)) {
    return { signal: "definitional_gap", confidence: 0.72, rationale: "Student cannot define the core term" };
  }

  if (lower.match(/why|because|reason|cause|effect|impact|so that|leads to|result/)) {
    if (lower.match(/not sure why|don't understand why|unclear why|unsure.*reason/)) {
      return { signal: "causal_reasoning_gap", confidence: 0.74, rationale: "Knows what, not why" };
    }
  }

  if (lower.match(/apply|real.?world|example|use case|practice|company|business|how would|situation/)) {
    if (lower.match(/not sure|unsure|difficult|hard|struggle|don't know how/)) {
      return { signal: "applied_transfer_difficulty", confidence: 0.73, rationale: "Cannot apply concept to real case" };
    }
  }

  if (lower.match(/understand|get it|makes sense|clear|concept|know|grasp|follow/) &&
      !lower.match(/not sure|unsure|don't|can't|difficult/)) {
    if (lower.match(/define|basic|generally|generally speaking|kind of|sort of/)) {
      return { signal: "surface_understanding", confidence: 0.68, rationale: "Can define but lacks deep reasoning" };
    }
    return { signal: "comprehension", confidence: 0.7, rationale: "Solid understanding demonstrated" };
  }

  if (lower.match(/not sure|unsure|kind of|sort of|somewhat|partially|maybe/)) {
    return { signal: "surface_understanding", confidence: 0.65, rationale: "Partial understanding, cannot reason deeply" };
  }

  return { signal: "causal_reasoning_gap", confidence: 0.55, rationale: "Heuristic fallback classification" };
}

function heuristicFollowup(step1Text: string, topic: string): string {
  const lower = step1Text.toLowerCase();

  if (lower.match(/blockchain/i) || topic === "Blockchain") {
    return "What do you think would happen if a transaction was modified after being added to the blockchain?";
  }
  if (lower.match(/agent|autonomous/i) || topic === "Agentic AI") {
    return "In what situation would you prefer an agentic AI system over a standard automated script, and why?";
  }
  if (lower.match(/quantum/i) || topic === "Quantum Computing") {
    return "Can you describe a specific problem that classical computers struggle with where quantum computing might help?";
  }
  if (lower.match(/ethic|bias|fairness|harm/i) || topic === "Generative AI Ethics") {
    return "How would you decide whether a specific use of generative AI crosses an ethical line in a real business context?";
  }
  if (lower.match(/cyber|security|attack|protect/i) || topic === "Cybersecurity Basics") {
    return "If a company could only implement one security measure with limited resources, what would you recommend and why?";
  }

  return "Can you give a specific example or scenario where you would apply this concept in practice?";
}

let openaiClient: unknown = null;

async function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const { default: OpenAI } = await import("openai");
    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
  } catch {
    return null;
  }
}

export async function generateFollowupQuestion(step1Text: string, topic: string): Promise<string> {
  const client = await getOpenAIClient() as { chat: { completions: { create: (args: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } } | null;
  if (!client) {
    return heuristicFollowup(step1Text, topic);
  }

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are an educational assistant helping to deepen student reflection. Given a student's initial response about "${topic}", generate ONE short, specific clarifying follow-up question that probes where they might be uncertain or could deepen their understanding. The question should be 1-2 sentences max. Do not repeat what they said back to them.`,
        },
        {
          role: "user",
          content: `Student's step 1 response: "${step1Text}"`,
        },
      ],
      max_tokens: 100,
    });
    return response.choices[0]?.message?.content?.trim() ?? heuristicFollowup(step1Text, topic);
  } catch (err) {
    logger.warn({ err }, "OpenAI followup call failed, using heuristic fallback");
    return heuristicFollowup(step1Text, topic);
  }
}

export async function classifyReflection(
  topic: string,
  step1: string,
  step2: string,
  step3: string
): Promise<ClassificationResult> {
  const fullText = `${step1} ${step2} ${step3}`;
  const client = await getOpenAIClient() as { chat: { completions: { create: (args: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } } | null;
  if (!client) {
    return heuristicClassify(fullText);
  }

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a learning signal classifier for course reflections on "${topic}". Classify this student reflection into EXACTLY ONE of these categories:
- "comprehension": solid understanding, can reason about and apply the concept
- "surface_understanding": can define the term but cannot reason deeply about it
- "definitional_gap": doesn't know the term itself
- "causal_reasoning_gap": knows what the concept is, but not why or how it works
- "applied_transfer_difficulty": understands the concept but cannot apply it to a real case
- "pacing_concern": feels rushed, behind, or overwhelmed with the pace
- "support_need": explicitly requests help or additional resources

Return a JSON object: { "signal": "<category>", "confidence": <0.0-1.0>, "rationale": "<one sentence>" }`,
        },
        {
          role: "user",
          content: `Step 1 (what they learned): ${step1}\nStep 2 (uncertainty): ${step2}\nStep 3 (application reasoning): ${step3}`,
        },
      ],
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return heuristicClassify(fullText);

    const parsed = JSON.parse(content) as { signal: string; confidence: number; rationale: string };
    if (SIGNAL_CATEGORIES.includes(parsed.signal as SignalCategory)) {
      return {
        signal: parsed.signal as SignalCategory,
        confidence: parsed.confidence ?? 0.8,
        rationale: parsed.rationale ?? "",
      };
    }
    return heuristicClassify(fullText);
  } catch (err) {
    logger.warn({ err }, "OpenAI classification failed, using heuristic fallback");
    return heuristicClassify(fullText);
  }
}
