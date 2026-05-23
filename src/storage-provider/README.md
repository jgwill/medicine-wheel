# medicine-wheel-storage-provider

> **Package rename notice:** `medicine-wheel-storage-provider` is scheduled to move to `@medicine-wheel/storage-provider`. This legacy package name remains published during the migration window so existing installs keep working. A future release will deprecate the legacy name in npm.

Abstract storage layer for Medicine Wheel data with JSONL and Neon backends, plus a future Redis path.

## Install

```bash
npm install medicine-wheel-storage-provider
```

## Usage

```ts
import { createProvider } from 'medicine-wheel-storage-provider';

const store = await createProvider();
```

