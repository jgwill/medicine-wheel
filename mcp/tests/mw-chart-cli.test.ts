/**
 * `mw chart` through the BUILT CLI (`dist/cli/mw.js`), which starts the BUILT
 * MCP server (`mcp/dist/index.js`) for each command, against a temporary
 * MW_DATA_DIR. Finding F1 of Miadi Chronicle Episode 297: until 0.24.0 every
 * `mw chart` one-shot command printed nothing and exited 0, because `mcpRaw`
 * sent one request with no handshake and no newline terminator, and the stdio
 * transport never read it. The tests in `structural-tension.test.ts` call the
 * tool handlers in process and could not see this.
 *
 * Needs the build: `npm run build:packages && npm run build:cli`.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JsonlStore } from "../src/jsonl-store.js";
import { createStructuralTensionTools } from "../src/tools/structural-tension.js";

const CLI = fileURLToPath(new URL("../../dist/cli/mw.js", import.meta.url));
const SERVER = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const DAY = 86_400_000;

const TRACE = "miadi-tracing:ceremony/session/3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b";
const WITH = "miadi-tracing:ceremony/prompt/miadiRun-2610200900-ep297-delayed-resolution@3";

let dataDir: string;
let env: NodeJS.ProcessEnv;

function mw(...args: string[]) {
  const r = spawnSync(process.execPath, [CLI, ...args], { env, encoding: "utf8", timeout: 30_000 });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

beforeAll(() => {
  for (const built of [CLI, SERVER]) {
    if (!fs.existsSync(built)) {
      throw new Error(`${built} is not built. Run npm run build:packages && npm run build:cli before this test.`);
    }
  }
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mw-chart-cli-"));
  // Only the temporary store: no wheel URL, no Honcho, no other server, the default output format.
  env = { ...process.env, MW_DATA_DIR: dataDir };
  for (const key of ["MW_API_URL", "MIADI_CHRONICLE_MW_URL", "HONCHO_URL", "HONCHO_WORKSPACE_ID", "HONCHO_API_KEY", "MW_MCP_PATH", "MW_FORMAT"]) {
    delete env[key];
  }
});

afterAll(() => {
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("mw chart through the built CLI (F1)", () => {
  let chartId = "";
  let stepId = "";

  it("mw chart create prints the chart it wrote, and exits 0", () => {
    const r = mw("chart", "create", "One-shot mw commands print what the server answered", "mw chart printed nothing", "south");
    expect(r.stderr).not.toContain("MCP error");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).not.toBe("");
    const out = JSON.parse(r.stdout);
    expect(out.chart_id).toEqual(expect.any(String));
    chartId = out.chart_id;
  });

  it("mw chart list reads it back from the same store", () => {
    const r = mw("chart", "list");
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.count).toBe(1);
    expect(out.charts[0].id ?? out.charts[0].chart_id).toBe(chartId);
  });

  it("mw chart delay carries --trace and --rehydrate-with, and end-delay gives them back", async () => {
    // mw has no add-step command; the step is written in process to the same store.
    const tools = createStructuralTensionTools(new JsonlStore(dataDir));
    const added = await tools.find(t => t.name === "add_action_step")!.handler({
      chart_id: chartId, title: "Rehydrate the lane on the date", current_reality: "The lane waits",
    });
    stepId = added.action_step_id;
    expect(stepId).toEqual(expect.any(String));

    const resolveBy = new Date(Date.now() + 7 * DAY).toISOString();
    const delayed = mw(
      "chart", "delay", chartId, stepId, resolveBy, "The lane waits for William's word",
      "--by", "Mia", "--session", "sess-cli", "--cwd", "/srv/miadi/episodes",
      "--trace", TRACE, "--rehydrate-with", WITH,
    );
    expect(delayed.status).toBe(0);
    const d = JSON.parse(delayed.stdout);
    expect(d.status).toBe("delayed");
    expect(d.delayed_resolution.session).toMatchObject({ session_id: "sess-cli", trace: TRACE, rehydrate_with: WITH });

    const listed = JSON.parse(mw("chart", "delayed").stdout);
    expect(listed.count).toBe(1);
    expect(listed.delays[0].session).toMatchObject({ trace: TRACE, rehydrate_with: WITH });

    const ended = mw("chart", "end-delay", chartId, stepId, "rehydrated", "--by", "William");
    expect(ended.status).toBe(0);
    expect(JSON.parse(ended.stdout)).toMatchObject({
      outcome: "rehydrated",
      resume_command: "cd /srv/miadi/episodes && claude --resume sess-cli",
      trace: TRACE,
      rehydrate_with: WITH,
    });
  }, 60_000);

  it("prints the refusal for a trace that does not begin with miadi-, and exits 2 for --trace without --session", () => {
    const resolveBy = new Date(Date.now() + 7 * DAY).toISOString();
    const refused = mw("chart", "delay", chartId, stepId, resolveBy, "r", "--by", "Mia", "--session", "s", "--trace", "langfuse:abc");
    expect(JSON.parse(refused.stdout)).toMatchObject({ status: "refused", refusal: "session_invalid" });

    const usage = mw("chart", "delay", chartId, stepId, resolveBy, "r", "--by", "Mia", "--trace", TRACE);
    expect(usage.status).toBe(2);
    expect(usage.stderr).toContain("--session");
  }, 30_000);

  it("mw chart delay carries --follow-up-prompt with its text and author; delayed shows it; end-delay rehydrates it without a session (0.26.0)", () => {
    const address = "miadi-prompt:ceremony/ep297-follow-up-cli@1";
    const text = "At the date, open a circle and read the lane's last words before resuming";
    const resolveBy = new Date(Date.now() + 5 * DAY).toISOString();
    const delayed = mw(
      "chart", "delay", chartId, stepId, resolveBy, "The circle decides at the date",
      "--by", "William", "--follow-up-prompt", address, "--follow-up-text", text, "--follow-up-by", "Mia",
    );
    expect(delayed.status).toBe(0);
    const d = JSON.parse(delayed.stdout);
    expect(d.delayed_resolution.follow_up_prompt).toEqual({ address, text, composed_by: "Mia", composed_at: d.delayed_resolution.chosen_at });
    expect(d.delayed_resolution).not.toHaveProperty("session");

    const listed = JSON.parse(mw("chart", "delayed").stdout);
    expect(listed.count).toBe(1);
    expect(listed.delays[0].follow_up_prompt.address).toBe(address);

    const ended = mw("chart", "end-delay", chartId, stepId, "rehydrated", "--by", "William");
    expect(ended.status).toBe(0);
    expect(JSON.parse(ended.stdout)).toMatchObject({
      outcome: "rehydrated",
      follow_up_prompt: { address, text },
      session: null,
      resume_command: null,
    });
  }, 60_000);

  it("refuses a follow-up address without miadi-, and exits 2 for --follow-up-text or --follow-up-by without --follow-up-prompt", () => {
    const resolveBy = new Date(Date.now() + 7 * DAY).toISOString();
    const refused = mw("chart", "delay", chartId, stepId, resolveBy, "r", "--by", "Mia", "--follow-up-prompt", "prompt:ceremony/x@1");
    expect(JSON.parse(refused.stdout)).toMatchObject({ status: "refused", refusal: "follow_up_prompt_invalid" });

    for (const flag of ["--follow-up-text", "--follow-up-by"]) {
      const usage = mw("chart", "delay", chartId, stepId, resolveBy, "r", "--by", "Mia", flag, "x");
      expect(usage.status).toBe(2);
      expect(usage.stderr).toContain("--follow-up-prompt");
    }
  }, 30_000);

  it("mw tools lists the server's tools through the same handshake", () => {
    const r = mw("tools");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\d+ tools available/);
    expect(r.stdout).toContain("delay_resolution");
  });
});
