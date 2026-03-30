/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — personal-dashboard.js  (v5 FINAL)
   
   FETCH STRATEGY: Absolutely minimal — only filter by user_id
   and date range. Zero other filters. Show everything.
   ═══════════════════════════════════════════════════════════ */

var ACTIVITY_ICONS = {
  'Cycling':'🚴','Jogging':'🏃','Reading':'📚','Gardening':'🌱',
  'Breakfast Prep':'🍳','Lunch Prep':'🥗','Dinner Prep':'🍽️',
  'Hydration':'💧','Personal Care':'🧴','Work':'💼',
  'Drop kids':'🚗','Pick-up kids':'🏫','Learning':'📖',
  'Commute':'🚌','Prayer Time':'🙏','Visit Spiritual Place':'⛪'
};

var CHIP_COLORS = [
  { bg:'#FDE8D8', border:'#F4A261', text:'#7B3F00' },
  { bg:'#D8EDFF', border:'#4A9EDE', text:'#1A4D7A' },
  { bg:'#D8F5E8', border:'#43BF87', text:'#1A5E3C' },
  { bg:'#F5D8FF', border:'#B06EC9', text:'#5C1A7A' },
  { bg:'#FFF4D8', border:'#F0C050', text:'#6B4A00' },
  { bg:'#FFD8D8', border:'#E87070', text:'#7A1A1A' },
  { bg:'#D8F8FF', border:'#4AC4DE', text:'#1A5F6B' }
];

var WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

var currentUser   = null;
var calWeekOffset = 0;
var pendingDate   = null;

/* ── Init ─────────────────────────────────────────────────*/
document.addEventListener('DOMContentLoaded', async function () {

  /* Get session — retry up to 3 seconds */
  var user = null;
  for (var attempt = 0; attempt < 6; attempt++) {
    var sr = await DAM.auth().getSession();
    if (sr.data && sr.data.session && sr.data.session.user) {
      user = sr.data.session.user;
      break;
    }
    await new Promise(function (r) { setTimeout(r, 500); });
  }

  if (!user) {
    console.error('[DAM] No session after 3s — redirecting');
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;
  console.log('[DAM] Logged in as:', currentUser.email, '| id:', currentUser.id);

  /* Profile tiles */
  var pRes = await DAM.db()
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', currentUser.id)
    .maybeSingle();

  var p = pRes.data || {};
  var el;
  el = document.getElementById('pName');
  if (el) el.textContent = ((p.first_name||'') + ' ' + (p.last_name||'')).trim() || '—';
  el = document.getElementById('pEmail');
  if (el) el.textContent = currentUser.email || '—';
  el = document.getElementById('pLastVisit');
  if (el) el.textContent = currentUser.last_sign_in_at
    ? new Date(currentUser.last_sign_in_at)
        .toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})
    : 'Today';

  /* Time pickers */
  buildTimePicker('From', 'activityFromWrap');
  buildTimePicker('End',  'activityEndWrap');

  /* Render calendar */
  await renderCalendar();

  /* Navigation */
  document.getElementById('calPrev').addEventListener('click', async function () {
    calWeekOffset--; await renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', async function () {
    calWeekOffset++; await renderCalendar();
  });

  /* Modal */
  document.getElementById('cancelActivityBtn').addEventListener('click', closeModal);
  document.getElementById('addActivityModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('saveActivityBtn').addEventListener('click', saveActivity);

  /* Popup close */
  document.getElementById('dayPopupClose').addEventListener('click', closeDayPopup);
  document.getElementById('dayPopupBackdrop').addEventListener('click', closeDayPopup);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDayPopup(); });
});

function closeModal() {
  document.getElementById('addActivityModal').classList.remove('is-open');
}

