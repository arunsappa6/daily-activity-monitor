/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — group-dashboard.js
   Handles: group list, 5-day calendar, activity CRUD,
            join group modal, admin approval requests
   ═══════════════════════════════════════════════════════════ */

/* Activity emoji map */
var ACTIVITY_ICONS = {
  'Cycling':       '🚴', 'Jogging':       '🏃',
  'Reading':       '📚', 'Gardening':     '🌱',
  'Breakfast Prep':'🍳', 'Lunch Prep':    '🥗',
  'Dinner Prep':   '🍽️', 'Hydration':    '💧',
  'Personal Care': '🧴', 'Work':          '💼',
  'Drop kids':     '🚗', 'Pick-up kids':  '🏫',
  'Learning':      '📖', 'Commute':       '🚌',
  'Prayer Time':   '🙏', 'Visit Spiritual Place': '⛪'
};

/* ── Build custom time picker ─────────────────────────── */
function buildTimePicker(label, wrapperId) {
  var wrap = document.getElementById(wrapperId);
  if (!wrap) return;
  var hSel = document.createElement('select');
  hSel.className = 'time-sel'; hSel.id = 'tp_h_' + label;
  hSel.setAttribute('aria-label', label + ' hour');
  var hOpt = '<option value="">HH</option>';
  for (var h = 1; h <= 12; h++) hOpt += '<option value="' + h + '">' + String(h).padStart(2,'0') + '</option>';
  hSel.innerHTML = hOpt;
  var sep = document.createElement('span');
  sep.className = 'time-sep'; sep.textContent = ':';
  var mSel = document.createElement('select');
  mSel.className = 'time-sel'; mSel.id = 'tp_m_' + label;
  mSel.setAttribute('aria-label', label + ' minute');
  var mOpt = '<option value="">MM</option>';
  for (var m = 0; m <= 59; m++) mOpt += '<option value="' + m + '">' + String(m).padStart(2,'0') + '</option>';
  mSel.innerHTML = mOpt;
  var ampm = document.createElement('select');
  ampm.className = 'time-ampm'; ampm.id = 'tp_ap_' + label;
  ampm.innerHTML = '<option value="AM">AM</option><option value="PM">PM</option>';
  wrap.appendChild(hSel); wrap.appendChild(sep); wrap.appendChild(mSel); wrap.appendChild(ampm);
}

function getTimePickerValue(label) {
  var h = document.getElementById('tp_h_' + label);
  var m = document.getElementById('tp_m_' + label);
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

/* ── Status dot ─────────────────────────────────────────── */
function getStatusDot(act, dateStr) {
  var now = new Date();
  var todayStr = toDateStr(now);
  if (dateStr !== todayStr) {
    var actDate = new Date(dateStr + 'T00:00:00');
    if (actDate < now) return '<span class="cal5-status-dot done"></span>';
    return '<span class="cal5-status-dot upcoming"></span>';
  }
  var nowMins = now.getHours() * 60 + now.getMinutes();
  var fromP = (act.from_time||'00:00').split(':');
  var endP  = (act.end_time ||'00:00').split(':');
  var fMins = parseInt(fromP[0]) * 60 + parseInt(fromP[1]);
  var eMins = parseInt(endP[0])  * 60 + parseInt(endP[1]);
  if (nowMins >= fMins && nowMins <= eMins) return '<span class="cal5-status-dot active"></span>';
  if (nowMins < fMins) return '<span class="cal5-status-dot upcoming"></span>';
  return '<span class="cal5-status-dot done"></span>';
}

var currentUser    = null;
var currentProfile = null;
var myGroups       = [];
var selectedGroup  = null;
var calWeekOffset  = 0;   // 0 = current week
var activitiesCache= {};  // key: groupId-YYYY-MM-DD
var allGroupNames  = [];  // for autocomplete

document.addEventListener('DOMContentLoaded', async function () {

  /* ── Wait for session ─────────────────────────────────── */
  await new Promise(function (r) { setTimeout(r, 500); });
  var sessionResult = await DAM.auth().getSession();
  var session = sessionResult.data && sessionResult.data.session ? sessionResult.data.session : null;
  currentUser = session ? session.user : null;
  if (!currentUser) return;

  /* ── Get profile ──────────────────────────────────────── */
  var pRes = await DAM.db().from('profiles')
    .select('first_name, last_name, is_admin')
    .eq('id', currentUser.id).single();
  currentProfile = pRes.data || {};

  /* ── Load all groups (for autocomplete + display) ─────── */
  var allGroupsRes = await DAM.db().from('groups').select('id, name, created_by, created_at');
  allGroupNames = allGroupsRes.data || [];

  /* ── Load groups I'm part of ──────────────────────────── */
  await loadMyGroups();

  /* ── Load admin pending requests ─────────────────────── */
  await loadPendingRequests();

  /* ── Calendar navigation ──────────────────────────────── */
  document.getElementById('calPrev').addEventListener('click', function () {
    calWeekOffset--; renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', function () {
    calWeekOffset++; renderCalendar();
  });

  /* ── Join Group modal ──────────────────────────────────── */
  setupJoinModal();

  /* ── Activity modal ────────────────────────────────────── */
  setupActivityModal();

  /* ── Day popup close handlers ──────────────────────────── */
  document.getElementById('dayPopupClose').addEventListener('click', closeDayPopup);
  document.getElementById('dayPopupBackdrop').addEventListener('click', closeDayPopup);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDayPopup();
  });

});

