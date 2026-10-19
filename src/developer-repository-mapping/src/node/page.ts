/**
 * The one page `mw-repomap serve` answers `/` with. It reads `/api/mapping`
 * and renders it: repositories with their lifecycle, git activity, drift and
 * revision state, a repository's features and relations, the capabilities and
 * who provides them, and every issue the reading found. No build step and no
 * external script, so it runs wherever the CLI runs.
 */

export const MAPPING_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Repository mapping</title>
<style>
:root {
  --bg: #fbfaf7; --panel: #ffffff; --ink: #1d1c1a; --muted: #6b675f; --line: #e3dfd6;
  --accent: #2f5d8a; --ok: #2e7d4f; --warn: #a3650b; --bad: #a83232; --chip: #f1ede4;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #161513; --panel: #1f1e1b; --ink: #ebe7df; --muted: #a29d93; --line: #34322d;
    --accent: #8db7e0; --ok: #7cc79a; --warn: #e3b25c; --bad: #e98a8a; --chip: #2a2925; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
header, main { max-width: 1200px; margin: 0 auto; padding: 16px; }
h1 { font-size: 20px; margin: 0 0 4px; }
.sub { color: var(--muted); font-size: 13px; }
.counts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.count { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; font-size: 13px; }
.count b { font-size: 16px; margin-right: 4px; }
nav { display: flex; gap: 4px; margin: 8px 0 12px; border-bottom: 1px solid var(--line); }
nav button { background: none; border: 0; border-bottom: 2px solid transparent; color: var(--muted); padding: 8px 10px; font: inherit; cursor: pointer; }
nav button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--accent); }
.filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.filters input, .filters select { background: var(--panel); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 14px; }
.filters input { flex: 1 1 220px; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
@media (min-width: 960px) { .layout.open { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } }
.scroll { overflow-x: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
tbody tr { cursor: pointer; }
tbody tr:hover, tbody tr.sel { background: var(--chip); }
.chip { display: inline-block; background: var(--chip); border-radius: 999px; padding: 1px 8px; font-size: 12px; margin: 0 4px 2px 0; white-space: nowrap; }
.converged { color: var(--ok); } .drifted { color: var(--bad); } .unobserved, .undeclared { color: var(--warn); }
.pending { color: var(--warn); } .affirmed { color: var(--ok); }
.clip { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 420px; }
aside { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; align-self: start; }
aside h2 { font-size: 17px; margin: 0 0 4px; word-break: break-word; }
aside h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); margin: 16px 0 6px; }
aside p { margin: 4px 0; }
.item { border-top: 1px solid var(--line); padding: 8px 0; }
.item:first-of-type { border-top: 0; }
a { color: var(--accent); }
.close { float: right; background: none; border: 1px solid var(--line); border-radius: 6px; color: var(--muted); cursor: pointer; padding: 2px 8px; }
.issue { padding: 8px 10px; border-bottom: 1px solid var(--line); font-size: 14px; }
.issue .error { color: var(--bad); font-weight: 600; } .issue .warning { color: var(--warn); font-weight: 600; }
.empty { color: var(--muted); padding: 16px; }
code { font-size: 13px; }
</style>
</head>
<body>
<header>
  <h1 id="title">Repository mapping</h1>
  <div class="sub" id="sub">Reading…</div>
  <div class="counts" id="counts"></div>
</header>
<main>
  <nav role="tablist" id="tabs"></nav>
  <div class="filters" id="filters"></div>
  <div class="layout" id="layout"><div id="list"></div><aside id="detail" hidden></aside></div>
</main>
<script>
const S = { v: null, tab: 'repositories', q: '', lifecycle: '', drift: '', revision: '', field: '', owner: '', sel: null };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (id) => String(id).replace(/^[a-z-]+:/, '');
const gh = (id) => { const m = /^repository:([^/]+)\\/(.+)$/.exec(id); return m ? 'https://github.com/' + m[1] + '/' + m[2] : null; };
const chip = (t, cls) => '<span class="chip ' + esc(cls || '') + '">' + esc(t) + '</span>';
const $ = (id) => document.getElementById(id);
// A malformed link (#%) opens the list instead of breaking the page.
const fromHash = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; } };

