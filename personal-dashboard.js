/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — personal-dashboard.js
   Personal 5-day calendar, activity add/view/delete
   ═══════════════════════════════════════════════════════════ */

var ACTIVITY_ICONS = {
  'Cycling':'🚴','Jogging':'🏃','Reading':'📚','Gardening':'🌱',
  'Breakfast Prep':'🍳','Lunch Prep':'🥗','Dinner Prep':'🍽️',
  'Hydration':'💧','Personal Care':'🧴','Work':'💼',
  'Drop kids':'🚗','Pick-up kids':'🏫','Learning':'📖','Commute':'🚌'
};

var currentUser  = null;
var calWeekOffset= 0;
var pendingDate  = null;

document.addEventListener('DOMContentLoaded', async function () {

  await new Promise(function (r) { setTimeout(r, 500); });
  var sessionResult = await DAM.auth().getSession();
  var session = sessionResult.data && sessionResult.data.session ? sessionResult.data.session : null;
  currentUser = session ? session.user : null;
  if (!currentUser) return;

  /* Fill profile summary */
  var pRes = await DAM.db().from('profiles')
    .select('first_name, last_name').eq('id', currentUser.id).single();
  var p = pRes.data || {};
  document.getElementById('pName').textContent      = ((p.first_name||'') + ' ' + (p.last_name||'')).trim() || '—';
  document.getElementById('pEmail').textContent     = currentUser.email || '—';
  document.getElementById('pLastVisit').textContent = currentUser.last_sign_in_at
    ? new Date(currentUser.last_sign_in_at).toLocaleDateString('en-CA', {month:'short', day:'numeric', year:'numeric'})
    : 'Today';

  /* Render calendar */
  await renderCalendar();

  /* Navigation */
  document.getElementById('calPrev').addEventListener('click', async function () { calWeekOffset--; await renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', async function () { calWeekOffset++; await renderCalendar(); });

  /* Add activity modal */
  document.getElementById('cancelActivityBtn').addEventListener('click', function () {
    document.getElementById('addActivityModal').classList.remove('is-open');
  });
  document.getElementById('addActivityModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('is-open');
  });
  document.getElementById('saveActivityBtn').addEventListener('click', saveActivity);

  /* View day modal close */
  document.getElementById('closeViewDayBtn').addEventListener('click', function () {
    document.getElementById('viewDayModal').classList.remove('is-open');
  });
  document.getElementById('viewDayModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('is-open');
  });
});

/* ── 5-day personal calendar ─────────────────────────────*/
async function renderCalendar() {
  var root  = document.getElementById('calendarRoot');
  root.innerHTML = '<p style="color:var(--color-ink-muted); padding:1rem;">Loading…</p>';

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

  var actRes = await DAM.db()
    .from('activities')
    .select('*')
    .eq('user_id', currentUser.id)
    .is('group_id', null)
    .gte('activity_date', dateFrom)
    .lte('activity_date', dateTo)
    .order('from_time');
  var acts = actRes.data || [];

  var weekdays = ['Mon','Tue','Wed','Thu','Fri'];
  var header = '<div class="cal5-header">';
  var body   = '<div class="cal5-grid">';

  days.forEach(function (d, i) {
    var isToday = toDateStr(d) === todayStr;
    header += '<div class="cal5-header-cell' + (isToday ? ' today' : '') + '">' +
      weekdays[i] + ' ' + d.getDate() + '/' + (d.getMonth()+1) + '</div>';
  });
  header += '</div>';

  days.forEach(function (d) {
    var ds      = toDateStr(d);
    var isToday = ds === todayStr;
    var dayActs = acts.filter(function (a) { return a.activity_date === ds; });

    var chips = '';
    dayActs.slice(0, 3).forEach(function (a) {
      var icon = ACTIVITY_ICONS[a.activity] || '📌';
      chips += '<div class="cal5-activity">' +
        '<span class="cal5-activity-icon">' + icon + '</span>' +
        '<span class="cal5-activity-text">' + esc(a.activity) + '</span>' +
      '</div>';
    });
    if (dayActs.length > 3) chips += '<div class="cal5-more">+' + (dayActs.length-3) + ' more</div>';

    body += '<div class="cal5-cell' + (isToday ? ' today' : '') + '" onclick="openViewDay(\'' + ds + '\')">' +
      '<div class="cal5-day-num' + (isToday ? ' today-num' : '') + '">' +
        '<span>' + d.getDate() + '</span>' +
        '<div class="cal5-controls">' +
          '<button class="cal5-btn plus" title="Add" onclick="event.stopPropagation(); openAddActivity(\'' + ds + '\')">+</button>' +
          '<button class="cal5-btn minus" title="View/Edit" onclick="event.stopPropagation(); openViewDay(\'' + ds + '\')">−</button>' +
        '</div>' +
      '</div>' + chips +
    '</div>';
  });

  body += '</div>';
  root.innerHTML = header + body;
}

