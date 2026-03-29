/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — forgot-password.js  (Supabase version)

   Supabase sends the real reset email automatically.
   No token generation, no simulation panel needed.
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

  $('resetEmail').addEventListener('blur', function () {
    if (!this.value.trim()) { setError(this, $('resetEmailErr'), 'Email address is required.'); return; }
    emailRe.test(this.value.trim()) ? setValid(this, $('resetEmailErr'))
      : setError(this, $('resetEmailErr'), 'Please enter a valid email address.');
  });

  $('resetEmail').addEventListener('input', function () {
    $('resetGeneralErr').classList.remove('visible');
  });

  $('resetEmail').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('resetRequestBtn').click();
  });

  $('resetRequestBtn').addEventListener('click', async function () {
    var email = ($('resetEmail').value || '').trim();
    $('resetEmail').dispatchEvent(new Event('blur'));
    $('resetGeneralErr').classList.remove('visible');
    if (!emailRe.test(email)) return;

    var btn = $('resetRequestBtn');
    btn.textContent = 'Sending…';
    btn.disabled    = true;

    /* ── Supabase sends the reset email automatically ─────────
       The email contains a link to:
       https://your-site.github.io/reset-password.html
       (configured in Supabase Dashboard → Authentication →
        URL Configuration → Redirect URLs)

       Security note: Supabase always responds with "success"
       even if the email doesn't exist — this prevents attackers
       from discovering which emails are registered.
    ─────────────────────────────────────────────────────────── */
    var resetUrl = window.location.href
      .replace(/\/[^\/]*$/, '/reset-password.html')
      .split('?')[0];

    var result = await DAM.auth().resetPasswordForEmail(email, {
      redirectTo: resetUrl
    });

    btn.textContent = 'Send Reset Link';
    btn.disabled    = false;

    if (result.error) {
      $('resetGeneralErr').textContent = '⚠ ' + result.error.message;
      $('resetGeneralErr').classList.add('visible');
      return;
    }

    /* Show confirmation — hide the demo panel since email is real */
    $('requestPanel').style.display = 'none';
    $('confirmPanel').style.display = 'block';
    $('sentToEmail').textContent = email;

    /* Hide the demo simulation panel — not needed with Supabase */
    var demoPanel = $('demoPanel');
    if (demoPanel) demoPanel.style.display = 'none';
  });

});
