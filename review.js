/* Analyst console for vetting dossiers.
   Access is enforced by Supabase row-level security (vetting_reviewers) and the
   approval gate by the vetting_guard trigger. This UI mirrors those rules so
   reviewers see why an action is locked, but it is not what enforces them. */
(function () {
  'use strict';
  var SB_URL = 'https://stpkhpxhqzgruorrupaw.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cGtocHhocXpncnVvcnJ1cGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDMxNjYsImV4cCI6MjA5NDY3OTE2Nn0.1TjVRSpoNGTk6cs4cR2CA3vxAD3aLTTkNZW0IYgkkws';
  var sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: 'cnssp-vetting-auth', autoRefreshToken: true } });

  var KIND = { supplier: 'Supplier', buyer: 'GPU buyer', compute: 'Compute' };
  var STATUS = { new: 'New', in_review: 'In review', info_requested: 'Info requested', on_hold: 'On hold', awaiting_second: 'Awaiting 2nd approval', approved: 'Approved', conditional: 'Conditional', declined: 'Declined' };
  var OPEN = ['new', 'in_review', 'info_requested', 'on_hold', 'awaiting_second'];
  var GCOL = { A: '#6FCF97', B: '#A8D17A', C: '#E8B95A', D: '#F0905A', F: '#F07A6A' };
  var me = { email: '', role: '', name: '' }, rows = [], cur = null, filt = { tab: 'open', kind: '', q: '' };
  var app = document.getElementById('app'), who = document.getElementById('who');

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var dt = function (s) { if (!s) return ''; var d = new Date(s); return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  var ago = function (s) { var m = (Date.now() - new Date(s)) / 60000; return m < 60 ? Math.round(m) + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
  var isApprover = function () { return me.role === 'approver' || me.role === 'admin'; };

  // ---------- auth ----------
  function gate(msg) {
    who.innerHTML = '';
    app.innerHTML = '<div class="gate"><form id="lf" autocomplete="on"><div class="kick" style="color:var(--gold-lt)">Restricted · Review desk</div><h1>Analyst sign-in</h1><p>Authorised reviewers only. Every action is recorded against your name.</p>' +
      '<label>Email<input type="email" name="email" autocomplete="username" required></label><label>Password<input type="password" name="password" autocomplete="current-password" required></label>' +
      '<button class="btn btn-gold" type="submit">Sign in <span class="arr">→</span></button><div class="err" id="lerr">' + esc(msg || '') + '</div></form></div>';
    document.getElementById('lf').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, err = document.getElementById('lerr'); err.textContent = 'Signing in…';
      sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value }).then(function (r) {
        if (r.error) { err.textContent = r.error.message; return; }
        start();
      });
    });
  }
  function start() {
    sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) return gate();
      me.email = (s.user.email || '').toLowerCase();
      sb.from('vetting_reviewers').select('email,name,role').eq('email', me.email).maybeSingle().then(function (x) {
        if (!x.data) { sb.auth.signOut(); return gate('This account is not on the vetting reviewer list. Ask an admin to add you.'); }
        me.role = x.data.role; me.name = x.data.name || me.email;
        who.innerHTML = '<span><b>' + esc(me.name) + '</b></span><span class="role">' + esc(me.role) + '</span><button class="lnk" id="so">Sign out</button>';
        document.getElementById('so').onclick = function () { sb.auth.signOut().then(function () { gate(); }); };
        shell(); load();
      });
    });
  }

  // ---------- queue ----------
  function shell() {
    app.innerHTML = '<div class="cgrid"><aside class="queue"><div class="kpis" id="kpis"></div><div class="qtools"><input id="qq" type="search" placeholder="Search entity, reference, email…"><div style="display:flex;gap:8px"><select id="qk"><option value="">All dossier types</option><option value="supplier">Suppliers</option><option value="buyer">GPU buyers</option><option value="compute">Compute</option></select></div>' +
      '<div class="tabs" id="tabs">' + [['open', 'Open'], ['awaiting_second', '2nd approval'], ['approved', 'Approved'], ['conditional', 'Conditional'], ['declined', 'Declined'], ['all', 'All']].map(function (t) { return '<button data-tab="' + t[0] + '"' + (filt.tab === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div></div><div class="qlist" id="ql"></div></aside><section class="pane" id="pane"><div class="blank">Select a dossier</div></section></div>';
    document.getElementById('qq').oninput = function (e) { filt.q = e.target.value.toLowerCase(); list(); };
    document.getElementById('qk').onchange = function (e) { filt.kind = e.target.value; list(); };
    document.getElementById('tabs').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; filt.tab = b.dataset.tab; [].forEach.call(this.children, function (c) { c.classList.toggle('on', c === b); }); list(); };
    document.getElementById('ql').onclick = function (e) { var b = e.target.closest('[data-ref]'); if (b) location.hash = b.dataset.ref; };
  }
  function load() {
    sb.from('vetting_submissions').select('id,ref,kind,created_at,entity_name,contact_name,country,grade,score,status,blockers,clearances,assigned_to,decision_at,approval_expires').order('created_at', { ascending: false }).limit(1000).then(function (r) {
      if (r.error) { document.getElementById('ql').innerHTML = '<div class="qempty">Could not load dossiers: ' + esc(r.error.message) + '</div>'; return; }
      rows = r.data || []; kpis(); list(); route();
    });
  }
  function kpis() {
    var open = rows.filter(function (r) { return OPEN.indexOf(r.status) >= 0; });
    var second = rows.filter(function (r) { return r.status === 'awaiting_second'; }).length;
    var blk = open.filter(function (r) { return openBlockers(r).length; }).length;
    var due = rows.filter(function (r) { return r.approval_expires && new Date(r.approval_expires) < new Date(Date.now() + 30 * 864e5) && (r.status === 'approved' || r.status === 'conditional'); }).length;
    document.getElementById('kpis').innerHTML = '<div><b>' + open.length + '</b><span>Open</span></div><div><b>' + second + '</b><span>2nd approval</span></div><div><b>' + blk + '</b><span>With blockers</span></div><div><b>' + due + '</b><span>Re-vet ≤30d</span></div>';
  }
  function openBlockers(r) { var c = r.clearances || {}; return (r.blockers || []).filter(function (b) { return !c[b.code] || (c[b.code].note || '').length < 15; }); }
  function list() {
    var out = rows.filter(function (r) {
      if (filt.kind && r.kind !== filt.kind) return false;
      if (filt.tab === 'open' && OPEN.indexOf(r.status) < 0) return false;
      if (['open', 'all'].indexOf(filt.tab) < 0 && r.status !== filt.tab) return false;
      if (filt.q && (r.entity_name + ' ' + r.ref + ' ' + r.contact_name + ' ' + (r.country || '')).toLowerCase().indexOf(filt.q) < 0) return false;
      return true;
    });
    document.getElementById('ql').innerHTML = out.length ? out.map(function (r) {
      var ob = openBlockers(r).length;
      return '<button class="qi' + (cur && cur.ref === r.ref ? ' on' : '') + '" data-ref="' + esc(r.ref) + '"><span class="gchip g' + r.grade + '">' + r.grade + '</span><span style="min-width:0"><div class="nm">' + esc(r.entity_name) + '</div><div class="sb">' + esc(KIND[r.kind]) + ' · ' + esc(r.ref) + (ob ? ' · <span style="color:#F07A6A">' + ob + ' blocker' + (ob > 1 ? 's' : '') + '</span>' : '') + '</div></span><span class="rt"><span class="st st-' + r.status + '">' + esc(STATUS[r.status]) + '</span><div style="margin-top:6px">' + ago(r.created_at) + ' · ' + r.score + '</div></span></button>';
    }).join('') : '<div class="qempty">No dossiers match.</div>';
  }
  function route() { var ref = decodeURIComponent(location.hash.slice(1)); if (ref) open(ref); }
  window.addEventListener('hashchange', route);

  // ---------- dossier ----------
  function open(ref) {
    sb.from('vetting_submissions').select('*').eq('ref', ref).maybeSingle().then(function (r) {
      if (!r.data) { document.getElementById('pane').innerHTML = '<div class="blank">Dossier ' + esc(ref) + ' not found</div>'; return; }
      cur = r.data; list(); render();
    });
  }
  function gates(d) {
    var ob = openBlockers(d), req = (d.checklist || []).filter(function (c) { return c.req; });
    var done = req.filter(function (c) { return d.verifications && d.verifications[c.id] && d.verifications[c.id].done; });
    var g = [
      { ok: !ob.length, t: ob.length ? ob.length + ' hard blocker(s) not cleared with evidence' : 'No open hard blockers' },
      { ok: done.length === req.length, t: done.length + ' of ' + req.length + ' required verifications completed' },
      { ok: d.score >= 55, na: d.score >= 40 && d.score < 55, t: d.score >= 55 ? 'Score ' + d.score + ' meets the approval floor (55)' : d.score >= 40 ? 'Score ' + d.score + ': conditional approval only' : 'Score ' + d.score + ' is below the minimum (40): decline' },
      { ok: d.score >= 70 || (d.status === 'awaiting_second' && d.first_approver !== me.email), na: d.score < 70 && d.status !== 'awaiting_second', t: d.score >= 70 ? 'Single approver sufficient (grade A/B)' : d.status === 'awaiting_second' ? 'First approval by ' + d.first_approver + (d.first_approver === me.email ? ' (a different approver must finalise)' : '') : 'Score under 70: two different approvers required' },
      { ok: isApprover(), t: isApprover() ? 'You can approve (' + me.role + ')' : 'Your role (' + me.role + ') cannot approve' }
    ];
    return { list: g, blockersOk: !ob.length, checksOk: done.length === req.length };
  }
  function render() {
    var d = cur, G = gates(d), decided = ['approved', 'conditional', 'declined'].indexOf(d.status) >= 0;
    var schema = (window.VETTING_SCHEMAS || {})[d.kind];
    var col = GCOL[d.grade];
    var h = '';
    h += '<div class="dhead"><div class="dial" style="--c:' + col + ';--s:' + d.score + '"><div><b>' + d.grade + '</b><span>' + d.score + ' / 100</span></div></div>' +
      '<div style="min-width:0"><div class="kick" style="color:var(--gold-lt)">' + esc(KIND[d.kind]) + ' · ' + esc(d.ref) + ' · ' + esc(d.rules_version) + '</div><h1>' + esc(d.entity_name) + '</h1><div class="verdict">' + esc(d.verdict) + '</div>' +
      '<div class="sub">' + esc(d.contact_name) + ' · <a style="color:var(--gold-lt)" href="mailto:' + esc(d.contact_email) + '?subject=' + encodeURIComponent('Your dossier ' + d.ref) + '">' + esc(d.contact_email) + '</a>' + (d.contact_phone ? ' · ' + esc(d.contact_phone) : '') + '<br>Submitted ' + esc(dt(d.created_at)) + (d.country ? ' · ' + esc(d.country) : '') + (d.assigned_to ? ' · Assigned to ' + esc(d.assigned_to) : '') + (d.approval_expires ? ' · Re-vet by ' + esc(d.approval_expires) : '') + '</div></div>' +
      '<div class="acts"><span class="st st-' + d.status + '" style="font-size:11px;padding:5px 10px">' + esc(STATUS[d.status]) + '</span>' +
      (d.assigned_to !== me.email && !decided ? '<button class="btn btn-line btn-sm" data-act="claim">Assign to me</button>' : '') +
      '<button class="btn btn-line btn-sm" data-act="print">Print dossier</button></div></div>';

    h += '<div class="cards">';
    // Decision
    h += '<div class="card"><div class="card-h"><h2>Approval gates</h2><span>Enforced by the database</span></div><div class="card-b"><ul class="gates">' + G.list.map(function (g) { return '<li class="' + (g.ok ? 'ok' : g.na ? 'na' : 'no') + '"><i>' + (g.ok ? '✓' : g.na ? '–' : '✕') + '</i><span>' + esc(g.t) + '</span></li>'; }).join('') + '</ul>';
    if (decided) {
      h += '<div class="decide"><p style="margin:14px 0 0;font-size:14px"><b>' + esc(STATUS[d.status]) + '</b> by ' + esc(d.decision_by || '') + ' on ' + esc(dt(d.decision_at)) + '.</p>' + (d.conditions ? '<p style="font-size:14px;margin:6px 0 0"><b>Conditions:</b> ' + esc(d.conditions) + '</p>' : '') + (d.decision_note ? '<p style="font-size:14px;margin:6px 0 0"><b>Reason:</b> ' + esc(d.decision_note) + '</p>' : '') +
        (me.role === 'admin' ? '<div class="row"><button class="btn btn-ghost btn-sm" data-act="reopen">Reopen file</button></div>' : '') + '<div class="cmsg" id="cmsg"></div></div>';
    } else {
      var canFull = isApprover() && G.blockersOk && G.checksOk && d.score >= 55;
      var approveLabel = d.score >= 70 ? 'Approve' : d.status === 'awaiting_second' ? 'Final approval (2nd approver)' : 'Submit for 2nd approval';
      var secondBlocked = d.score < 70 && d.status === 'awaiting_second' && d.first_approver === me.email;
      h += '<div class="decide"><label>Reason / decision note<textarea id="dnote" placeholder="Required to decline, hold or request information. Recorded in the audit log.">' + esc(d.decision_note || '') + '</textarea></label>' +
        '<label>Conditions (for conditional approval)<textarea id="dcond" placeholder="e.g. Escrow only. First order capped at 10% of allocation. Re-review after delivery.">' + esc(d.conditions || '') + '</textarea></label><div class="row">' +
        (d.status === 'new' ? '<button class="btn btn-navy btn-sm" data-act="review">Start review</button>' : '') +
        '<button class="btn btn-ok btn-sm" data-act="approve"' + (canFull && !secondBlocked ? '' : ' disabled') + '>' + approveLabel + '</button>' +
        '<button class="btn btn-warn btn-sm" data-act="conditional"' + (isApprover() && G.blockersOk && d.score >= 40 ? '' : ' disabled') + '>Approve with conditions</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="info">Request information</button><button class="btn btn-ghost btn-sm" data-act="hold">Hold</button>' +
        '<button class="btn btn-bad btn-sm" data-act="decline">Decline</button></div><div class="cmsg" id="cmsg"></div></div>';
    }
    h += '</div></div>';

    // Category bars
    h += '<div class="card"><div class="card-h"><h2>Risk profile</h2><span>' + (d.blockers || []).length + ' blockers · ' + (d.flags || []).length + ' findings</span></div><div class="card-b bars">' + (d.categories || []).map(function (c) {
      var p = c.pct, color = p >= 75 ? '#2F6B4F' : p >= 45 ? '#9A6A14' : '#A3392B';
      return '<div class="b"><div class="bl">' + esc(c.name) + '<span>' + c.earned + ' / ' + c.weight + '</span></div><div class="tr"><i style="width:' + p + '%;background:' + color + '"></i></div></div>';
    }).join('') + '</div></div>';

    // Blockers
    if ((d.blockers || []).length) {
      h += '<div class="card full alert"><div class="card-h"><h2>Hard blockers</h2><span>Each must be cleared with evidence before any approval</span></div><div class="card-b">' + d.blockers.map(function (b) {
        var c = (d.clearances || {})[b.code], ok = c && (c.note || '').length >= 15;
        return '<div class="blk' + (ok ? ' cleared' : '') + '"><p>' + (ok ? '✓ Cleared · ' : '■ ') + esc(b.text) + '</p>' + (ok ? '<div class="ev"><b>Evidence:</b> ' + esc(c.note) + ' <span style="font:500 11px var(--mono);color:var(--mute)">— ' + esc(c.by || '') + ' ' + esc(dt(c.at)) + '</span></div>' :
          (decided ? '' : '<textarea data-clear="' + esc(b.code) + '" placeholder="Evidence that clears this blocker: what you checked, the source, and the result (min. 15 characters)."></textarea><div style="margin-top:8px"><button class="btn btn-navy btn-sm" data-act="clear" data-code="' + esc(b.code) + '">Record clearance</button></div>')) + '</div>';
      }).join('') + '</div></div>';
    }

    // Findings
    h += '<div class="card"><div class="card-h"><h2>Findings</h2><span>By severity</span></div><div class="card-b">' + ((d.flags || []).length ? d.flags.map(function (f) { return '<div class="fl"><span class="sev sev-' + f.sev + '">' + esc(f.sev) + '</span><span>' + esc(f.text) + '</span></div>'; }).join('') : '<p style="font-size:14px;color:var(--mute)">No findings.</p>') + '</div></div>';

    // Checklist
    h += '<div class="card"><div class="card-h"><h2>Verification</h2><span>Completed by a reviewer</span></div><div class="card-b">' + (d.checklist || []).map(function (c) {
      var v = (d.verifications || {})[c.id] || {};
      return '<div class="ck"><input type="checkbox" data-ck="' + esc(c.id) + '"' + (v.done ? ' checked' : '') + (decided ? ' disabled' : '') + '><div>' + esc(c.text) + (c.req ? '<span class="rq">REQUIRED</span>' : '') +
        '<input type="text" data-cknote="' + esc(c.id) + '" value="' + esc(v.note || '') + '" placeholder="Source / result (e.g. CSL screened 10 Nov, no matches, PDF saved)"' + (decided ? ' disabled' : '') + '>' + (v.by ? '<div class="by">' + (v.done ? 'Done' : 'Updated') + ' by ' + esc(v.by) + ' · ' + esc(dt(v.at)) + '</div>' : '') + '</div></div>';
    }).join('') + '</div></div>';

    // Screening helpers
    var names = (d.screening && d.screening.names) || [];
    h += '<div class="card"><div class="card-h"><h2>Screening</h2><span>CSL: ' + esc((d.screening && d.screening.csl) || 'n/a') + '</span></div><div class="card-b"><p style="font-size:13.5px;margin:0">Screen every name below on the <a href="https://www.trade.gov/data-visualization/csl-search" target="_blank" rel="noopener">Consolidated Screening List</a>, <a href="https://sanctionssearch.ofac.treas.gov/" target="_blank" rel="noopener">OFAC</a>, the <a href="https://search-uk-sanctions-list.service.gov.uk/" target="_blank" rel="noopener">UK list</a> and the <a href="https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions" target="_blank" rel="noopener">EU list</a>. Click a name for an adverse-media search.</p><div class="names">' +
      names.map(function (n) { return '<a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent('"' + n + '" (fraud OR sanctions OR indictment OR lawsuit OR smuggling OR export)') + '">' + esc(n) + '</a>'; }).join('') + '</div>' +
      '<div style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-act="copynames">Copy all names</button></div>' + (d.ip ? '<p style="font:500 11px var(--mono);color:var(--mute);margin:12px 0 0">Submitted from IP ' + esc(d.ip) + ' · TZ ' + esc((d.meta || {}).tz || '?') + ' · ' + Math.round(((d.meta || {}).elapsed_ms || 0) / 60000) + ' min to complete</p>' : '') + '</div></div>';

    // Files
    h += '<div class="card"><div class="card-h"><h2>Documents</h2><span>Private bucket · links expire in 2 min</span></div><div class="card-b files" id="files"><p style="font-size:14px;color:var(--mute)">Loading…</p></div></div>';

    // Answers
    h += '<div class="card full"><div class="card-h"><h2>Full dossier</h2><span>As submitted · immutable</span></div><div class="card-b ans">' + answersHTML(schema, d.answers || {}) + '</div></div>';

    // Notes + audit
    h += '<div class="card"><div class="card-h"><h2>Notes</h2><span>Internal</span></div><div class="card-b"><div class="tl">' + ((d.notes || []).slice().reverse().map(function (n) { return '<div><span>' + esc(dt(n.at)) + '<br>' + esc(n.by) + '</span><span>' + esc(n.text) + '</span></div>'; }).join('') || '<p style="font-size:14px;color:var(--mute)">No notes yet.</p>') + '</div><div class="note-in"><input id="nin" placeholder="Add a note (call outcome, document received, etc.)" maxlength="1000"><button class="btn btn-navy btn-sm" data-act="note">Add</button></div></div></div>';
    h += '<div class="card"><div class="card-h"><h2>Audit trail</h2><span>Append-only</span></div><div class="card-b tl">' + (d.audit || []).slice().reverse().map(function (a) { return '<div><span>' + esc(dt(a.at)) + '<br>' + esc(a.by) + '</span><span><b>' + esc(a.action) + (a.to ? ': ' + esc(STATUS[a.from] || a.from) + ' → ' + esc(STATUS[a.to] || a.to) : '') + '</b>' + (a.note ? '<br>' + esc(a.note) : '') + '</span></div>'; }).join('') + '</div></div>';
    h += '</div>';
    var pane = document.getElementById('pane'); pane.innerHTML = h; pane.scrollTop = 0;
    loadFiles(d);
  }

  function answersHTML(schema, a) {
    if (!schema) return '<pre style="white-space:pre-wrap;font-size:12px">' + esc(JSON.stringify(a, null, 2)) + '</pre>';
    var vis = function (f, row) { try { return !f.show || f.show(row || a, a); } catch (e) { return true; } };
    var val = function (v) { if (v === true) return 'Yes (agreed)'; if (v === false || v == null || v === '') return '—'; return Array.isArray(v) ? v.join(', ') : String(v); };
    return schema.sections.map(function (s, i) {
      var rows = '';
      s.fields.forEach(function (f) {
        if (f.t === 'note' || f.t === 'sub' || !vis(f)) return;
        if (f.t === 'repeat') { (a[f.n] || []).forEach(function (r, j) { rows += '<dt>' + esc(f.item || f.l) + ' ' + (j + 1) + '</dt><dd>' + esc(f.fields.map(function (sf) { return sf.l + ': ' + val(r[sf.n]); }).join('\n')) + '</dd>'; }); if (!(a[f.n] || []).length) rows += '<dt>' + esc(f.l) + '</dt><dd>—</dd>'; return; }
        if (f.t === 'docs') { f.items.forEach(function (it) { rows += '<dt>' + esc(it.l) + '</dt><dd>' + esc(val((a[f.n] || {})[it.k])) + '</dd>'; }); return; }
        var flagged = f.t === 'screen' && a[f.n] === 'Yes';
        rows += '<dt>' + esc(f.l) + '</dt><dd' + (flagged ? ' class="yes"' : '') + '>' + esc(val(a[f.n])) + '</dd>';
      });
      return '<h3>' + String(i + 1).padStart(2, '0') + ' · ' + esc(s.title) + '</h3><dl>' + rows + '</dl>';
    }).join('');
  }
  function loadFiles(d) {
    var el = document.getElementById('files');
    sb.storage.from('vetting-docs').list(d.ref, { limit: 100 }).then(function (r) {
      if (!el) return;
      var items = (r.data || []).filter(function (x) { return x.id; });
      if (r.error) { el.innerHTML = '<p style="font-size:14px;color:var(--err)">' + esc(r.error.message) + '</p>'; return; }
      var declared = (d.files || []).length;
      el.innerHTML = items.length ? items.map(function (x) { return '<a href="#" data-file="' + esc(d.ref + '/' + x.name) + '">' + esc(x.name.replace(/^\d+-/, '')) + '<span>' + Math.round(((x.metadata || {}).size || 0) / 1024) + ' KB</span></a>'; }).join('') + (declared > items.length ? '<p style="font-size:13px;color:var(--warn)">' + (declared - items.length) + ' declared file(s) did not arrive.</p>' : '')
        : '<p style="font-size:14px;color:var(--mute)">' + (declared ? declared + ' file(s) declared but none received. Send the applicant a secure link.' : 'No files attached. Request the document package.') + '</p>';
    });
  }

  // ---------- actions ----------
  function msg(t, ok) { var m = document.getElementById('cmsg'); if (m) { m.className = 'cmsg ' + (ok ? 's' : 'e'); m.textContent = t; } }
  function save(patch, okText) {
    return sb.from('vetting_submissions').update(patch).eq('id', cur.id).select('*').single().then(function (r) {
      if (r.error) { msg(r.error.message.replace(/^.*?:\s*/, '') || r.error.message); return false; }
      cur = r.data;
      var i = rows.findIndex(function (x) { return x.id === cur.id; }); if (i >= 0) rows[i] = Object.assign(rows[i], cur);
      render(); kpis(); list(); if (okText) msg(okText, true);
      return true;
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act],[data-file]'); if (!b || !cur) return;
    if (b.dataset.file) { e.preventDefault(); sb.storage.from('vetting-docs').createSignedUrl(b.dataset.file, 120).then(function (r) { if (r.data) window.open(r.data.signedUrl, '_blank', 'noopener'); }); return; }
    var act = b.dataset.act, note = (document.getElementById('dnote') || {}).value || '', cond = (document.getElementById('dcond') || {}).value || '';
    if (act === 'print') return window.print();
    if (act === 'claim') return save({ assigned_to: me.email, status: cur.status === 'new' ? 'in_review' : cur.status }, 'Assigned to you.');
    if (act === 'review') return save({ status: 'in_review', assigned_to: cur.assigned_to || me.email }, 'Review started.');
    if (act === 'reopen') { if (confirm('Reopen this decided file? The original decision stays in the audit trail.')) save({ status: 'in_review' }, 'Reopened.'); return; }
    if (act === 'approve') {
      var to = cur.score >= 70 ? 'approved' : cur.status === 'awaiting_second' ? 'approved' : 'awaiting_second';
      if (!confirm(to === 'awaiting_second' ? 'Record your approval and send to a second approver?' : 'Approve ' + cur.entity_name + ' and release to the network?')) return;
      return save({ status: to, decision_note: note || null }, to === 'approved' ? 'Approved.' : 'Sent for second approval.');
    }
    if (act === 'conditional') { if (confirm('Approve with the conditions entered?')) save({ status: 'conditional', conditions: cond, decision_note: note || null }, 'Conditionally approved.'); return; }
    if (act === 'info') return save({ status: 'info_requested', decision_note: note }, 'Marked as information requested. Email the applicant with the specific questions.');
    if (act === 'hold') return save({ status: 'on_hold', decision_note: note }, 'On hold.');
    if (act === 'decline') { if (confirm('Decline ' + cur.entity_name + '? This is recorded permanently.')) save({ status: 'declined', decision_note: note }, 'Declined.'); return; }
    if (act === 'clear') {
      var ta = document.querySelector('[data-clear="' + b.dataset.code + '"]'), t = (ta && ta.value || '').trim();
      if (t.length < 15) return alert('Write the evidence that clears this blocker (at least 15 characters).');
      var c = Object.assign({}, cur.clearances || {}); c[b.dataset.code] = { note: t };
      return save({ clearances: c }, 'Clearance recorded.');
    }
    if (act === 'note') {
      var n = (document.getElementById('nin').value || '').trim(); if (!n) return;
      return save({ notes: (cur.notes || []).concat([{ at: new Date().toISOString(), by: me.email, text: n }]) });
    }
    if (act === 'copynames') { var names = ((cur.screening || {}).names || []).join('\n'); navigator.clipboard && navigator.clipboard.writeText(names); b.textContent = 'Copied'; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!cur) return;
    if (t.dataset.ck || t.dataset.cknote) {
      var id = t.dataset.ck || t.dataset.cknote;
      var box = document.querySelector('[data-ck="' + id + '"]'), nt = document.querySelector('[data-cknote="' + id + '"]');
      var v = Object.assign({}, cur.verifications || {}); v[id] = { done: !!box.checked, note: (nt.value || '').trim() };
      save({ verifications: v });
    }
  });

  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') gate(); });
  start();
})();
