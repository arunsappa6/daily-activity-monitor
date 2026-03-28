/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — session.js
   Shared session management across all pages.

   Responsibilities:
   • Read / write dam_current_user from localStorage
   • Auth guard: redirect to login if not logged in
   • Render correct navbar (Login/Register vs. Logout + username)
   • Logout handler
   • Email verification token check
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Storage keys ───────────────────────────────────────── */
  var KEYS = {
    currentUser : 'dam_current_user',   // { ...userObj, verified: bool }
    users       : 'dam_users',          // array of all registered users
    groups      : 'dam_groups'          // array of all groups
  };

  /* ── Pages that require a verified, logged-in session ────── */
  var PROTECTED_PAGES = [
    'home.html',
    'group-dashboard.html',
    'personal-dashboard.html',
    'create-group.html',
    'join-group.html'
  ];

  /* ── Pages that a logged-in user should NOT see ──────────── */
  var AUTH_ONLY_PAGES = [
    'login.html',
    'register.html'
  ];

  /* ── Helpers ────────────────────────────────────────────── */
  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(KEYS.currentUser)); }
    catch (e) { return null; }
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(KEYS.users)) || []; }
    catch (e) { return []; }
  }

  function saveUsers(arr) {
    localStorage.setItem(KEYS.users, JSON.stringify(arr));
  }

  function saveCurrentUser(u) {
    localStorage.setItem(KEYS.currentUser, JSON.stringify(u));
  }

  function clearSession() {
    localStorage.removeItem(KEYS.currentUser);
  }

  /* ── Auth guard ─────────────────────────────────────────── */
  function enforceAuth() {
    var page = currentPage();
    var user = getUser();

    // Protected page + not logged in → send to login
    if (PROTECTED_PAGES.indexOf(page) !== -1) {
      if (!user) {
        sessionStorage.setItem('dam_redirect_after_login', page);
        window.location.href = 'login.html';
        return;
      }
      // Logged in but not verified → send to verify-pending page
      if (!user.verified) {
        window.location.href = 'verify-pending.html';
        return;
      }
    }

    // Logged-in user visiting login/register → send to home
    if (AUTH_ONLY_PAGES.indexOf(page) !== -1 && user && user.verified) {
      window.location.href = 'home.html';
    }
  }

  /* ── Email verification token handling ───────────────────── */
  /* Called on verify.html — reads ?token= from the URL         */
  function handleVerificationToken() {
    if (currentPage() !== 'verify.html') return;

    var params = new URLSearchParams(window.location.search);
    var token  = params.get('token');
    var msgEl  = document.getElementById('verifyMessage');

    if (!token) {
      if (msgEl) msgEl.textContent = '⚠ No verification token found.';
      return;
    }

    var users = getUsers();
    var idx   = users.findIndex(function (u) { return u.verifyToken === token; });

    if (idx === -1) {
      if (msgEl) msgEl.textContent = '⚠ Invalid or expired verification link.';
      return;
    }

    // Mark verified
    users[idx].verified = true;
    users[idx].verifyToken = null;
    saveUsers(users);

    // Update current session if it matches
    var curr = getUser();
    if (curr && curr.email === users[idx].email) {
      curr.verified = true;
      curr.verifyToken = null;
      saveCurrentUser(curr);
    }

    if (msgEl) {
      msgEl.innerHTML =
        '✅ Your email has been verified! <a href="login.html">Click here to log in.</a>';
    }
  }

  /* ── Navbar renderer ────────────────────────────────────── */
  /* Replaces Login/Register buttons with "Hi, Name | Logout"
     when a verified session exists.                           */
  function renderNav() {
    var user       = getUser();
    var sessionDiv = document.querySelector('.nav-session');
    if (!sessionDiv) return;

    if (user && user.verified) {
      sessionDiv.innerHTML =
        '<span class="nav-user-greeting">Hi, <strong>' +
        escHtml(user.firstName) +
        '</strong></span>' +
        '<button class="nav-btn nav-btn--ghost" id="logoutBtn">Logout</button>';

      var logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
          clearSession();
          window.location.href = 'index.html';
        });
      }
    } else {
      // Not logged in — keep default Login / Register
      sessionDiv.innerHTML =
        '<a href="login.html"  class="nav-btn nav-btn--ghost">Login</a>' +
        '<a href="register.html" class="nav-btn nav-btn--solid">Register</a>';
    }
  }

  /* Simple HTML escape */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Public API (used by other scripts) ─────────────────── */
  window.DAMSession = {
    getUser       : getUser,
    getUsers      : getUsers,
    saveUsers     : saveUsers,
    saveCurrentUser: saveCurrentUser,
    clearSession  : clearSession,
    KEYS          : KEYS
  };

  /* ── Run on every page load ─────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    enforceAuth();
    renderNav();
    handleVerificationToken();
  });

})();
