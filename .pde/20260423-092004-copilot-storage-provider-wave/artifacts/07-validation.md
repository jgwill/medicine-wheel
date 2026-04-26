# Validation

## Commands and results

### 1. Package build

**Command**

```bash
npm run build -w medicine-wheel-storage-provider
```

**Result:** pass (exit 0)

**Output**

```text
> medicine-wheel-storage-provider@0.1.0 build
> tsc
```

### 2. Workspace packages + app build

**Command**

```bash
npm run build:packages && npm run build
```

**Result:** pass (exit 0)

**Key output**

```text
> medicine-wheel-storage-provider@0.1.0 build
> tsc

> medicine-wheel@1.0.0 build
> next build

✓ Compiled successfully in 11.4s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (19/19)
✓ Collecting build traces
✓ Finalizing page optimization
```

### 3. Smoke check against built app

**Commands**

```bash
npm run start
curl -sS -D - http://127.0.0.1:3940/api/nodes
kill 2966763
```

**Result:** pass

**Output**

```text
HTTP/1.1 200 OK
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
content-type: application/json
Date: Sat, 25 Apr 2026 13:54:23 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

[{"id":"0cb4a58a-1da9-467c-978c-7f926521d4b2","name":"Elder Sarah","type":"human","direction":"north","metadata":{},"created_at":"2026-04-04T21:36:22.123Z","updated_at":"2026-04-04T21:36:22.123Z"},{"id":"93905fb7-cb3a-4799-978b-c63c3b627e1c","name":"Youth Circle","type":"human","direction":"south","metadata":{},"created_at":"2026-04-04T21:36:22.138Z","updated_at":"2026-04-04T21:36:22.138Z"},{"id":"399a9be6-c9c5-4843-a497-535f850b1b49","name":"Turtle Island","type":"land","direction":"east","metadata":{},"created_at":"2026-04-04T21:36:22.139Z","updated_at":"2026-04-04T21:36:22.139Z"},{"id":"b5596ebe-ceaa-4ec0-bf7b-b7d2b1b814e7","name":"Sacred River","type":"land","direction":"west","metadata":{},"created_at":"2026-04-04T21:36:22.140Z","updated_at":"2026-04-04T21:36:22.140Z"},{"id":"bdefc90e-a630-49c4-a282-bde54bdef240","name":"Ancestor Teachings","type":"ancestor","direction":"north","metadata":{},"created_at":"2026-04-04T21:36:22.140Z","updated_at":"2026-04-04T21:36:22.140Z"},{"id":"20987cb5-7487-4f67-b514-7e416b09cc6d","name":"Dream Vision","type":"spirit","direction":"east","metadata":{},"created_at":"2026-04-04T21:36:22.142Z","updated_at":"2026-04-04T21:36:22.142Z"},{"id":"baacfba5-8e41-4ec4-a4e1-f48570194e7e","name":"Seven Generations","type":"future","direction":"south","metadata":{},"created_at":"2026-04-04T21:36:22.142Z","updated_at":"2026-04-04T21:36:22.142Z"},{"id":"5cc6730d-ae3f-4ca2-8791-2de9bc173041","name":"Oral Traditions","type":"knowledge","direction":"west","metadata":{},"created_at":"2026-04-04T21:36:22.143Z","updated_at":"2026-04-04T21:36:22.143Z"},{"id":"test-lock-1775365900604","type":"knowledge","name":"Lock fix test","description":"Verifying lock fix works","created_at":"2026-04-05T05:11:40.604Z","updated_at":"2026-04-05T05:11:40.617Z"},{"id":"memory:1775381859564:e2e","type":"knowledge","name":"lifecycle-test","description":"Full cycle validated","direction":"south","metadata":{"ceremony_id":"ceremony:1775381859548:e2e"},"created_at":"2026-04-05T09:37:39.564Z","updated_at":"2026-04-05T09:37:39.564Z"},{"id":"memory:1775640820181:riqjq","type":"knowledge","name":"cli-test","description":"The mw CLI wrapper works — ceremony lifecycle verified","direction":"east","created_at":"2026-04-08T09:33:40.181Z","updated_at":"2026-04-08T09:33:40.181Z"},{"id":"6b5c6fa5-8757-4aa4-a6b9-058d6161940b","name":"OpenClaw skill ontology ceremony","type":"concept","metadata":{},"created_at":"2026-04-16T11:23:35.253Z","updated_at":"2026-04-16T11:23:35.253Z"},{"id":"c14ace3d-8529-4bb8-8082-5cc837d34975","name":"miadisabelle/workspace-openclaw#68","type":"artifact","metadata":{},"created_at":"2026-04-16T11:23:35.432Z","updated_at":"2026-04-16T11:23:35.432Z"}]
```

### 4. Lint command

**Command**

```bash
CI=1 npm run lint
```

**Result:** blocked by interactive ESLint initialization prompt

**Output**

```text
> medicine-wheel@1.0.0 lint
> next lint

`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .

? How would you like to configure ESLint? https://nextjs.org/docs/app/api-reference/config/eslint
❯  Strict (recommended)
   Base
   Cancel
```

### 5. Test script

**Command**

```bash
npm run test
```

**Result:** no root test script exists

**Output**

```text
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run
```

## Validation summary

- `storage-provider` package build: **pass**
- workspace package build: **pass**
- Next.js app production build: **pass**
- local smoke check (`/api/nodes`): **pass**
- root lint command: **blocked by interactive ESLint initialization**
- root test command: **not available**
