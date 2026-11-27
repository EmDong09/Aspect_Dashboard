/* Aspect dashboard: hash-routed single-page prototype built from the Figma file.
   Plain JS, no build step. All state lives in memory and resets on reload. */
(function () {
  'use strict';

  const D = window.ASPECT_DATA;
  const PAGE_SIZE = 12;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------------------------------------------------------------- state */

  function freshUpload() {
    return {
      step: 1, skills: [], skillQuery: '', level: 'Single', tokens: '', prompt: '', video: null,
      complete: 'Pass', editable: 'Yes', fidelity: '', quality: '', errors: {}
    };
  }

  const state = {
    runs: D.runs,
    skills: D.skills,
    overview: { range: 'Week' },
    runsView: { q: '', skill: 'All', level: 'All', quality: 'Any', date: 'All time', sort: 'Newest', page: 1 },
    archive: { q: '', skills: [], level: 'All', bestOnly: false, page: 1, skillSearch: '' },
    deleted: { q: '', skills: [], level: 'All', skillSearch: '' },
    skillsEdit: null,
    upload: freshUpload(),
    openMenu: null,
    confirm: null,
    route: { page: 'overview', id: null }
  };

  /* -------------------------------------------------------------- helpers */

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, s) => window.icon(n, s);

  function parseDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function fmtShort(iso) { const d = parseDate(iso); return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function fmtLong(iso) { const d = parseDate(iso); return fmtShort(iso) + ', ' + d.getFullYear(); }
  function ts(run) {
    const d = parseDate(run.date);
    const m = /^(\d+):(\d+)(am|pm)$/.exec(run.time || '') || [];
    let h = Number(m[1] || 0) % 12; if (m[3] === 'pm') h += 12;
    d.setHours(h, Number(m[2] || 0));
    return d.getTime();
  }
  function todayIso() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nowTime(at) { const d = at || new Date(); let h = d.getHours(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + ':' + String(d.getMinutes()).padStart(2, '0') + ap; }
  const skillLabel = run => run.skills.join(' + ');
  const activeRuns = () => state.runs.filter(r => !r.deleted);
  const deletedRuns = () => state.runs.filter(r => r.deleted);
  const findRun = id => state.runs.find(r => r.id === id);
  const skillDesc = name => (state.skills.find(s => s.name === name) || {}).desc;
  function allSkillNames() {
    const set = new Set(state.skills.map(s => s.name));
    state.runs.forEach(r => r.skills.forEach(s => set.add(s)));
    return Array.from(set);
  }

  const LEVEL_COLOR = { Single: 'blue', Combined: 'pink', Storyboard: 'orange' };
  const tag = (label, color, extra = '') => `<span class="tag tag-${color}" ${extra}>${esc(label)}</span>`;
  const levelTag = l => tag(l, LEVEL_COLOR[l] || 'grey');
  const passTag = v => tag(v, v === 'Pass' || v === 'Yes' ? 'green' : v === 'Fail' || v === 'No' ? 'red' : 'grey');
  const bestTag = () => tag('Best', 'green');

  function skillTagWithTip(name, uid) {
    const desc = skillDesc(name);
    const tipId = 'tip-' + uid + '-' + name.replace(/[^a-z0-9]/gi, '');
    return `<span class="tip-wrap"><span class="tag tag-grey" tabindex="0" aria-describedby="${tipId}">${esc(name)}</span>` +
      `<span class="tooltip" role="tooltip" id="${tipId}"><b>${esc(name)}</b><span>${esc(desc || 'No description yet')}</span></span></span>`;
  }

  /* --------------------------------------------------------------- toasts */

  function toast(msg, action) {
    const region = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : '');
    if (action) el.querySelector('button').addEventListener('click', () => { el.remove(); action.fn(); });
    region.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  /* -------------------------------------------------------------- players */
  // Placeholder players: there is no real video yet, so playback animates the
  // progress bar across the 6-second duration shown in the design.
  const players = new Map();
  const DURATION = 6;
  function playerState(id) { if (!players.has(id)) players.set(id, { playing: false, elapsed: 0, last: 0 }); return players.get(id); }
  const fmtTime = s => '0:' + String(Math.floor(s)).padStart(2, '0');
  function tickPlayers(t) {
    let any = false;
    players.forEach((p, id) => {
      if (!p.playing) return;
      any = true;
      p.elapsed += (t - (p.last || t)) / 1000; p.last = t;
      if (p.elapsed >= DURATION) { p.elapsed = DURATION; p.playing = false; }
      syncPlayerDom(id);
    });
    if (any) requestAnimationFrame(tickPlayers);
  }
  function syncPlayerDom(id) {
    const p = playerState(id);
    document.querySelectorAll(`[data-player="${id}"]`).forEach(el => {
      const bar = el.querySelector('.progress span'); if (bar) bar.style.width = (p.elapsed / DURATION * 100) + '%';
      const time = el.querySelector('.time'); if (time) time.textContent = fmtTime(p.elapsed) + ' / ' + fmtTime(DURATION);
      el.querySelectorAll('[data-action="play"]').forEach(b => {
        b.innerHTML = ic(p.playing ? 'pause' : 'play', b.classList.contains('play-btn') ? 18 : 14);
        b.classList.toggle('is-playing', p.playing);
        b.setAttribute('aria-label', p.playing ? 'Pause' : 'Play');
      });
    });
  }
  function togglePlayer(id) {
    const p = playerState(id);
    if (p.elapsed >= DURATION) p.elapsed = 0;
    p.playing = !p.playing; p.last = 0;
    syncPlayerDom(id);
    if (p.playing) requestAnimationFrame(tickPlayers);
  }
  function videoBlock(id, filename, opts = {}) {
    const p = playerState(id);
    return `<div class="video ${opts.cls || ''}" data-player="${id}">
      <button type="button" class="play-btn" data-action="play" data-id="${id}" aria-label="${p.playing ? 'Pause' : 'Play'}">${ic(p.playing ? 'pause' : 'play', 18)}</button>
      ${filename ? `<span class="filename">${esc(filename)}</span>` : ''}
    </div>`;
  }
  function playerBar(id, dark) {
    const p = playerState(id);
    return `<div class="player-bar ${dark ? 'dark' : ''}" data-player="${id}">
      <button type="button" class="bar-play" data-action="play" data-id="${id}" aria-label="Play">${ic(p.playing ? 'pause' : 'play', 14)}</button>
      <div class="progress" aria-hidden="true"><span style="width:${p.elapsed / DURATION * 100}%"></span></div>
      <span class="time">${fmtTime(p.elapsed)} / ${fmtTime(DURATION)}</span>
    </div>`;
  }

  /* ------------------------------------------------------- shared widgets */

  function dropdown(key, label, menuHtml, opts = {}) {
    const open = state.openMenu === key;
    return `<div class="dd-wrap">
      <button type="button" class="dropdown" data-action="toggle-menu" data-key="${key}" aria-haspopup="true" aria-expanded="${open}" id="dd-${key}">
        <span class="dd-label">${esc(label)}</span>${ic('chevD', 16)}
      </button>
      ${open ? `<div class="menu ${opts.right ? 'align-right' : ''}" role="menu" style="${opts.width ? 'min-width:' + opts.width + 'px' : ''}">${menuHtml}</div>` : ''}
    </div>`;
  }
  function singleMenu(path, options, current) {
    return options.map(o => `<button type="button" role="menuitemradio" aria-checked="${o === current}" class="menu-item ${o === current ? 'is-selected' : ''}" data-action="set" data-path="${path}" data-value="${esc(o)}">${esc(o)}</button>`).join('');
  }
  function skillsMultiMenu(scope) {
    const view = state[scope];
    const q = view.skillSearch.trim().toLowerCase();
    const names = allSkillNames().filter(n => !q || n.toLowerCase().includes(q));
    return `<label class="menu-search">${ic('search', 14)}<input id="${scope}-skill-search" data-bind="${scope}.skillSearch" data-live value="${esc(view.skillSearch)}" placeholder="Search skills" autocomplete="off" aria-label="Search skills"></label>
      <div class="menu-list">${names.length ? names.map(n => {
        const on = view.skills.includes(n);
        return `<button type="button" role="menuitemcheckbox" aria-checked="${on}" class="menu-item ${on ? 'is-selected' : ''}" data-action="toggle-skill-filter" data-scope="${scope}" data-value="${esc(n)}"><span class="check">${on ? ic('check', 12) : ''}</span>${esc(n)}</button>`;
      }).join('') : '<p class="menu-empty">No matching skills</p>'}</div>
      <div class="menu-divider"></div>
      <div class="menu-footer"><span>${view.skills.length} selected</span><button type="button" class="link-btn" data-action="clear-skill-filter" data-scope="${scope}">Clear</button></div>`;
  }
  function levelMenu(scope, withBest) {
    const view = state[scope];
    const opts = [['All', 'All levels'], ['Single', 'Single'], ['Combined', 'Combined'], ['Storyboard', 'Storyboard']];
    return opts.map(([v, l]) => {
      const on = view.level === v;
      return `<button type="button" role="menuitemradio" aria-checked="${on}" class="menu-item ${on ? 'is-selected' : ''}" data-action="set" data-path="${scope}.level" data-value="${v}" data-keep-open><span class="radio">${on ? ic('check', 10) : ''}</span>${l}</button>`;
    }).join('') + (withBest ? `<div class="menu-divider"></div>
      <button type="button" role="menuitemcheckbox" aria-checked="${view.bestOnly}" class="menu-item ${view.bestOnly ? 'is-selected' : ''}" data-action="toggle-best" data-scope="${scope}"><span class="check">${view.bestOnly ? ic('check', 12) : ''}</span>Best runs only</button>` : '');
  }
  const skillFilterLabel = list => 'Skill: ' + (list.length ? list.join(', ') : 'All');
  const levelFilterLabel = v => 'Level: ' + (v.level === 'All' ? 'All' : v.level) + (v.bestOnly ? ' · Best' : '');

  function pageList(page, pages) {
    if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, '…', pages];
    if (page >= pages - 2) return [1, '…', pages - 2, pages - 1, pages];
    return [1, '…', page, '…', pages];
  }
  function pagination(scope, page, pages) {
    if (pages < 1) pages = 1;
    return `<nav class="pagination" aria-label="Pagination">
      <button type="button" class="page-btn" data-action="page" data-scope="${scope}" data-value="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">${ic('chevL', 14)}</button>
      ${pageList(page, pages).map(p => p === '…'
        ? '<span class="page-btn" aria-hidden="true">…</span>'
        : `<button type="button" class="page-btn ${p > 9 ? 'wide' : ''}" data-action="page" data-scope="${scope}" data-value="${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`).join('')}
      <button type="button" class="page-btn" data-action="page" data-scope="${scope}" data-value="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">${ic('chevR', 14)}</button>
    </nav>`;
  }

  function runRowCells(r) {
    return `<td><div class="skill-cell"><b>${esc(skillLabel(r))}</b><small>v${r.version}</small></div></td>
      <td>${levelTag(r.level)}</td>
      <td>${esc(r.runsAtLevel)}</td>
      <td>${passTag(r.complete)}</td>
      <td>${esc(r.fidelity)}</td>
      <td>${passTag(r.editable)}</td>
      <td><span class="quality-cell">${esc(r.quality)}${r.best ? bestTag() : ''}</span></td>
      <td>${esc(r.tokens)}</td>
      <td class="muted">${fmtShort(r.date)}</td>`;
  }
  const RUN_HEAD = ['Skill', 'Level', 'Runs at level', 'Complete', 'Fidelity', 'Editable', 'Quality', 'Token cost', 'Uploaded'];

  /* ---------------------------------------------------------------- views */

  function viewOverview() {
    const range = state.overview.range;
    const vs = { Day: 'vs yesterday', Week: 'vs last week', Month: 'vs last month', Year: 'vs last year', All: '' }[range];
    const kpis = [
      ['Total test runs', 'xxx', vs && '+x% ' + vs],
      ['Avg tokens per run', 'xx.xK', vs && '-x% ' + vs],
      ['Avg completion rate', 'xx%', vs && '+x pts ' + vs]
    ];
    const recent = activeRuns().slice().sort((a, b) => ts(b) - ts(a)).slice(0, 10);
    return `<header class="page-header"><h1 class="page-title">Overview</h1></header>
      <section class="stack-12" aria-label="Summary">
        <div class="segmented" role="group" aria-label="Time range">
          ${['Day', 'Week', 'Month', 'Year', 'All'].map(r => `<button type="button" aria-pressed="${r === range}" data-action="range" data-value="${r}">${r}</button>`).join('')}
        </div>
        <div class="kpis">${kpis.map(([l, v, d]) => `<div class="card kpi"><p class="label">${l}</p><div class="value-row"><p class="value">${v}</p>${d ? `<p class="delta">${d}</p>` : ''}</div></div>`).join('')}</div>
      </section>
      <section class="card table-card" aria-labelledby="recent-title">
        <div class="table-card-header"><h2 class="card-title" id="recent-title">Most recent runs</h2><span class="spacer"></span>
          <a class="link-btn" href="#/runs">View all runs ${ic('arrow', 14)}</a></div>
        <div class="table-scroll"><table class="table">
          <thead><tr>${RUN_HEAD.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
          <tbody>${recent.map(r => `<tr class="clickable" data-action="open-run" data-id="${r.id}">${runRowCells(r).replace('<b>', `<b><a class="row-link-inline" href="#/overview/${r.id}">`).replace('</b>', '</a></b>')}</tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  }

  function filteredRuns() {
    const v = state.runsView;
    const q = v.q.trim().toLowerCase();
    const ref = Math.max(...state.runs.map(ts));
    const days = { 'Last 7 days': 7, 'Last 30 days': 30 }[v.date];
    let list = activeRuns().filter(r =>
      (!q || skillLabel(r).toLowerCase().includes(q) || r.prompt.toLowerCase().includes(q) || r.file.toLowerCase().includes(q)) &&
      (v.skill === 'All' || r.skills.includes(v.skill)) &&
      (v.level === 'All' || r.level === v.level) &&
      (v.quality === 'Any' || (v.quality === 'Best only' ? r.best : v.quality === 'Passed completion' ? r.complete === 'Pass' : r.complete === 'Fail')) &&
      (!days || ref - ts(r) <= days * 864e5));
    const sorters = {
      Newest: (a, b) => ts(b) - ts(a),
      Oldest: (a, b) => ts(a) - ts(b),
      'Skill A–Z': (a, b) => skillLabel(a).localeCompare(skillLabel(b)) || b.version - a.version
    };
    return list.sort(sorters[v.sort]);
  }

  function viewRuns() {
    const v = state.runsView;
    const list = filteredRuns();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (v.page > pages) v.page = pages;
    const start = (v.page - 1) * PAGE_SIZE;
    const rows = list.slice(start, start + PAGE_SIZE);
    const id = state.route.id;
    return `<header class="page-header">
        <div class="title-stack"><a class="back-link" href="#/overview">${ic('arrowL', 14)} Back</a><h1 class="page-title">All runs</h1></div>
        <span class="spacer"></span>
        <button type="button" class="btn btn-secondary" data-action="export-csv">${ic('download', 14)} Export CSV</button>
      </header>
      <div class="filters">
        <label class="search lg">${ic('search', 16)}<input id="runs-q" data-bind="runsView.q" data-live value="${esc(v.q)}" placeholder="Search skills or prompts" aria-label="Search skills or prompts" autocomplete="off"></label>
        ${dropdown('runs-skill', 'Skill: ' + v.skill, `<div class="menu-list">${singleMenu('runsView.skill', ['All'].concat(allSkillNames()), v.skill)}</div>`)}
        ${dropdown('runs-level', 'Level: ' + v.level, singleMenu('runsView.level', ['All'].concat(D.levels), v.level))}
        ${dropdown('runs-quality', 'Quality: ' + v.quality, singleMenu('runsView.quality', ['Any', 'Best only', 'Passed completion', 'Failed completion'], v.quality))}
        ${dropdown('runs-date', 'Date: ' + v.date, singleMenu('runsView.date', ['All time', 'Last 7 days', 'Last 30 days'], v.date))}
        <span class="spacer"></span>
        ${dropdown('runs-sort', 'Sort: ' + v.sort, singleMenu('runsView.sort', ['Newest', 'Oldest', 'Skill A–Z'], v.sort), { right: true, width: 160 })}
      </div>
      <section class="card table-card" aria-label="Runs">
        <div class="table-scroll"><table class="table table-runs">
          <thead><tr>${RUN_HEAD.map(h => `<th scope="col">${h}</th>`).join('')}<th><span class="visually-hidden">Open</span></th></tr></thead>
          <tbody>${rows.length ? rows.map(r => `<tr class="clickable ${r.id === id ? 'is-selected' : ''}" data-action="open-run" data-id="${r.id}">${runRowCells(r)}<td class="row-chev"><a href="#/runs/${r.id}" aria-label="Open ${esc(skillLabel(r))} v${r.version}">${ic('chevR', 14)}</a></td></tr>`).join('')
            : `<tr><td colspan="10" class="muted" style="text-align:center;height:120px">No runs match these filters.</td></tr>`}</tbody>
        </table></div>
        <div class="table-footer"><span class="count">Showing ${list.length ? start + 1 : 0}–${start + rows.length} of ${list.length} runs</span><span class="spacer"></span>${pagination('runsView', v.page, pages)}</div>
      </section>`;
  }

  function archiveFiltered(scope) {
    const v = state[scope];
    const q = v.q.trim().toLowerCase();
    const base = scope === 'deleted' ? deletedRuns() : activeRuns();
    return base.filter(r =>
      (!q || r.file.toLowerCase().includes(q) || r.prompt.toLowerCase().includes(q) || skillLabel(r).toLowerCase().includes(q)) &&
      (!v.skills.length || r.skills.some(s => v.skills.includes(s))) &&
      (v.level === 'All' || r.level === v.level) &&
      (!v.bestOnly || r.best)
    ).sort((a, b) => scope === 'deleted' ? b.daysLeft - a.daysLeft : ts(b) - ts(a));
  }
  const filtersActive = v => v.q || v.skills.length || v.level !== 'All' || v.bestOnly;

  function archiveCard(r) {
    return `<article class="vcard has-hover">
      <div class="vcard-thumb">
        <span class="tl">${levelTag(r.level)}</span>${r.best ? `<span class="tr">${bestTag()}</span>` : ''}
        <span class="play-btn" aria-hidden="true">${ic('play', 18)}</span>
        <span class="duration">${r.duration}</span>
      </div>
      <div class="vcard-body">
        <div class="vcard-title-row"><h3 class="vcard-title">${esc(r.file)}</h3><span class="vcard-date">${fmtShort(r.date)}</span></div>
        <div class="tag-row">${r.skills.map(s => skillTagWithTip(s, r.id)).join('')}</div>
      </div>
      <a class="vcard-open" href="#/archive/${r.id}" aria-label="View details for ${esc(r.file)}"></a>
      <div class="vcard-hover" aria-hidden="true"><span>View details</span></div>
    </article>`;
  }

  function viewArchive() {
    const v = state.archive;
    const list = archiveFiltered('archive');
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (v.page > pages) v.page = pages;
    const start = (v.page - 1) * PAGE_SIZE;
    const items = list.slice(start, start + PAGE_SIZE);
    return `<header class="page-header"><h1 class="page-title">Video archive</h1><span class="spacer"></span>
        <div class="header-actions">
          <a class="ghost-btn" href="#/deleted">${ic('trash', 16)} View recently deleted</a>
          <label class="search">${ic('search', 16)}<input id="archive-q" data-bind="archive.q" data-live value="${esc(v.q)}" placeholder="Search videos or prompts" aria-label="Search videos or prompts" autocomplete="off"></label>
        </div></header>
      <div class="filters">
        ${dropdown('archive-skill', skillFilterLabel(v.skills), skillsMultiMenu('archive'), { width: 206 })}
        ${dropdown('archive-level', levelFilterLabel(v), levelMenu('archive', true), { width: 152 })}
        <span class="spacer"></span>
        ${filtersActive(v) ? `<button type="button" class="link-btn" data-action="clear-filters" data-scope="archive">Clear filters</button>` : ''}
      </div>
      ${items.length ? `<section class="video-grid" aria-label="Videos">${items.map(archiveCard).join('')}</section>`
        : `<div class="empty"><b>No videos match these filters</b>Try another skill or level, or clear the filters.</div>`}
      <div class="table-footer" style="border:0;padding:0">
        <span class="count">Showing ${list.length ? start + 1 : 0}–${start + items.length} of ${list.length} videos</span><span class="spacer"></span>
        <span class="per-page">Per page <span class="page-btn" aria-hidden="true">${PAGE_SIZE}</span></span>
        ${pagination('archive', v.page, pages)}
      </div>`;
  }

  function viewDeleted() {
    const v = state.deleted;
    const list = archiveFiltered('deleted');
    const total = deletedRuns().length;
    return `<header class="page-header">
        <div class="title-stack"><a class="back-link" href="#/archive">${ic('arrowL', 14)} Back</a><h1 class="page-title">Recently deleted</h1></div>
        <span class="spacer"></span>
        <div class="header-actions">
          <label class="search">${ic('search', 16)}<input id="deleted-q" data-bind="deleted.q" data-live value="${esc(v.q)}" placeholder="Search videos or prompts" aria-label="Search deleted videos or prompts" autocomplete="off"></label>
          <button type="button" class="btn btn-danger-outline" data-action="delete-all" ${total ? '' : 'disabled'}>${ic('trash', 16)} Delete all</button>
        </div></header>
      <div class="filters">
        ${dropdown('deleted-skill', skillFilterLabel(v.skills), skillsMultiMenu('deleted'), { width: 206 })}
        ${dropdown('deleted-level', levelFilterLabel(v), levelMenu('deleted', false), { width: 152 })}
        <span class="spacer"></span>
        ${filtersActive(v) ? `<button type="button" class="link-btn" data-action="clear-filters" data-scope="deleted">Clear filters</button>` : ''}
      </div>
      <div class="alert" role="note">${ic('info', 16)} Deleted videos stay here for 30 days, then they're removed permanently. Restore a video to move it back to the archive with its benchmark results.</div>
      <p class="muted">${list.length === total ? total : list.length + ' of ' + total} deleted video${total === 1 ? '' : 's'}</p>
      ${list.length ? `<section class="video-grid" aria-label="Deleted videos">${list.map(r => `<article class="vcard is-deleted">
          <div class="vcard-thumb"><span class="tl">${levelTag(r.level)}</span><span class="play-btn" aria-hidden="true">${ic('play', 18)}</span><span class="duration">${r.duration}</span></div>
          <div class="vcard-body">
            <div class="vcard-title-row"><h3 class="vcard-title">${esc(r.file)}</h3><span class="days-left ${r.daysLeft <= 3 ? 'urgent' : ''}">${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} left</span></div>
            <div class="tag-row">${r.skills.map(s => skillTagWithTip(s, r.id)).join('')}</div>
            <div class="deleted-actions">
              <button type="button" class="btn btn-secondary btn-sm" data-action="restore" data-id="${r.id}">${ic('restore', 14)} Restore</button>
              <button type="button" class="link-danger" data-action="delete-forever" data-id="${r.id}">Delete forever</button>
            </div>
          </div></article>`).join('')}</section>`
        : `<div class="empty"><b>${total ? 'No deleted videos match these filters' : 'Nothing here'}</b>${total ? 'Try another skill or level.' : 'Videos you delete from the archive will appear here for 30 days.'}</div>`}`;
  }

  function viewSkills() {
    const editing = !!state.skillsEdit;
    const head = ['Skill', 'Tests covering', 'Levels covered', 'Best quality', 'Avg cost / run', 'Last run'];
    let body;
    if (!editing) {
      body = state.skills.map(s => `<tr>
        <td><div class="skill-cell"><b>${esc(s.name)}</b><span class="desc">${esc(s.desc || '')}</span></div></td>
        <td>${esc(s.tests)}</td><td><div class="tag-row">${s.levels.map(levelTag).join('') || '<span class="muted">—</span>'}</div></td>
        <td>${esc(s.best)}</td><td>${esc(s.cost)}</td><td class="muted">${esc(s.last)}</td></tr>`).join('');
    } else {
      body = state.skillsEdit.rows.map((row, i) => {
        if (row.removed) {
          return `<tr class="is-removed"><td><span class="struck">${esc(row.orig)}</span></td><td>${esc(row.skill.tests)}</td>
            <td><div class="tag-row">${row.skill.levels.map(levelTag).join('')}</div></td><td>${esc(row.skill.best)}</td><td>${esc(row.skill.cost)}</td><td>${esc(row.skill.last)}</td>
            <td style="text-align:right"><button type="button" class="link-btn" data-action="undo-remove" data-index="${i}">Undo</button></td></tr>`;
        }
        const s = row.skill;
        return `<tr>
          <td><input class="name-input" id="skill-name-${i}" data-bind-skill="${i}" value="${esc(row.name)}" aria-label="Skill name" placeholder="new-skill-name" autocomplete="off"></td>
          <td>${s ? esc(s.tests) : '<span class="muted">—</span>'}</td>
          <td>${s ? `<div class="tag-row">${s.levels.map(levelTag).join('')}</div>` : '<span class="muted">—</span>'}</td>
          <td>${s ? esc(s.best) : '<span class="muted">—</span>'}</td><td>${s ? esc(s.cost) : '<span class="muted">—</span>'}</td>
          <td class="muted">${s ? esc(s.last) : '—'}</td>
          <td style="text-align:right"><button type="button" class="icon-btn" data-action="remove-skill" data-index="${i}" aria-label="Remove ${esc(row.name || 'new skill')}">${ic('trash', 16)}</button></td></tr>`;
      }).join('');
    }
    return `<header class="page-header"><h1 class="page-title">Evaluating skills</h1></header>
      <section class="card table-card" aria-labelledby="all-skills">
        <div class="table-card-header" style="padding:16px 20px">
          <div><h2 class="card-title" id="all-skills">All skills</h2>
            <p class="card-sub">${state.skills.length} skills documented</p></div>
          <span class="spacer"></span>
          ${editing
            ? `<button type="button" class="btn btn-secondary" data-action="cancel-edit">Cancel</button><button type="button" class="btn btn-primary" data-action="save-skills">Save changes</button>`
            : `<button type="button" class="btn btn-secondary btn-sm" data-action="edit-skills">${ic('pencil', 14)} Edit skills</button>`}
        </div>
        <div class="table-scroll"><table class="table skills-table ${editing ? '' : 'with-desc'}">
          <thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}${editing ? '<th><span class="visually-hidden">Remove</span></th>' : ''}</tr></thead>
          <tbody>${body}</tbody></table></div>
        ${editing ? `<div class="add-row"><button type="button" class="link-btn" data-action="add-skill">${ic('plus', 14)} Add skill</button></div>` : ''}
      </section>
      ${editing ? `<div class="alert" role="note">${ic('info', 16)} Removing a skill moves every test run tagged only with that skill to Recently deleted. Runs that also include other skills stay in the archive.</div>` : ''}`;
  }

  /* ---------------------------------------------------------- upload flow */
  // Two steps, matching Figma: 02 · Upload test run (Enter run) and
  // 03 · Review & upload. Benchmark results come from local testing.

  const STEPS = ['Enter run', 'Review & upload'];
  function stepper(step) {
    return `<ol class="stepper" aria-label="Upload progress" style="list-style:none;margin:0;padding:0">${STEPS.map((label, i) => {
      const n = i + 1;
      const cls = n < step ? 'is-done' : n === step ? 'is-current' : '';
      const dot = n < step ? ic('check', 14) : n;
      const inner = `<span class="step-dot">${dot}</span><span class="step-label">${label}</span>`;
      return (i ? `<li aria-hidden="true" style="display:contents"><span class="step-line ${n <= step ? 'is-done' : ''}"></span></li>` : '') +
        `<li style="display:contents">${n < step
          ? `<button type="button" class="step ${cls}" data-action="up-goto" data-value="${n}" aria-label="Back to step ${n}: ${label}">${inner}</button>`
          : `<span class="step ${cls}" ${n === step ? 'aria-current="step"' : ''}>${inner}</span>`}</li>`;
    }).join('')}</ol>`;
  }
  function uploadHeader(title) {
    return `<header class="page-header"><h1 class="page-title">${title}</h1><span class="spacer"></span>
      <div class="header-actions" style="width:auto">${stepper(state.upload.step)}<span class="v-divider"></span>
        <button type="button" class="btn btn-secondary btn-sm btn-muted" data-action="up-cancel">${ic('x', 14)} Cancel</button></div></header>`;
  }
  const fmtBytes = b => b > 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
  const toNumber = v => { const s = String(v).replace(/[^\d.]/g, ''); return s === '' ? NaN : Number(s); };
  function tokensLabel(u) {
    const n = toNumber(u.tokens);
    return n ? (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'K' : String(n)) : 'xxK';
  }
  const fidelityValue = u => toNumber(u.fidelity);
  const qualityValue = u => toNumber(u.quality);
  function uploadVideoName(u) { return u.video ? u.video.name : 'test_run.mp4'; }
  function nextVersion(u) {
    const key = u.skills.slice().sort().join('|');
    const vs = state.runs.filter(r => r.skills.slice().sort().join('|') === key).map(r => r.version);
    return vs.length ? Math.max(...vs) + 1 : 1;
  }
  function validateUpload(u) {
    const errors = {};
    if (!u.skills.length) errors.skills = 'Pick at least one skill this run tests.';
    const f = fidelityValue(u);
    if (isNaN(f)) errors.fidelity = 'Enter the fidelity score from local testing.';
    else if (f < 0 || f > 100) errors.fidelity = 'Fidelity is a percentage from 0 to 100.';
    const q = qualityValue(u);
    if (isNaN(q)) errors.quality = 'Enter the quality score from local testing.';
    else if (q < 0 || q > 5) errors.quality = 'Quality is a score from 0 to 5.';
    return errors;
  }

  function viewUpload() {
    const u = state.upload;
    return u.step === 2 ? uploadReview(u) : uploadEnter(u);
  }

  function segmented(label, id, action, options, current) {
    return `<div class="segmented" role="radiogroup" aria-labelledby="${id}" style="align-self:flex-start">
      ${options.map(o => `<button type="button" role="radio" aria-checked="${current === o}" data-action="${action}" data-value="${o}">${o}</button>`).join('')}
    </div>`;
  }
  const fieldError = msg => msg ? `<p class="field-error" role="alert">${esc(msg)}</p>` : '';

  function uploadEnter(u) {
    const err = u.errors || {};
    const open = state.openMenu === 'up-skills';
    const q = u.skillQuery.trim();
    const names = state.skills.map(s => s.name).concat(u.skills.filter(n => !state.skills.some(s => s.name === n)));
    const shown = names.filter(n => !q || n.toLowerCase().includes(q.toLowerCase()));
    const canAdd = q && !names.some(n => n.toLowerCase() === q.toLowerCase());
    const menu = `<div class="menu ms-menu" role="listbox" aria-multiselectable="true" aria-label="Skills">
      <div class="menu-list">${shown.map(n => {
        const on = u.skills.includes(n);
        return `<button type="button" role="option" aria-selected="${on}" class="menu-item lg ${on ? 'is-selected' : ''}" data-action="up-toggle-skill" data-value="${esc(n)}"><span class="check">${on ? ic('check', 12) : ''}</span>${esc(n)}</button>`;
      }).join('') || '<p class="menu-empty">No matching skills</p>'}</div>
      <div class="menu-divider"></div>
      <button type="button" class="menu-item lg link-btn" style="font-size:14px" data-action="up-add-skill">${ic('plus', 14)} ${canAdd ? `Add “${esc(q)}”` : 'Add new skill'}</button></div>`;
    const video = u.video
      ? `<span class="dz-icon">${ic('check', 16)}</span><span class="dz-title">${esc(u.video.name)}</span><span class="dz-sub">${fmtBytes(u.video.size)} · <b>Replace video</b></span>`
      : `<span class="dz-icon">${ic('upload', 20)}</span><span class="dz-title">Drag &amp; drop your test run video</span><span class="dz-sub">or <b>click to browse</b> · MP4 or MOV</span>`;
    const recorded = [
      ['Skill', 'You enter'], ['Level', 'You enter'], ['Runs at level', 'Automatic'], ['Complete', 'From local testing'],
      ['Fidelity', 'From local testing'], ['Editable', 'From local testing'], ['Quality', 'From local testing'],
      ['Token cost', 'You enter'], ['Uploaded', 'Automatic']
    ];
    return uploadHeader('Upload test run') + `<form class="upload-body" id="upload-form" novalidate>
      <div class="col" style="gap:24px">
        <section class="card form-card" aria-labelledby="rd-title">
          <div class="card-header"><h2 class="card-title" id="rd-title">Run details</h2></div>
          <div class="field">
            <label class="field-label" for="up-skill-q">Skill(s) tested</label>
            <div class="dd-wrap">
              <div class="multiselect ${open ? 'is-open' : ''} ${err.skills ? 'is-invalid' : ''}" data-action="focus-skill-input">
                ${u.skills.map(n => `<span class="chip">${esc(n)}<button type="button" data-action="up-remove-skill" data-value="${esc(n)}" aria-label="Remove ${esc(n)}">${ic('x', 12)}</button></span>`).join('')}
                <input id="up-skill-q" data-bind="upload.skillQuery" data-live value="${esc(u.skillQuery)}" placeholder="Search or add a skill…" autocomplete="off" role="combobox" aria-expanded="${open}" aria-autocomplete="list" ${err.skills ? 'aria-invalid="true"' : ''}>
                <button type="button" class="ms-chev" data-action="toggle-menu" data-key="up-skills" aria-label="Show skills">${ic('chevD', 16)}</button>
              </div>
              ${open ? menu : ''}
            </div>
            ${fieldError(err.skills)}
          </div>
          <div class="field-row">
            <div class="field"><span class="field-label" id="lvl-label">Level</span>${segmented('Level', 'lvl-label', 'up-level', D.levels, u.level)}</div>
            <div class="field"><label class="field-label" for="up-tokens">Token cost</label>
              <div class="input-affix"><input class="input" id="up-tokens" data-bind="upload.tokens" value="${esc(u.tokens)}" inputmode="numeric" placeholder="e.g. 48,000" autocomplete="off"><span class="affix">tokens</span></div></div>
          </div>
          <div class="field"><label class="field-label" for="up-prompt">Original prompt</label>
            <textarea class="textarea" id="up-prompt" data-bind="upload.prompt" placeholder="Paste the exact prompt you used to generate this run…">${esc(u.prompt)}</textarea></div>
          <div class="field"><span class="field-label">Test run video</span>
            <div class="dropzone" role="button" tabindex="0" data-action="up-browse" id="dropzone" aria-label="Upload test run video, MP4 or MOV">${video}</div></div>
        </section>
        <section class="card form-card" aria-labelledby="br-title">
          <div class="card-header"><div><h2 class="card-title" id="br-title">Benchmark results</h2><p class="card-sub">Enter the results from your local benchmark run</p></div>
            <span class="spacer"></span>${tag('From local testing', 'grey')}</div>
          <div class="field-row">
            <div class="field"><span class="field-label" id="cmp-label">Complete</span>${segmented('Complete', 'cmp-label', 'up-complete', ['Pass', 'Fail'], u.complete)}
              <p class="field-hint">Did the run do everything the prompt asked?</p></div>
            <div class="field"><span class="field-label" id="edit-label">Editable</span>${segmented('Editable', 'edit-label', 'up-editable', ['Yes', 'No'], u.editable)}
              <p class="field-hint">Are text, timing and layers adjustable in AE?</p></div>
          </div>
          <div class="field-row">
            <div class="field"><label class="field-label" for="up-fidelity">Fidelity</label>
              <div class="input-affix short"><input class="input ${err.fidelity ? 'is-invalid' : ''}" id="up-fidelity" data-bind="upload.fidelity" value="${esc(u.fidelity)}" inputmode="decimal" placeholder="e.g. 85" autocomplete="off" aria-describedby="fid-hint" ${err.fidelity ? 'aria-invalid="true"' : ''}><span class="affix">%</span></div>
              ${fieldError(err.fidelity)}<p class="field-hint" id="fid-hint">Share of requested properties visible in the render</p></div>
            <div class="field"><label class="field-label" for="up-quality">Quality</label>
              <div class="input-affix short"><input class="input ${err.quality ? 'is-invalid' : ''}" id="up-quality" data-bind="upload.quality" value="${esc(u.quality)}" inputmode="decimal" placeholder="e.g. 4.2" autocomplete="off" aria-describedby="q-hint" ${err.quality ? 'aria-invalid="true"' : ''}><span class="affix">/ 5</span></div>
              ${fieldError(err.quality)}<p class="field-hint" id="q-hint">Score from your local quality check</p></div>
          </div>
          <div class="auto-note">${ic('info', 16)}<span>Runs at level and the upload date are filled in automatically.</span></div>
        </section>
        <div class="form-footer"><button type="submit" class="btn btn-primary">Review run</button></div>
      </div>
      <aside class="card recorded-card" aria-labelledby="rec-title">
        <div><h2 class="card-title" id="rec-title">What gets recorded</h2><p class="card-sub">These fill the columns in every test run table</p></div>
        <dl class="recorded-list">${recorded.map(([k, v]) => `<div><dt>${k}</dt><dd class="${v === 'Automatic' ? 'muted' : ''}">${v}</dd></div>`).join('')}</dl>
      </aside>
    </form>`;
  }

  function uploadReview(u) {
    const f = fidelityValue(u);
    const q = qualityValue(u);
    const stars = Math.round(q);
    return uploadHeader('Review &amp; upload') + `<div class="checks-body">
      <div class="col">
        ${videoBlock('up-video', uploadVideoName(u))}
        <section class="card result-card" aria-labelledby="ri-title">
          <h2 class="card-title" id="ri-title">Run info</h2>
          <dl class="info-grid info-grid-auto">
            <dt>Skill(s)</dt><dd class="tag-row">${u.skills.map(s => tag(s, 'grey')).join('')}</dd><dd></dd>
            <dt>Level</dt><dd>${levelTag(u.level)}</dd><dd></dd>
            <dt>Token cost</dt><dd>${tokensLabel(u)} tokens</dd><dd></dd>
            <dt>Runs at level</dt><dd>xx</dd><dd class="auto">Automatic</dd>
            <dt>Uploaded</dt><dd>Today</dd><dd class="auto">Automatic</dd>
          </dl>
          <div class="divider"></div>
          <p class="muted" style="font-weight:500">Original prompt</p>
          <div class="prompt-box">${u.prompt ? esc(u.prompt) : '<span class="muted">No prompt added</span>'}</div>
        </section>
      </div>
      <div class="col">
        <div class="section-head"><h2 class="card-title">Benchmark results</h2><span class="spacer"></span>${tag('From local testing', 'grey')}</div>
        <div class="bench-cards">
          <section class="card bench-card" aria-labelledby="bc-complete">
            <div class="bench-head"><span class="bench-icon">${ic('target', 18)}</span><h3 id="bc-complete">Complete</h3><span class="spacer"></span>${passTag(u.complete)}</div>
            <p class="desc">${u.complete === 'Pass' ? 'The run did everything the prompt asked.' : 'The run missed part of what the prompt asked.'}</p>
          </section>
          <section class="card bench-card" aria-labelledby="bc-editable">
            <div class="bench-head"><span class="bench-icon">${ic('layers', 18)}</span><h3 id="bc-editable">Editable</h3><span class="spacer"></span>${passTag(u.editable)}</div>
            <p class="desc">${u.editable === 'Yes' ? 'Text, timing and layers are adjustable in After Effects.' : 'Text, timing or layers are not adjustable in After Effects.'}</p>
          </section>
          <section class="card bench-card" aria-labelledby="bc-fidelity">
            <div class="bench-head"><span class="bench-icon">${ic('eye', 18)}</span><h3 id="bc-fidelity">Fidelity</h3></div>
            <p class="bench-value">${f}%</p>
            <p class="desc">Share of requested properties visible in the render.</p>
            <div class="meter" role="img" aria-label="Fidelity ${f}%"><span style="width:${Math.min(100, Math.max(0, f))}%"></span></div>
          </section>
          <section class="card bench-card" aria-labelledby="bc-quality">
            <div class="bench-head"><span class="bench-icon">${ic('starOutline', 18)}</span><h3 id="bc-quality">Quality</h3></div>
            <p class="bench-value">${q} / 5</p>
            <p class="desc">Score from your local quality check.</p>
            <span class="stars" role="img" aria-label="${stars} of 5 stars">${Array.from({ length: 5 }, (_, i) => ic(i < stars ? 'star' : 'starOutline', 18)).join('')}</span>
          </section>
        </div>
        <div class="actions-right">
          <button type="button" class="btn btn-secondary" data-action="up-goto" data-value="1">Back to edit</button>
          <button type="button" class="btn btn-primary" data-action="up-save">Upload run</button>
        </div>
      </div></div>`;
  }

  /* --------------------------------------------------------------- modals */

  function runModal(r, context) {
    const archive = context === 'archive';
    return `<div class="scrim" data-action="scrim">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1" id="modal">
        <div class="modal-player">
          ${videoBlock('m-' + r.id, r.file, { cls: '' })}
          ${playerBar('m-' + r.id, true)}
          <div class="modal-notes">
            <p class="k">What you liked</p><p class="v">${esc(r.liked || '—')}</p>
            <p class="k">What to change</p><p class="v">${esc(r.change || '—')}</p>
          </div>
        </div>
        <div class="modal-meta">
          <div class="modal-title-row"><h2 class="modal-title" id="modal-title">${esc(r.file)}</h2>
            <button type="button" class="close-btn" data-action="close-modal" aria-label="Close">${ic('x', 20)}</button></div>
          <p class="muted">Uploaded ${fmtLong(r.date)} · ${esc(r.time)}</p>
          <dl class="meta-grid">
            <dt>Skills</dt><dd>${r.skills.map(s => tag(s, 'grey')).join('')}</dd>
            <dt>Level</dt><dd>${levelTag(r.level)}</dd>
            <dt>Version</dt><dd>v${r.version}${r.best ? bestTag() : ''}</dd>
            <dt>Token cost</dt><dd>${esc(r.tokens)}${archive ? ' tokens · ' + esc(r.cost) : ''}</dd>
          </dl>
          <p class="label-xs">Original prompt</p>
          <div class="prompt-scroll-wrap"><div class="prompt-scroll" tabindex="0" aria-label="Original prompt">${esc(r.prompt || 'No prompt recorded')}</div></div>
          <p class="label-xs">Benchmark results</p>
          <div class="bench-grid">
            <div class="bench"><p class="k">Completion</p><p class="v">${esc(r.complete)}</p></div>
            <div class="bench"><p class="k">Fidelity</p><p class="v">${esc(r.fidelity)}</p></div>
            <div class="bench"><p class="k">Editability</p><p class="v">${r.editable === 'Yes' ? 'Pass' : r.editable === 'No' ? 'Fail' : esc(r.editable)}</p></div>
            <div class="bench"><p class="k">Quality</p><p class="v">${esc(r.quality)}</p></div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" data-action="download" data-id="${r.id}">Download</button>
            ${archive
              ? `<button type="button" class="btn btn-danger-outline" data-action="delete-run" data-id="${r.id}">${ic('trash', 16)} Delete</button>`
              : `<a class="btn btn-primary" href="#/archive/${r.id}">Open in archive</a>`}
          </div>
        </div>
      </div></div>`;
  }

  function confirmDialog(c) {
    return `<div class="scrim" style="z-index:60;background:rgba(10,13,59,.35)" data-action="confirm-cancel">
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body" tabindex="-1" id="confirm">
        <span class="dialog-icon">${ic(c.icon || 'trash', 22)}</span>
        <h2 class="dialog-title" id="confirm-title">${esc(c.title)}</h2>
        <p class="dialog-body" id="confirm-body">${esc(c.body)}</p>
        <div class="dialog-actions"><button type="button" class="btn btn-secondary" data-action="confirm-cancel">Cancel</button>
          <button type="button" class="btn btn-danger" data-action="confirm-ok">${esc(c.ok)}</button></div>
      </div></div>`;
  }

  /* --------------------------------------------------------------- render */

  const VIEWS = { overview: viewOverview, runs: viewRuns, upload: viewUpload, skills: viewSkills, archive: viewArchive, deleted: viewDeleted };
  const TITLES = { overview: 'Overview', runs: 'All runs', upload: 'Upload test run', skills: 'Evaluating skills', archive: 'Video archive', deleted: 'Recently deleted' };
  const NAV_FOR = { overview: 'overview', runs: 'overview', upload: 'upload', skills: 'skills', archive: 'archive', deleted: 'archive' };

  let lastFocusBeforeModal = null;

  function render() {
    const { page } = state.route;
    const active = document.activeElement;
    const focusId = active && active.id;
    const sel = active && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
    const view = $('#view');
    view.innerHTML = VIEWS[page]();
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el && el !== document.activeElement && view.contains(el)) {
        el.focus({ preventScroll: true });
        if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not a text field */ }
      }
    }
    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.dataset.nav === NAV_FOR[page]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('#app').classList.toggle('no-sidebar', page === 'runs');
    renderModal();
  }

  function renderModal() {
    const root = $('#modal-root');
    const { page, id } = state.route;
    const run = id && findRun(id);
    let html = '';
    if (run && !(page === 'archive' && run.deleted)) html += runModal(run, page === 'archive' ? 'archive' : 'run');
    if (state.confirm) html += confirmDialog(state.confirm);
    const wasOpen = !root.hidden;
    const prevKey = root.dataset.key || '';
    const key = (run ? run.id : '') + '|' + (state.confirm ? 'c' : '');
    if (!html) {
      if (wasOpen) { root.hidden = true; root.innerHTML = ''; root.dataset.key = ''; document.body.style.overflow = ''; if (lastFocusBeforeModal && document.contains(lastFocusBeforeModal)) lastFocusBeforeModal.focus(); lastFocusBeforeModal = null; }
      return;
    }
    if (!wasOpen) lastFocusBeforeModal = document.activeElement;
    if (prevKey !== key || !wasOpen) {
      root.innerHTML = html; root.hidden = false; root.dataset.key = key; document.body.style.overflow = 'hidden';
      const target = state.confirm ? $('#confirm [data-action="confirm-cancel"]') : $('#modal');
      if (target) target.focus();
    }
  }

  /* --------------------------------------------------------------- router */

  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const page = VIEWS[parts[0]] ? parts[0] : 'overview';
    return { page, id: parts[1] || null };
  }
  let lastHash = null;
  function onRoute() {
    if (location.hash === lastHash) return;
    lastHash = location.hash;
    const prev = state.route;
    state.route = parseRoute();
    state.openMenu = null;
    if (prev.page !== state.route.page) {
      if (state.route.page !== 'skills') state.skillsEdit = null;
      render();
      if (!state.route.id) { window.scrollTo(0, 0); $('#view').focus({ preventScroll: true }); }
    } else {
      render();
    }
    document.title = (state.route.id && findRun(state.route.id) ? findRun(state.route.id).file + ' · ' : '') + TITLES[state.route.page] + ' · Aspect';
  }
  // Navigate and render right away; the hashchange event that follows is ignored.
  const go = hash => { if (location.hash !== hash) location.hash = hash; lastHash = null; onRoute(); };
  const closeModal = () => go('#/' + state.route.page);

  /* -------------------------------------------------------------- actions */

  function setPath(path, value) {
    const [scope, key] = path.split('.');
    state[scope][key] = value;
    if ('page' in state[scope] && key !== 'page') state[scope].page = 1;
  }

  function askConfirm(c) { state.confirm = c; renderModal(); }

  function deleteRun(r) {
    r.deleted = true; r.daysLeft = 30;
    toast(`Moved ${r.file} to Recently deleted`, { label: 'Undo', fn: () => { r.deleted = false; r.daysLeft = null; render(); } });
  }

  function exportCsv() {
    const rows = filteredRuns();
    const head = ['skill', 'version', 'level', 'runs_at_level', 'completion', 'fidelity', 'editable', 'quality', 'best', 'token_cost', 'uploaded', 'file'];
    const q = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    const csv = [head.join(',')].concat(rows.map(r => [skillLabel(r), 'v' + r.version, r.level, r.runsAtLevel, r.complete, r.fidelity, r.editable, r.quality, r.best ? 'yes' : 'no', r.tokens, r.date + ' ' + r.time, r.file].map(q).join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'aspect-runs.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${rows.length} run${rows.length === 1 ? '' : 's'} as CSV`);
  }

  function saveSkills() {
    const rows = state.skillsEdit.rows;
    const names = rows.filter(r => !r.removed).map(r => r.name.trim()).filter(Boolean);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) { toast(`Two skills are named “${dup}”. Rename one before saving.`); return; }
    let moved = 0;
    rows.forEach(row => {
      if (!row.skill) return;
      if (row.removed) {
        state.runs.forEach(r => {
          if (!r.deleted && r.skills.length === 1 && r.skills[0] === row.orig) { r.deleted = true; r.daysLeft = 30; moved++; }
        });
        return;
      }
      const name = row.name.trim() || row.orig;
      if (name !== row.orig) state.runs.forEach(r => { r.skills = r.skills.map(s => s === row.orig ? name : s); });
      row.skill.name = name;
    });
    const kept = rows.filter(r => r.skill && !r.removed).map(r => r.skill);
    rows.filter(r => !r.skill && r.name.trim()).forEach((r, i) => kept.push({ id: 'n' + Date.now() + i, name: r.name.trim(), desc: '', tests: '0', levels: [], best: '—', cost: '—', last: '—' }));
    state.skills.splice(0, state.skills.length, ...kept);
    state.skillsEdit = null;
    render();
    toast('Skills saved' + (moved ? ` · ${moved} run${moved === 1 ? '' : 's'} moved to Recently deleted` : ''));
  }

  function reviewUpload() {
    const u = state.upload;
    u.errors = validateUpload(u);
    state.openMenu = null;
    const first = Object.keys(u.errors)[0];
    render();
    if (first) { const el = { skills: '#up-skill-q', fidelity: '#up-fidelity', quality: '#up-quality' }[first]; $(el) && $(el).focus(); return; }
    u.step = 2; render(); window.scrollTo(0, 0);
  }

  function saveUploadedRun() {
    const u = state.upload;
    const v = nextVersion(u);
    const run = {
      id: 'u' + Date.now(), file: u.video ? u.video.name : `${u.skills.join('-')}_v${v}.mp4`, skills: u.skills.slice(), version: v, level: u.level,
      runsAtLevel: 'xx', complete: u.complete, fidelity: fidelityValue(u) + '%', editable: u.editable, quality: qualityValue(u) + ' / 5', best: false,
      tokens: tokensLabel(u), cost: '$x.xx', duration: '0:06', date: todayIso(), time: nowTime(), prompt: u.prompt,
      liked: '', change: '', deleted: false, daysLeft: null
    };
    state.runs.unshift(run);
    run.skills.forEach(name => {
      const s = state.skills.find(x => x.name === name);
      if (s) { s.last = 'just now'; if (!s.levels.includes(u.level)) s.levels.push(u.level); }
    });
    state.upload = freshUpload();
    go('#/overview');
    toast('Run uploaded', { label: 'View', fn: () => go('#/overview/' + run.id) });
  }

  function handleAction(el, e) {
    const a = el.dataset.action;
    const val = el.dataset.value;
    const u = state.upload;
    switch (a) {
      case 'range': state.overview.range = val; render(); break;
      case 'toggle-menu': {
        const key = el.dataset.key;
        state.openMenu = state.openMenu === key ? null : key;
        render();
        if (state.openMenu) {
          const search = document.querySelector('.menu .menu-search input');
          const first = document.querySelector('.menu .menu-item');
          if (key === 'up-skills') $('#up-skill-q').focus(); else (search || first) && (search || first).focus();
        }
        break;
      }
      case 'set': {
        setPath(el.dataset.path, val);
        if (!('keepOpen' in el.dataset)) { const key = state.openMenu; state.openMenu = null; render(); const b = document.getElementById('dd-' + key); b && b.focus(); }
        else render();
        break;
      }
      case 'toggle-skill-filter': {
        const v = state[el.dataset.scope];
        v.skills = v.skills.includes(val) ? v.skills.filter(s => s !== val) : v.skills.concat(val);
        if ('page' in v) v.page = 1;
        render(); break;
      }
      case 'clear-skill-filter': state[el.dataset.scope].skills = []; render(); break;
      case 'toggle-best': state[el.dataset.scope].bestOnly = !state[el.dataset.scope].bestOnly; state[el.dataset.scope].page = 1; render(); break;
      case 'clear-filters': {
        const v = state[el.dataset.scope];
        Object.assign(v, { q: '', skills: [], level: 'All', bestOnly: false, skillSearch: '' });
        if ('page' in v) v.page = 1;
        render(); break;
      }
      case 'page': state[el.dataset.scope].page = Number(val); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'export-csv': exportCsv(); break;
      case 'open-run':
        if (e.target.closest('a')) return; // the link inside the row handles navigation
        go('#/' + state.route.page + '/' + el.dataset.id); break;
      case 'scrim': if (e.target === el) closeModal(); break;
      case 'close-modal': closeModal(); break;
      case 'play': togglePlayer(el.dataset.id); break;
      case 'download': toast('Sample run: there is no video file to download yet.'); break;
      case 'delete-run': {
        const r = findRun(el.dataset.id);
        askConfirm({ title: 'Delete this test run?', body: 'If not restored within 30 days, this run will be permanently deleted along with its benchmark results and feedback.', ok: 'Delete',
          fn: () => { deleteRun(r); state.confirm = null; go('#/archive'); } });
        break;
      }
      case 'restore': {
        const r = findRun(el.dataset.id); r.deleted = false; r.daysLeft = null; render();
        toast(`Restored ${r.file} to the archive`, { label: 'View', fn: () => go('#/archive/' + r.id) });
        break;
      }
      case 'delete-forever': {
        const r = findRun(el.dataset.id);
        askConfirm({ title: 'Delete forever?', body: `${r.file} and its benchmark results and feedback will be removed now. This can't be undone.`, ok: 'Delete forever',
          fn: () => { state.runs.splice(state.runs.indexOf(r), 1); state.confirm = null; render(); toast(`${r.file} deleted permanently`); } });
        break;
      }
      case 'delete-all': {
        const n = deletedRuns().length;
        askConfirm({ title: `Delete all ${n} videos?`, body: "Every video in Recently deleted will be removed now, along with its benchmark results and feedback. This can't be undone.", ok: 'Delete all',
          fn: () => { state.runs = state.runs.filter(r => !r.deleted); state.confirm = null; render(); toast(`${n} videos deleted permanently`); } });
        break;
      }
      case 'confirm-cancel': if (e.target === el || el.tagName === 'BUTTON') { state.confirm = null; renderModal(); } break;
      case 'confirm-ok': { const fn = state.confirm.fn; fn(); renderModal(); break; }

      case 'edit-skills':
        state.skillsEdit = { rows: state.skills.map(s => ({ skill: s, name: s.name, orig: s.name, removed: false })) };
        render(); { const f = $('#skill-name-0'); f && f.focus(); } break;
      case 'cancel-edit': state.skillsEdit = null; render(); break;
      case 'save-skills': saveSkills(); break;
      case 'remove-skill': {
        const i = Number(el.dataset.index); const row = state.skillsEdit.rows[i];
        if (!row.skill) state.skillsEdit.rows.splice(i, 1); else row.removed = true;
        render(); break;
      }
      case 'undo-remove': state.skillsEdit.rows[Number(el.dataset.index)].removed = false; render(); break;
      case 'add-skill': {
        state.skillsEdit.rows.push({ skill: null, name: '', orig: '', removed: false });
        render(); const f = $('#skill-name-' + (state.skillsEdit.rows.length - 1)); f && f.focus(); break;
      }

      case 'focus-skill-input':
        if (e.target === el) { $('#up-skill-q').focus(); if (state.openMenu !== 'up-skills') { state.openMenu = 'up-skills'; render(); } }
        break;
      case 'up-toggle-skill':
        u.skills = u.skills.includes(val) ? u.skills.filter(s => s !== val) : u.skills.concat(val);
        u.skillQuery = ''; render(); $('#up-skill-q').focus(); break;
      case 'up-remove-skill': u.skills = u.skills.filter(s => s !== val); render(); $('#up-skill-q').focus(); break;
      case 'up-add-skill': {
        const q = u.skillQuery.trim().toLowerCase().replace(/\s+/g, '-');
        if (!q) { toast('Type a skill name in the field, then add it.'); $('#up-skill-q').focus(); break; }
        if (!u.skills.includes(q)) u.skills.push(q);
        u.skillQuery = ''; render(); $('#up-skill-q').focus(); break;
      }
      case 'up-level': u.level = val; render(); break;
      case 'up-browse': $('#file-video').click(); break;
      case 'up-complete': u.complete = val; render(); break;
      case 'up-editable': u.editable = val; render(); break;
      case 'up-cancel': {
        const dirty = u.step > 1 || u.skills.length || u.prompt || u.video || u.tokens || u.fidelity || u.quality;
        const reset = () => { state.upload = freshUpload(); state.confirm = null; go('#/overview'); };
        if (!dirty) reset();
        else askConfirm({ title: 'Discard this test run?', body: "The run details, video and benchmark results you've entered won't be saved.", ok: 'Discard', icon: 'x', fn: reset });
        break;
      }
      case 'up-goto': u.step = Number(val); render(); window.scrollTo(0, 0); break;
      case 'up-save': saveUploadedRun(); break;
      default: break;
    }
  }

  /* --------------------------------------------------------------- events */

  document.addEventListener('click', e => {
    if (state.openMenu && !e.target.closest('.dd-wrap')) { state.openMenu = null; render(); }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.closest('.is-dimmed')) return;
    handleAction(el, e);
  });

  document.addEventListener('submit', e => {
    if (e.target.id === 'upload-form') { e.preventDefault(); reviewUpload(); }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.bind) {
      const [scope, key] = el.dataset.bind.split('.');
      state[scope][key] = el.value;
      if (scope === 'upload' && state.upload.errors[key]) { delete state.upload.errors[key]; el.classList.remove('is-invalid'); }
      if ('page' in state[scope] && key === 'q') state[scope].page = 1;
      if (el.dataset.bind === 'upload.skillQuery') state.openMenu = 'up-skills';
      if ('live' in el.dataset) render();
    } else if (el.dataset.bindSkill != null) {
      state.skillsEdit.rows[Number(el.dataset.bindSkill)].name = el.value;
    }
  });

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (e.key === 'Escape') {
      if (state.confirm) { state.confirm = null; renderModal(); }
      else if (state.openMenu) { const key = state.openMenu; state.openMenu = null; render(); const b = document.getElementById('dd-' + key) || $('#up-skill-q'); b && b.focus(); }
      else if (state.route.id) closeModal();
      return;
    }
    if (t.id === 'up-skill-q') {
      const u = state.upload;
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = u.skillQuery.trim();
        if (!q) return;
        const match = allSkillNames().find(n => n.toLowerCase() === q.toLowerCase());
        const name = match || q.toLowerCase().replace(/\s+/g, '-');
        if (!u.skills.includes(name)) u.skills.push(name);
        u.skillQuery = ''; render();
      } else if (e.key === 'Backspace' && !t.value && u.skills.length) {
        u.skills.pop(); render();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); state.openMenu = 'up-skills'; render(); const f = document.querySelector('.ms-menu .menu-item'); f && f.focus();
      }
      return;
    }
    if (t.id === 'dropzone' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#file-video').click(); return; }
    // Arrow navigation within open menus
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && t.closest && t.closest('.menu')) {
      e.preventDefault();
      const items = Array.from(t.closest('.menu').querySelectorAll('.menu-item, input'));
      const i = items.indexOf(t);
      const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      next && next.focus();
    }
    // Keep focus inside an open dialog
    if (e.key === 'Tab' && !$('#modal-root').hidden) {
      const scope = $('#confirm') || $('#modal');
      if (!scope) return;
      const f = Array.from(scope.querySelectorAll('button, a[href], input, textarea, [tabindex]:not([tabindex="-1"])')).filter(x => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === scope)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  document.addEventListener('focusin', e => {
    if (e.target.id === 'up-skill-q' && state.openMenu !== 'up-skills') { state.openMenu = 'up-skills'; render(); }
  });

  // File inputs and drag & drop for the upload step
  function setVideo(file) {
    if (!file) return;
    if (!/\.(mp4|mov)$/i.test(file.name) && !/^video\/(mp4|quicktime)$/.test(file.type)) { toast('Upload an MP4 or MOV file.'); return; }
    state.upload.video = { name: file.name, size: file.size }; render();
  }
  $('#file-video').addEventListener('change', e => { setVideo(e.target.files[0]); e.target.value = ''; });
  document.addEventListener('dragover', e => {
    const dz = e.target.closest && e.target.closest('#dropzone');
    if (dz) { e.preventDefault(); dz.classList.add('is-drag'); }
  });
  document.addEventListener('dragleave', e => {
    const dz = e.target.closest && e.target.closest('#dropzone');
    if (dz && !dz.contains(e.relatedTarget)) dz.classList.remove('is-drag');
  });
  document.addEventListener('drop', e => {
    const dz = e.target.closest && e.target.closest('#dropzone');
    if (!dz) return;
    e.preventDefault(); dz.classList.remove('is-drag');
    setVideo(e.dataTransfer.files[0]);
  });

  window.addEventListener('hashchange', onRoute);
  if (!location.hash) history.replaceState(null, '', '#/overview');
  onRoute();
})();
