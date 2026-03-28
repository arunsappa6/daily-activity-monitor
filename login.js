/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — login.js
   • Validates email + password against localStorage users
   • Checks email-verified flag before allowing login
   • Saves current session (dam_current_user)
   • Redirects to originally-requested page or home.html
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function $(id) { return document.getElementById(id); }

  function setError(el, errEl, msg) {
    el.classList.add('is-error');
    el.classList.remove('is-valid');
    if (errEl) { errEl.textContent = '⚠ ' + msg; errEl.classList.add('visible'); }
  }

  function setValid(el, errEl) {
    el.classList.remove('is-error');
    el.classList.add('is-valid');
    if (errEl) errEl.classList.remove('visible');
  }

  // ── Field live validation ──────────────────────────────
  $('loginEmail').addEventListener('blur', function () {
    if (!this.value) { setError(this, $('loginEmailErr'), 'Email is required.'); return; }
    emailRe.test(this.value)
      ? setValid(this, $('loginEmailErr'))
      : setError(this, $('loginEmailErr'), 'Please enter a valid email address.');
  });

  $('loginPassword').addEventListener('input', function () {
    $('loginGeneralErr').classList.remove('visible');
    this.value
      ? setValid(this, $('loginPasswordErr'))
      : setError(this, $('loginPasswordErr'), 'Password is required.');
  });

  // ── Submit ─────────────────────────────────────────────
  $('loginSubmit').addEventListener('click', function () {
    var email = ($('loginEmail').value || '').trim();
    var pass  = ($('loginPassword').value || '');

    $('loginEmail').dispatchEvent(new Event('blur'));
    $('loginGeneralErr').classList.remove('visible');

    var valid = true;
    if (!emailRe.test(email)) valid = false;
    if (!pass) {
      setError($('loginPassword'), $('loginPasswordErr'), 'Password is required.');
      valid = false;
    }
    if (!valid) return;

    // Look up user in localStorage
    var users = DAMSession.getUsers();
    var user  = users.find(function (u) {
      return u.email.toLowerCase() === email.toLowerCase();
    });

    // Wrong email
    if (!user) {
      $('loginGeneralErr').textContent = '⚠ No account found with that email address.';
      $('loginGeneralErr').classList.add('visible');
      return;
    }

    // Wrong password (stored as plain text for this frontend demo —
    // a real backend would use bcrypt hashing)
    if (user.password !== pass) {
      $('loginGeneralErr').textContent = '⚠ Incorrect password. Please try again.';
      $('loginGeneralErr').classList.add('visible');
      return;
    }

    // Not yet verified
    if (!user.verified) {
      $('loginGeneralErr').textContent =
        '⚠ Please verify your email first. Check your inbox for the verification link.';
      $('loginGeneralErr').classList.add('visible');
      return;
    }

    // ── Success — save session ────────────────────────
    DAMSession.saveCurrentUser(user);

    $('loginSubmit').textContent = 'Signing in…';
    $('loginSubmit').disabled    = true;

    $('loginSuccess').classList.add('visible');

    setTimeout(function () {
      // Redirect to the page the user originally tried to visit
      var redirectTo = sessionStorage.getItem('dam_redirect_after_login') || 'home.html';
      sessionStorage.removeItem('dam_redirect_after_login');
      window.location.href = redirectTo;
    }, 900);
  });

  // Allow Enter key to submit
  ['loginEmail','loginPassword'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        $('loginSubmit').click();
      }
    });
  });

});