function openAddActivity(dateStr) {
  pendingDate = dateStr;
  document.getElementById('addActivityDate').textContent  = formatDisplayDate(dateStr);
  document.getElementById('activityType').value     = '';
  document.getElementById('activityFrom').value     = '';
  document.getElementById('activityEnd').value      = '';
  document.getElementById('activityLocation').value = '';
  ['activityTypeErr','activityFromErr','activityEndErr','activityGenErr'].forEach(function (id) {
    document.getElementById(id).classList.remove('visible');
  });
  document.getElementById('addActivityModal').classList.add('is-open');
}

async function saveActivity() {
  var type = document.getElementById('activityType').value;
  var from = document.getElementById('activityFrom').value;
  var end  = document.getElementById('activityEnd').value;
  var loc  = document.getElementById('activityLocation').value.trim();
  var valid = true;

  document.getElementById('activityGenErr').classList.remove('visible');
  if (!type) { document.getElementById('activityTypeErr').classList.add('visible'); valid = false; }
  else        { document.getElementById('activityTypeErr').classList.remove('visible'); }
  if (!from)  { document.getElementById('activityFromErr').classList.add('visible'); valid = false; }
  else        { document.getElementById('activityFromErr').classList.remove('visible'); }
  if (!end)   { document.getElementById('activityEndErr').classList.add('visible'); valid = false; }
  else        { document.getElementById('activityEndErr').classList.remove('visible'); }
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
  if (res.error) { alert('Error: ' + res.error.message); return; }
  document.getElementById('addActivityModal').classList.remove('is-open');
  await renderCalendar();
}

async function openViewDay(dateStr) {
  var modal  = document.getElementById('viewDayModal');
  var listEl = document.getElementById('viewDayList');
  document.getElementById('viewDayTitle').textContent = formatDisplayDate(dateStr);
  listEl.innerHTML = '<p style="color:var(--color-ink-muted); font-size:0.9rem;">Loading…</p>';
  modal.classList.add('is-open');

  var res = await DAM.db().from('activities')
    .select('*').eq('user_id', currentUser.id).is('group_id', null)
    .eq('activity_date', dateStr).order('from_time');
  var acts = res.data || [];

  if (!acts.length) {
    listEl.innerHTML = '<p style="color:var(--color-ink-muted); font-size:0.9rem; padding:0.5rem 0;">No activities scheduled for this day.</p>';
    return;
  }

  listEl.innerHTML = acts.map(function (a) {
    var icon = ACTIVITY_ICONS[a.activity] || '📌';
    var loc  = a.location ? ' — ' + esc(a.location) : '';
    return '<div class="schedule-item">' +
      '<div class="schedule-item-icon">' + icon + '</div>' +
      '<div class="schedule-item-body">' +
        '<div class="schedule-item-name">' + esc(a.activity) + '</div>' +
        '<div class="schedule-item-time">' + fmt12h(a.from_time) + ' to ' + fmt12h(a.end_time) + loc + '</div>' +
      '</div>' +
      '<button onclick="deleteActivity(\'' + a.id + '\',\'' + dateStr + '\')" ' +
        'style="background:none;border:none;cursor:pointer;color:#E74C3C;font-size:1rem;padding:0.25rem;" title="Remove">🗑</button>' +
    '</div>';
  }).join('');
}

async function deleteActivity(actId, dateStr) {
  if (!confirm('Remove this activity?')) return;
  await DAM.db().from('activities').delete().eq('id', actId);
  await openViewDay(dateStr);
  await renderCalendar();
}

/* Utility */
function toDateStr(d) {
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function formatDisplayDate(ds) {
  var d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}
function fmt12h(t) {
  if (!t) return ''; var p=t.split(':'); var h=parseInt(p[0]); var m=p[1];
  return (h%12||12)+':'+m+(h>=12?' PM':' AM');
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