fetch('/api/mapping').then((r) => r.json()).then((v) => {
  if (v.error) { $('sub').textContent = v.error; return; }
  S.v = v;
  S.readings = Object.fromEntries(v.summary.readings.map((r) => [r.nodeId, r]));
  const hash = fromHash();
  if (hash.startsWith('repository:')) S.sel = hash;
  header(); render();
}).catch((e) => { $('sub').textContent = 'Could not read /api/mapping: ' + e.message; });

window.addEventListener('hashchange', () => { if (!S.v) return; const h = fromHash(); S.sel = h || null; S.tab = 'repositories'; render(); });

function header() {
  const v = S.v, s = v.summary;
  $('title').textContent = v.manifest.hub + ' — repository mapping';
  document.title = v.manifest.hub + ' mapping';
  $('sub').innerHTML = esc(v.manifest.kind === 'meta' ? 'Meta hub, reading ' + v.hubs.length + ' hubs' : 'Owner hub') +
    (v.manifest.description ? ' · ' + esc(v.manifest.description) : '');
  const c = [['repositories', s.repositories], ['features', s.features], ['capabilities', s.capabilities], ['relations', s.relations],
    ['drifted', s.byDrift.drifted], ['unobserved', s.byDrift.unobserved], ['pending revision', s.byRevision.pending],
    ['errors', v.issues.filter((i) => i.severity === 'error').length]];
  $('counts').innerHTML = c.map(([k, n]) => '<span class="count"><b>' + n + '</b>' + esc(k) + '</span>').join('');
}

function tabs() {
  const t = [['repositories', 'Repositories'], ['capabilities', 'Capabilities'], ['hubs', 'Hubs'], ['issues', 'Issues (' + S.v.issues.length + ')']];
  $('tabs').innerHTML = t.map(([k, label]) => '<button role="tab" aria-selected="' + (S.tab === k) + '" data-tab="' + k + '">' + esc(label) + '</button>').join('');
  $('tabs').querySelectorAll('button').forEach((b) => b.onclick = () => { S.tab = b.dataset.tab; render(); });
}

function filters() {
  if (S.tab !== 'repositories') { $('filters').innerHTML = ''; return; }
  const v = S.v;
  const opt = (name, values, label) => '<select data-f="' + name + '"><option value="">' + name + ': all</option>' +
    values.map((x) => '<option value="' + esc(x) + '"' + (S[name] === x ? ' selected' : '') + '>' + esc(label ? label(x) : x) + '</option>').join('') + '</select>';
  const owners = [...new Set(v.repositories.map((r) => r.nodeId.split(':')[1].split('/')[0]))].sort();
  $('filters').innerHTML = '<input type="search" placeholder="Search purpose, features, ids" value="' + esc(S.q) + '" data-f="q">' +
    opt('lifecycle', ['unclassified', 'prototype', 'implementation', 'maintained', 'archived']) +
    opt('drift', ['converged', 'drifted', 'unobserved', 'undeclared']) +
    opt('revision', ['pending', 'revised', 'affirmed']) +
    opt('field', Object.keys(v.summary.fields).sort(), short) +
    (owners.length > 1 ? opt('owner', owners) : '');
  $('filters').querySelectorAll('[data-f]').forEach((el) => el.oninput = () => { S[el.dataset.f] = el.value; list(); });
}

function matches(r) {
  const rd = S.readings[r.nodeId] || {};
  if (S.lifecycle && r.lifecycle !== S.lifecycle) return false;
  if (S.drift && rd.drift !== S.drift) return false;
  if (S.revision && r.revision !== S.revision) return false;
  if (S.field && !r.fields.includes(S.field)) return false;
  if (S.owner && r.nodeId.split(':')[1].split('/')[0] !== S.owner) return false;
  if (!S.q) return true;
  const q = S.q.toLowerCase();
  const feats = S.v.features.filter((f) => f.repository === r.nodeId).map((f) => f.name + ' ' + (f.statement || '')).join(' ');
  return (r.nodeId + ' ' + (r.purpose || '') + ' ' + (r.horizon || '') + ' ' + feats).toLowerCase().includes(q);
}

