/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — personal-dashboard.js  (v2)
   • New activities: Prayer Time, Visit Spiritual Place
   • Custom time dropdowns (H/M/AM-PM)
   • Hover tooltip showing scheduled activities
   • Status dots: green (active now), red (upcoming), grey (done)
   ═══════════════════════════════════════════════════════════ */

var ACTIVITY_ICONS = {
  'Cycling':'🚴','Jogging':'🏃','Reading':'📚','Gardening':'🌱',
  'Breakfast Prep':'🍳','Lunch Prep':'🥗','Dinner Prep':'🍽️',
  'Hydration':'💧','Personal Care':'🧴','Work':'💼',
  'Drop kids':'🚗','Pick-up kids':'🏫','Learning':'📖','Commute':'🚌',
  'Prayer Time':'🙏','Visit Spiritual Place':'⛪'
};

var currentUser   = null;
var calWeekOffset = 0;
var pendingDate   = null;

/* ── Init ─────────────────────────────────────────────────*/
document.addEventListener('DOMContentLoaded', async function () {

  await new Promise(function (r) { setTimeout(r, 500); });
  var sessionResult = await DAM.auth().getSession();
  var session = sessionResult.data && sessionResult.data.session ? sessionResult.data.session : null;
  currentUser = session ? session.user : null;
  if (!currentUser) return;

  /* Profile summary tiles */
  var pRes = await DAM.db().from('profiles')
    .select('first_name, last_name').eq('id', currentUser.id).single();
  var p = pRes.data || {};
  document.getElementById('pName').textContent = ((p.first_name||'') + ' ' + (p.last_name||'')).trim() || '—';
  document.getElementById('pEmail').textContent = currentUser.email || '—';
  document.getElementById('pLastVisit').textContent = currentUser.last_sign_in_at
    ? new Date(currentUser.last_sign_in_at).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})
    : 'Today';

  await renderCalendar();

  /* Navigation */
  document.getElementById('calPrev').addEventListener('click', async function () { calWeekOffset--; await renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', async function () { calWeekOffset++; await renderCalendar(); });

  /* Build custom time pickers */
  buildTimePicker('From', 'activityFromWrap');
  buildTimePicker('End',  'activityEndWrap');

  /* Modal close handlers */
  document.getElementById('cancelActivityBtn').addEventListener('click', function () {
    document.getElementById('addActivityModal').classList.remove('is-open');
  });
  document.getElementById('addActivityModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('is-open');
  });
  document.getElementById('saveActivityBtn').addEventListener('click', saveActivity);

  /* Day popup close handlers */
  document.getElementById('dayPopupClose').addEventListener('click', closeDayPopup);
  document.getElementById('dayPopupBackdrop').addEventListener('click', closeDayPopup);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDayPopup();
  });
});

/* ── Build custom time picker dropdowns ───────────────────*/
function buildTimePicker(label, wrapperId) {
  var wrap = document.getElementById(wrapperId);
  if (!wrap) return;

  /* Hours 1–12 */
  var hSel = document.createElement('select');
  hSel.className = 'time-sel'; hSel.id = 'tp_h_' + label;
  hSel.setAttribute('aria-label', label + ' hour');
  var hOpt = '<option value="">HH</option>';
  for (var h = 1; h <= 12; h++) hOpt += '<option value="' + h + '">' + String(h).padStart(2,'0') + '</option>';
  hSel.innerHTML = hOpt;

  /* Separator */
  var sep = document.createElement('span');
  sep.className = 'time-sep'; sep.textContent = ':';

  /* Minutes 00–59 */
  var mSel = document.createElement('select');
  mSel.className = 'time-sel'; mSel.id = 'tp_m_' + label;
  mSel.setAttribute('aria-label', label + ' minute');
  var mOpt = '<option value="">MM</option>';
  for (var m = 0; m <= 59; m++) mOpt += '<option value="' + m + '">' + String(m).padStart(2,'0') + '</option>';
  mSel.innerHTML = mOpt;

  /* AM / PM */
  var ampm = document.createElement('select');
  ampm.className = 'time-ampm'; ampm.id = 'tp_ap_' + label;
  ampm.setAttribute('aria-label', label + ' AM PM');
  ampm.innerHTML = '<option value="AM">AM</option><option value="PM">PM</option>';

  wrap.appendChild(hSel);
  wrap.appendChild(sep);
  wrap.appendChild(mSel);
  wrap.appendChild(ampm);
}

