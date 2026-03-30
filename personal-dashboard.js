/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — personal-dashboard.js  (v4 — FIXED)

   ROOT CAUSE OF INVISIBLE ACTIVITIES (now fixed):
   1. check_activity_overlap RPC may not exist in Supabase yet
      → was blocking saves silently. Fixed: overlap check is
        skipped gracefully if RPC is unavailable.
   2. Session wait was too short (500ms) causing currentUser=null
      → Fixed: now uses onAuthStateChange event, not setTimeout.
   3. .or('group_id.is.null,...') filter was unreliable
      → Fixed: fetch ALL user activities, filter client-side.

   7-day Mon–Sun calendar, colorful minimalist template #fcfbf8
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

/* ── Wait for Supabase auth then boot ─────────────────────*/
function waitForAuth(callback) {
  /* Try immediately first */
  DAM.auth().getSession().then(function (result) {
    var session = result.data && result.data.session
      ? result.data.session : null;
    if (session && session.user) {
      callback(session.user);
      return;
    }
    /* Not signed in yet — listen for state change */
    var unsub = DAM.auth().onAuthStateChange(function (event, sess) {
      if (event === 'SIGNED_IN' && sess && sess.user) {
        unsub.data && unsub.data.subscription && unsub.data.subscription.unsubscribe
          ? unsub.data.subscription.unsubscribe()
          : null;
        callback(sess.user);
      }
    });
    /* Hard timeout 4s */
    setTimeout(function () {
      if (!currentUser) {
        console.warn('[DAM] Auth timeout — redirecting to login');
        window.location.href = 'login.html';
      }
    }, 4000);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  waitForAuth(function (user) {
    currentUser = user;
    boot();
  });
});

async function boot() {
  /* Profile tiles */
  var pRes = await DAM.db().from('profiles')
    .select('first_name, last_name').eq('id', currentUser.id).maybeSingle();
  var p = pRes.data || {};
  var nameEl = document.getElementById('pName');
  if (nameEl) nameEl.textContent =
    ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || '—';
  var emailEl = document.getElementById('pEmail');
  if (emailEl) emailEl.textContent = currentUser.email || '—';
  var visitEl = document.getElementById('pLastVisit');
  if (visitEl) visitEl.textContent = currentUser.last_sign_in_at
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

  /* Add activity modal */
  document.getElementById('cancelActivityBtn').addEventListener('click', function () {
    document.getElementById('addActivityModal').classList.remove('is-open');
  });
  document.getElementById('addActivityModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('is-open');
  });
  document.getElementById('saveActivityBtn').addEventListener('click', saveActivity);

  /* Day popup close */
  document.getElementById('dayPopupClose').addEventListener('click', closeDayPopup);
  document.getElementById('dayPopupBackdrop').addEventListener('click', closeDayPopup);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDayPopup();
  });
}

