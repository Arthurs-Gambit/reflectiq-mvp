import { Router } from "express";
import db from "../db/database";

const router = Router();

router.get("/", (req, res) => {
  const { topic, dateFrom, dateTo, signal } = req.query as Record<string, string | undefined>;

  let whereClauses = ["c.is_suppressed = 0"];
  const params: unknown[] = [];

  if (topic) {
    whereClauses.push("c.topic = ?");
    params.push(topic);
  }
  if (signal) {
    whereClauses.push("c.signal = ?");
    params.push(signal);
  }
  if (dateFrom) {
    whereClauses.push("c.created_at >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    whereClauses.push("c.created_at <= ?");
    params.push(dateTo + "T23:59:59");
  }

  const clusters = db
    .prepare(
      `SELECT id, topic, signal, student_count, representative_phrases, suggested_action,
              action_status, trend_direction, trend_delta
       FROM clusters c
       WHERE ${whereClauses.join(" AND ")}
       ORDER BY student_count DESC`
    )
    .all(...params) as {
    id: number;
    topic: string;
    signal: string;
    student_count: number;
    representative_phrases: string;
    suggested_action: string;
    action_status: string | null;
    trend_direction: string;
    trend_delta: number | null;
  }[];

  const result = clusters.map((c) => ({
    id: c.id,
    topic: c.topic,
    signal: c.signal,
    studentCount: c.student_count,
    representativePhrases: JSON.parse(c.representative_phrases) as string[],
    suggestedAction: c.suggested_action,
    actionStatus: c.action_status,
    trendDirection: c.trend_direction,
    trendDelta: c.trend_delta,
  }));

  res.json(result);
});

router.patch("/:id/action", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { actionStatus } = req.body as { actionStatus: string };

  if (!["acknowledged", "dismissed"].includes(actionStatus)) {
    res.status(400).json({ error: "actionStatus must be acknowledged or dismissed" });
    return;
  }

  db.prepare(`UPDATE clusters SET action_status = ? WHERE id = ? AND is_suppressed = 0`).run(actionStatus, id);

  const cluster = db
    .prepare(
      `SELECT id, topic, signal, student_count, representative_phrases, suggested_action,
              action_status, trend_direction, trend_delta
       FROM clusters WHERE id = ?`
    )
    .get(id) as {
    id: number;
    topic: string;
    signal: string;
    student_count: number;
    representative_phrases: string;
    suggested_action: string;
    action_status: string | null;
    trend_direction: string;
    trend_delta: number | null;
  } | undefined;

  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }

  res.json({
    id: cluster.id,
    topic: cluster.topic,
    signal: cluster.signal,
    studentCount: cluster.student_count,
    representativePhrases: JSON.parse(cluster.representative_phrases) as string[],
    suggestedAction: cluster.suggested_action,
    actionStatus: cluster.action_status,
    trendDirection: cluster.trend_direction,
    trendDelta: cluster.trend_delta,
  });
});

export default router;
