# Community service paths

Companion to [`COMMUNITY.md`](./COMMUNITY.md). Paths for building `Community.Circle.Contributor` and `Community.Inquiry` services, drawn from ecosystem research.

## Fork targets

| Repo | What to take |
|---|---|
| [`all-contributors/all-contributors`](https://github.com/all-contributors/all-contributors) | Circle manifest schema (extend `.all-contributorsrc`), bot workflow (comment → manifest update → PR), contributor type mapping |
| [`opensourcedesign/open-collective`](https://github.com/opencollective/opencollective) / [`cobudget`](https://github.com/cobudget/cobudget) | Circle ledger — transparent budgets, participatory funding tied to inquiries and circles |
| [`loomio/loomio`](https://github.com/loomio/loomio) | Group + facilitator + decision-thread model; phased discussion → proposals → decisions |
| [`decidim/decidim`](https://github.com/decidim/decidim) | Participatory democracy framework; assemblies, consultations, petitions as inquiry types |
| [`compdemocracy/polis`](https://github.com/compdemocracy/polis) | Conversation analytics — participation segments, opinion clustering, Jupyter notebooks for trajectory analysis |
| [`nicksanford/policykit`](https://github.com/amyxzhang/policykit) | Cross-platform governance policies; circle rules for recognition, permissions, escalation across GitHub / Slack / web |
| [`github/MVG`](https://github.com/github/MVG) | Lightweight consensus governance; steering committee template for steering circles |

## Proposed packages

| Package | Pattern source |
|---|---|
| `@medicine-wheel/community-circle-spec` | `.all-contributorsrc` + Decidim components + MVG agreements — circle schema, roles, governance in JSON/YAML |
| `@medicine-wheel/community-inquiry-flow` | Loomio threads + Decidim participatory spaces + Pol.is analytics — inquiry lifecycle engine |
| `@medicine-wheel/circle-ledger` | Open Collective API + Cobudget — transparent budgets linked to circles and inquiries |
| `@medicine-wheel/policy-bridge` | PolicyKit + MVG — circle rules enforced across GitHub, Slack, web, and academic tools |

## Where each belongs in the wheel

- **Circle.Contributor** — circle manifests, relational roles, recognition, stewardship, resource ledger
- **Community.Inquiry** — inquiry groups, facilitators, decision phases, participation analytics, budget outcomes

Full research: [`rispecs/inquiry-weave-registration.spec.md`](./rispecs/inquiry-weave-registration.spec.md) and [`output/research-gap-analysis.md`](./output/research-gap-analysis.md)

