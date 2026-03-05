# Article Publishing Pipeline — RISE Specification

> Reusable pipeline for publishing markdown articles through a Medicine Wheel–themed web interface, with Four Directions visual categorization and server-side filesystem scanning.

**Version**: 0.1.0
**Status**: Active
**Package**: Shared pattern (medicine-wheel-ui-components + consuming app)
**Lineage**: Derived from Miadi articles system integration with medicine-wheel ui-components

---

## 🌅 EAST — Vision

A standardized pipeline for:
1. **Ingesting** markdown articles with YAML frontmatter (title, author, date, tags, direction, abstract)
2. **Categorizing** content by Four Directions (East=Vision, South=Analysis, West=Validation, North=Action)
3. **Rendering** articles in a grid layout with direction-themed visual cards
4. **Uploading** new articles via web form with safe filename generation (safename + timestamp)

## 🔥 SOUTH — Analysis

### Frontmatter Schema

```yaml
---
title: string        # Required — article title
author: string       # Required — author name
date: string         # Publication year or ISO date
tags: string[]       # Topic tags for filtering
direction: enum      # east | south | west | north
abstract: string     # 200-char summary for card display
id?: string          # Optional unique identifier
---
```

### Direction Theming Map

| Direction | Icon | Border Color | Background | Semantic |
|-----------|------|-------------|------------|----------|
| East 🌅  | 🌅   | yellow-400  | yellow-50  | Vision, requirements, envisioning |
| South 🔥 | 🔥   | red-400     | red-50     | Analysis, research, growth |
| West 🌊  | 🌊   | blue-400    | blue-50    | Validation, testing, reflection |
| North ❄️ | ❄️   | white/gray  | gray-50    | Action, implementation, wisdom |

### Server-Side Scanning Pattern

```typescript
// Server component reads filesystem directly (no API needed for listing)
import fs from 'fs';
import matter from 'gray-matter';

function getAllArticles(dir: string): Article[] {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf-8'));
      return { slug: f.replace(/\.md$/, ''), ...data, content };
    });
}
```

### Upload Filename Convention

```
<safename>-<YYMMDDHHmm>.md
```
Where `safename` = title slugified (lowercase, hyphens, alphanumeric only).

## 🌊 WEST — Validation

- Frontmatter must include at minimum: `title`, `direction`
- Direction must be one of: `east`, `south`, `west`, `north`
- Filename must end with `.md`
- Upload API must sanitize filename to prevent path traversal

## ❄️ NORTH — Action

### Integration with medicine-wheel-ui-components

The `DirectionCard` component from `medicine-wheel-ui-components` provides the canonical Four Directions visual vocabulary. Consuming apps should:
1. Import or replicate the direction color scheme from `DirectionCard`
2. Use the same icon/color mapping for visual consistency
3. Extend with app-specific card layouts (article metadata, tags, etc.)

### Reusable Components

- **ArticleCard**: Direction-themed card wrapping article metadata
- **ArticleGrid**: Responsive grid layout for article cards
- **ArticleParser**: Server-side utility for scanning and parsing markdown articles

---

## Dependencies

- `gray-matter` — YAML frontmatter parsing
- `react-markdown` + `remark-gfm` — Markdown rendering
- `medicine-wheel-ui-components` — Direction theming reference
- `medicine-wheel-ontology-core` — Direction type definitions