/* ── Load groups the current user created or is a member of */
async function loadMyGroups() {
  var listEl = document.getElementById('groupList');
  var subtitleEl = document.getElementById('groupSubtitle');

  /* Groups I created */
  var createdRes = await DAM.db()
    .from('groups').select('id, name, created_at, created_by')
    .eq('created_by', currentUser.id);

  /* Groups where my email is listed as a member AND request was accepted */
  var memberRes = await DAM.db()
    .from('group_join_requests')
    .select('group_id, group_name')
    .eq('email', currentUser.email)
    .eq('status', 'accepted');

  var memberGroupIds = (memberRes.data || []).map(function (r) { return r.group_id; });

  var memberGroups = [];
  if (memberGroupIds.length > 0) {
    var mgRes = await DAM.db()
      .from('groups').select('id, name, created_at, created_by')
      .in('id', memberGroupIds);
    memberGroups = mgRes.data || [];
  }

  /* Merge, deduplicate */
  var created = createdRes.data || [];
  var allMy = created.slice();
  memberGroups.forEach(function (g) {
    if (!allMy.find(function (x) { return x.id === g.id; })) allMy.push(g);
  });
  myGroups = allMy;

  subtitleEl.textContent = myGroups.length > 0
    ? 'You are part of ' + myGroups.length + ' group' + (myGroups.length !== 1 ? 's' : '') + '.'
    : 'You have not joined or created any groups yet.';

  if (myGroups.length === 0) {
    listEl.innerHTML = '<p style="font-size:0.85rem; color:var(--color-ink-light); font-style:italic; padding:0.5rem 0;">No groups yet. Create or join one!</p>';
    return;
  }

  listEl.innerHTML = '';
  myGroups.forEach(function (g) {
    var isAdmin = g.created_by === currentUser.id;
    var initial = (g.name || '?').charAt(0).toUpperCase();
    var btn = document.createElement('button');
    btn.className = 'group-list-item';
    btn.innerHTML = [
      '<div class="group-list-icon">' + initial + '</div>',
      '<span class="group-list-name">' + esc(g.name) + '</span>',
      isAdmin ? '<span class="group-list-badge">Admin</span>' : ''
    ].join('');
    btn.addEventListener('click', function () {
      document.querySelectorAll('.group-list-item').forEach(function (el) { el.classList.remove('active'); });
      btn.classList.add('active');
      selectGroup(g);
    });
    listEl.appendChild(btn);
  });
}

/* ── Select a group and show its calendar ─────────────────*/
function selectGroup(group) {
  selectedGroup = group;
  calWeekOffset = 0;
  document.getElementById('calPanelEmpty').style.display  = 'none';
  document.getElementById('calendarWrap').style.display   = 'block';
  document.getElementById('calGroupTitle').textContent    = group.name;
  renderCalendar();
}

