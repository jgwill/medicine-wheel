/**
 * @medicine-wheel/perception-layer — Observers
 *
 * Pure classifiers — the perceptual organs. Each observer recognizes a kind of
 * witnessed material. Observers take NO world action; they only see and hear.
 * Precedence is intentional: relational witnessing (the Renaud thread) is
 * recognized first so relationships are never buried under technical chatter.
 */
import type { PerceptualEventType, PerceptualSense } from './types.js';

export interface PerceptualObserver {
  name: string;
  sense: PerceptualSense;
  type: PerceptualEventType;
  /** True when this observer recognizes the segment. */
  matches: (text: string) => boolean;
}

function has(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

/** Eye — what relationship is being witnessed. */
export const relationalWitnessingObserver: PerceptualObserver = {
  name: 'relational-witnessing-observer',
  sense: 'eye',
  type: 'relational-moment',
  matches: (t) =>
    has(t, [
      'jerry',
      'nicolas',
      'renaud',
      'renault',
      'relationship',
      'knowledge comes from relationship',
      'my friend',
      'ceremony',
      'community',
      'my meeting',
    ]),
};

/** Ear — stated creative intent. */
export const directorIntentObserver: PerceptualObserver = {
  name: 'director-intent-observer',
  sense: 'ear',
  type: 'director-intent',
  matches: (t) =>
    has(t, [
      'i want',
      'i believe',
      'vision',
      'end result',
      "i'm trying",
      'desire',
      'requirement',
      'optimal',
    ]),
};

/** Eye — what is seen / framed. */
export const shotCompositionObserver: PerceptualObserver = {
  name: 'shot-composition-observer',
  sense: 'eye',
  type: 'shot-composition',
  matches: (t) =>
    has(t, [
      "i'm seeing",
      'seeing',
      'shot',
      'video',
      'image',
      'animation',
      'screen',
      'visual',
      'picture',
      'frame',
    ]),
};

/** Ear — recording / sonic environment. */
export const ambientSoundObserver: PerceptualObserver = {
  name: 'ambient-sound-observer',
  sense: 'ear',
  type: 'ambient-sound',
  matches: (t) =>
    has(t, [
      'record',
      'recording',
      'audio',
      'sound',
      'natural sound',
      'transcription',
      'voice',
      'hear',
    ]),
};

/** Ordered observer registry — precedence matters (see module doc). */
export const OBSERVERS: PerceptualObserver[] = [
  relationalWitnessingObserver,
  directorIntentObserver,
  shotCompositionObserver,
  ambientSoundObserver,
];

export interface Classification {
  sense: PerceptualSense;
  type: PerceptualEventType;
  observer: string;
}

/** Classify a segment through the observer registry; default is a plain ear. */
export function classify(text: string): Classification {
  for (const obs of OBSERVERS) {
    if (obs.matches(text)) {
      return { sense: obs.sense, type: obs.type, observer: obs.name };
    }
  }
  return { sense: 'ear', type: 'transcript-segment', observer: 'default' };
}
