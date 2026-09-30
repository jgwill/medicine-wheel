# @medicine-wheel/memory

Asking the wheel's memory, whoever keeps it. The wheel records ceremonies, turns and diary entries. A memory provider (Honcho today, through `@medicine-wheel/honcho`) receives them and reasons over them. A caller asks the **wheel**, never the provider: it names a scope, the wheel turns it into the ceremonies it covers, and every provider is kept inside that reach. Every source in an answer is a wheel record, or is marked as coming from outside the wheel.

This package holds what does not depend on the provider. It has no dependencies.

## The contract

```ts
interface MemoryScope {            // every field adds ceremonies; the reach is their union
  ceremonies?: string | string[];
  subject_id?: string | string[];  // ceremonies held about a node: a review, a PDE (pde:<uuid>)
  circle_id?: string | string[];
  episode_path?: string | string[];
  participant?: string;            // where this person was seated: participant, circle member, facilitator
  exclude_ceremonies?: string[];   // removed last, e.g. a PDE's own ceremony
}

interface MemoryAnswer {
  provider: string;                // 'honcho', or 'wheel' when only the wheel's own records answered
  mode: 'dialectic' | 'search' | 'matched' | 'empty';
  answer?: string;                 // dialectic only
  sources: MemorySource[];
  reach: { scope; ceremonies: string[]; episodes: string[] };
  note?: string;                   // why a fallback answered
}

interface MemorySource {
  provider: string;                // who produced this source
  wheel_kind: string;              // beat | diary | ceremony | message (outside the wheel)
  wheel_id: string;
  ceremony_id?: string;
  speaker?: string;                // a wheel id
  speaker_name?: string;
  speaker_kind?: 'person' | 'agent' | 'wheel';  // whose words: a human, an agent holding a seat, the wheel's own record
  excerpt: string;                 // person ids replaced with names
  at?: string;
  outside_wheel?: boolean;
}
```

A scope with no field reaches nothing. The whole wheel is never the default.

| mode | meaning |
| --- | --- |
| `dialectic` | a provider reasoned over the reach |
| `search` | a provider returned the closest records without reasoning, because it cannot keep its reasoning inside a reach or was not asked to reason |
| `matched` | no provider answered, and the wheel matched its own records on their words |
| `empty` | the reach holds nothing, and nothing was asked |

## Using it

A wheel server builds one memory from its store and its providers:

```ts
import { createMemory } from '@medicine-wheel/memory';
import { createHonchoClient, honchoFromEnv, honchoMemoryProvider } from '@medicine-wheel/honcho';

const memory = createMemory({
  wheel,                                            // MemoryWheel: ceremonies(), seats(), records(reach), names(ids)
  providers: [honchoMemoryProvider(createHonchoClient(honchoFromEnv()!))],
});

await memory.ask({ question: 'What is still unresolved?', scope: { circle_id: 'circle:…' } });
await memory.search({ query: 'lantern', scope: { subject_id: 'pde:…', exclude_ceremonies: ['…'] } });
await memory.about({ person: 'node:human:…', scope: { participant: 'node:human:…' } });
```

Providers are tried in order. The first that answers gives the answer, and the wheel's own matches are added after its sources. When every provider fails, the wheel's records answer in `matched` mode with a `note`.

Everyone else asks a wheel over HTTP (`POST /api/memory/ask`, `/search`, `/about`, `GET /api/memory`), through `@medicine-wheel/client` (`wheel.memory.ask(…)`), or through the MCP tools `memory_ask`, `memory_search`, `memory_about`, `memory_status`, `memory_conclude` and `memory_resend`.

Also exported: `resolveReach` (scope to ceremonies), `matchRecords` and `queryTerms` (the text match), `excerptAround`, `isEmptyScope`.

## Who decides who may ask

The wheel keeps an answer inside the scope it is given. Deciding who may name which scope stays with the caller. Miadi, for example, builds the scope from the circles a person sits in.