/* ── Time picker ──────────────────────────────────────────*/
function buildTimePicker(label, wrapId) {
  var wrap = document.getElementById(wrapId);
  if (!wrap || wrap.childElementCount > 0) return;

  var hSel = document.createElement('select');
  hSel.className = 'time-sel'; hSel.id = 'tp_h_' + label;
  var hOpt = '<option value="">HH</option>';
  for (var h = 1; h <= 12; h++)
    hOpt += '<option value="' + h + '">' + String(h).padStart(2,'0') + '</option>';
  hSel.innerHTML = hOpt;

  var sep = document.createElement('span');
  sep.className = 'time-sep'; sep.textContent = ':';

  var mSel = document.createElement('select');
  mSel.className = 'time-sel'; mSel.id = 'tp_m_' + label;
  var mOpt = '<option value="">MM</option>';
  for (var m = 0; m <= 59; m++)
    mOpt += '<option value="' + m + '">' + String(m).padStart(2,'0') + '</option>';
  mSel.innerHTML = mOpt;

  var ampm = document.createElement('select');
  ampm.className = 'time-ampm'; ampm.id = 'tp_ap_' + label;
  ampm.innerHTML = '<option value="AM">AM</option><option value="PM">PM</option>';

  wrap.appendChild(hSel); wrap.appendChild(sep);
  wrap.appendChild(mSel); wrap.appendChild(ampm);
}

function getTimeValue(label) {
  var h  = document.getElementById('tp_h_' + label);
  var m  = document.getElementById('tp_m_' + label);
  var ap = document.getElementById('tp_ap_' + label);
  if (!h || !m || h.value === '' || m.value === '') return null;
  var hour = parseInt(h.value);
  if (ap && ap.value === 'PM' && hour !== 12) hour += 12;
  if (ap && ap.value === 'AM' && hour === 12) hour = 0;
  return String(hour).padStart(2,'0') + ':' + String(m.value).padStart(2,'0') + ':00';
}

function resetTimePicker(label) {
  ['tp_h_','tp_m_','tp_ap_'].forEach(function (pfx) {
    var el = document.getElementById(pfx + label);
    if (el) el.selectedIndex = 0;
  });
}

/* ── Status dot ───────────────────────────────────────────*/
function getStatusDot(act, dateStr) {
  var now = new Date(); var todayStr = toDateStr(now);
  if (dateStr !== todayStr)
    return new Date(dateStr + 'T00:00:00') < now
      ? '<span class="cal5-status-dot done"></span>'
      : '<span class="cal5-status-dot upcoming"></span>';
  var nowM = now.getHours()*60+now.getMinutes();
  var fp = (act.from_time||'00:00').split(':');
  var ep = (act.end_time||'00:00').split(':');
  var fM = parseInt(fp[0])*60+parseInt(fp[1]);
  var eM = parseInt(ep[0])*60+parseInt(ep[1]);
  if (nowM >= fM && nowM <= eM) return '<span class="cal5-status-dot active"></span>';
  if (nowM < fM) return '<span class="cal5-status-dot upcoming"></span>';
  return '<span class="cal5-status-dot done"></span>';
}

/* ═══════════════════════════════════════════════════════════
   7-DAY CALENDAR
   ═══════════════════════════════════════════════════════════ */
