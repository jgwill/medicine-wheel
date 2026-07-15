import type { Tool } from "../types.js";
import { store } from "../store.js";

interface PlanPerspectiveEpisode {
  path: string;
  number?: number;
  [key: string]: unknown;
}

interface PlanPerspectiveRecord {
  id: string;
  perspective: 1;
  plan: {
    session_id: string;
    plan_path?: string;
    plan_filename: string;
    plan_sha256: string;
    captured_at?: string;
    [key: string]: unknown;
  };
  narrative: {
    title: string;
    body_markdown: string;
    mia_context?: string;
    [key: string]: unknown;
  };
  lineage?: {
    user_inputs_path?: string;
    input_count?: number;
    first_input_at?: string;
    last_input_at?: string;
    excerpts?: string[];
    [key: string]: unknown;
  };
  episodes: PlanPerspectiveEpisode[];
  source: {
    package?: string;
    generator?: {
      system?: string;
      agent?: string;
      model?: string;
      producer_session_id?: string;
      [key: string]: unknown;
    };
    registered_at: string;
    updated_at: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface PlanPerspectiveFilters {
  episode_path?: string;
  session_id?: string;
  id?: string;
}

interface PlanPerspectiveStore {
  name?: string;
  registerPlanPerspective(
    record: PlanPerspectiveRecord,
  ): PlanPerspectiveRecord | Promise<PlanPerspectiveRecord>;
  getPlanPerspective(
    id: string,
  ): PlanPerspectiveRecord | undefined | Promise<PlanPerspectiveRecord | undefined>;
  listPlanPerspectives(
    filters?: PlanPerspectiveFilters,
  ): PlanPerspectiveRecord[] | Promise<PlanPerspectiveRecord[]>;
}

const PERSPECTIVE_ID_PREFIX = "plan-perspective:";

const planPerspectiveRecordSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    perspective: { type: "number", enum: [1] },
    plan: {
      type: "object",
      additionalProperties: true,
      properties: {
        session_id: { type: "string" },
        plan_path: { type: "string" },
        plan_filename: { type: "string" },
        plan_sha256: { type: "string" },
        captured_at: { type: "string" },
      },
      required: ["session_id", "plan_filename", "plan_sha256"],
    },
    narrative: {
      type: "object",
      additionalProperties: true,
      properties: {
        title: { type: "string" },
        body_markdown: { type: "string" },
        mia_context: { type: "string" },
      },
      required: ["title", "body_markdown"],
    },
    lineage: {
      type: "object",
      additionalProperties: true,
      properties: {
        user_inputs_path: { type: "string" },
        input_count: { type: "number" },
        first_input_at: { type: "string" },
        last_input_at: { type: "string" },
        excerpts: { type: "array", items: { type: "string" } },
      },
    },
    episodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          path: { type: "string" },
          number: { type: "number" },
        },
        required: ["path"],
      },
    },
    source: {
      type: "object",
      additionalProperties: true,
      properties: {
        package: { type: "string" },
        generator: { type: "object", additionalProperties: true },
        registered_at: { type: "string" },
        updated_at: { type: "string" },
      },
      required: ["registered_at", "updated_at"],
    },
  },
  required: ["id", "perspective", "plan", "narrative", "episodes", "source"],
};

export function createPlanPerspectiveTools(targetStore: PlanPerspectiveStore): Tool[] {
  return [
    {
      name: "register_plan_perspective",
      description:
        "Register or upsert a Plan Perspective record projection in Medicine Wheel storage. Upserts by id, unions episode paths, and never rewrites perspective prose.",
      inputSchema: {
        type: "object",
        properties: {
          record: planPerspectiveRecordSchema,
        },
        required: ["record"],
      },
      handler: async (args) => {
        const record = args.record as PlanPerspectiveRecord | undefined;
        if (
          !record ||
          typeof record.id !== "string" ||
          !record.id.startsWith(PERSPECTIVE_ID_PREFIX)
        ) {
          return {
            success: false,
            status: "error",
            message: `register_plan_perspective requires record.id starting with '${PERSPECTIVE_ID_PREFIX}'`,
          };
        }

        const merged = await targetStore.registerPlanPerspective(record);

        return {
          success: true,
          record: merged,
          provider: targetStore.name ?? "unknown",
        };
      },
    },
    {
      name: "list_plan_perspectives",
      description:
        "List Plan Perspective records from Medicine Wheel storage by episode path, session id, or record id. Requires at least one filter.",
      inputSchema: {
        type: "object",
        properties: {
          episode_path: { type: "string" },
          session_id: { type: "string" },
          id: { type: "string" },
        },
      },
      handler: async (args) => {
        const filters = planPerspectiveFiltersFromArgs(args);
        if (
          filters.episode_path === undefined &&
          filters.session_id === undefined &&
          filters.id === undefined
        ) {
          return {
            success: false,
            status: "error",
            message: "list_plan_perspectives requires episode_path, session_id, or id",
          };
        }

        const planPerspectives = await targetStore.listPlanPerspectives(filters);

        return {
          count: planPerspectives.length,
          plan_perspectives: planPerspectives,
          provider: targetStore.name ?? "unknown",
        };
      },
    },
    {
      name: "get_plan_perspective",
      description: "Get one Plan Perspective record by id from Medicine Wheel storage.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
      handler: async (args) => {
        const id = typeof args.id === "string" ? args.id : "";
        const record = id ? await targetStore.getPlanPerspective(id) : undefined;

        return {
          record: record ?? null,
          provider: targetStore.name ?? "unknown",
        };
      },
    },
  ];
}

export const planPerspectiveTools = createPlanPerspectiveTools(store as PlanPerspectiveStore);

function planPerspectiveFiltersFromArgs(args: Record<string, unknown>): PlanPerspectiveFilters {
  const filters: PlanPerspectiveFilters = {};
  if (typeof args.episode_path === "string") filters.episode_path = args.episode_path;
  if (typeof args.session_id === "string") filters.session_id = args.session_id;
  if (typeof args.id === "string") filters.id = args.id;
  return filters;
}