/* ── Read time picker value as HH:MM (24h) ───────────────*/
function getTimePickerValue(label) {
  var h  = document.getElementById('tp_h_' + label);
  var m  = document.getElementById('tp_m_' + label);
  var ap = document.getElementById('tp_ap_' + label);
  if (!h || !m || !h.value || !m.value) return null;
  var hour = parseInt(h.value);
  var ap_v = ap ? ap.value : 'AM';
  if (ap_v === 'PM' && hour !== 12) hour += 12;
  if (ap_v === 'AM' && hour === 12) hour = 0;
  return String(hour).padStart(2,'0') + ':' + String(m.value).padStart(2,'0') + ':00';
}

function resetTimePicker(label) {
  ['tp_h_','tp_m_','tp_ap_'].forEach(function (pfx) {
    var el = document.getElementById(pfx + label);
    if (el) el.selectedIndex = 0;
  });
}

/* ── Status dot for an activity ──────────────────────────*/
function getStatusDot(act, dateStr) {
  var now     = new Date();
  var todayStr= toDateStr(now);
  if (dateStr !== todayStr) {
    /* Past or future date */
    var actDate = new Date(dateStr + 'T00:00:00');
    if (actDate < now) return '<span class="cal5-status-dot done"></span>';
    return '<span class="cal5-status-dot upcoming"></span>';
  }
  /* Today — compare times */
  var nowMins   = now.getHours() * 60 + now.getMinutes();
  var fromParts = (act.from_time||'00:00').split(':');
  var endParts  = (act.end_time ||'00:00').split(':');
  var fromMins  = parseInt(fromParts[0]) * 60 + parseInt(fromParts[1]);
  var endMins   = parseInt(endParts[0])  * 60 + parseInt(endParts[1]);
  if (nowMins >= fromMins && nowMins <= endMins) {
    return '<span class="cal5-status-dot active"></span>';
  }
  if (nowMins < fromMins) {
    return '<span class="cal5-status-dot upcoming"></span>';
  }
  return '<span class="cal5-status-dot done"></span>';
}

