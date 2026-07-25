# @medicine-wheel/storage-provider

Abstract storage layer for Medicine Wheel data with JSONL and Neon backends, plus a future Redis path.

> [!WARNING]
> **Experimental alpha.** Part of the Medicine Wheel Developer Suite, which is
> under active development. APIs change between patch versions and all packages
> move in lockstep — pin exact versions. See
> [ALPHA.md](https://github.com/jgwill/medicine-wheel/blob/main/ALPHA.md).

## Install

```bash
npm install @medicine-wheel/storage-provider
```

## Usage

```ts
import { createProvider } from '@medicine-wheel/storage-provider';

const store = await createProvider();
```

