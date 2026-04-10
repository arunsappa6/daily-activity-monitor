/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — activity-modal.js
   Shared module used by personal-dashboard and group-dashboard.

   Features:
   • Sub-activity dropdowns for Prayer Time, Learning,
     Breakfast Prep, Work
   • Location text field with Google Maps autocomplete
   • "Suggest nearby places" within 30 km radius
   • Works with Google Maps Places API (key in config below)
   ═══════════════════════════════════════════════════════════ */

/* ── Google Maps API Key ──────────────────────────────────
   Get a free key at: console.cloud.google.com
   Enable: "Places API" and "Maps JavaScript API"
   Replace the value below with your real key.
   Restriction: set HTTP referrer to your GitHub Pages URL.
─────────────────────────────────────────────────────────── */
var GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

/* ── Sub-activity definitions ────────────────────────────*/
var SUB_ACTIVITIES = {
  'Prayer Time': [
    { value: 'Hindu Mandir',     label: '🛕 Hindu Mandir',      searchQuery: 'Hindu temple mandir' },
    { value: 'Buddhist Vihara',  label: '☸️ Buddhist Vihara',   searchQuery: 'Buddhist temple vihara' },
    { value: 'Church',           label: '⛪ Church',             searchQuery: 'Christian church' },
    { value: 'Mosque',           label: '🕌 Mosque',             searchQuery: 'mosque masjid' },
    { value: 'Synagogue',        label: '✡️ Synagogue',          searchQuery: 'synagogue Jewish temple' },
    { value: 'Gurudwara',        label: '🪯 Gurudwara',          searchQuery: 'Gurudwara Sikh temple' }
  ],
  'Learning': [
    { value: 'Library',          label: '📚 Library',            searchQuery: 'public library' },
    { value: 'Home',             label: '🏠 Home',               searchQuery: null },
    { value: 'Community Center', label: '🏢 Community Center',   searchQuery: 'community center' }
  ],
  'Breakfast Prep': [
    { value: 'Home Made',        label: '🏠 Home Made',          searchQuery: null },
    { value: 'Online Order',     label: '📱 Online Order',       searchQuery: null }
  ],
  'Work': [
    { value: 'Work from Home',   label: '🏠 Work from Home',     searchQuery: null },
    { value: 'Work from Office', label: '🏢 Work from Office',   searchQuery: 'office coworking' }
  ]
};

/* Activities that support location suggestions */
var LOCATION_SEARCHABLE = [
  'Prayer Time','Learning','Work','Cycling','Jogging',
  'Gardening','Visit Spiritual Place','Commute'
];

/* ── State ───────────────────────────────────────────────*/
var _currentSearchQuery = null;
var _userPostalCode     = null;
var _mapsLoaded         = false;

/* ── Load Google Maps SDK once ───────────────────────────*/
function loadGoogleMaps(callback) {
  if (_mapsLoaded || typeof google !== 'undefined') {
    _mapsLoaded = true;
    if (callback) callback();
    return;
  }
  if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    console.warn('[DAM] Google Maps API key not configured. Location suggestions disabled.');
    return;
  }
  var script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
    GOOGLE_MAPS_API_KEY + '&libraries=places&callback=_onGoogleMapsReady';
  script.async = true; script.defer = true;
  document.head.appendChild(script);
}

window._onGoogleMapsReady = function () {
  _mapsLoaded = true;
  console.log('[DAM] Google Maps loaded');
};

/* ── Init modal for a given date ─────────────────────────*/
function initActivityModal(dateStr) {
  /* Reset all fields */
  var actType   = document.getElementById('activityType');
  var subWrap   = document.getElementById('subActivityWrap');
  var subSel    = document.getElementById('subActivity');
  var locInput  = document.getElementById('activityLocation');
  var suggestSection = document.getElementById('locationSuggestSection');

  if (actType)   actType.value   = '';
  if (locInput)  locInput.value  = '';
  if (subWrap)   subWrap.style.display  = 'none';
  if (subSel)    subSel.innerHTML = '<option value="">— Select —</option>';
  if (suggestSection) suggestSection.style.display = 'none';

  /* Clear errors */
  ['activityTypeErr','activitySubErr','activityFromErr','activityEndErr',
   'activityGenErr','activityOverlapErr'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
  ['activityFromWrap','activityEndWrap'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('is-error');
  });

  /* Reset time pickers */
  ['From','End'].forEach(function (label) {
    ['tp_h_','tp_m_','tp_ap_'].forEach(function (pfx) {
      var el = document.getElementById(pfx + label);
      if (el) el.selectedIndex = 0;
    });
  });

  /* Pre-load Google Maps */
  loadGoogleMaps();
}

/* ── Wire up activity type change → sub-activity ─────────*/
function wireActivityTypeChange() {
  var actType = document.getElementById('activityType');
  if (!actType || actType.dataset.wired) return;
  actType.dataset.wired = 'true';

  actType.addEventListener('change', function () {
    var val = this.value;
    showSubActivity(val);
    checkLocationSuggestion(val, '');
  });
}

