#!/usr/bin/env node

/**
 * mwsrv — Medicine Wheel Server Launcher
 *
 * Starts the Medicine Wheel Next.js application in local or Docker mode.
 *
 * Usage:
 *   mwsrv [options]
 *   mwsrv --docker -D /path/to/project
 *
 * Options:
 *   --port, -p <port>        Port to listen on (default: 3940)
 *   --directory, -D <dir>    Host directory containing (or for) .mw/store (default: cwd)
 *   --docker                 Run in Docker container
 *   --pull                   Pull Docker image before starting
 *   --no-open                Do not open browser automatically
 *   --help, -h               Show this help message
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const DOCKER_IMAGE = 'jgwill/medicine-wheel:app';
const DEFAULT_PORT = 3940;
const CONTAINER_PORT = 3940;

// ── Arg parsing ───────────────────────────────────────────────────
interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positional: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      positional.push(...args.slice(i + 1));
      break;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// ── Helpers ───────────────────────────────────────────────────────
function resolvePackageRoot(): string {
  try {
    const scriptDir = path.dirname(fs.realpathSync(process.argv[1]));
    // dist/cli/mwsrv.js → go up two levels to package root
    return path.resolve(scriptDir, '..', '..');
  } catch {
    return process.cwd();
  }
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
    ? 'start'
    : 'xdg-open';
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref();
}

// ── Docker mode ───────────────────────────────────────────────────
async function runDocker(opts: {
  hostDir: string;
  port: number;
  pull: boolean;
  noOpen: boolean;
}): Promise<void> {
  const { hostDir, port, pull, noOpen } = opts;

  // Resolve store path on host: <dir>/.mw/store
  const storeDir = path.resolve(hostDir, '.mw', 'store');
  fs.mkdirSync(storeDir, { recursive: true });

  if (pull) {
    console.log(`⬇️  Pulling ${DOCKER_IMAGE}...`);
    await new Promise<void>((resolve, reject) => {
      const p = spawn('docker', ['pull', DOCKER_IMAGE], { stdio: 'inherit' });
      p.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`docker pull failed: ${code}`)),
      );
    });
  }

  const dockerArgs = [
    'run', '--rm',
    '-p', `${port}:${CONTAINER_PORT}`,
    '-v', `${storeDir}:/data/store`,
    '-e', `MW_DATA_DIR=/data/store`,
    '-e', `MW_STORAGE_PROVIDER=jsonl`,
    '-e', `PORT=${CONTAINER_PORT}`,
    DOCKER_IMAGE,
  ];

  console.log(`🐳 docker ${dockerArgs.join(' ')}\n`);

  const proc = spawn('docker', dockerArgs, { stdio: 'inherit' });

  if (!noOpen) {
    setTimeout(() => {
      const url = `http://localhost:${port}`;
      console.log(`\n🚀 Opening browser: ${url}\n`);
      openBrowser(url);
    }, 4000);
  }

  const shutdown = (): void => {
    console.log('\n👋 Shutting down Medicine Wheel...');
    proc.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  proc.on('exit', (code) => process.exit(code ?? 0));
}

// ── Local mode ────────────────────────────────────────────────────
function runLocal(opts: {
  hostDir: string;
  port: number;
  noOpen: boolean;
  packageRoot: string;
}): void {
  const { hostDir, port, noOpen, packageRoot } = opts;

  const storeDir = path.resolve(hostDir, '.mw', 'store');
  fs.mkdirSync(storeDir, { recursive: true });

  // Local mode always runs `next dev`. `next start` requires a production build
  // (.next/) which is not shipped in the published package. For a
  // production-like experience without a source checkout, use --docker instead.
  const nextCmd = 'dev';

  console.log(`🌿 Medicine Wheel — local dev mode (next dev)`);
  console.log(`   For a production-built server use: mwsrv --docker`);
  console.log(`📁 Store: ${storeDir}`);
  console.log(`🌐 http://localhost:${port}\n`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MW_DATA_DIR: storeDir,
    MW_STORAGE_PROVIDER: process.env.MW_STORAGE_PROVIDER ?? 'jsonl',
    PORT: String(port),
  };

  // next binary may be in node_modules/.bin relative to package root
  const nextBin = path.join(packageRoot, 'node_modules', '.bin', 'next');
  const nextExe = fs.existsSync(nextBin) ? nextBin : 'next';

  const proc = spawn(nextExe, [nextCmd, '-p', String(port)], {
    cwd: packageRoot,
    stdio: 'inherit',
    env,
  });

  if (!noOpen) {
    setTimeout(() => {
      const url = `http://localhost:${port}`;
      console.log(`\n🚀 Opening browser: ${url}\n`);
      openBrowser(url);
    }, 5000);
  }

  const shutdown = (): void => {
    console.log('\n👋 Shutting down Medicine Wheel...');
    proc.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  proc.on('exit', (code) => process.exit(code ?? 0));
}

// ── Help ──────────────────────────────────────────────────────────
function showHelp(): void {
  console.log(`
\x1b[1m🌿 mwsrv — Medicine Wheel Server Launcher\x1b[0m

DESCRIPTION
  Starts the Medicine Wheel Next.js application locally or in Docker.
  In Docker mode, data persists in the host directory's .mw/store folder.

USAGE
  mwsrv [options]

OPTIONS
  --port, -p <port>       Port to listen on (default: ${DEFAULT_PORT})
  --directory, -D <dir>   Host directory for .mw/store (default: current dir)
  --docker                Run in Docker container (image: ${DOCKER_IMAGE})
  --pull                  Pull/update Docker image before starting
  --no-open               Do not auto-open browser
  --help, -h              Show this help

EXAMPLES
  # Start locally (uses current directory's .mw/store)
  mwsrv

  # Start locally with a specific data directory
  mwsrv -D ~/my-research

  # Start in Docker (recommended for clean environments)
  mwsrv --docker

  # Docker with custom directory and port
  mwsrv --docker -D ~/my-research --port 4000

  # Pull latest image then start in Docker
  mwsrv --docker --pull -D ~/my-research

ENVIRONMENT
  MW_API_URL            Client API URL (default: http://localhost:${DEFAULT_PORT})
  MW_STORAGE_PROVIDER   Storage backend: jsonl (default) or postgres
  DATABASE_URL          PostgreSQL connection string (when using postgres provider)
`);
}

// ── Main ──────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv);

  if (flags['help'] || flags['h']) { showHelp(); return; }

  const port = Number(flags['port'] ?? flags['p'] ?? DEFAULT_PORT);
  const directory = String(flags['directory'] ?? flags['D'] ?? process.cwd());
  const useDocker = Boolean(flags['docker']);
  const pull = Boolean(flags['pull']);
  const noOpen = Boolean(flags['no-open']);

  const hostDir = path.resolve(directory);

  console.log(`🌿 Medicine Wheel${useDocker ? ' [DOCKER]' : ' [LOCAL]'}`);
  console.log(`📁 Directory: ${hostDir}`);
  console.log(`🌐 Port: ${port}\n`);

  if (useDocker) {
    await runDocker({ hostDir, port, pull, noOpen });
  } else {
    const packageRoot = resolvePackageRoot();
    runLocal({ hostDir, port, noOpen, packageRoot });
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