/* ── 5-Day Calendar Renderer ──────────────────────────────*/
async function renderCalendar() {
  var root = document.getElementById('calendarRoot');
  root.innerHTML = '<p style="padding:1rem; color:var(--color-ink-muted); text-align:center;">Loading schedule…</p>';

  var today = new Date();
  var monday = new Date(today);
  var dayOfWeek = today.getDay() || 7;
  monday.setDate(today.getDate() - dayOfWeek + 1 + (calWeekOffset * 5));

  var days = [];
  for (var i = 0; i < 5; i++) {
    var d = new Date(monday); d.setDate(monday.getDate() + i); days.push(d);
  }

  var todayStr = toDateStr(today);
  var dateFrom = toDateStr(days[0]);
  var dateTo   = toDateStr(days[4]);

  var actRes = await DAM.db()
    .from('activities').select('*')
    .eq('group_id', selectedGroup.id)
    .gte('activity_date', dateFrom)
    .lte('activity_date', dateTo)
    .order('from_time');
  var acts = actRes.data || [];

  /* Header */
  var headerHtml = '<div class="cal5-header">';
  days.forEach(function (d) {
    var ds = toDateStr(d);
    var isToday = ds === todayStr;
    var dayAbbr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    if (isToday) {
      headerHtml += '<div class="cal5-header-cell today">' +
        '<span class="hdr-day">' + dayAbbr + '</span>' +
        '<span class="hdr-date">' + d.getDate() + '</span></div>';
    } else {
      headerHtml += '<div class="cal5-header-cell">' +
        '<span class="hdr-day">' + dayAbbr + '</span>' +
        '<span class="hdr-date" style="font-size:1.1rem;font-weight:700;color:#fff;display:block;margin-top:2px;">' + d.getDate() + '</span></div>';
    }
  });
  headerHtml += '</div>';

  /* Grid */
  var bodyHtml = '<div class="cal5-grid">';
  days.forEach(function (d) {
    var ds      = toDateStr(d);
    var isToday = ds === todayStr;
    var isPast  = d < today && !isToday;
    var dayActs = acts.filter(function (a) { return a.activity_date === ds; });

    var chips = '';
    dayActs.slice(0, 3).forEach(function (a) {
      var icon = resolveIcon(a.activity);
      var dot  = getStatusDot(a, ds);
      chips += '<div class="cal5-activity" onclick="openEditActivity(event,\'' + ds + '\',\'' + a.id + '\')">' +
        dot +
        '<span class="cal5-activity-icon">' + icon + '</span>' +
        '<span class="cal5-activity-text">' + esc(a.activity) + '</span>' +
      '</div>';
    });
    if (dayActs.length > 3) chips += '<div class="cal5-more">+' + (dayActs.length - 3) + ' more</div>';

    /* Hover tooltip */
    var tipRows = dayActs.length === 0
      ? '<div class="cal5-tooltip-empty">No activities</div>'
      : dayActs.slice(0,5).map(function (a) {
          return '<div class="cal5-tooltip-row">' +
            '<span class="cal5-tooltip-icon">' + (resolveIcon(a.activity)) + '</span>' +
            '<span><div class="cal5-tooltip-name">' + esc(a.activity) + '</div>' +
            '<div class="cal5-tooltip-time">' + fmt12h(a.from_time) + '–' + fmt12h(a.end_time) +
              (a.location ? ' · ' + esc(a.location) : '') + '</div></span>' +
          '</div>';
        }).join('') + (dayActs.length > 5 ? '<div class="cal5-tooltip-empty">+' + (dayActs.length-5) + ' more</div>' : '');

    var cls = 'cal5-cell' + (isToday ? ' today' : '') + (isPast ? ' past' : '');
    bodyHtml += '<div class="' + cls + '" onclick="openViewDay(\'' + ds + '\', this)">' +
      '<div class="cal5-day-num' + (isToday ? ' today-num' : '') + '">' +
        '<span>' + d.getDate() + '</span>' +
        '<div class="cal5-controls">' +
          '<button class="cal5-btn plus" title="Add activity" onclick="event.stopPropagation(); openAddActivity(\'' + ds + '\')">+</button>' +
          '<button class="cal5-btn minus" title="View/Remove" onclick="event.stopPropagation(); openViewDay(\'' + ds + '\', this.closest(\'.cal5-cell\'))">−</button>' +
        '</div>' +
      '</div>' + chips +
      '<div class="cal5-tooltip">' + tipRows + '</div>' +
    '</div>';
  });
  bodyHtml += '</div>';

  root.innerHTML = '<div class="cal5-wrap">' + headerHtml + bodyHtml + '</div>';
}

