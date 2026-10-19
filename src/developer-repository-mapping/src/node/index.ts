/**
 * @medicine-wheel/developer-repository-mapping/node
 *
 * File, git and HTTP access for repository mappings, on Node: read and write
 * a mapping folder, read a clone's history into an activity reading, read a
 * meta hub with every owner hub it registers, and serve the small web page.
 */

export { findMappingDir, readMappingDir, writeMappingDir, initMappingDir } from './fs';
export { readActivity, originRepository } from './git';
export type { ReadActivityOptions } from './git';
export { defaultHubSource, readMappingSource, readHub, HUB_FETCH_TIMEOUT_MS } from './hub';
export type { FetchLike, HubStatus, HubRead, ReadHubOptions } from './hub';
export { createMappingServer, toView, LOOPBACK_HOSTS } from './server';
export type { MappingView, MappingServerOptions } from './server';
export { MAPPING_PAGE } from './page';
