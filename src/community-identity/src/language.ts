/**
 * The language answers are written in (jgwill/medicine-wheel#175).
 *
 * A host that answers a person through the wheel (the circles' memory, first)
 * writes in one language. Three places may name it: what the person asked for
 * this once, the person's own preference (`Person.output_language`), and the
 * community's default (`CommunityConfig.default_output_language`). Only the
 * languages the community offers (`CommunityConfig.output_languages`) are used.
 *
 * A language is a canonical BCP 47 tag (`en`, `fr`, `fr-CA`), as
 * `Intl.getCanonicalLocales` writes it.
 */

import type { CommunityConfig } from './config.js';

/** The languages a community offers when its admin has named none. */
export const DEFAULT_OUTPUT_LANGUAGES: readonly string[] = ['en', 'fr'];
/** The community's default when its admin has named none. */
export const DEFAULT_OUTPUT_LANGUAGE = 'en';
/** How many languages a community may offer. */
export const MAX_OUTPUT_LANGUAGES = 32;

/** The tag in its canonical form, or null when it is not a BCP 47 language tag. */
export function normalizeLanguageTag(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw || raw.length > 35) return null;
  try {
    const [tag] = Intl.getCanonicalLocales(raw);
    return tag ?? null;
  } catch {
    return null;
  }
}

/** Each tag canonical, in order, once; null when any is not a language tag. */
export function normalizeLanguageList(input: readonly unknown[]): string[] | null {
  const out: string[] = [];
  for (const item of input) {
    const tag = normalizeLanguageTag(item);
    if (tag === null) return null;
    if (!out.includes(tag)) out.push(tag);
  }
  return out;
}

/** A language as a person reads it: its name in English, and in itself. */
export interface LanguageName {
  tag: string;
  /** The name in English (`French`), or the tag when the runtime cannot name it. */
  name: string;
  /** The name in the language itself (`français`), or the tag. */
  native: string;
}

function nameIn(locale: string, tag: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/** The names of a language, in English and in itself. */
export function languageName(tag: string): LanguageName {
  return { tag, name: nameIn('en', tag), native: nameIn(tag, tag) };
}

/** The languages a community offers and its default, coherent: the default is always one of them. */
export function offeredLanguages(config: Partial<Pick<CommunityConfig, 'output_languages' | 'default_output_language'>> = {}): { languages: string[]; default: string } {
  const listed = Array.isArray(config.output_languages) ? normalizeLanguageList(config.output_languages) : null;
  const languages = listed && listed.length ? listed : [...DEFAULT_OUTPUT_LANGUAGES];
  const wanted = normalizeLanguageTag(config.default_output_language);
  return { languages, default: wanted && languages.includes(wanted) ? wanted : languages[0] };
}

/** The tag in canonical form when the community offers it, else null. */
export function offeredLanguage(tag: unknown, config: Partial<Pick<CommunityConfig, 'output_languages' | 'default_output_language'>> = {}): string | null {
  const t = normalizeLanguageTag(tag);
  return t && offeredLanguages(config).languages.includes(t) ? t : null;
}

/** Where the language of an answer came from. */
export type OutputLanguageSource = 'asked' | 'profile' | 'platform';

export interface OutputLanguage {
  tag: string;
  source: OutputLanguageSource;
}

/**
 * The language an answer is written in: what was asked for this once, else the
 * person's preference, else the community's default. A language the community
 * does not offer is passed over.
 */
export function outputLanguageFor(input: {
  asked?: string | null;
  person?: { output_language?: string } | null;
  config?: Partial<Pick<CommunityConfig, 'output_languages' | 'default_output_language'>>;
}): OutputLanguage {
  const config = input.config ?? {};
  const asked = offeredLanguage(input.asked, config);
  if (asked) return { tag: asked, source: 'asked' };
  const preferred = offeredLanguage(input.person?.output_language, config);
  if (preferred) return { tag: preferred, source: 'profile' };
  return { tag: offeredLanguages(config).default, source: 'platform' };
}