/* ── Add Activity Modal ────────────────────────────────── */
var pendingDate = null;
var editingActivityId = null;

function openAddActivity(dateStr) {
  pendingDate = dateStr;
  editingActivityId = null;
  document.getElementById('addActivityTitle').textContent = 'Add Activity';
  document.getElementById('addActivityDate').textContent  = formatDisplayDate(dateStr);

  /* Use shared modal module */
  if (typeof initActivityModal === 'function') initActivityModal(dateStr);
  if (typeof wireActivityTypeChange === 'function') wireActivityTypeChange();

  document.getElementById('addActivityModal').classList.add('is-open');
}

function openEditActivity(event, dateStr, actId) {
  event.stopPropagation();
  var cellEl = event.target.closest('.cal5-cell');
  openViewDay(dateStr, cellEl);
}

function setupActivityModal() {
  /* Build time pickers */
  buildTimePicker('From', 'activityFromWrap');
  buildTimePicker('End',  'activityEndWrap');

  document.getElementById('cancelActivityBtn').addEventListener('click', function () {
    document.getElementById('addActivityModal').classList.remove('is-open');
  });
  document.getElementById('addActivityModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('is-open');
  });

  document.getElementById('saveActivityBtn').addEventListener('click', async function () {
    /* Use shared modal module for combined activity value */
    var rawType = (document.getElementById('activityType') || {}).value || '';
    var type  = typeof getActivityValue === 'function' ? getActivityValue() : rawType;
    var from  = getTimePickerValue('From');
    var end   = getTimePickerValue('End');
    var loc   = document.getElementById('activityLocation').value.trim();

    var valid = true;
    document.getElementById('activityGenErr').classList.remove('visible');

    if (!rawType) { document.getElementById('activityTypeErr').classList.add('visible'); valid = false; }
    else          { document.getElementById('activityTypeErr').classList.remove('visible'); }

    /* Validate sub-activity */
    var subWrap = document.getElementById('subActivityWrap');
    var subSel  = document.getElementById('subActivity');
    var subErr  = document.getElementById('activitySubErr');
    if (subWrap && subWrap.style.display !== 'none' && subSel && !subSel.value) {
      if (subErr) subErr.classList.add('visible'); valid = false;
    } else { if (subErr) subErr.classList.remove('visible'); }
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

    var payload = {
      user_id:       currentUser.id,
      group_id:      selectedGroup ? selectedGroup.id : null,
      activity:      type || rawType,   /* combined value e.g. "Prayer Time — Mosque" */
      activity_date: pendingDate,
      from_time:     from,
      end_time:      end,
      location:      loc || null,
      is_group:      !!selectedGroup
    };

    var res = await DAM.db().from('activities').insert(payload);

    btn.textContent = 'Save Activity'; btn.disabled = false;

    if (res.error) {
      alert('Error saving activity: ' + res.error.message); return;
    }

    document.getElementById('addActivityModal').classList.remove('is-open');
    if (selectedGroup) renderCalendar();
  });
}