async function renderCalendar() {
  var root = document.getElementById('calendarRoot');
  root.innerHTML =
    '<p style="padding:2rem;text-align:center;color:#888;">Loading schedule…</p>';

  if (!currentUser) return;

  /* Mon–Sun week */
  var today  = new Date();
  var monday = new Date(today);
  var dow    = today.getDay() || 7;
  monday.setDate(today.getDate() - dow + 1 + calWeekOffset * 7);

  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d);
  }

  var todayStr = toDateStr(today);
  var dateFrom = toDateStr(days[0]);
  var dateTo   = toDateStr(days[6]);

  /* Update week label */
  var lbl = document.getElementById('calWeekLabel');
  if (lbl) lbl.textContent = formatShort(days[0]) + ' – ' + formatShort(days[6]);

  /* ── FETCH: simplest possible query — only user_id + dates ── */
  var { data, error } = await DAM.db()
    .from('activities')
    .select('id, activity, activity_date, from_time, end_time, location, group_id, is_group')
    .eq('user_id', currentUser.id)
    .gte('activity_date', dateFrom)
    .lte('activity_date', dateTo)
    .order('from_time', { ascending: true });

  if (error) {
    console.error('[DAM] Fetch error:', error);
    root.innerHTML =
      '<div style="padding:1.5rem;text-align:center;color:#E74C3C;">' +
      '<strong>⚠ Could not load activities</strong><br/>' +
      '<small>' + error.message + '</small><br/>' +
      '<small>Run supabase-update-5.sql in Supabase SQL Editor</small></div>';
    return;
  }

  var acts = data || [];
  console.log('[DAM] Loaded', acts.length, 'activities |', dateFrom, '→', dateTo);

  /* ── Header ─────────────────────────────────────────────── */
  var header = '<div class="cal7-header">';
  days.forEach(function (d, i) {
    var ds = toDateStr(d); var isT = ds === todayStr; var isW = i >= 5;
    header +=
      '<div class="cal7-header-cell' + (isT?' today':'') + (isW?' weekend':'') + '">' +
        '<span class="hdr-abbr">' + WEEKDAYS[i] + '</span>' +
        '<span class="hdr-num' + (isT?' today-circle':'') + '">' + d.getDate() + '</span>' +
        '<span class="hdr-month">' + d.toLocaleDateString('en-CA',{month:'short'}) + '</span>' +
      '</div>';
  });
  header += '</div>';

  /* ── Grid ───────────────────────────────────────────────── */
  var body = '<div class="cal7-grid">';
  days.forEach(function (d, idx) {
    var ds = toDateStr(d);
    var isT = ds === todayStr;
    var isP = !isT && d < today;
    var isW = idx >= 5;
    var dayActs = acts.filter(function (a) { return a.activity_date === ds; });

    /* Chips */
    var chips = '';
    dayActs.slice(0,4).forEach(function (a, ci) {
      var icon = ACTIVITY_ICONS[a.activity] || '📌';
      var dot  = getStatusDot(a, ds);
      var col  = CHIP_COLORS[ci % CHIP_COLORS.length];
      chips +=
        '<div class="cal7-chip" ' +
          'style="background:' + col.bg + ';border-left:3px solid ' + col.border +
          ';color:' + col.text + ';" ' +
          'onclick="event.stopPropagation();openViewDay(\'' + ds + '\',this.closest(\'.cal7-cell\'))">' +
          dot +
          '<span class="cal7-chip-icon">' + icon + '</span>' +
          '<span class="cal7-chip-text">' + esc(a.activity) + '</span>' +
        '</div>';
    });
    if (dayActs.length > 4)
      chips += '<div class="cal7-more">+' + (dayActs.length-4) + ' more</div>';

    /* Hover tooltip */
    var tip = dayActs.length === 0
      ? '<div class="cal5-tooltip-empty">No activities</div>'
      : dayActs.slice(0,5).map(function (a) {
          return '<div class="cal5-tooltip-row">' +
            '<span class="cal5-tooltip-icon">' + (ACTIVITY_ICONS[a.activity]||'📌') + '</span>' +
            '<span><div class="cal5-tooltip-name">' + esc(a.activity) + '</div>' +
            '<div class="cal5-tooltip-time">' + fmt12h(a.from_time) + '–' + fmt12h(a.end_time) +
              (a.location ? ' · ' + esc(a.location) : '') + '</div></span></div>';
        }).join('');

    var cls = 'cal7-cell'+(isT?' today':'')+(isP?' past':'')+(isW?' weekend':'');
    body +=
      '<div class="' + cls + '" onclick="openViewDay(\'' + ds + '\',this)">' +
        '<div class="cal7-cell-top"><div class="cal7-controls">' +
          '<button class="cal5-btn plus" title="Add" ' +
            'onclick="event.stopPropagation();openAddActivity(\'' + ds + '\')">+</button>' +
          '<button class="cal5-btn minus" title="View" ' +
            'onclick="event.stopPropagation();openViewDay(\'' + ds + '\',this.closest(\'.cal7-cell\'))">−</button>' +
        '</div></div>' +
        chips +
        '<div class="cal5-tooltip">' + tip + '</div>' +
      '</div>';
  });
  body += '</div>';

  root.innerHTML = '<div class="cal5-wrap cal7-wrap">' + header + body + '</div>';
}

