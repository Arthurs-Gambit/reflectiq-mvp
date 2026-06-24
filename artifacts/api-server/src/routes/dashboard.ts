import { Router } from "express";
import db from "../db/database";

const router = Router();

router.get("/summary", (_req, res) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekStr = oneWeekAgo.toISOString().slice(0, 19);

  const totalReflectionsThisWeek = (
    db.prepare(`SELECT COUNT(*) as cnt FROM reflections WHERE created_at >= ?`).get(weekStr) as { cnt: number }
  ).cnt;

  const activeClusterCount = (
    db.prepare(`SELECT COUNT(*) as cnt FROM clusters WHERE is_suppressed = 0`).get() as { cnt: number }
  ).cnt;

  const flaggedTopicCount = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT topic) as cnt FROM clusters
         WHERE is_suppressed = 0
         AND signal IN ('definitional_gap', 'causal_reasoning_gap')
         AND student_count >= 8`
      )
      .get() as { cnt: number }
  ).cnt;

  res.json({ totalReflectionsThisWeek, activeClusterCount, flaggedTopicCount });
});

router.get("/heatmap", (req, res) => {
  const { topic, dateFrom, dateTo, signal } = req.query as Record<string, string | undefined>;

  let whereClauses = ["1=1"];
  const params: unknown[] = [];

  if (topic) {
    whereClauses.push("r.topic = ?");
    params.push(topic);
  }
  if (dateFrom) {
    whereClauses.push("r.created_at >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    whereClauses.push("r.created_at <= ?");
    params.push(dateTo + "T23:59:59");
  }
  if (signal) {
    whereClauses.push("r.signal = ?");
    params.push(signal);
  }

  const rows = db
    .prepare(
      `SELECT r.topic, r.signal, COUNT(*) as cnt
       FROM reflections r
       WHERE ${whereClauses.join(" AND ")}
       GROUP BY r.topic, r.signal
       ORDER BY r.topic, r.signal`
    )
    .all(...params) as { topic: string; signal: string; cnt: number }[];

  const topicMap: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!topicMap[row.topic]) topicMap[row.topic] = {};
    topicMap[row.topic][row.signal] = row.cnt;
  }

  const TOPICS = ["Agentic AI", "Blockchain", "Quantum Computing", "Generative AI Ethics", "Cybersecurity Basics"];
  const result = Object.entries(topicMap).map(([t, signals]) => {
    const total = Object.values(signals).reduce((a, b) => a + b, 0);
    const gapCount = (signals["definitional_gap"] ?? 0) + (signals["causal_reasoning_gap"] ?? 0);
    const isHotspot = total > 0 && gapCount / total >= 0.35;
    return { topic: t, signals, total, isHotspot };
  });

  const sortedResult = TOPICS.filter((t) => result.find((r) => r.topic === t))
    .map((t) => result.find((r) => r.topic === t)!)
    .concat(result.filter((r) => !TOPICS.includes(r.topic)));

  res.json(sortedResult);
});

router.get("/clusters", (req, res) => {
  const { topic, dateFrom, dateTo, signal } = req.query as Record<string, string | undefined>;

  const whereClauses = ["c.is_suppressed = 0"];
  const params: unknown[] = [];

  if (topic) { whereClauses.push("c.topic = ?"); params.push(topic); }
  if (signal) { whereClauses.push("c.signal = ?"); params.push(signal); }
  if (dateFrom) { whereClauses.push("c.created_at >= ?"); params.push(dateFrom); }
  if (dateTo) { whereClauses.push("c.created_at <= ?"); params.push(dateTo + "T23:59:59"); }

  const clusters = db
    .prepare(
      `SELECT id, topic, signal, student_count, representative_phrases, suggested_action,
              action_status, trend_direction, trend_delta
       FROM clusters c
       WHERE ${whereClauses.join(" AND ")}
       ORDER BY student_count DESC`
    )
    .all(...params) as {
    id: number; topic: string; signal: string; student_count: number;
    representative_phrases: string; suggested_action: string;
    action_status: string | null; trend_direction: string; trend_delta: number | null;
  }[];

  res.json(clusters.map((c) => ({
    id: c.id,
    topic: c.topic,
    signal: c.signal,
    studentCount: c.student_count,
    representativePhrases: JSON.parse(c.representative_phrases) as string[],
    suggestedAction: c.suggested_action,
    actionStatus: c.action_status,
    trendDirection: c.trend_direction,
    trendDelta: c.trend_delta,
  })));
});

export default router;