/* ── View Day Schedule Modal ──────────────────────────────*/
/* ── Popup positioning (shared helper) ────────────────────*/
function positionPopup(cellEl) {
  var popup = document.getElementById('dayPopup');
  if (!popup || !cellEl) return;

  var rect  = cellEl.getBoundingClientRect();
  var popW  = 300;
  var popH  = 340;
  var vw    = window.innerWidth;
  var vh    = window.innerHeight;

  var top  = rect.bottom + 6;
  var left = rect.left;

  if (left + popW > vw - 12) left = vw - popW - 12;
  if (left < 8) left = 8;

  popup.classList.remove('arrow-right', 'opens-up');
  if (left > rect.left + 20) popup.classList.add('arrow-right');

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

/* ── Open day popup ───────────────────────────────────────*/
async function openViewDay(dateStr, cellEl) {
  var popup   = document.getElementById('dayPopup');
  var body    = document.getElementById('dayPopupBody');
  var titleEl = document.getElementById('dayPopupTitle');
  var subEl   = document.getElementById('dayPopupSubtitle');
  var addBtn  = document.getElementById('dayPopupAddBtn');

  /* Header text */
  var d       = new Date(dateStr + 'T00:00:00');
  var dayName = d.toLocaleDateString('en-CA', { weekday: 'long' });
  var dateFmt = d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });

  titleEl.textContent = selectedGroup ? (selectedGroup.name + ' — ' + dayName) : dayName;
  subEl.textContent   = dateFmt;

  /* Loading state */
  body.innerHTML =
    '<div class="day-popup-empty">' +
      '<div class="day-popup-empty-icon">⏳</div>Loading…' +
    '</div>';

  /* Position and show */
  if (cellEl) positionPopup(cellEl);
  popup.classList.add('is-open');
  document.getElementById('dayPopupBackdrop').classList.add('is-open');

  /* Wire Add button */
  addBtn.onclick = function () {
    closeDayPopup();
    openAddActivity(dateStr);
  };

  /* Fetch activities */
  var query = DAM.db().from('activities')
    .select('*, profiles!activities_user_id_fkey(first_name, last_name)')
    .eq('activity_date', dateStr)
    .order('from_time');

  if (selectedGroup) query = query.eq('group_id', selectedGroup.id);
  else               query = query.eq('user_id', currentUser.id);

  var res  = await query;
  var acts = res.data || [];

  /* If the join fails, fall back to plain activities query */
  if (res.error) {
    var fallback = await DAM.db().from('activities')
      .select('*')
      .eq('activity_date', dateStr)
      .order('from_time');
    if (selectedGroup) fallback = fallback.eq('group_id', selectedGroup.id);
    else               fallback = fallback.eq('user_id', currentUser.id);
    var fbRes = await fallback;
    acts = fbRes.data || [];
  }

  if (!acts.length) {
    body.innerHTML =
      '<div class="day-popup-empty">' +
        '<div class="day-popup-empty-icon">📭</div>' +
        'No activities scheduled' +
      '</div>';
    return;
  }

  body.innerHTML = acts.map(function (a) {
    var icon   = resolveIcon(a.activity);
    var dot    = getStatusDot(a, dateStr);
    var loc    = a.location
      ? '<div class="day-popup-item-loc">📍 ' + esc(a.location) + '</div>'
      : '';

    /* Show member name for group activities */
    var memberLine = '';
    if (selectedGroup && a.profiles) {
      var fn = a.profiles.first_name || '';
      var ln = a.profiles.last_name  || '';
      if (fn || ln) {
        memberLine = '<div class="day-popup-item-member">👤 <strong>' +
          esc(fn + ' ' + ln).trim() + '</strong></div>';
      }
    }

    /* Only allow deletion of own activities */
    var deleteBtn = (a.user_id === currentUser.id)
      ? '<button class="day-popup-delete" title="Remove" ' +
          'onclick="deleteActivityPopup(\'' + a.id + '\',\'' + dateStr + '\')">🗑</button>'
      : '';

    return '<div class="day-popup-item">' +
      '<div class="day-popup-item-icon">' + icon + '</div>' +
      '<div class="day-popup-item-body">' +
        '<div class="day-popup-item-name">' + dot + esc(a.activity) + '</div>' +
        '<div class="day-popup-item-time">🕐 ' + fmt12h(a.from_time) + ' – ' + fmt12h(a.end_time) + '</div>' +
        loc + memberLine +
      '</div>' +
      deleteBtn +
    '</div>';
  }).join('');
}

async function deleteActivityPopup(actId, dateStr) {
  if (!confirm('Remove this activity?')) return;
  await DAM.db().from('activities').delete().eq('id', actId);
  await openViewDay(dateStr, null);   /* refresh popup in place */
  if (selectedGroup) renderCalendar();
}

