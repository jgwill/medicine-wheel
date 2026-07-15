import type { Tool } from "../types.js";
import { store } from "../store.js";

type WeaveSyncState = "never-synced" | "in-sync" | "stale" | "episode-copy-diverged";

interface InquiryWeaveRecord {
  id: string;
  weave: 1;
  artefact: {
    id: string;
    path?: string;
    [key: string]: unknown;
  };
  issue: string;
  issue_url?: string;
  episode: {
    path: string;
    number: number;
    [key: string]: unknown;
  };
  last_sync: {
    state: WeaveSyncState;
    at?: string;
    tree_sha256?: string;
    file_count?: number;
    bytes_total?: number;
    [key: string]: unknown;
  };
  source: {
    package: string;
    record_path?: string;
    registered_at: string;
    updated_at: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface InquiryWeaveFilters {
  episode_path?: string;
  episode_number?: number;
  issue?: string;
  artefact?: string;
}

interface InquiryWeaveStore {
  name?: string;
  registerInquiryWeave(record: InquiryWeaveRecord): void | Promise<void>;
  getInquiryWeave(id: string): InquiryWeaveRecord | undefined | Promise<InquiryWeaveRecord | undefined>;
  listInquiryWeaves(filters?: InquiryWeaveFilters): InquiryWeaveRecord[] | Promise<InquiryWeaveRecord[]>;
}

const inquiryWeaveRecordSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    weave: { type: "number", enum: [1] },
    artefact: {
      type: "object",
      additionalProperties: true,
      properties: {
        id: { type: "string" },
        path: { type: "string" },
      },
      required: ["id"],
    },
    issue: { type: "string" },
    issue_url: { type: "string" },
    episode: {
      type: "object",
      additionalProperties: true,
      properties: {
        path: { type: "string" },
        number: { type: "number" },
      },
      required: ["path", "number"],
    },
    last_sync: {
      type: "object",
      additionalProperties: true,
      properties: {
        state: {
          type: "string",
          enum: ["never-synced", "in-sync", "stale", "episode-copy-diverged"],
        },
        at: { type: "string" },
        tree_sha256: { type: "string" },
        file_count: { type: "number" },
        bytes_total: { type: "number" },
      },
      required: ["state"],
    },
    source: {
      type: "object",
      additionalProperties: true,
      properties: {
        package: { type: "string" },
        record_path: { type: "string" },
        registered_at: { type: "string" },
        updated_at: { type: "string" },
      },
      required: ["package", "registered_at", "updated_at"],
    },
  },
  required: ["id", "weave", "artefact", "issue", "episode", "last_sync", "source"],
};

export function createInquiryWeaveTools(targetStore: InquiryWeaveStore): Tool[] {
  return [
    {
      name: "register_inquiry_weave",
      description: "Register or update an Inquiry Weave record projection in Medicine Wheel storage.",
      inputSchema: {
        type: "object",
        properties: {
          record: inquiryWeaveRecordSchema,
        },
        required: ["record"],
      },
      handler: async (args) => {
        const record = args.record as InquiryWeaveRecord | undefined;
        if (!record || typeof record.id !== "string" || record.id.length === 0) {
          return {
            success: false,
            status: "error",
            message: "register_inquiry_weave requires record.id",
          };
        }

        await targetStore.registerInquiryWeave(record);

        return {
          success: true,
          record,
          provider: targetStore.name ?? "unknown",
        };
      },
    },
    {
      name: "list_inquiry_weaves",
      description: "List Inquiry Weave records from Medicine Wheel storage with optional episode, issue, or artefact filters.",
      inputSchema: {
        type: "object",
        properties: {
          episode_path: { type: "string" },
          episode_number: { type: "number" },
          issue: { type: "string" },
          artefact: { type: "string" },
        },
      },
      handler: async (args) => {
        const filters = inquiryWeaveFiltersFromArgs(args);
        const inquiryWeaves = await targetStore.listInquiryWeaves(filters);

        return {
          count: inquiryWeaves.length,
          inquiry_weaves: inquiryWeaves,
          provider: targetStore.name ?? "unknown",
        };
      },
    },
    {
      name: "get_inquiry_weave",
      description: "Get one Inquiry Weave record by id from Medicine Wheel storage.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
      handler: async (args) => {
        const id = typeof args.id === "string" ? args.id : "";
        const record = id ? await targetStore.getInquiryWeave(id) : undefined;

        return {
          record: record ?? null,
          provider: targetStore.name ?? "unknown",
        };
      },
    },
  ];
}

export const inquiryWeaveTools = createInquiryWeaveTools(store as InquiryWeaveStore);

function inquiryWeaveFiltersFromArgs(args: Record<string, unknown>): InquiryWeaveFilters {
  const filters: InquiryWeaveFilters = {};
  if (typeof args.episode_path === "string") filters.episode_path = args.episode_path;
  if (typeof args.episode_number === "number") filters.episode_number = args.episode_number;
  if (typeof args.issue === "string") filters.issue = args.issue;
  if (typeof args.artefact === "string") filters.artefact = args.artefact;
  return filters;
}