/* ── Custom time picker ───────────────────────────────────*/
function buildTimePicker(label, wrapperId) {
  var wrap = document.getElementById(wrapperId);
  if (!wrap || wrap.childElementCount > 0) return; /* don't double-build */
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

function getTimePickerValue(label) {
  var h  = document.getElementById('tp_h_'  + label);
  var m  = document.getElementById('tp_m_'  + label);
  var ap = document.getElementById('tp_ap_' + label);
  if (!h || !m || h.value === '' || m.value === '') return null;
  var hour = parseInt(h.value);
  var apv  = ap ? ap.value : 'AM';
  if (apv === 'PM' && hour !== 12) hour += 12;
  if (apv === 'AM' && hour === 12) hour = 0;
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
  var now      = new Date();
  var todayStr = toDateStr(now);
  if (dateStr !== todayStr) {
    return new Date(dateStr + 'T00:00:00') < now
      ? '<span class="cal5-status-dot done"></span>'
      : '<span class="cal5-status-dot upcoming"></span>';
  }
  var nowM  = now.getHours() * 60 + now.getMinutes();
  var fp    = (act.from_time || '00:00').split(':');
  var ep    = (act.end_time  || '00:00').split(':');
  var fM    = parseInt(fp[0]) * 60 + parseInt(fp[1]);
  var eM    = parseInt(ep[0]) * 60 + parseInt(ep[1]);
  if (nowM >= fM && nowM <= eM) return '<span class="cal5-status-dot active"></span>';
  if (nowM <  fM)               return '<span class="cal5-status-dot upcoming"></span>';
  return '<span class="cal5-status-dot done"></span>';
}

/* ── 7-Day Calendar Renderer ─────────────────────────────*/
async function renderCalendar() {
  var root = document.getElementById('calendarRoot');
  root.innerHTML =
    '<p style="color:var(--color-ink-muted);padding:2rem;text-align:center;">Loading your schedule…</p>';

  if (!currentUser) return;

  /* Calculate Mon–Sun for the current week offset */
  var today  = new Date();
  var monday = new Date(today);
  var dow    = today.getDay() || 7;
  monday.setDate(today.getDate() - dow + 1 + (calWeekOffset * 7));

  var days = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  var todayStr = toDateStr(today);
  var dateFrom = toDateStr(days[0]);
  var dateTo   = toDateStr(days[6]);

  /* Week label */
  var weekLabelEl = document.getElementById('calWeekLabel');
  if (weekLabelEl)
    weekLabelEl.textContent = formatShort(days[0]) + ' – ' + formatShort(days[6]);

  /* ─────────────────────────────────────────────────────
     DEFINITIVE FIX: fetch ALL user activities then filter
     client-side. This avoids any Supabase filter issues
     with NULL comparisons and RLS edge cases.
  ───────────────────────────────────────────────────── */
  var actRes = await DAM.db()
    .from('activities')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('activity_date', dateFrom)
    .lte('activity_date', dateTo)
    .order('activity_date')
    .order('from_time');

  /* Client-side filter: personal = group_id is null/undefined/empty */
  var allFetched = actRes.data || [];
  var acts = allFetched.filter(function (a) {
    return !a.group_id ||
           a.group_id === '' ||
           a.group_id === null ||
           a.is_group === false;
  });

  console.log('[DAM] fetchedActivities:', allFetched.length,
              'personalFiltered:', acts.length,
              'week:', dateFrom, '–', dateTo);

  if (actRes.error) {
    console.error('[DAM] Supabase fetch error:', actRes.error);
    root.innerHTML =
      '<p style="color:#E74C3C;padding:1.5rem;text-align:center;">' +
      '⚠ Could not load activities: ' + actRes.error.message +
      '<br/><small>Check browser console for details.</small></p>';
    return;
  }

  /* ── Build header ───────────────────────────────────── */
  var header = '<div class="cal7-header">';
  days.forEach(function (d, i) {
    var ds = toDateStr(d); var isToday = ds === todayStr;
    var isWknd = (i === 5 || i === 6);
    header +=
      '<div class="cal7-header-cell' +
        (isToday ? ' today' : '') + (isWknd ? ' weekend' : '') + '">' +
        '<span class="hdr-abbr">' + WEEKDAYS[i] + '</span>' +
        '<span class="hdr-num' + (isToday ? ' today-circle' : '') + '">' + d.getDate() + '</span>' +
        '<span class="hdr-month">' + d.toLocaleDateString('en-CA',{month:'short'}) + '</span>' +
      '</div>';
  });
  header += '</div>';

  /* ── Build grid ─────────────────────────────────────── */
  var body = '<div class="cal7-grid">';
  days.forEach(function (d, idx) {
    var ds      = toDateStr(d);
    var isToday = ds === todayStr;
    var isPast  = d < today && !isToday;
    var isWknd  = (idx === 5 || idx === 6);
    var dayActs = acts.filter(function (a) { return a.activity_date === ds; });

    /* Colorful chips */
    var chips = '';
    dayActs.slice(0, 4).forEach(function (a, ci) {
      var icon = ACTIVITY_ICONS[a.activity] || '📌';
      var dot  = getStatusDot(a, ds);
      var col  = CHIP_COLORS[ci % CHIP_COLORS.length];
      chips +=
        '<div class="cal7-chip" ' +
          'style="background:' + col.bg + ';border-left:3px solid ' + col.border + ';color:' + col.text + ';" ' +
          'onclick="event.stopPropagation(); openViewDay(\'' + ds + '\', this.closest(\'.cal7-cell\'))">' +
          dot +
          '<span class="cal7-chip-icon">' + icon + '</span>' +
          '<span class="cal7-chip-text">' + esc(a.activity) + '</span>' +
        '</div>';
    });
    if (dayActs.length > 4)
      chips += '<div class="cal7-more">+' + (dayActs.length - 4) + ' more</div>';

    /* Hover tooltip */
    var tipRows = dayActs.length === 0
      ? '<div class="cal5-tooltip-empty">No activities</div>'
      : dayActs.slice(0, 5).map(function (a) {
          return '<div class="cal5-tooltip-row">' +
            '<span class="cal5-tooltip-icon">' + (ACTIVITY_ICONS[a.activity] || '📌') + '</span>' +
            '<span>' +
              '<div class="cal5-tooltip-name">' + esc(a.activity) + '</div>' +
              '<div class="cal5-tooltip-time">' + fmt12h(a.from_time) + '–' + fmt12h(a.end_time) +
                (a.location ? ' · ' + esc(a.location) : '') + '</div>' +
            '</span></div>';
        }).join('') +
        (dayActs.length > 5
          ? '<div class="cal5-tooltip-empty">+' + (dayActs.length-5) + ' more</div>' : '');

    var cls = 'cal7-cell' +
      (isToday ? ' today' : '') + (isPast ? ' past' : '') + (isWknd ? ' weekend' : '');

    body +=
      '<div class="' + cls + '" onclick="openViewDay(\'' + ds + '\', this)">' +
        '<div class="cal7-cell-top">' +
          '<div class="cal7-controls">' +
            '<button class="cal5-btn plus" title="Add activity" ' +
              'onclick="event.stopPropagation(); openAddActivity(\'' + ds + '\')">+</button>' +
            '<button class="cal5-btn minus" title="View activities" ' +
              'onclick="event.stopPropagation(); openViewDay(\'' + ds + '\', this.closest(\'.cal7-cell\'))">−</button>' +
          '</div>' +
        '</div>' +
        chips +
        '<div class="cal5-tooltip">' + tipRows + '</div>' +
      '</div>';
  });
  body += '</div>';

  root.innerHTML = '<div class="cal5-wrap cal7-wrap">' + header + body + '</div>';
}

/* ── Open Add Activity ────────────────────────────────────*/
function openAddActivity(dateStr) {
  pendingDate = dateStr;
  var d = new Date(dateStr + 'T00:00:00');
  document.getElementById('addActivityDate').textContent =
    d.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  document.getElementById('activityType').value     = '';
  document.getElementById('activityLocation').value = '';
  resetTimePicker('From');
  resetTimePicker('End');
  ['activityTypeErr','activityFromErr','activityEndErr',
   'activityGenErr','activityOverlapErr'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
  ['activityFromWrap','activityEndWrap'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('is-error');
  });
  document.getElementById('addActivityModal').classList.add('is-open');
}

/* ── Save Activity ────────────────────────────────────────*/
async function saveActivity() {
  var type = document.getElementById('activityType').value;
  var from = getTimePickerValue('From');
  var end  = getTimePickerValue('End');
  var loc  = document.getElementById('activityLocation').value.trim();
  var valid = true;

  ['activityGenErr','activityOverlapErr'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });

  if (!type) {
    document.getElementById('activityTypeErr').classList.add('visible'); valid = false;
  } else { document.getElementById('activityTypeErr').classList.remove('visible'); }

  if (!from) {
    document.getElementById('activityFromErr').classList.add('visible');
    document.getElementById('activityFromWrap').classList.add('is-error'); valid = false;
  } else {
    document.getElementById('activityFromErr').classList.remove('visible');
    document.getElementById('activityFromWrap').classList.remove('is-error');
  }

  if (!end) {
    document.getElementById('activityEndErr').classList.add('visible');
    document.getElementById('activityEndWrap').classList.add('is-error'); valid = false;
  } else {
    document.getElementById('activityEndErr').classList.remove('visible');
    document.getElementById('activityEndWrap').classList.remove('is-error');
  }

  if (from && end && from >= end) {
    document.getElementById('activityGenErr').classList.add('visible'); valid = false;
  }
  if (!valid) return;

  var btn = document.getElementById('saveActivityBtn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  /* ── Overlap check (graceful — skip if RPC not ready) ──
     If check_activity_overlap RPC is not yet created in
     Supabase, we skip the check and allow the save.
     Run supabase-update-4.sql to enable overlap prevention.
  ─────────────────────────────────────────────────────── */
  try {
    var overlapRes = await DAM.db().rpc('check_activity_overlap', {
      p_user_id:   currentUser.id,
      p_group_id:  null,
      p_date:      pendingDate,
      p_from:      from.substring(0, 5),
      p_end:       end.substring(0, 5),
      p_exclude_id: null
    });

    if (overlapRes.data === true) {
      btn.textContent = 'Save Activity'; btn.disabled = false;
      var oe = document.getElementById('activityOverlapErr');
      if (oe) {
        oe.textContent = '⚠ This time overlaps with an existing activity. Please choose a different time.';
        oe.classList.add('visible');
      }
      return;
    }
  } catch (overlapErr) {
    /* RPC not set up yet — continue with save */
    console.info('[DAM] Overlap check skipped (RPC not available yet)');
  }

  /* ── Insert activity ────────────────────────────────── */
  var res = await DAM.db().from('activities').insert({
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

  if (res.error) {
    console.error('[DAM] Insert error:', res.error);
    alert('Could not save activity:\n\n' + res.error.message +
          '\n\nHint: Have you run supabase-update-4.sql in your Supabase SQL Editor?');
    return;
  }

  console.log('[DAM] Activity saved successfully');
  document.getElementById('addActivityModal').classList.remove('is-open');
  await renderCalendar();
}

/* ── Popup helpers ────────────────────────────────────────*/
function positionPopup(cellEl) {
  var popup = document.getElementById('dayPopup');
  if (!popup || !cellEl) return;
  var rect = cellEl.getBoundingClientRect();
  var popW = 300; var popH = 340;
  var vw = window.innerWidth; var vh = window.innerHeight;
  var top = rect.bottom + 6; var left = rect.left;
  if (left + popW > vw - 12) left = vw - popW - 12;
  if (left < 8) left = 8;
  popup.classList.remove('arrow-right','opens-up');
  if (left > rect.left + 20) popup.classList.add('arrow-right');
  if (top + popH > vh - 16) {
    top = rect.top - popH - 6;
    if (top < 8) top = 8;
    popup.classList.add('opens-up');
  }
  popup.style.top = top + 'px'; popup.style.left = left + 'px';
}

function closeDayPopup() {
  var p = document.getElementById('dayPopup');
  var b = document.getElementById('dayPopupBackdrop');
  if (p) p.classList.remove('is-open');
  if (b) b.classList.remove('is-open');
}

/* ── Open day popup ───────────────────────────────────────*/
async function openViewDay(dateStr, cellEl) {
  var popup   = document.getElementById('dayPopup');
  var body    = document.getElementById('dayPopupBody');
  var titleEl = document.getElementById('dayPopupTitle');
  var subEl   = document.getElementById('dayPopupSubtitle');
  var addBtn  = document.getElementById('dayPopupAddBtn');

  if (!popup || !body) return;

  var d = new Date(dateStr + 'T00:00:00');
  titleEl.textContent = d.toLocaleDateString('en-CA',{weekday:'long'});
  subEl.textContent   = d.toLocaleDateString('en-CA',{month:'long',day:'numeric',year:'numeric'});

  body.innerHTML = '<div class="day-popup-empty"><div class="day-popup-empty-icon">⏳</div>Loading…</div>';
  if (cellEl) positionPopup(cellEl);
  popup.classList.add('is-open');
  document.getElementById('dayPopupBackdrop').classList.add('is-open');

  addBtn.onclick = function () { closeDayPopup(); openAddActivity(dateStr); };

  /* Fetch all user activities for this day then filter personal */
  var res = await DAM.db()
    .from('activities')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('activity_date', dateStr)
    .order('from_time');

  var acts = (res.data || []).filter(function (a) { return !a.group_id; });

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
      ? '<div class="day-popup-item-loc">📍 ' + esc(a.location) + '</div>'
      : '';
    return '<div class="day-popup-item" style="border-left:3px solid ' + col.border + ';">' +
      '<div class="day-popup-item-icon">' + icon + '</div>' +
      '<div class="day-popup-item-body">' +
        '<div class="day-popup-item-name">' + dot + esc(a.activity) + '</div>' +
        '<div class="day-popup-item-time">🕐 ' + fmt12h(a.from_time) + ' – ' + fmt12h(a.end_time) + '</div>' +
        loc +
      '</div>' +
      '<button class="day-popup-delete" title="Remove" ' +
        'onclick="deleteActivityPopup(\'' + a.id + '\',\'' + dateStr + '\')">🗑</button>' +
    '</div>';
  }).join('');
}

async function deleteActivityPopup(actId, dateStr) {
  if (!confirm('Remove this activity?')) return;
  var res = await DAM.db().from('activities').delete().eq('id', actId);
  if (res.error) { alert('Error: ' + res.error.message); return; }
  await openViewDay(dateStr, null);
  await renderCalendar();
}

/* ── Utilities ────────────────────────────────────────────*/
function toDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}
function formatShort(d) {
  return d.toLocaleDateString('en-CA',{month:'short',day:'numeric'});
}
function fmt12h(t) {
  if (!t) return '';
  var p = t.split(':'); var h = parseInt(p[0]); var m = p[1];
  return (h % 12 || 12) + ':' + m + (h >= 12 ? ' PM' : ' AM');
}
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