/* ── 5-Day calendar renderer ─────────────────────────────*/
async function renderCalendar() {
  var root = document.getElementById('calendarRoot');
  root.innerHTML = '<p style="color:var(--color-ink-muted); padding:1.5rem; text-align:center;">Loading your schedule…</p>';

  var today  = new Date();
  var monday = new Date(today);
  var dow    = today.getDay() || 7;
  monday.setDate(today.getDate() - dow + 1 + (calWeekOffset * 5));

  var days = [];
  for (var i = 0; i < 5; i++) {
    var d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d);
  }

  var todayStr = toDateStr(today);
  var dateFrom = toDateStr(days[0]);
  var dateTo   = toDateStr(days[4]);

  /* Week label */
  var wkLabel = formatShort(days[0]) + ' – ' + formatShort(days[4]);
  var weekLabelEl = document.getElementById('calWeekLabel');
  if (weekLabelEl) weekLabelEl.textContent = wkLabel;

  var actRes = await DAM.db()
    .from('activities').select('*')
    .eq('user_id', currentUser.id).is('group_id', null)
    .gte('activity_date', dateFrom).lte('activity_date', dateTo)
    .order('from_time');
  var acts = actRes.data || [];

  /* Build header */
  var header = '<div class="cal5-header">';
  days.forEach(function (d) {
    var ds = toDateStr(d);
    var isToday = ds === todayStr;
    var dayAbbr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    if (isToday) {
      header += '<div class="cal5-header-cell today">' +
        '<span class="hdr-day">' + dayAbbr + '</span>' +
        '<span class="hdr-date">' + d.getDate() + '</span></div>';
    } else {
      header += '<div class="cal5-header-cell">' +
        '<span class="hdr-day">' + dayAbbr + '</span>' +
        '<span class="hdr-date" style="font-size:1.1rem; font-weight:700; color:#fff; display:block; margin-top:2px;">' + d.getDate() + '</span></div>';
    }
  });
  header += '</div>';

  /* Build grid */
  var body = '<div class="cal5-grid">';
  days.forEach(function (d) {
    var ds      = toDateStr(d);
    var isToday = ds === todayStr;
    var isPast  = d < today && !isToday;
    var dayActs = acts.filter(function (a) { return a.activity_date === ds; });

    /* Activity chips (max 3 visible) */
    var chips = '';
    dayActs.slice(0, 3).forEach(function (a) {
      var icon = ACTIVITY_ICONS[a.activity] || '📌';
      var dot  = getStatusDot(a, ds);
      chips += '<div class="cal5-activity">' +
        dot +
        '<span class="cal5-activity-icon">' + icon + '</span>' +
        '<span class="cal5-activity-text">' + esc(a.activity) + '</span>' +
      '</div>';
    });
    if (dayActs.length > 3) chips += '<div class="cal5-more">+' + (dayActs.length - 3) + ' more</div>';

    /* Hover tooltip */
    var tipRows = '';
    if (dayActs.length === 0) {
      tipRows = '<div class="cal5-tooltip-empty">No activities</div>';
    } else {
      dayActs.slice(0, 5).forEach(function (a) {
        var icon = ACTIVITY_ICONS[a.activity] || '📌';
        tipRows += '<div class="cal5-tooltip-row">' +
          '<span class="cal5-tooltip-icon">' + icon + '</span>' +
          '<span>' +
            '<div class="cal5-tooltip-name">' + esc(a.activity) + '</div>' +
            '<div class="cal5-tooltip-time">' + fmt12h(a.from_time) + '–' + fmt12h(a.end_time) +
              (a.location ? ' · ' + esc(a.location) : '') +
            '</div>' +
          '</span>' +
        '</div>';
      });
      if (dayActs.length > 5) tipRows += '<div class="cal5-tooltip-empty">+' + (dayActs.length-5) + ' more</div>';
    }

    var cellClass = 'cal5-cell' + (isToday ? ' today' : '') + (isPast ? ' past' : '');

    body += '<div class="' + cellClass + '" onclick="openViewDay(\'' + ds + '\', this)">' +
      '<div class="cal5-day-num' + (isToday ? ' today-num' : '') + '">' +
        '<span>' + d.getDate() + '</span>' +
        '<div class="cal5-controls">' +
          '<button class="cal5-btn plus" title="Add activity" onclick="event.stopPropagation(); openAddActivity(\'' + ds + '\')">+</button>' +
          '<button class="cal5-btn minus" title="View/edit" onclick="event.stopPropagation(); openViewDay(\'' + ds + '\', this.closest(\'.cal5-cell\'))">−</button>' +
        '</div>' +
      '</div>' +
      chips +
      '<div class="cal5-tooltip">' + tipRows + '</div>' +
    '</div>';
  });
  body += '</div>';

  root.innerHTML = '<div class="cal5-wrap">' + header + body + '</div>';
}

/* ── Open add activity modal ─────────────────────────────*/
function openAddActivity(dateStr) {
  pendingDate = dateStr;
  document.getElementById('addActivityDate').textContent = formatDisplayDate(dateStr);
  document.getElementById('activityType').value = '';
  document.getElementById('activityLocation').value = '';
  resetTimePicker('From');
  resetTimePicker('End');
  ['activityTypeErr','activityFromErr','activityEndErr','activityGenErr'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
  ['activityFromWrap','activityEndWrap'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('is-error');
  });
  document.getElementById('addActivityModal').classList.add('is-open');
}

/* ── Save activity ────────────────────────────────────────*/
async function saveActivity() {
  var type = document.getElementById('activityType').value;
  var from = getTimePickerValue('From');
  var end  = getTimePickerValue('End');
  var loc  = document.getElementById('activityLocation').value.trim();
  var valid = true;

  document.getElementById('activityGenErr').classList.remove('visible');

  if (!type) {
    document.getElementById('activityTypeErr').classList.add('visible'); valid = false;
  } else {
    document.getElementById('activityTypeErr').classList.remove('visible');
  }

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

  if (res.error) { alert('Error saving: ' + res.error.message); return; }

  document.getElementById('addActivityModal').classList.remove('is-open');
  await renderCalendar();
}

