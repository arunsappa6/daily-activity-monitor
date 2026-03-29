/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — reset-password.js  (Supabase version)

   Supabase parses the token from the URL automatically via
   onAuthStateChange. When the user clicks the reset link,
   Supabase fires a PASSWORD_RECOVERY event — we then show
   the new-password form. No manual token parsing needed.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  function $(id) { return document.getElementById(id); }
  function show(id) { var el=$(id); if(el) el.style.display='block'; }
  function hide(id) { var el=$(id); if(el) el.style.display='none'; }

  function setError(el, errEl, msg) {
    el.classList.add('is-error'); el.classList.remove('is-valid');
    if (errEl) { errEl.textContent = '⚠ ' + msg; errEl.classList.add('visible'); }
  }
  function setValid(el, errEl) {
    el.classList.remove('is-error'); el.classList.add('is-valid');
    if (errEl) errEl.classList.remove('visible');
  }
  function clearState(el, errEl) {
    el.classList.remove('is-error','is-valid');
    if (errEl) errEl.classList.remove('visible');
  }

  /* ── Listen for Supabase PASSWORD_RECOVERY event ─────────
     When the user clicks the reset link in their email,
     Supabase automatically validates the token in the URL
     and fires this event — we simply show the form.
  ─────────────────────────────────────────────────────────── */
  var recoveryReceived = false;

  DAM.auth().onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryReceived = true;
      hide('invalidPanel');
      show('resetPanel');
    }
  });

  /* Fallback: if no event fires within 3 seconds, show invalid panel */
  setTimeout(function () {
    if (!recoveryReceived) {
      show('invalidPanel');
    }
  }, 3000);

  /* ── Password strength meter ─────────────────────────────── */
  function measureStrength(pw) {
    var s = 0;
    if (pw.length >= 8)  s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }

  var sColors = ['#E24B4A','#E24B4A','#EF9F27','#1D9E75','#0F6E56'];
  var sLabels = ['Very weak','Weak','Fair','Strong','Very strong'];
  var sPcts   = ['20%','35%','55%','78%','100%'];

  $('newPassword').addEventListener('input', function () {
    var pw    = this.value;
    var wrap  = $('strengthWrap');
    var bar   = $('strengthBar');
    var label = $('strengthLabel');

    if (!pw) { wrap.style.display = 'none'; clearState(this, $('newPasswordErr')); return; }
    wrap.style.display = 'block';

    var idx = Math.min(measureStrength(pw), 4);
    bar.style.width = sPcts[idx];
    bar.style.backgroundColor = sColors[idx];
    label.textContent = sLabels[idx];
    label.style.color = sColors[idx];

    pw.length < 8
      ? setError(this, $('newPasswordErr'), 'At least 8 characters required.')
      : setValid(this, $('newPasswordErr'));

    if ($('confirmNewPassword').value) {
      $('confirmNewPassword').dispatchEvent(new Event('input'));
    }
  });

  $('confirmNewPassword').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('confirmNewPasswordErr')); return; }
    this.value === $('newPassword').value
      ? setValid(this, $('confirmNewPasswordErr'))
      : setError(this, $('confirmNewPasswordErr'), 'Passwords do not match.');
  });

  ['newPassword','confirmNewPassword'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('resetSubmitBtn').click();
    });
  });

  /* ── Submit: update password via Supabase ────────────────── */
  $('resetSubmitBtn').addEventListener('click', async function () {
    var newPw  = $('newPassword').value;
    var confPw = $('confirmNewPassword').value;

    $('newPassword').dispatchEvent(new Event('input'));
    $('confirmNewPassword').dispatchEvent(new Event('input'));

    if (!newPw || newPw.length < 8) return;
    if (newPw !== confPw) return;
    if (document.querySelectorAll('.field-error.visible').length > 0) return;

    var btn = $('resetSubmitBtn');
    btn.textContent = 'Updating…';
    btn.disabled    = true;

    /* ── Supabase updateUser — validates the recovery session ──
       Supabase ensures the user is authenticated via the
       recovery token before allowing this call to succeed.
    ─────────────────────────────────────────────────────────── */
    var result = await DAM.auth().updateUser({ password: newPw });

    if (result.error) {
      btn.textContent = 'Update Password';
      btn.disabled    = false;
      var errDiv = document.createElement('div');
      errDiv.className = 'field-error visible';
      errDiv.textContent = '⚠ ' + result.error.message;
      btn.before(errDiv);
      return;
    }

    /* Sign out after password reset — forces fresh login */
    await DAM.auth().signOut();

    hide('resetPanel');
    show('successPanel');

    setTimeout(function () {
      window.location.href = 'login.html';
    }, 2500);
  });

});
