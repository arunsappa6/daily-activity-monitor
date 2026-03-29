/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — login.js  (Supabase version)
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function $(id) { return document.getElementById(id); }

  function setError(el, errEl, msg) {
    el.classList.add('is-error'); el.classList.remove('is-valid');
    if (errEl) { errEl.textContent = '⚠ ' + msg; errEl.classList.add('visible'); }
  }
  function setValid(el, errEl) {
    el.classList.remove('is-error'); el.classList.add('is-valid');
    if (errEl) errEl.classList.remove('visible');
  }

  /* ── Field validation ────────────────────────────────────── */
  $('loginEmail').addEventListener('blur', function () {
    if (!this.value) { setError(this, $('loginEmailErr'), 'Email is required.'); return; }
    emailRe.test(this.value) ? setValid(this, $('loginEmailErr'))
      : setError(this, $('loginEmailErr'), 'Please enter a valid email address.');
  });

  $('loginPassword').addEventListener('input', function () {
    $('loginGeneralErr').classList.remove('visible');
    this.value ? setValid(this, $('loginPasswordErr'))
               : setError(this, $('loginPasswordErr'), 'Password is required.');
  });

  /* ── Enter key support ───────────────────────────────────── */
  ['loginEmail','loginPassword'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('loginSubmit').click();
    });
  });

  /* ── Submit ──────────────────────────────────────────────── */
  $('loginSubmit').addEventListener('click', async function () {
    var email = ($('loginEmail').value  || '').trim();
    var pass  = ($('loginPassword').value || '');

    $('loginEmail').dispatchEvent(new Event('blur'));
    $('loginGeneralErr').classList.remove('visible');

    if (!emailRe.test(email)) return;
    if (!pass) {
      setError($('loginPassword'), $('loginPasswordErr'), 'Password is required.');
      return;
    }

    var btn = $('loginSubmit');
    btn.textContent = 'Signing in…';
    btn.disabled    = true;

    /* ── Supabase sign-in ─────────────────────────────────────
       Supabase handles:
       • Password comparison (bcrypt, never stored in plain text)
       • Email-verified check
       • Session token creation
    ─────────────────────────────────────────────────────────── */
    var result = await DAM.auth().signInWithPassword({
      email:    email,
      password: pass
    });

    if (result.error) {
      btn.textContent = 'Sign In';
      btn.disabled    = false;

      var msg = result.error.message || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        $('loginGeneralErr').textContent =
          '⚠ Please verify your email first. Check your inbox for the verification link.';
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        $('loginGeneralErr').textContent =
          '⚠ Incorrect email or password. Please try again.';
      } else {
        $('loginGeneralErr').textContent = '⚠ ' + msg;
      }
      $('loginGeneralErr').classList.add('visible');
      return;
    }

    /* Success — verify profile still exists in DB */
    var profileCheck = await DAM.db()
      .from('profiles')
      .select('id')
      .eq('id', result.data.user.id)
      .single();

    if (profileCheck.error || !profileCheck.data) {
      /* Profile deleted — sign out and show error */
      await DAM.auth().signOut();
      btn.textContent = 'Sign In';
      btn.disabled    = false;
      $('loginGeneralErr').textContent =
        '⚠ This account no longer exists. Please register a new account.';
      $('loginGeneralErr').classList.add('visible');
      return;
    }

    $('loginSuccess').classList.add('visible');
    setTimeout(function () {
      var redirectTo = sessionStorage.getItem('dam_redirect_after_login') || 'home.html';
      sessionStorage.removeItem('dam_redirect_after_login');
      window.location.href = redirectTo;
    }, 900);
  });

});
