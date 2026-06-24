# ReflectIQ

  **Faculty learning intelligence — turning anonymous student reflections into actionable class-level insights.**

  ReflectIQ closes the feedback loop between students and faculty by collecting short guided reflections after each topic, classifying them with an LLM, clustering them by learning signal, and surfacing a privacy-preserving dashboard for instructors.

  ---

  ## How it works

  ```
  Student → 3-step guided reflection
                ↓
          LLM classifier (7 signal types)
                ↓
          Cluster aggregation (MIN_CLUSTER_SIZE privacy filter)
                ↓
          Faculty dashboard → heatmap + cluster cards + suggested actions
  ```

  ### Learning signals

  | Signal | Meaning |
  |---|---|
  | `comprehension` | Student demonstrates solid understanding |
  | `surface_understanding` | Vocabulary without deeper reasoning |
  | `definitional_gap` | Missing or confused core definitions |
  | `causal_reasoning_gap` | Can't trace cause-and-effect chains |
  | `applied_transfer_difficulty` | Struggles to apply concepts to real cases |
  | `pacing_concern` | Content moving too fast or too slow |
  | `support_need` | Explicit request for additional help |

  ---

  ## Features

  ### Student flow (`/student`)
  - 3-step guided reflection with topic picker
  - AI-generated follow-up question (heuristic fallback, no API key required)
  - Full privacy disclosure before submission
  - Anonymous submission — no student identity stored

  ### Faculty dashboard (`/faculty`)
  - **Summary strip** — reflections this week, active clusters, flagged topics
  - **Heatmap** — topic × signal intensity grid with hotspot highlighting
  - **Cluster cards** — student counts, representative quotes, trend arrows, suggested actions
  - **Acknowledge / Dismiss** controls — all suggestions require faculty decision
  - **Privacy filter modal** — live view of aggregation threshold in action
  - **Governance panel** — 6 FERPA-aware principles, collapsible

  ### Privacy by design
  - Clusters with fewer than **4 students** are suppressed and never reach the dashboard
  - No student name, ID, or identifier is stored anywhere
  - No grading, ranking, or individual scoring

  ---

  ## Stack

  | Layer | Tech |
  |---|---|
  | Frontend | React 19, Vite 7, Tailwind CSS, shadcn/ui |
  | API client | TanStack Query, Orval-generated hooks |
  | Backend | Express 5, Node.js 24 |
  | Database | SQLite via `node:sqlite` (Node.js 24 built-in) |
  | API contract | OpenAPI 3.1, Zod validation |
  | Monorepo | pnpm workspaces |

  ---

  ## Project structure

  ```
  artifacts/
    reflectiq/          # React + Vite frontend (/ route)
    api-server/         # Express API (/api route)
  lib/
    api-spec/           # OpenAPI 3.1 spec (source of truth)
    api-client-react/   # Generated TanStack Query hooks
    api-zod/            # Generated Zod schemas
  ```

  ---

  ## Getting started

  ```bash
  pnpm install

  # Start the API server (port 5000)
  pnpm --filter @workspace/api-server run dev

  # Start the frontend (separate terminal)
  pnpm --filter @workspace/reflectiq run dev

  # Seed demo data (~220 reflections, 5 topics)
  curl -X POST http://localhost:5000/api/admin/seed
  ```

  Then open [http://localhost:5173](http://localhost:5173).

  ### Regenerate API hooks after spec changes

  ```bash
  pnpm --filter @workspace/api-spec run codegen
  ```

  ### Environment variables

  | Variable | Default | Description |
  |---|---|---|
  | `PORT` | `5000` | API server port |
  | `MIN_CLUSTER_SIZE` | `4` | Minimum students per cluster before it appears on dashboard |
  | `OPENAI_API_KEY` | — | Optional — enables real LLM classification. Falls back to heuristic classifier if unset. |

  ---

  ## API routes

  | Method | Path | Description |
  |---|---|---|
  | `POST` | `/api/reflections/followup` | Generate a follow-up question for step 2 |
  | `POST` | `/api/reflections` | Submit a completed reflection |
  | `GET` | `/api/dashboard/summary` | Summary strip stats |
  | `GET` | `/api/dashboard/heatmap` | Topic × signal heatmap data |
  | `GET` | `/api/dashboard/clusters` | Cluster cards (filtered, privacy-safe) |
  | `PATCH` | `/api/clusters/:id/action` | Acknowledge or dismiss a cluster |
  | `POST` | `/api/admin/seed` | Regenerate synthetic demo data |
  | `GET` | `/api/admin/stats` | Raw aggregation stats |

  ---

  ## Demo topics

  - Agentic AI  
  - Blockchain  
  - Quantum Computing  
  - Generative AI Ethics  
  - Cybersecurity Basics

  ---

  ## License

  MIT
  