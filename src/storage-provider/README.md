# @medicine-wheel/storage-provider

Abstract storage layer for Medicine Wheel data with JSONL and Neon backends, plus a future Redis path.

## Install

```bash
npm install @medicine-wheel/storage-provider
```

## Usage

```ts
import { createProvider } from '@medicine-wheel/storage-provider';

const store = await createProvider();
```