/* ── Open Add Activity Modal ─────────────────────────────*/
function openAddActivity(dateStr) {
  pendingDate = dateStr;
  var d = new Date(dateStr + 'T00:00:00');
  document.getElementById('addActivityDate').textContent =
    d.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  document.getElementById('activityType').value     = '';
  document.getElementById('activityLocation').value = '';
  resetTimePicker('From'); resetTimePicker('End');
  ['activityTypeErr','activityFromErr','activityEndErr','activityGenErr','activityOverlapErr']
    .forEach(function (id) { var el=document.getElementById(id); if(el) el.classList.remove('visible'); });
  ['activityFromWrap','activityEndWrap']
    .forEach(function (id) { var el=document.getElementById(id); if(el) el.classList.remove('is-error'); });
  document.getElementById('addActivityModal').classList.add('is-open');
}

/* ── Save Activity ────────────────────────────────────────*/
async function saveActivity() {
  var type = document.getElementById('activityType').value;
  var from = getTimeValue('From');
  var end  = getTimeValue('End');
  var loc  = document.getElementById('activityLocation').value.trim();
  var ok   = true;

  /* Clear previous errors */
  ['activityGenErr','activityOverlapErr'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.classList.remove('visible');
  });

  /* Validate */
  if (!type) { document.getElementById('activityTypeErr').classList.add('visible'); ok=false; }
  else document.getElementById('activityTypeErr').classList.remove('visible');

  if (!from) {
    document.getElementById('activityFromErr').classList.add('visible');
    document.getElementById('activityFromWrap').classList.add('is-error'); ok=false;
  } else {
    document.getElementById('activityFromErr').classList.remove('visible');
    document.getElementById('activityFromWrap').classList.remove('is-error');
  }

  if (!end) {
    document.getElementById('activityEndErr').classList.add('visible');
    document.getElementById('activityEndWrap').classList.add('is-error'); ok=false;
  } else {
    document.getElementById('activityEndErr').classList.remove('visible');
    document.getElementById('activityEndWrap').classList.remove('is-error');
  }

  if (from && end && from >= end) {
    document.getElementById('activityGenErr').classList.add('visible'); ok=false;
  }
  if (!ok) return;

  var btn = document.getElementById('saveActivityBtn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  /* Overlap check — skip gracefully if RPC missing */
  try {
    var { data: isOverlap } = await DAM.db().rpc('check_activity_overlap', {
      p_user_id: currentUser.id, p_group_id: null,
      p_date: pendingDate, p_from: from.substring(0,5), p_end: end.substring(0,5),
      p_exclude_id: null
    });
    if (isOverlap === true) {
      btn.textContent = 'Save Activity'; btn.disabled = false;
      var oe = document.getElementById('activityOverlapErr');
      if (oe) { oe.textContent = '⚠ This time overlaps with an existing activity.'; oe.classList.add('visible'); }
      return;
    }
  } catch(e) { /* RPC not set up yet — allow save */ }

  /* Insert */
  var { error } = await DAM.db().from('activities').insert({
    user_id:       currentUser.id,
    group_id:      null,
    activity:      type,
    activity_date: pendingDate,
    from_time:     from,
    end_time:      end,
    location:      loc || null,
    is_group:      false
  });

  btn.textContent = 'Save Activity'; btn.disabled = false;

  if (error) {
    console.error('[DAM] Insert failed:', error);
    alert('Save failed: ' + error.message +
          '\n\nPlease run supabase-update-5.sql in Supabase SQL Editor.');
    return;
  }

  console.log('[DAM] Saved! Refreshing calendar…');
  closeModal();
  await renderCalendar();
}

/* ── Day popup ────────────────────────────────────────────*/
function positionPopup(cellEl) {
  var popup = document.getElementById('dayPopup');
  if (!popup || !cellEl) return;
  var r = cellEl.getBoundingClientRect();
  var popW=300, popH=340, vw=window.innerWidth, vh=window.innerHeight;
  var top=r.bottom+6, left=r.left;
  if (left+popW > vw-12) left=vw-popW-12;
  if (left < 8) left=8;
  popup.classList.remove('arrow-right','opens-up');
  if (left > r.left+20) popup.classList.add('arrow-right');
  if (top+popH > vh-16) { top=r.top-popH-6; if(top<8) top=8; popup.classList.add('opens-up'); }
  popup.style.top=top+'px'; popup.style.left=left+'px';
}