function showSubActivity(activityValue) {
  var subWrap = document.getElementById('subActivityWrap');
  var subSel  = document.getElementById('subActivity');
  if (!subWrap || !subSel) return;

  var subs = SUB_ACTIVITIES[activityValue];
  if (!subs) {
    subWrap.style.display = 'none';
    subSel.innerHTML = '<option value="">— Select —</option>';
    return;
  }

  var html = '<option value="">— Select type —</option>';
  subs.forEach(function (s) {
    html += '<option value="' + s.value + '">' + s.label + '</option>';
  });
  subSel.innerHTML = html;
  subWrap.style.display = 'block';

  /* When sub-activity changes, update location suggestion */
  subSel.onchange = function () {
    checkLocationSuggestion(activityValue, this.value);
  };
}

/* ── Location suggestion logic ───────────────────────────*/
function checkLocationSuggestion(activityValue, subValue) {
  var section = document.getElementById('locationSuggestSection');
  if (!section) return;

  /* Find the search query */
  var searchQuery = null;
  var subs = SUB_ACTIVITIES[activityValue];
  if (subs && subValue) {
    var match = subs.find(function (s) { return s.value === subValue; });
    if (match) searchQuery = match.searchQuery;
  } else if (LOCATION_SEARCHABLE.indexOf(activityValue) !== -1) {
    searchQuery = activityValue;
  }

  _currentSearchQuery = searchQuery;

  /* Only show suggestion prompt if the activity has a location to search */
  if (!searchQuery) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  document.getElementById('suggestPromptText').textContent =
    'Can I suggest nearest ' + (subValue || activityValue) + ' options near you?';

  /* Reset to prompt state */
  document.getElementById('suggestPromptRow').style.display  = 'flex';
  document.getElementById('suggestPostalRow').style.display  = 'none';
  document.getElementById('suggestResultsRow').style.display = 'none';
  document.getElementById('suggestPostalInput').value = _userPostalCode || '';
}

/* ── "Yes" button clicked ────────────────────────────────*/
function onSuggestYes() {
  document.getElementById('suggestPromptRow').style.display = 'none';
  document.getElementById('suggestPostalRow').style.display = 'flex';
  document.getElementById('suggestPostalInput').focus();
}

/* ── "No Thanks" button clicked ──────────────────────────*/
function onSuggestNo() {
  document.getElementById('locationSuggestSection').style.display = 'none';
}

/* ── Search nearby places ────────────────────────────────*/
async function searchNearbyPlaces() {
  var postalInput = document.getElementById('suggestPostalInput');
  var postal = (postalInput.value || '').trim();
  if (!postal) {
    postalInput.style.borderColor = '#E74C3C';
    postalInput.placeholder = 'Postal code is required';
    return;
  }
  postalInput.style.borderColor = '';
  _userPostalCode = postal;

  var resultsRow = document.getElementById('suggestResultsRow');
  var resultsList = document.getElementById('suggestResultsList');
  resultsRow.style.display = 'block';
  resultsList.innerHTML =
    '<div style="text-align:center;padding:1rem;color:#888;">🔍 Searching nearby…</div>';

  /* Check if Google Maps key is configured */
  if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    resultsList.innerHTML = buildNoMapsKeyMessage(_currentSearchQuery, postal);
    return;
  }

  /* Step 1: Geocode the postal code */
  try {
    var geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=' +
      encodeURIComponent(postal + ', Canada') +
      '&key=' + GOOGLE_MAPS_API_KEY;

    var geoRes = await fetch(geocodeUrl);
    var geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      resultsList.innerHTML =
        '<div class="suggest-empty">⚠ Could not find location for postal code "' +
        esc(postal) + '". Please check and try again.</div>';
      return;
    }

    var location = geoData.results[0].geometry.location;

    /* Step 2: Search nearby places */
    var placesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?' +
      'location=' + location.lat + ',' + location.lng +
      '&radius=30000' +   /* 30 km */
      '&keyword=' + encodeURIComponent(_currentSearchQuery) +
      '&key=' + GOOGLE_MAPS_API_KEY;

    /* Note: Direct Places API calls require backend proxy due to CORS.
       We use the Maps JS SDK instead (loaded client-side). */
    searchWithPlacesSDK(location, _currentSearchQuery, resultsList);

  } catch (err) {
    console.error('[DAM] Geocode error:', err);
    resultsList.innerHTML =
      '<div class="suggest-empty">⚠ Search failed. Please check your API key configuration.</div>';
  }
}

