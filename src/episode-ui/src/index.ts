/**
 * @medicine-wheel/episode-ui — the episode-vessel experience, as React.
 *
 * The files workspace (`mountEpisodeFiles`) is framework-free so that gmtermux,
 * which serves plain pages with no bundler, and Miadi, which renders React,
 * mount the same implementation. `EpisodeFiles` is its React wrapper and
 * `dist/browser/episode-files.js` is its self-contained browser bundle.
 *
 * The contract, in one line: **data and callbacks in, intent out.** No
 * component holds a URL or token, knows a chronicle root, or decides what a
 * person is allowed to do. `httpEpisodeFiles` is the one module that fetches,
 * and only from URLs the host hands it. The host resolves capabilities (see
 * `@medicine-wheel/episode-vessel/permissions`) and remains the authority; a capability
 * here decides only what is offered.
 *
 * Styles are one stylesheet of plain classes over CSS custom properties:
 * `import "@medicine-wheel/episode-ui/styles.css"`, or write your own against the same
 * class names.
 */

export {
  episodeLinkTarget,
  imageUploadPath,
  mountEpisodeFiles,
  type EpisodeFilesOptions,
  type EpisodeFilesHandle,
  type EpisodeFilesService,
  type EpisodeFileSelection,
  type FileMode,
  type SaveOutcome,
  type UploadOutcome,
} from "./episode-files.js"
export {
  ancestorFolders,
  buildFileTree,
  folderPaths,
  type FileTreeFile,
  type FileTreeFolder,
  type FileTreeNode,
} from "./file-tree.js"
export { httpEpisodeFiles, type HttpEpisodeFilesOptions } from "./http.js"
export {
  EpisodeFiles,
  useEpisodeFilesAddress,
  type EpisodeFilesProps,
  type EpisodeFilesAddress,
  type UseEpisodeFilesAddressOptions,
} from "./react.js"
export {
  FILE_PARAM,
  MODE_PARAM,
  addressWithSelection,
  selectionFromSearch,
  writeSelectionToAddress,
} from "./address.js"
export {
  EpisodeMasthead,
  LineageList,
  SourceIssueList,
  type EpisodeMastheadProps,
  type LineageEdgeItem,
  type LineageListProps,
  type MastheadDirection,
  type SourceIssueItem,
  type SourceIssueListProps,
} from "./room.js"
export {
  CeremonyNoteEditor,
  CeremonyAttachments,
  type CeremonyNoteEditorProps,
  type CeremonyAttachmentsProps,
} from "./ceremony.js"
export { EpisodeShelfFilter, type EpisodeShelfFilterProps } from "./shelf-filter.js"
export {
  DEFAULT_THEME,
  themeVars,
  formatBytes,
  iconFor,
  MEDIA_ROLES,
  MEDIA_ORIGIN_KINDS,
  type FileKind,
  type MediaRecordFieldsView,
  type MediaRecordView,
  type EpisodeFileView,
  type FileRevisionView,
  type EpisodeTextView,
  type EpisodeCapabilitiesView,
  type CeremonyAttachmentView,
  type EpisodeShelfEntry,
  type EpisodeUITheme,
} from "./types.js"
