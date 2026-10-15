#!/usr/bin/env node
/**
 * Writes the catalog's documents into schema/ after tsc: the JSON Schema that
 * validates any wheel event and the AsyncAPI document of its topics. Both are
 * committed so a reader on GitHub, or a consumer in another language, has them
 * without building; tests/events-package.test.ts fails when they drift.
 */
const fs = require('node:fs');
const path = require('node:path');
const { wheelEventsJsonSchema, asyncApiDocument } = require('../dist/schema.js');

const dir = path.join(__dirname, '..', 'schema');
fs.mkdirSync(dir, { recursive: true });
const write = (name, doc) => fs.writeFileSync(path.join(dir, name), JSON.stringify(doc, null, 2) + '\n');
write('wheel-events.schema.json', wheelEventsJsonSchema());
write('asyncapi.json', asyncApiDocument());
console.log(`[events] wrote ${path.relative(process.cwd(), dir)}/wheel-events.schema.json and asyncapi.json`);