/* ── Places search using Google Maps JS SDK ──────────────*/
function searchWithPlacesSDK(location, query, listEl) {
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    listEl.innerHTML = buildNoMapsKeyMessage(query, _userPostalCode);
    return;
  }

  var map = new google.maps.Map(document.createElement('div'));
  var service = new google.maps.places.PlacesService(map);

  service.nearbySearch({
    location: new google.maps.LatLng(location.lat, location.lng),
    radius:   30000,   /* 30 km */
    keyword:  query
  }, function (results, status) {
    if (status !== google.maps.places.PlacesServiceStatus.OK || !results.length) {
      listEl.innerHTML =
        '<div class="suggest-empty">📭 No ' + esc(query) +
        ' found within 30 km of your location.</div>';
      return;
    }

    listEl.innerHTML = results.slice(0, 8).map(function (place) {
      var rating  = place.rating ? '⭐ ' + place.rating : '';
      var open    = place.opening_hours
        ? (place.opening_hours.open_now ? '🟢 Open now' : '🔴 Closed')
        : '';
      var addr    = place.vicinity || '';
      var mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(place.name + ' ' + addr);
      var appleMapsUrl = 'https://maps.apple.com/?q=' +
        encodeURIComponent(place.name + ' ' + addr);

      return '<div class="suggest-place-card" onclick="selectPlace(\'' +
          esc(place.name) + '\', \'' + esc(addr) + '\')">' +
        '<div class="suggest-place-name">' + esc(place.name) + '</div>' +
        '<div class="suggest-place-addr">' + esc(addr) + '</div>' +
        '<div class="suggest-place-meta">' +
          (rating ? '<span>' + rating + '</span>' : '') +
          (open ? '<span style="margin-left:0.5rem;">' + open + '</span>' : '') +
        '</div>' +
        '<div class="suggest-place-actions">' +
          '<a href="' + mapsUrl + '" target="_blank" class="suggest-map-btn google">📍 Google Maps</a>' +
          '<a href="' + appleMapsUrl + '" target="_blank" class="suggest-map-btn apple">🗺 Apple Maps</a>' +
          '<button class="suggest-map-btn select" onclick="event.stopPropagation();' +
            'selectPlace(\'' + esc(place.name) + '\', \'' + esc(addr) + '\')">✓ Use This</button>' +
        '</div>' +
      '</div>';
    }).join('');
  });
}

/* ── Select a suggested place → fill Location field ──────*/
function selectPlace(name, addr) {
  var locInput = document.getElementById('activityLocation');
  if (locInput) {
    locInput.value = name + (addr ? ', ' + addr : '');
    locInput.style.borderColor = '#43BF87';
    setTimeout(function () { locInput.style.borderColor = ''; }, 2000);
  }
  document.getElementById('suggestResultsRow').style.display = 'none';
  document.getElementById('suggestPromptRow').style.display  = 'none';
  document.getElementById('locationSuggestSection').style.display = 'none';
}

/* ── Fallback message when Maps key not configured ───────*/
function buildNoMapsKeyMessage(query, postal) {
  var googleUrl = 'https://www.google.com/maps/search/' +
    encodeURIComponent(query + ' near ' + postal);
  var appleUrl  = 'https://maps.apple.com/?q=' +
    encodeURIComponent(query + ' near ' + postal);
  return '<div class="suggest-no-key">' +
    '<p style="margin-bottom:0.75rem;font-size:0.88rem;color:#555;">' +
    'Search for <strong>' + esc(query) + '</strong> near <strong>' + esc(postal) + '</strong>:</p>' +
    '<div style="display:flex;gap:0.6rem;flex-wrap:wrap;">' +
      '<a href="' + googleUrl + '" target="_blank" class="suggest-map-btn google">📍 Open Google Maps</a>' +
      '<a href="' + appleUrl  + '" target="_blank" class="suggest-map-btn apple">🗺 Open Apple Maps</a>' +
    '</div>' +
    '<p style="font-size:0.75rem;color:#999;margin-top:0.5rem;">' +
    'To enable inline results, add your Google Maps API key in activity-modal.js</p>' +
  '</div>';
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Get combined activity value for saving ──────────────*/
function getActivityValue() {
  var type = (document.getElementById('activityType') || {}).value || '';
  var sub  = (document.getElementById('subActivity')  || {}).value || '';
  if (!type) return '';
  return sub ? type + ' — ' + sub : type;
}

/* ── Get display icon for combined activity ──────────────*/
var ACTIVITY_ICONS_MODAL = {
  'Cycling':'🚴','Jogging':'🏃','Reading':'📚','Gardening':'🌱',
  'Breakfast Prep':'🍳','Lunch Prep':'🥗','Dinner Prep':'🍽️',
  'Hydration':'💧','Personal Care':'🧴','Work':'💼',
  'Drop kids':'🚗','Pick-up kids':'🏫','Learning':'📖',
  'Commute':'🚌','Prayer Time':'🙏','Visit Spiritual Place':'⛪'
};

function getActivityIcon(fullValue) {
  if (!fullValue) return '📌';
  var base = fullValue.split(' — ')[0];
  return ACTIVITY_ICONS_MODAL[base] || '📌';
}