/* ── View day schedule modal ──────────────────────────────*/
/* ── Popup positioning engine ─────────────────────────────*/
function positionPopup(cellEl) {
  var popup = document.getElementById('dayPopup');
  if (!popup || !cellEl) return;

  var rect  = cellEl.getBoundingClientRect();
  var popW  = 300;
  var popH  = 340;   /* estimated max height */
  var vw    = window.innerWidth;
  var vh    = window.innerHeight;

  /* Default: open below the cell */
  var top  = rect.bottom + 6;
  var left = rect.left;

  /* Clamp right edge */
  if (left + popW > vw - 12) left = vw - popW - 12;
  if (left < 8) left = 8;

  /* Determine arrow side */
  popup.classList.remove('arrow-right', 'opens-up');
  if (left > rect.left + 20) popup.classList.add('arrow-right');

  /* Flip upward if not enough space below */
  if (top + popH > vh - 16) {
    top = rect.top - popH - 6;
    if (top < 8) top = 8;
    popup.classList.add('opens-up');
  }

  popup.style.top  = top  + 'px';
  popup.style.left = left + 'px';
}

function closeDayPopup() {
  document.getElementById('dayPopup').classList.remove('is-open');
  document.getElementById('dayPopupBackdrop').classList.remove('is-open');
}

/* ── Open day schedule popup ─────────────────────────────*/
async function openViewDay(dateStr, cellEl) {
  var popup    = document.getElementById('dayPopup');
  var body     = document.getElementById('dayPopupBody');
  var titleEl  = document.getElementById('dayPopupTitle');
  var subEl    = document.getElementById('dayPopupSubtitle');
  var addBtn   = document.getElementById('dayPopupAddBtn');

  /* Format date for header */
  var d       = new Date(dateStr + 'T00:00:00');
  var dayName = d.toLocaleDateString('en-CA', { weekday: 'long' });
  var dateFmt = d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });

  titleEl.textContent = dayName;
  subEl.textContent   = dateFmt;

  /* Show loading state */
  body.innerHTML = '<div class="day-popup-empty"><div class="day-popup-empty-icon">⏳</div>Loading…</div>';

  /* Position popup near clicked cell before showing */
  if (cellEl) positionPopup(cellEl);

  popup.classList.add('is-open');
  document.getElementById('dayPopupBackdrop').classList.add('is-open');

  /* Wire Add button */
  addBtn.onclick = function () {
    closeDayPopup();
    openAddActivity(dateStr);
  };

  /* Fetch activities */
  var res = await DAM.db().from('activities')
    .select('*').eq('user_id', currentUser.id).is('group_id', null)
    .eq('activity_date', dateStr).order('from_time');
  var acts = res.data || [];

  if (!acts.length) {
    body.innerHTML =
      '<div class="day-popup-empty">' +
        '<div class="day-popup-empty-icon">📭</div>' +
        'No activities scheduled' +
      '</div>';
    return;
  }

  body.innerHTML = acts.map(function (a) {
    var icon = ACTIVITY_ICONS[a.activity] || '📌';
    var dot  = getStatusDot(a, dateStr);
    var loc  = a.location
      ? '<div class="day-popup-item-loc">📍 ' + esc(a.location) + '</div>'
      : '';
    return '<div class="day-popup-item">' +
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
  await DAM.db().from('activities').delete().eq('id', actId);
  await openViewDay(dateStr, null);  /* refresh popup in place */
  await renderCalendar();
}

/* ── Utilities ────────────────────────────────────────────*/
function toDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function formatDisplayDate(ds) {
  var d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}
function formatShort(d) {
  return d.toLocaleDateString('en-CA',{month:'short',day:'numeric'});
}
function fmt12h(t) {
  if (!t) return '';
  var p = t.split(':'); var h = parseInt(p[0]); var m = p[1];
  return (h%12||12) + ':' + m + (h>=12?' PM':' AM');
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