/* ── Join Group Modal ─────────────────────────────────── */
function setupJoinModal() {
  var modal       = document.getElementById('joinModal');
  var openBtn     = document.getElementById('joinGroupBtn');
  var cancelBtn   = document.getElementById('cancelJoinBtn');
  var submitBtn   = document.getElementById('submitJoinBtn');
  var nameInput   = document.getElementById('joinGroupName');
  var suggestBox  = document.getElementById('groupSuggestions');

  openBtn.addEventListener('click', function () {
    modal.classList.add('is-open');
    document.getElementById('joinGroupName').value = '';
    document.getElementById('joinReason').value    = '';
    document.getElementById('joinRelationship').value = '';
    document.getElementById('joinSuccessMsg').style.display = 'none';
    document.getElementById('joinModal').querySelector('.modal-form').style.display = 'block';
    document.getElementById('joinModal').querySelector('.modal-actions').style.display = 'flex';
    ['joinGroupNameErr','joinRelationshipErr','joinGeneralErr'].forEach(function (id) {
      document.getElementById(id).classList.remove('visible');
    });
    nameInput.focus();
  });

  cancelBtn.addEventListener('click', function () { modal.classList.remove('is-open'); });
  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.classList.remove('is-open');
  });

  /* Autocomplete */
  var focusIdx = -1;
  nameInput.addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    if (!q) { suggestBox.style.display = 'none'; return; }
    var matches = allGroupNames.filter(function (g) {
      return g.name.toLowerCase().includes(q);
    });
    if (matches.length === 0) { suggestBox.style.display = 'none'; return; }
    focusIdx = -1;
    suggestBox.innerHTML = matches.map(function (g, i) {
      return '<div class="suggestion-item" data-id="' + g.id + '" data-name="' + esc(g.name) + '" data-idx="' + i + '">' + esc(g.name) + '</div>';
    }).join('');
    suggestBox.style.display = 'block';
    suggestBox.querySelectorAll('.suggestion-item').forEach(function (item) {
      item.addEventListener('mousedown', function (e) {
        e.preventDefault();
        nameInput.value = this.dataset.name;
        suggestBox.style.display = 'none';
      });
    });
  });

  /* Keyboard navigation for suggestions */
  nameInput.addEventListener('keydown', function (e) {
    var items = suggestBox.querySelectorAll('.suggestion-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault(); focusIdx = Math.min(focusIdx + 1, items.length - 1);
      items.forEach(function (el, i) { el.classList.toggle('focused', i === focusIdx); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); focusIdx = Math.max(focusIdx - 1, 0);
      items.forEach(function (el, i) { el.classList.toggle('focused', i === focusIdx); });
    } else if (e.key === 'Enter' && focusIdx >= 0) {
      e.preventDefault();
      nameInput.value = items[focusIdx].dataset.name;
      suggestBox.style.display = 'none';
    } else if (e.key === 'Escape') {
      suggestBox.style.display = 'none';
    }
  });

  nameInput.addEventListener('blur', function () {
    setTimeout(function () { suggestBox.style.display = 'none'; }, 200);
  });

  /* Submit join request */
  submitBtn.addEventListener('click', async function () {
    var groupName    = nameInput.value.trim();
    var relationship = document.getElementById('joinRelationship').value;
    var reason       = document.getElementById('joinReason').value.trim();
    var valid = true;

    document.getElementById('joinGeneralErr').classList.remove('visible');

    if (!groupName) {
      document.getElementById('joinGroupNameErr').classList.add('visible'); valid = false;
    } else { document.getElementById('joinGroupNameErr').classList.remove('visible'); }

    if (!relationship) {
      document.getElementById('joinRelationshipErr').classList.add('visible'); valid = false;
    } else { document.getElementById('joinRelationshipErr').classList.remove('visible'); }

    if (!valid) return;

    /* Find matching group */
    var matchedGroup = allGroupNames.find(function (g) {
      return g.name.toLowerCase() === groupName.toLowerCase();
    });

    if (!matchedGroup) {
      document.getElementById('joinGroupNameErr').textContent = '⚠ Group not found. Check the name and try again.';
      document.getElementById('joinGroupNameErr').classList.add('visible'); return;
    }

    submitBtn.textContent = 'Submitting…'; submitBtn.disabled = true;

    var payload = {
      group_id:     matchedGroup.id,
      requester_id: currentUser.id,
      first_name:   currentProfile.first_name || '',
      last_name:    currentProfile.last_name  || '',
      email:        currentUser.email,
      group_name:   matchedGroup.name,
      reason:       reason || null,
      relationship: relationship,
      status:       'pending'
    };

    var res = await DAM.db().from('group_join_requests').insert(payload);

    submitBtn.textContent = 'Submit Request'; submitBtn.disabled = false;

    if (res.error) {
      document.getElementById('joinGeneralErr').textContent = '⚠ ' + res.error.message;
      document.getElementById('joinGeneralErr').classList.add('visible'); return;
    }

    modal.querySelector('.modal-form').style.display   = 'none';
    modal.querySelector('.modal-actions').style.display = 'none';
    document.getElementById('joinSuccessMsg').style.display = 'block';
  });
}

