/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — login.js
   Phase 3: Login form validation + redirect simulation
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  const $ = id => document.getElementById(id);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  $('loginEmail').addEventListener('blur', function () {
    if (!this.value) { setError(this, $('loginEmailErr'), 'Email is required.'); return; }
    emailRe.test(this.value)
      ? setValid(this, $('loginEmailErr'))
      : setError(this, $('loginEmailErr'), 'Please enter a valid email address.');
  });

  $('loginPassword').addEventListener('input', function () {
    this.value
      ? setValid(this, $('loginPasswordErr'))
      : setError(this, $('loginPasswordErr'), 'Password is required.');
    $('loginGeneralErr').classList.remove('visible');
  });

  $('loginSubmit').addEventListener('click', () => {
    const email = $('loginEmail').value.trim();
    const pass  = $('loginPassword').value;

    $('loginEmail').dispatchEvent(new Event('blur'));

    let valid = true;

    if (!emailRe.test(email)) valid = false;
    if (!pass) {
      setError($('loginPassword'), $('loginPasswordErr'), 'Password is required.');
      valid = false;
    }

    if (!valid) return;

    // UI: simulate login (backend will handle real auth)
    $('loginSubmit').textContent  = 'Signing in…';
    $('loginSubmit').disabled     = true;

    setTimeout(() => {
      $('loginForm').style.display  = 'none';
      $('loginSuccess').classList.add('visible');
      // Redirect to home/dashboard after 1.8s
      setTimeout(() => { window.location.href = 'home.html'; }, 1800);
    }, 900);
  });

});
