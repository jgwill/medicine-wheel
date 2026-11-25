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

## Before you upgrade a store to the version that brings governed edges

An edge may name a governed kinship type (`kinship_type`) and keep the context that bounds it. Such an edge is identified by its two nodes and that name, so one pair of nodes can hold several of them. Two things follow for whoever runs a wheel. The reasons are in `rispecs/agent-kinship.spec.md`.

**On Postgres, run `scripts/005-edges-kinship.sql` before you start the upgraded wheel.** The provider reads and writes a `kinship_type` column and the edge key `(from_id, to_id, kinship_type)`. `connect()` creates some tables when they are missing and never creates or alters `nodes`, `edges` or `ceremonies`. Until the script has run on an existing database, every edge operation fails. Stop the wheel, run the script, start the upgraded wheel. A database created from the current `scripts/001-create-medicine-wheel-tables.sql` needs nothing more. Neither the script nor the Postgres code of this change was run against a database by its author: try both on a copy first.

**Once a store holds a governed edge, earlier code must not write to it, and going back takes a step first.** Code from before this change knows one edge per ordered pair. Its write on a pair removes the governed edges of that pair, and an earlier MCP server opened on the store's files reads one edge of a pair and drops the others on its next write. So upgrade every process that opens the files before the first governed edge is written. An earlier MCP server that reaches the wheel over HTTP is safe. To go back to earlier code: with the current wheel still running, read every edge that has a `kinship_type` (`GET /api/edges?limit=all`), keep that list outside the store, and release each one (`DELETE /api/edges?from=&to=&kinship_type=`). A store with no governed edge is read and written by earlier code as before.

A governed edge keeps the date it was first written through every write.

