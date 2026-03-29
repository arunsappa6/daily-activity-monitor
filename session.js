/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — session.js  (Supabase version)

   Responsibilities:
   • Listen for Supabase auth state changes on every page
   • Auth guard: redirect to login if not signed in
   • Redirect verified users away from login/register pages
   • Render correct navbar (Login/Register vs Hi, Name | Logout)
   • Expose DAMSession helpers used by other JS files
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Pages that require a signed-in, verified session ─── */
  var PROTECTED_PAGES = [
    'home.html',
    'group-dashboard.html',
    'personal-dashboard.html',
    'create-group.html',
    'join-group.html',
    'my-profile.html',
    'manage-profile.html'
  ];

  /* ── Pages a logged-in user should not see ──────────────── */
  var AUTH_ONLY_PAGES = [
    'login.html',
    'register.html'
  ];

  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Render navbar based on auth state ──────────────────── */
  function renderNav(user, profile) {
    var sessionDiv = document.querySelector('.nav-session');
    if (!sessionDiv) return;

    if (user) {
      var firstName = (profile && profile.first_name)
        ? profile.first_name
        : (user.email || '').split('@')[0];

      sessionDiv.innerHTML = [
        '<span class="nav-user-greeting">Hi, <strong>' + escHtml(firstName) + '</strong></span>',
        '<div class="nav-profile-wrap" id="navProfileWrap">',
          '<button class="nav-profile-btn" id="navProfileBtn" aria-haspopup="true" aria-expanded="false">',
            'My Profile <span class="profile-chevron">▾</span>',
          '</button>',
          '<div class="nav-profile-dropdown" id="navProfileDropdown" role="menu">',
            '<div class="nav-profile-dropdown-section">',
              '<div class="nav-profile-dropdown-label">Account</div>',
              '<a href="my-profile.html" role="menuitem">👤 Personal Details</a>',
              '<a href="manage-profile.html" role="menuitem">⚙️ Manage Profile</a>',
            '</div>',
            '<div class="nav-profile-dropdown-section">',
              '<button class="dropdown-item dropdown-item-danger" id="navLogoutBtn" role="menuitem">',
                '🚪 Logout',
              '</button>',
            '</div>',
          '</div>',
        '</div>'
      ].join('');

      /* Toggle dropdown */
      var wrap   = document.getElementById('navProfileWrap');
      var btn    = document.getElementById('navProfileBtn');
      var dd     = document.getElementById('navProfileDropdown');

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = wrap.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      /* Close on outside click */
      document.addEventListener('click', function () {
        wrap.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      });

      /* Logout */
      document.getElementById('navLogoutBtn').addEventListener('click', function () {
        DAM.auth().signOut().then(function () {
          window.location.href = 'index.html';
        });
      });

    } else {
      sessionDiv.innerHTML =
        '<a href="login.html"   class="nav-btn nav-btn--ghost">Login</a>' +
        '<a href="register.html" class="nav-btn nav-btn--solid">Register</a>';
    }
  }

  /* ── Auth guard + nav render ─────────────────────────────── */
  async function init() {
    var page = currentPage();

    /* Get current session from Supabase */
    var sessionResult = await DAM.auth().getSession();
    var session = sessionResult.data && sessionResult.data.session
      ? sessionResult.data.session
      : null;
    var user = session ? session.user : null;

    /* Fetch profile for display name */
    var profile = null;
    if (user) {
      var profileResult = await DAM.db()
        .from('profiles')
        .select('first_name, last_name, is_admin')
        .eq('id', user.id)
        .single();
      if (profileResult.data) profile = profileResult.data;
    }

    /* Cache on window so other scripts can use it synchronously */
    window._damUser    = user;
    window._damProfile = profile;

    /* Auth guard: protected page + not logged in */
    if (PROTECTED_PAGES.indexOf(page) !== -1 && !user) {
      sessionStorage.setItem('dam_redirect_after_login', page);
      window.location.href = 'login.html';
      return;
    }

    /* Guard: logged-in user visiting login/register */
    if (AUTH_ONLY_PAGES.indexOf(page) !== -1 && user) {
      window.location.href = 'home.html';
      return;
    }

    renderNav(user, profile);
  }

  /* ── Listen for auth changes (login, logout, token refresh) */
  DAM.auth().onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT') {
      window._damUser    = null;
      window._damProfile = null;
      renderNav(null, null);
      var page = currentPage();
      if (PROTECTED_PAGES.indexOf(page) !== -1) {
        window.location.href = 'login.html';
      }
    }
    if (event === 'SIGNED_IN' && session) {
      window._damUser = session.user;
    }
  });

  /* ── Public API used by other JS files ───────────────────── */
  window.DAMSession = {
    getUser:    function () { return window._damUser    || null; },
    getProfile: function () { return window._damProfile || null; }
  };

  /* ── Keyboard nav focus ring ─────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') document.body.classList.add('keyboard-nav');
  });
  document.addEventListener('mousedown', function () {
    document.body.classList.remove('keyboard-nav');
  });

  /* ── Run on every page ───────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    init().catch(function (err) {
      console.error('DAMSession init error:', err);
    });
  });

})();
