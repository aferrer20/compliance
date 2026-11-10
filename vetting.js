/* ==========================================================================
   Vetting engine — renders a dossier schema, autosaves, validates, submits.

   Deliberately contains NO scoring or grading logic. Grades are computed
   server-side (Supabase function `vetting-intake`) so an applicant reading
   this source cannot learn which answers move their score.

   Schema field types:
     text email tel url number date area select country seg multi yesno
     screen (yes/no where "No" is the compliant answer)
     repeat (rows of sub-fields)  docs (status + optional upload per item)
     agree (checkbox)  sign (typed signature)  note  sub (subheading)
   Field props: n (name), l (label), hint, ph, req (bool | fn(v)),
     show (fn(v)), o (options), full (span both columns), min/max (repeat)
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    endpoint: 'https://stpkhpxhqzgruorrupaw.supabase.co/functions/v1/vetting-intake',
    // Fallback inbox if the intake function is unreachable. Raw answers only, never a grade.
    web3formsKey: '7f1ff338-3ebd-4053-8253-76e5e1a5f40e',
    contact: 'amanda@thechiefnegotiators.com',
    maxFiles: 12,
    maxFileMB: 15,
    fileTypes: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt'
  };

  var COUNTRIES = ['United States','Canada','Mexico','United Kingdom','Ireland','Germany','France','Netherlands','Belgium','Luxembourg','Switzerland','Austria','Italy','Spain','Portugal','Denmark','Sweden','Norway','Finland','Iceland','Poland','Czech Republic','Slovakia','Hungary','Romania','Bulgaria','Greece','Croatia','Slovenia','Serbia','Bosnia and Herzegovina','Montenegro','North Macedonia','Albania','Estonia','Latvia','Lithuania','Ukraine','Moldova','Malta','Cyprus','Turkey','Israel','Jordan','Lebanon','Egypt','Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Bahrain','Oman','Iraq','Iran','Syria','Yemen','Russia','Belarus','Georgia','Armenia','Azerbaijan','Kazakhstan','Uzbekistan','Kyrgyzstan','Tajikistan','Turkmenistan','Afghanistan','Pakistan','India','Bangladesh','Sri Lanka','Nepal','China','Hong Kong','Macau','Taiwan','Japan','South Korea','North Korea','Mongolia','Singapore','Malaysia','Indonesia','Thailand','Vietnam','Philippines','Cambodia','Laos','Myanmar (Burma)','Brunei','Australia','New Zealand','Brazil','Argentina','Chile','Colombia','Peru','Ecuador','Uruguay','Paraguay','Bolivia','Venezuela','Panama','Costa Rica','Guatemala','Honduras','El Salvador','Nicaragua','Dominican Republic','Puerto Rico','Jamaica','Bahamas','Barbados','Trinidad and Tobago','Haiti','Cuba','Cayman Islands','British Virgin Islands','Bermuda','South Africa','Nigeria','Kenya','Ghana','Morocco','Tunisia','Algeria','Libya','Ethiopia','Tanzania','Uganda','Rwanda','Senegal','Ivory Coast','Cameroon','Angola','Mozambique','Zambia','Zimbabwe','Botswana','Namibia','Mauritius','Sudan','South Sudan','Somalia','Eritrea','Central African Republic','Democratic Republic of the Congo','Republic of the Congo','Liechtenstein','Monaco','Andorra','San Marino','Gibraltar','Jersey','Guernsey','Isle of Man','Seychelles','Other'];

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return [].slice.call((el || document).querySelectorAll(sel)); };
  var empty = function (v) { return v == null || v === '' || v === false || (Array.isArray(v) && !v.length); };
  var opt = function (o) { return Array.isArray(o) ? { v: o[0], l: o[1] } : { v: o, l: o }; };

  function mount(schema) {
    var root = document.getElementById('dossier');
    var DRAFT = 'cnssp-vetting-' + schema.id + '-v' + schema.version;
    var state = { step: 0, v: {}, files: {}, started: Date.now(), sent: false };
    var qs = new URLSearchParams(location.search);

    // Restore a draft (files are never stored, only answers).
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
      if (d && d.v) { state.v = d.v; state.step = Math.min(d.step || 0, schema.sections.length - 1); state.started = d.started || state.started; }
    } catch (e) {}
    // Deep-link prefill from an outreach email: ?e=email&c=company&ref=quote
    (schema.prefill || []).forEach(function (p) { if (qs.get(p[0]) && empty(state.v[p[1]])) state.v[p[1]] = qs.get(p[0]).slice(0, 200); });

    var V = state.v;
    var visible = function (f, row) { try { return !f.show || !!f.show(row || V, V); } catch (e) { return true; } };
    var required = function (f, row) { if (!visible(f, row)) return false; return typeof f.req === 'function' ? !!f.req(row || V, V) : !!f.req; };

    // ---------- completeness ----------
    function missingIn(sec) {
      var out = [];
      sec.fields.forEach(function (f) {
        if (!visible(f)) return;
        if (f.t === 'repeat') {
          var rows = V[f.n] || [];
          if (required(f) && rows.length < (f.min || 1)) out.push({ f: f, label: f.l });
          rows.forEach(function (r, i) {
            (f.fields || []).forEach(function (sf) { if (required(sf, r) && empty(r[sf.n])) out.push({ f: f, label: f.l + ' ' + (i + 1) + ': ' + sf.l }); });
          });
          return;
        }
        if (f.t === 'docs') {
          f.items.forEach(function (it) { if (it.req && empty((V[f.n] || {})[it.k])) out.push({ f: f, label: it.l }); });
          return;
        }
        if (required(f) && empty(V[f.n])) out.push({ f: f, label: f.l });
        if (f.t === 'email' && !empty(V[f.n]) && !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(V[f.n])) out.push({ f: f, label: f.l + ' (check the address)' });
        if (f.t === 'number' && !empty(V[f.n]) && isNaN(parseFloat(V[f.n]))) out.push({ f: f, label: f.l + ' (numbers only)' });
      });
      return out;
    }
    function countReq(sec) {
      var total = 0, have = 0;
      sec.fields.forEach(function (f) {
        if (!visible(f) || ['note', 'sub'].indexOf(f.t) >= 0) return;
        if (f.t === 'docs') { f.items.forEach(function (it) { total++; if (!empty((V[f.n] || {})[it.k])) have++; }); return; }
        if (required(f)) { total++; if (f.t === 'repeat' ? (V[f.n] || []).length >= (f.min || 1) : !empty(V[f.n])) have++; }
      });
      return { total: total, have: have, miss: missingIn(sec).length };
    }

    // ---------- field renderers ----------
    function lab(f, n, req) {
      return '<span class="l">' + (n ? '<span class="qn">' + n + '</span>' : '') + esc(f.l) + (req ? '<span class="req">REQUIRED</span>' : '') + '</span>' + (f.hint ? '<span class="hint">' + f.hint + '</span>' : '');
    }
    function control(f, val, name) {
      var nm = esc(name);
      var ph = f.ph ? ' placeholder="' + esc(f.ph) + '"' : '';
      switch (f.t) {
        case 'area': return '<textarea name="' + nm + '"' + ph + ' maxlength="' + (f.max || 4000) + '">' + esc(val) + '</textarea>';
        case 'select':
          return '<select name="' + nm + '"><option value="">Select…</option>' + f.o.map(function (o) { o = opt(o); return '<option value="' + esc(o.v) + '"' + (val === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>';
        case 'country':
          return '<select name="' + nm + '"><option value="">Select country…</option>' + COUNTRIES.map(function (c) { return '<option' + (val === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>';
        case 'seg': case 'yesno': case 'screen':
          var os = f.t === 'seg' ? f.o : ['Yes', 'No'];
          return '<div class="seg" role="radiogroup">' + os.map(function (o) { o = opt(o); return '<label><input type="radio" name="' + nm + '" value="' + esc(o.v) + '"' + (val === o.v ? ' checked' : '') + '><span>' + esc(o.l) + '</span></label>'; }).join('') + '</div>';
        case 'multi':
          var arr = Array.isArray(val) ? val : [];
          return '<div class="pills">' + f.o.map(function (o) { o = opt(o); return '<label><input type="checkbox" data-multi="' + nm + '" value="' + esc(o.v) + '"' + (arr.indexOf(o.v) >= 0 ? ' checked' : '') + '><span>' + esc(o.l) + '</span></label>'; }).join('') + '</div>';
        case 'sign':
          return '<input type="text" class="sig" name="' + nm + '" value="' + esc(val) + '" autocomplete="name" placeholder="Type your full legal name">';
        default:
          var type = { email: 'email', tel: 'tel', url: 'url', number: 'text', date: 'date' }[f.t] || 'text';
          var im = f.t === 'number' ? ' inputmode="decimal"' : '';
          var ac = f.ac ? ' autocomplete="' + f.ac + '"' : '';
          return '<input type="' + type + '" name="' + nm + '" value="' + esc(val) + '"' + ph + im + ac + ' maxlength="' + (f.max || 400) + '">';
      }
    }
    function fieldHTML(f, qn) {
      if (!visible(f)) return '';
      var req = required(f);
      var full = f.full || ['area', 'multi', 'note', 'sub', 'repeat', 'docs', 'agree', 'screen'].indexOf(f.t) >= 0;
      if (f.t === 'note') return '<p class="note">' + f.l + '</p>';
      if (f.t === 'sub') return '<div class="sub">' + esc(f.l) + '</div>';
      if (f.t === 'agree') return '<label class="agree f" data-f="' + f.n + '"><input type="checkbox" name="' + f.n + '"' + (V[f.n] ? ' checked' : '') + '><span>' + f.l + (req ? ' <span class="req">REQUIRED</span>' : '') + '</span></label>';
      if (f.t === 'screen') {
        var flagged = V[f.n] === 'Yes';
        return '<div class="screen f full' + (flagged ? ' flagged' : '') + '" data-f="' + f.n + '"><div>' + lab(f, qn, req) + '</div>' + control(f, V[f.n], f.n) +
          '<div class="flag-t">A "Yes" here requires review by our compliance team before this can proceed. Please add context in the notes field below.</div><div class="err-t">Please answer.</div></div>';
      }
      if (f.t === 'repeat') return repeatHTML(f, req);
      if (f.t === 'docs') return docsHTML(f);
      return '<div class="f' + (full ? ' full' : '') + '" data-f="' + f.n + '"><label>' + lab(f, qn, req) + control(f, V[f.n], f.n) + '</label><div class="err-t">' + (f.err || 'Required.') + '</div></div>';
    }
    function repeatHTML(f, req) {
      var rows = V[f.n] = Array.isArray(V[f.n]) ? V[f.n] : [];
      while (rows.length < (f.start || 0)) rows.push({});
      var h = '<div class="rep f" data-f="' + f.n + '">' + lab(f, null, req);
      rows.forEach(function (r, i) {
        h += '<div class="rep-row"><span class="rep-n">' + esc(f.item || 'Entry') + ' ' + String(i + 1).padStart(2, '0') + '</span>' +
          (rows.length > (f.min || 0) ? '<button type="button" class="rep-x" data-rm="' + f.n + ':' + i + '">Remove</button>' : '') +
          '<div class="rep-g">' + f.fields.map(function (sf) {
            if (!visible(sf, r)) return '';
            var rq = required(sf, r), nm = f.n + '.' + i + '.' + sf.n;
            return '<div class="f' + (sf.full ? ' full' : '') + '" data-f="' + nm + '" style="' + (sf.full ? 'grid-column:1/-1' : '') + '"><label>' + lab(sf, null, rq) + control(sf, r[sf.n], nm) + '</label><div class="err-t">Required.</div></div>';
          }).join('') + '</div></div>';
      });
      if (rows.length < (f.max || 10)) h += '<button type="button" class="rep-add" data-add="' + f.n + '">+ ' + esc(f.add || 'Add another') + '</button>';
      return h + '<div class="err-t">' + esc(f.err || 'Add at least ' + (f.min || 1) + '.') + '</div></div>';
    }
    function docsHTML(f) {
      var st = V[f.n] = V[f.n] || {};
      var opts = f.statuses || ['Ready', 'In progress', 'Not yet', 'Not applicable'];
      return '<div class="docs f" data-f="' + f.n + '">' + f.items.map(function (it) {
        var files = state.files[it.k] || [];
        return '<div class="doc" data-f="' + f.n + '.' + it.k + '"><div><span class="l">' + esc(it.l) + (it.req ? '<span class="req">REQUIRED</span>' : '') + '</span>' + (it.hint ? '<span class="hint">' + it.hint + '</span>' : '') + '</div>' +
          '<div class="seg" role="radiogroup">' + opts.map(function (o) { return '<label><input type="radio" name="' + f.n + '.' + it.k + '" value="' + esc(o) + '"' + (st[it.k] === o ? ' checked' : '') + '><span>' + esc(o) + '</span></label>'; }).join('') + '</div>' +
          (f.upload === false ? '' : '<div class="up"><label>Attach file<input type="file" data-file="' + it.k + '" accept="' + CFG.fileTypes + '" multiple></label>' +
            files.map(function (fl, i) { return '<span class="file">' + esc(fl.name) + ' · ' + Math.max(1, Math.round(fl.size / 1024)) + ' KB <button type="button" data-unfile="' + it.k + ':' + i + '" aria-label="Remove">×</button></span>'; }).join('') +
            (files.length ? '' : '<span>Optional now. PDF, image or Office file, up to ' + CFG.maxFileMB + ' MB.</span>') + '</div>') +
          '</div>';
      }).join('') + '</div>';
    }

    // ---------- page render ----------
    function rail() {
      var totalReq = 0, haveReq = 0;
      var items = schema.sections.map(function (s, i) {
        var c = countReq(s); totalReq += c.total; haveReq += Math.min(c.have, c.total);
        var cls = i === state.step ? 'on' : '';
        if (c.total && c.miss === 0 && c.have >= c.total) cls += ' done';
        else if (c.have) cls += ' part';
        var p = c.total ? Math.round((c.have / c.total) * 100) : 0;
        return '<li class="' + cls + '" style="--p:' + p + '%"><button type="button" data-go="' + i + '"><span class="n">' + String(i + 1).padStart(2, '0') + '</span><span>' + esc(s.short || s.title) + '</span><span class="st">' + (cls.indexOf('done') >= 0 ? '✓' : '') + '</span></button></li>';
      }).join('');
      var pct = totalReq ? Math.round((haveReq / totalReq) * 100) : 0;
      return '<div class="rail-h"><div class="kick">Dossier completion</div><div class="pct"><b>' + pct + '%</b><span>' + haveReq + ' of ' + totalReq + ' required</span></div><div class="meter"><i style="width:' + pct + '%"></i></div></div><ol>' + items + '</ol>' +
        '<div class="rail-f">Answers save on this device as you type.<br><button type="button" data-clear>Clear saved draft</button></div>';
    }
    function sectionHTML() {
      var s = schema.sections[state.step], n = 0, last = state.step === schema.sections.length - 1;
      var body = s.fields.map(function (f) { var qn = (f.t !== 'note' && f.t !== 'sub' && s.numbered) ? String(++n).padStart(2, '0') : null; return fieldHTML(f, qn); }).join('');
      var h = '<section class="sec"><div class="sec-h"><div><div class="kick">Section ' + String(state.step + 1).padStart(2, '0') + ' of ' + String(schema.sections.length).padStart(2, '0') + '</div><h2>' + esc(s.title) + '</h2></div><span class="tag">' + esc(s.tag || '') + '</span></div>' +
        (s.intro ? '<p class="sec-intro">' + s.intro + '</p>' : '') + (s.why ? '<div class="why"><b>Why we ask</b>' + s.why + '</div>' : '') +
        '<div class="fields">' + body + '</div>';
      if (last) h += readinessHTML();
      h += '</section>';
      h += '<div class="nav"><p>' + esc(last ? 'Submitting sends your dossier to a named reviewer. Nothing is shared with any counterparty without your agreement.' : 'Every answer is reviewed by a person. Precise answers move faster than general ones.') + '</p><div class="btns">' +
        (state.step > 0 ? '<button type="button" class="btn btn-line" data-back>Back</button>' : '') +
        (last ? '<button type="button" class="btn btn-gold" data-submit>Submit dossier for review <span class="arr">→</span></button>' : '<button type="button" class="btn btn-gold" data-next>Continue <span class="arr">→</span></button>') +
        '</div></div><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><p class="msg" id="msg" role="alert"></p><span class="saved" id="saved"></span></div>';
      return h;
    }
    function readinessHTML() {
      var rows = schema.sections.slice(0, -1).map(function (s, i) {
        var m = missingIn(s).length;
        return '<li><span>' + String(i + 1).padStart(2, '0') + ' · ' + esc(s.short || s.title) + '</span>' + (m ? '<button type="button" data-go="' + i + '">' + m + ' to complete →</button>' : '<span class="okk">Complete</span>') + '</li>';
      }).join('');
      return '<div class="ready" style="margin-bottom:28px"><div class="ready-h"><span>Readiness check</span><span>' + (state.files ? Object.keys(state.files).reduce(function (a, k) { return a + state.files[k].length; }, 0) : 0) + ' file(s) attached</span></div><ul>' + rows + '</ul></div>';
    }
    function render(keepFocus) {
      var active = keepFocus && document.activeElement && document.activeElement.name;
      var y = window.scrollY;
      root.innerHTML = '<div class="shell"><aside class="rail" aria-label="Dossier sections">' + rail() + '</aside><div><form id="vf" novalidate autocomplete="on"><div class="hp" aria-hidden="true"><label>Company website<input type="text" name="website_hp" tabindex="-1" autocomplete="off"></label></div>' + sectionHTML() + '</form></div></div>';
      if (active) { var el = root.querySelector('[name="' + active.replace(/"/g, '') + '"]'); if (el) { el.focus({ preventScroll: true }); window.scrollTo(0, y); } }
    }
    function refreshRail() { var r = $('.rail', root); if (r) r.innerHTML = rail(); }

    // ---------- value plumbing ----------
    function setPath(name, val) {
      var parts = name.split('.');
      if (parts.length === 1) { V[name] = val; return; }
      if (parts.length === 2) { V[parts[0]] = V[parts[0]] || {}; V[parts[0]][parts[1]] = val; return; }
      var arr = V[parts[0]] = V[parts[0]] || []; var row = arr[+parts[1]] = arr[+parts[1]] || {}; row[parts[2]] = val;
    }
    var saveT;
    function save() {
      clearTimeout(saveT);
      saveT = setTimeout(function () {
        try { localStorage.setItem(DRAFT, JSON.stringify({ v: V, step: state.step, started: state.started, at: Date.now() })); var s = $('#saved'); if (s) s.textContent = 'Draft saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      }, 350);
    }

    root.addEventListener('input', function (e) {
      var t = e.target; if (!t.name || t.name === 'website_hp' || t.type === 'radio' || t.type === 'checkbox' || t.type === 'file' || t.tagName === 'SELECT') return;
      setPath(t.name, t.value);
      var w = t.closest('.bad'); if (w) w.classList.remove('bad');
      save(); refreshRail();
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type === 'file') return addFiles(t);
      if (t.dataset.multi) {
        var cur = Array.isArray(V[t.dataset.multi]) ? V[t.dataset.multi].slice() : [];
        var i = cur.indexOf(t.value); if (t.checked && i < 0) cur.push(t.value); if (!t.checked && i >= 0) cur.splice(i, 1);
        V[t.dataset.multi] = cur;
      } else if (t.type === 'checkbox') setPath(t.name, t.checked);
      else if (t.type === 'radio' || t.tagName === 'SELECT') setPath(t.name, t.value);
      else return;
      save(); render(true);
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.go != null) { go(+b.dataset.go); }
      else if (b.hasAttribute('data-next')) { next(); }
      else if (b.hasAttribute('data-back')) { go(state.step - 1); }
      else if (b.hasAttribute('data-submit')) { submit(b); }
      else if (b.dataset.add) { (V[b.dataset.add] = V[b.dataset.add] || []).push({}); save(); render(); }
      else if (b.dataset.rm) { var p = b.dataset.rm.split(':'); V[p[0]].splice(+p[1], 1); save(); render(); }
      else if (b.dataset.unfile) { var q = b.dataset.unfile.split(':'); state.files[q[0]].splice(+q[1], 1); render(); }
      else if (b.hasAttribute('data-clear')) {
        if (confirm('Clear every saved answer on this device and start again?')) { try { localStorage.removeItem(DRAFT); } catch (x) {} location.reload(); }
      }
    });

    function addFiles(input) {
      var k = input.dataset.file, list = state.files[k] = state.files[k] || [], msg = $('#msg');
      var total = Object.keys(state.files).reduce(function (a, x) { return a + state.files[x].length; }, 0);
      [].slice.call(input.files).forEach(function (fl) {
        if (total >= CFG.maxFiles) { msg.textContent = 'Up to ' + CFG.maxFiles + ' files per dossier. Send anything further once we reply.'; return; }
        if (fl.size > CFG.maxFileMB * 1048576) { msg.textContent = fl.name + ' is over ' + CFG.maxFileMB + ' MB.'; return; }
        list.push(fl); total++;
      });
      render();
    }

    function markBad(sec) {
      $$('.bad', root).forEach(function (el) { el.classList.remove('bad'); });
      var miss = missingIn(sec), first = null;
      miss.forEach(function (m) {
        var el = root.querySelector('[data-f="' + m.f.n + '"]');
        if (m.f.t === 'repeat') {
          (V[m.f.n] || []).forEach(function (r, i) { m.f.fields.forEach(function (sf) { if (required(sf, r) && empty(r[sf.n])) { var c = root.querySelector('[data-f="' + m.f.n + '.' + i + '.' + sf.n + '"]'); if (c) { c.classList.add('bad'); first = first || c; } } }); });
          if ((V[m.f.n] || []).length < (m.f.min || 1) && el) { el.classList.add('bad'); first = first || el; }
          return;
        }
        if (m.f.t === 'docs') { m.f.items.forEach(function (it) { if (it.req && empty((V[m.f.n] || {})[it.k])) { var c = root.querySelector('[data-f="' + m.f.n + '.' + it.k + '"]'); if (c) { c.classList.add('bad'); first = first || c; } } }); return; }
        if (el) { el.classList.add('bad'); first = first || el; }
      });
      return { miss: miss, first: first };
    }
    function go(i) {
      if (i < 0 || i >= schema.sections.length) return;
      state.step = i; save(); render();
      window.scrollTo({ top: $('.shell').getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
    }
    function next() {
      var r = markBad(schema.sections[state.step]);
      if (r.miss.length) {
        $('#msg').textContent = r.miss.length + ' answer' + (r.miss.length > 1 ? 's' : '') + ' still needed in this section. They are outlined in red.';
        r.first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var inp = r.first.querySelector('input,select,textarea'); if (inp) setTimeout(function () { inp.focus({ preventScroll: true }); }, 300);
        return;
      }
      go(state.step + 1);
    }

    // ---------- submission ----------
    function flat() {
      // Label → answer pairs, used for the email fallback and the local backup.
      var out = {};
      schema.sections.forEach(function (s) {
        s.fields.forEach(function (f) {
          if (!visible(f) || f.t === 'note' || f.t === 'sub') return;
          var v = V[f.n];
          if (f.t === 'repeat') (v || []).forEach(function (r, i) { out[f.l + ' ' + (i + 1)] = f.fields.map(function (sf) { return sf.l + ': ' + (r[sf.n] || '—'); }).join(' | '); });
          else if (f.t === 'docs') f.items.forEach(function (it) { out['Document · ' + it.l] = (v || {})[it.k] || '—'; });
          else out[f.l] = Array.isArray(v) ? v.join(', ') : v === true ? 'Yes' : (v || '—');
        });
      });
      return out;
    }
    function mkRef() {
      var a = new Uint8Array(4); (window.crypto || window.msCrypto).getRandomValues(a);
      return schema.prefix + '-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + [].map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').toUpperCase().slice(0, 6);
    }

    function submit(btn) {
      var msg = $('#msg');
      for (var i = 0; i < schema.sections.length; i++) {
        if (missingIn(schema.sections[i]).length) {
          if (i !== state.step) { go(i); setTimeout(function () { markBad(schema.sections[state.step]); $('#msg').textContent = 'This section still has required answers. They are outlined in red.'; }, 60); return; }
          var r = markBad(schema.sections[i]); msg.textContent = 'A few required answers are missing. They are outlined in red.'; if (r.first) r.first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
        }
      }
      if (state.sent) return;
      state.sent = true;
      btn.disabled = true; btn.innerHTML = 'Encrypting &amp; submitting…'; msg.textContent = '';

      var ref = mkRef();
      var files = [];
      Object.keys(state.files).forEach(function (k) { state.files[k].forEach(function (fl) { files.push({ doc: k, name: fl.name.slice(0, 140), size: fl.size, type: fl.type || 'application/octet-stream' }); }); });
      var body = {
        kind: schema.id, version: schema.version, ref: ref,
        website_hp: ($('[name=website_hp]') || {}).value || '',
        answers: V, files: files,
        meta: { started_at: new Date(state.started).toISOString(), elapsed_ms: Date.now() - state.started, tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '', lang: navigator.language || '', page: location.pathname, campaign: qs.get('c') || '' }
      };

      fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.status === 422 && j.error) { var e = new Error(j.error); e.user = true; throw e; } if (!r.ok || !j.ok) throw new Error(j.error || 'HTTP ' + r.status); return j; }); })
        .then(function (j) { return uploadAll(j.uploads || []).then(function (log) { done(j.ref || ref, log); }); })
        .catch(function (err) {
          if (err.user) { fail(btn, err.message); return; }
          // Intake unreachable: deliver the raw dossier by email so nothing is lost. No grade is ever computed here.
          var payload = Object.assign({ access_key: CFG.web3formsKey, subject: '[' + schema.title + '] ' + (V[schema.entityField] || 'New dossier') + ' · ' + ref + ' · UNGRADED (intake offline)', from_name: 'CN × SSP Vetting', Reference: ref, 'Files declared': files.map(function (f) { return f.name; }).join(', ') || 'None' }, flat());
          fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json(); })
            .then(function (j) { if (!j.success) throw new Error(j.message); done(ref, files.length ? ['Your files were not transferred. We will send you a secure link to provide them.'] : []); })
            .catch(function () { fail(btn, 'We could not reach our secure intake. Your answers are still saved on this device. Please try again in a moment, or email ' + CFG.contact + ' quoting ' + ref + '.'); });
        });
    }
    function uploadAll(ups) {
      var log = [];
      var all = [];
      Object.keys(state.files).forEach(function (k) { state.files[k].forEach(function (fl) { all.push({ doc: k, file: fl }); }); });
      var seq = Promise.resolve();
      ups.forEach(function (u, i) {
        var match = all[i]; if (!match || !u.url) return;
        seq = seq.then(function () {
          var fd = new FormData(); fd.append('cacheControl', '3600'); fd.append('', match.file);
          return fetch(u.url, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: fd })
            .then(function (r) { log.push((r.ok ? 'Received  ' : 'Not received  ') + match.file.name); })
            .catch(function () { log.push('Not received  ' + match.file.name); });
        });
      });
      return seq.then(function () { return log; });
    }
    function fail(btn, text) {
      state.sent = false; btn.disabled = false; btn.innerHTML = 'Submit dossier for review <span class="arr">→</span>';
      $('#msg').textContent = text;
    }
    function done(ref, log) {
      try { localStorage.removeItem(DRAFT); } catch (e) {}
      root.innerHTML = '<section class="done" aria-live="polite"><div class="kick">Dossier received</div><h2>Thank you. Your dossier is with our review desk.</h2>' +
        '<p style="margin:14px 0 0;max-width:640px">A confirmation is on its way to your inbox. Keep your reference: you will need it for any follow-up.</p>' +
        '<div class="ref">REFERENCE <b>' + esc(ref) + '</b></div>' +
        '<div class="next">' + (schema.next || []).map(function (t, i) { return '<div><b>' + String(i + 1).padStart(2, '0') + '</b><span>' + t + '</span></div>'; }).join('') + '</div>' +
        (log && log.length ? '<div class="uplog">' + log.map(esc).join('<br>') + '</div>' : '') +
        '<p style="margin:24px 0 0;font-size:14px">Questions: <a href="mailto:' + CFG.contact + '?subject=' + encodeURIComponent('Vetting ' + ref) + '">' + CFG.contact + '</a></p></section>';
      window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' });
    }

    render();
  }

  window.Vetting = { mount: mount, COUNTRIES: COUNTRIES, CFG: CFG };
})();
