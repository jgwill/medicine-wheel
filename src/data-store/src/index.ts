/**
 * Medicine Wheel Data Store
 *
 * Shared Redis data-access layer for the Medicine Wheel Developer Suite.
 * Provides connection management, Node/Edge/Ceremony CRUD, session-ceremony linking,
 * and generic Redis helpers.
 *
 * @example
 * ```ts
 * import { getRedis, createNode, logCeremony, linkSessionToCeremony } from 'medicine-wheel-data-store';
 *
 * // Connection is auto-managed — just call store functions
 * await createNode({ id: 'elder-1', type: 'human', name: 'Elder', ... });
 * await logCeremony({ id: 'c-1', type: 'opening', direction: 'east', ... });
 * await linkSessionToCeremony('c-1', 'session-abc');
 * ```
 */

// Connection
export {
  getRedis,
  createRedisClient,
  disconnectRedis,
  type ConnectionOptions,
} from './connection.js';

// Store — Nodes, Edges, Ceremonies, Accountability, Discovery
export {
  createNode,
  getNode,
  getNodesByType,
  getNodesByDirection,
  getAllNodes,
  searchNodes,
  createEdge,
  getEdge,
  getRelatedNodes,
  updateEdgeCeremony,
  logCeremony,
  getCeremony,
  getCeremoniesTimeline,
  getCeremoniesByDirection,
  getCeremoniesByType,
  getAllCeremonies,
  getRelationalWeb,
  trackAccountability,
  getAccountability,
  type RelationalNode,
  type RelationalEdge,
  type CeremonyLog,
  type AccountabilityData,
} from './store.js';

// Session-Ceremony Linking
export {
  linkSessionToCeremony,
  unlinkSessionFromCeremony,
  getSessionsForCeremony,
  getCeremoniesForSession,
  getLinkMetadata,
  type CeremonySessionLink,
} from './session-link.js';

// Generic Redis Helpers
export {
  getAllFromSet,
  getHash,
  getAllHashes,
  getSortedSetRange,
  setHash,
  addToSet,
  addToSortedSet,
} from './helpers.js';