/* ── Load pending requests (admin view) ─────────────────── */
async function loadPendingRequests() {
  /* Check if user is admin of any group */
  var adminGroupsRes = await DAM.db()
    .from('groups').select('id').eq('created_by', currentUser.id);
  var adminGroupIds = (adminGroupsRes.data || []).map(function (g) { return g.id; });

  if (adminGroupIds.length === 0) return;

  document.getElementById('adminRequestsSection').style.display = 'block';

  var reqRes = await DAM.db()
    .from('group_join_requests')
    .select('*')
    .in('group_id', adminGroupIds)
    .eq('status', 'pending')
    .order('created_at');

  var requests = reqRes.data || [];
  var listEl   = document.getElementById('pendingRequestsList');

  if (requests.length === 0) {
    listEl.innerHTML = '<p style="font-size:0.88rem; color:var(--color-ink-muted);">No pending requests.</p>';
    return;
  }

  listEl.innerHTML = requests.map(function (r) {
    return [
      '<div class="request-card" id="req-' + r.id + '">',
        '<div class="request-info">',
          '<div class="request-name">' + esc(r.first_name) + ' ' + esc(r.last_name) + '</div>',
          '<div class="request-email">' + esc(r.email) + '</div>',
          '<div class="request-group">Wants to join: <strong>' + esc(r.group_name) + '</strong>',
            (r.relationship ? ' &bull; ' + esc(r.relationship) : ''),
          '</div>',
          (r.reason ? '<div style="font-size:0.78rem; color:var(--color-ink-light); margin-top:2px;">Reason: ' + esc(r.reason) + '</div>' : ''),
        '</div>',
        '<div class="request-actions">',
          '<button class="btn--accept" onclick="handleRequest(\'' + r.id + '\',\'accepted\',\'' + esc(r.first_name) + '\',\'' + esc(r.email) + '\',\'' + esc(r.group_name) + '\')">✓ Accept</button>',
          '<button class="btn--deny"   onclick="handleRequest(\'' + r.id + '\',\'denied\',\'' + esc(r.first_name) + '\',\'' + esc(r.email) + '\',\'' + esc(r.group_name) + '\')">✕ Deny</button>',
        '</div>',
      '</div>'
    ].join('');
  }).join('');
}

async function handleRequest(reqId, status, firstName, email, groupName) {
  var res = await DAM.db()
    .from('group_join_requests')
    .update({ status: status })
    .eq('id', reqId);

  if (res.error) { alert('Error: ' + res.error.message); return; }

  /* Remove the card from UI */
  var card = document.getElementById('req-' + reqId);
  if (card) {
    card.style.opacity = '0.4';
    card.style.pointerEvents = 'none';
    var label = card.querySelector('.request-actions');
    if (label) label.innerHTML = '<span style="font-size:0.85rem; font-weight:600; color:' +
      (status === 'accepted' ? 'var(--color-green)' : '#E74C3C') + ';">' +
      (status === 'accepted' ? '✓ Accepted' : '✕ Denied') + '</span>';
  }

  /* Trigger Supabase Edge Function for email notification */
  /* The Edge Function "send-group-email" handles the actual email send */
  await DAM.db().rpc('notify_request_decision', {
    p_email:      email,
    p_first_name: firstName,
    p_group_name: groupName,
    p_status:     status
  }).catch(function () {
    /* RPC may not exist yet — see EDGE-FUNCTION-GUIDE.md */
    console.info('Email notification RPC not yet configured. See EDGE-FUNCTION-GUIDE.md.');
  });
}

/* ── Utility helpers ──────────────────────────────────── */
function toDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}

function formatDisplayDate(ds) {
  var d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function fmt12h(t) {
  if (!t) return '';
  var parts = t.split(':');
  var h = parseInt(parts[0]); var m = parts[1];
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
