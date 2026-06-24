import { Router } from "express";
import db from "../db/database";
import { generateFollowupQuestion, classifyReflection } from "../lib/llm";
import { logger } from "../lib/logger";

const router = Router();

const MIN_CLUSTER_SIZE = parseInt(process.env.MIN_CLUSTER_SIZE ?? "4", 10);

const SIGNAL_TO_ACTION: Record<string, string> = {
  comprehension: "No action needed",
  surface_understanding: "Reinforce",
  definitional_gap: "Clarify terminology",
  causal_reasoning_gap: "Provide real-world examples",
  applied_transfer_difficulty: "Provide real-world examples",
  pacing_concern: "Revisit",
  support_need: "Revisit",
};

router.post("/followup", async (req, res) => {
  const { step1Text, topic } = req.body as { step1Text: string; topic: string };
  if (!step1Text || !topic) {
    res.status(400).json({ error: "step1Text and topic are required" });
    return;
  }
  try {
    const question = await generateFollowupQuestion(step1Text, topic);
    res.json({ question });
  } catch (err) {
    req.log.error({ err }, "Error generating followup question");
    res.status(500).json({ error: "Failed to generate question" });
  }
});

router.post("/", async (req, res) => {
  const { topic, step1Text, step2Text, step3Text } = req.body as {
    topic: string;
    step1Text: string;
    step2Text: string;
    step3Text: string;
  };

  if (!topic || !step1Text || !step2Text || !step3Text) {
    res.status(400).json({ error: "All fields required" });
    return;
  }

  try {
    const classification = await classifyReflection(topic, step1Text, step2Text, step3Text);

    const existing = db
      .prepare(
        `SELECT id, student_count FROM clusters WHERE topic = ? AND signal = ? AND is_suppressed = 0`
      )
      .get(topic, classification.signal) as { id: number; student_count: number } | undefined;

    let clusterId: number | null = null;

    if (existing) {
      const newCount = existing.student_count + 1;
      db.prepare(`UPDATE clusters SET student_count = ? WHERE id = ?`).run(newCount, existing.id);
      clusterId = existing.id;
    } else {
      const info = db
        .prepare(
          `INSERT INTO clusters (topic, signal, student_count, representative_phrases, suggested_action, trend_direction, is_suppressed)
           VALUES (?, ?, 1, '[]', ?, 'stable', ?)`
        )
        .run(topic, classification.signal, SIGNAL_TO_ACTION[classification.signal] ?? "Revisit", 1 < MIN_CLUSTER_SIZE ? 1 : 0);
      clusterId = info.lastInsertRowid as number;
    }

    const existing2 = db
      .prepare(`SELECT id, student_count, is_suppressed FROM clusters WHERE id = ?`)
      .get(clusterId) as { id: number; student_count: number; is_suppressed: number } | undefined;
    if (existing2 && existing2.is_suppressed && existing2.student_count >= MIN_CLUSTER_SIZE) {
      db.prepare(`UPDATE clusters SET is_suppressed = 0 WHERE id = ?`).run(clusterId);
    }

    const reflectionInfo = db
      .prepare(
        `INSERT INTO reflections (topic, step1_text, step2_text, step3_text, signal, confidence, cluster_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(topic, step1Text, step2Text, step3Text, classification.signal, classification.confidence, clusterId);

    res.status(201).json({
      id: reflectionInfo.lastInsertRowid,
      signal: classification.signal,
      confidence: classification.confidence,
      clusterId,
    });
  } catch (err) {
    req.log.error({ err }, "Error submitting reflection");
    res.status(500).json({ error: "Failed to process reflection" });
  }
});

export default router;