function list() {
  const v = S.v;
  if (S.tab === 'repositories') {
    const rows = v.repositories.filter(matches);
    if (!rows.length) { $('list').innerHTML = '<div class="scroll"><div class="empty">No repository matches.</div></div>'; return; }
    $('list').innerHTML = '<div class="scroll"><table><thead><tr><th>Repository</th><th>Lifecycle</th><th>Git</th><th>Purpose</th><th>Revision</th></tr></thead><tbody>' +
      rows.map((r) => {
        const rd = S.readings[r.nodeId] || {};
        const git = rd.activity ? esc(rd.activity) + (rd.daysSinceLastCommit != null ? ' · ' + rd.daysSinceLastCommit + 'd' : '') : '—';
        return '<tr data-id="' + esc(r.nodeId) + '"' + (S.sel === r.nodeId ? ' class="sel"' : '') + '><td><b>' + esc(short(r.nodeId)) + '</b><br>' +
          r.fields.map((f) => chip(short(f))).join('') + '</td><td>' + esc(r.lifecycle) + '<br><span class="' + esc(rd.drift) + '">' + esc(rd.drift || '') +
          '</span></td><td>' + git + '</td><td><span class="chip">' + esc(r.status) + '</span><div class="clip">' + esc(r.purpose || '') +
          '</div></td><td class="' + esc(r.revision) + '">' + esc(r.revision) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    $('list').querySelectorAll('tr[data-id]').forEach((tr) => tr.onclick = () => { location.hash = encodeURIComponent(tr.dataset.id); });
  } else if (S.tab === 'capabilities') {
    const providers = {};
    v.capabilities.forEach((c) => c.providedBy.forEach((p) => (providers[c.nodeId] = providers[c.nodeId] || new Set()).add(p)));
    const repoOf = (feature) => { const m = /^feature:([^#]+)#/.exec(feature); return m ? 'repository:' + m[1] : null; };
    v.features.forEach((f) => f.realizes && (providers[f.realizes] = providers[f.realizes] || new Set()).add(f.repository));
    v.relations.filter((r) => r.type === 'realizes' && repoOf(r.from)).forEach((r) => (providers[r.to] = providers[r.to] || new Set()).add(repoOf(r.from)));
    v.relations.filter((r) => r.type === 'provides').forEach((r) => (providers[r.to] = providers[r.to] || new Set()).add(r.from));
    const ids = [...new Set([...v.capabilities.map((c) => c.nodeId), ...Object.keys(providers)])].sort();
    $('list').innerHTML = '<div class="scroll">' + (ids.length ? '<table><thead><tr><th>Capability</th><th>Statement</th><th>Provided by</th></tr></thead><tbody>' +
      ids.map((id) => {
        const c = v.capabilities.find((x) => x.nodeId === id);
        const ps = [...(providers[id] || [])].sort();
        return '<tr><td><b>' + esc(c ? c.name : short(id)) + '</b><br><code>' + esc(id) + '</code>' + (ps.length > 1 ? '<br>' + chip('shared') : '') +
          '</td><td>' + (c ? chip(c.status) + esc(c.statement || '') : '<span class="unobserved">not defined in any hub read</span>') + '</td><td>' +
          ps.map((p) => p.startsWith('repository:') ? '<a href="#' + encodeURIComponent(p) + '">' + esc(short(p)) + '</a>' : esc(p)).join('<br>') + '</td></tr>';
      }).join('') + '</tbody></table>' : '<div class="empty">No capability yet.</div>') + '</div>';
  } else if (S.tab === 'hubs') {
    $('list').innerHTML = '<div class="scroll"><table><thead><tr><th>Hub</th><th>Source</th><th>Repositories</th><th>Issues</th></tr></thead><tbody>' +
      v.hubs.map((h) => '<tr><td><b>' + esc(h.hub) + '</b></td><td><code>' + esc(h.source) + '</code></td><td>' + (h.read ? h.repositories : '<span class="drifted">not read</span>') +
        '</td><td>' + h.issues.length + '</td></tr>').join('') + '</tbody></table></div>';
  } else {
    $('list').innerHTML = '<div class="scroll">' + (v.issues.length ? v.issues.map((i) => '<div class="issue"><span class="' + esc(i.severity) + '">' + esc(i.severity) +
      '</span> ' + esc((i.file || '') + (i.line ? ':' + i.line : '')) + ' ' + (i.nodeId ? '<code>' + esc(i.nodeId) + '</code> ' : '') + esc(i.message) + '</div>').join('')
      : '<div class="empty">No issue.</div>') + '</div>';
  }
}

function detail() {
  const v = S.v, el = $('detail'), layout = $('layout');
  const r = S.tab === 'repositories' && S.sel ? v.repositories.find((x) => x.nodeId === S.sel) : null;
  if (!r) { el.hidden = true; layout.classList.remove('open'); return; }
  el.hidden = false; layout.classList.add('open');
  const rd = S.readings[r.nodeId] || {};
  const feats = v.features.filter((f) => f.repository === r.nodeId);
  const rels = v.relations.filter((x) => x.from === r.nodeId || x.to === r.nodeId);
  const link = (id) => id.startsWith('repository:') ? '<a href="#' + encodeURIComponent(id) + '">' + esc(short(id)) + '</a>' : '<code>' + esc(id) + '</code>';
  const attribution = (x) => '<div class="sub">' + esc(x.statedBy) + ' · ' + esc(x.statedAt) + ' · <span class="' + esc(x.revision) + '">' + esc(x.revision) + '</span>' +
    (x.revisedBy ? ' by ' + esc(x.revisedBy) : '') + '</div>';
  const url = gh(r.nodeId);
  el.innerHTML = '<button class="close" onclick="location.hash=\\'\\'">Close</button><h2>' + esc(short(r.nodeId)) + '</h2>' +
    '<p>' + chip(r.lifecycle) + chip(r.origin) + chip(r.status) + (url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener">GitHub ↗</a>' : '') + '</p>' +
    (r.purpose ? '<h3>Purpose</h3><p>' + esc(r.purpose) + '</p>' : '') +
    (r.horizon ? '<h3>Horizon</h3><p>' + esc(r.horizon) + '</p>' : '') +
    '<h3>Git</h3><p class="' + esc(rd.drift) + '">' + esc(rd.reason || '') + '</p>' +
    (r.observed ? '<p class="sub">' + r.observed.commits + ' commits, ' + r.observed.commitsLast90Days + ' in the 90 days before the reading, ' + r.observed.tags + ' tags · read by ' + esc(r.observed.observedBy) + ' ' + esc(r.observed.observedAt) + '</p>' : '') +
    (r.fields.length ? '<h3>Fields</h3><p>' + r.fields.map((f) => chip(short(f))).join('') + '</p>' : '') +
    (r.prototypes.length ? '<h3>Prototypes</h3><p>' + r.prototypes.map((p) => '<code>' + esc(p) + '</code>').join(' ') + '</p>' : '') +
    '<h3>Features (' + feats.length + ')</h3>' + (feats.length ? feats.map((f) => '<div class="item"><b>' + esc(f.name) + '</b> ' + chip(f.status) +
      (f.realizes ? chip('realizes ' + short(f.realizes)) : '') + '<p>' + esc(f.statement || '') + '</p>' + attribution(f) + '</div>').join('') : '<p class="sub">None named yet.</p>') +
    '<h3>Relations (' + rels.length + ')</h3>' + (rels.length ? rels.map((x) => '<div class="item">' + link(x.from) + ' <b>' + esc(x.type) + '</b> ' + link(x.to) +
      (x.description ? '<p>' + esc(x.description) + '</p>' : '') + attribution(x) + '</div>').join('') : '<p class="sub">None named yet.</p>') +
    '<h3>Evidence read</h3><p>' + r.grounding.map((g) => '<code>' + esc(g) + '</code>').join('<br>') + '</p>' + attribution(r) +
    (v.sources[r.nodeId] ? '<p class="sub">From ' + esc(v.sources[r.nodeId]) + '</p>' : '');
}

function render() { tabs(); filters(); list(); detail(); }
</script>
</body>
</html>
`;