function closeDayPopup() {
  ['dayPopup','dayPopupBackdrop'].forEach(function(id) {
    var el=document.getElementById(id); if(el) el.classList.remove('is-open');
  });
}

async function openViewDay(dateStr, cellEl) {
  var popup = document.getElementById('dayPopup');
  var body  = document.getElementById('dayPopupBody');
  if (!popup || !body) return;

  /* Set title */
  var d = new Date(dateStr + 'T00:00:00');
  document.getElementById('dayPopupTitle').textContent =
    d.toLocaleDateString('en-CA',{weekday:'long'});
  document.getElementById('dayPopupSubtitle').textContent =
    d.toLocaleDateString('en-CA',{month:'long',day:'numeric',year:'numeric'});

  /* Show loading */
  body.innerHTML = '<div class="day-popup-empty"><div class="day-popup-empty-icon">⏳</div>Loading…</div>';
  if (cellEl) positionPopup(cellEl);
  popup.classList.add('is-open');
  document.getElementById('dayPopupBackdrop').classList.add('is-open');

  /* Wire add button */
  document.getElementById('dayPopupAddBtn').onclick = function () {
    closeDayPopup(); openAddActivity(dateStr);
  };

  /* ── FETCH: simplest possible — user + date only ── */
  var { data, error } = await DAM.db()
    .from('activities')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('activity_date', dateStr)
    .order('from_time', { ascending: true });

  if (error) {
    body.innerHTML = '<div class="day-popup-empty" style="color:#E74C3C;">Error: ' + error.message + '</div>';
    return;
  }

  var acts = data || [];
  console.log('[DAM] openViewDay:', dateStr, '→', acts.length, 'activities');

  if (!acts.length) {
    body.innerHTML =
      '<div class="day-popup-empty">' +
        '<div class="day-popup-empty-icon">📭</div>' +
        'No activities scheduled' +
      '</div>';
    return;
  }

  body.innerHTML = acts.map(function (a, idx) {
    var icon = ACTIVITY_ICONS[a.activity] || '📌';
    var dot  = getStatusDot(a, dateStr);
    var col  = CHIP_COLORS[idx % CHIP_COLORS.length];
    var loc  = a.location
      ? '<div class="day-popup-item-loc">📍 ' + esc(a.location) + '</div>' : '';
    return '<div class="day-popup-item" style="border-left:3px solid ' + col.border + ';">' +
      '<div class="day-popup-item-icon">' + icon + '</div>' +
      '<div class="day-popup-item-body">' +
        '<div class="day-popup-item-name">' + dot + ' ' + esc(a.activity) + '</div>' +
        '<div class="day-popup-item-time">🕐 ' + fmt12h(a.from_time) + ' – ' + fmt12h(a.end_time) + '</div>' +
        loc +
      '</div>' +
      '<button class="day-popup-delete" title="Remove" ' +
        'onclick="deleteActivity(\'' + a.id + '\',\'' + dateStr + '\')">🗑</button>' +
    '</div>';
  }).join('');
}

async function deleteActivity(actId, dateStr) {
  if (!confirm('Remove this activity?')) return;
  var { error } = await DAM.db().from('activities').delete().eq('id', actId);
  if (error) { alert('Delete failed: ' + error.message); return; }
  await openViewDay(dateStr, null);
  await renderCalendar();
}

/* ── Utilities ────────────────────────────────────────────*/
function toDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}
function formatShort(d) {
  return d.toLocaleDateString('en-CA',{month:'short',day:'numeric'});
}
function fmt12h(t) {
  if (!t) return '';
  var p=t.split(':'), h=parseInt(p[0]), m=p[1];
  return (h%12||12)+':'+m+(h>=12?' PM':' AM');
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
