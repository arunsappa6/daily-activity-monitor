/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — manage-profile.js
   Handles: Update Profile fields + Delete Profile modal
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async function () {

  function $(id) { return document.getElementById(id); }

  function setError(el, errEl, msg) {
    el.classList.add('is-error'); el.classList.remove('is-valid');
    if (errEl) { errEl.textContent = '⚠ ' + msg; errEl.classList.add('visible'); }
  }
  function setValid(el, errEl) {
    el.classList.remove('is-error'); el.classList.add('is-valid');
    if (errEl) errEl.classList.remove('visible');
  }

  /* ── Wait for session, get current user ─────────────────── */
  await new Promise(function (r) { setTimeout(r, 400); });
  var sessionResult = await DAM.auth().getSession();
  var session = sessionResult.data && sessionResult.data.session
    ? sessionResult.data.session : null;
  var user = session ? session.user : null;
  if (!user) return;

  /* ── Pre-fill update form with current values ───────────── */
  var pResult = await DAM.db()
    .from('profiles')
    .select('first_name, last_name, phone, street_name')
    .eq('id', user.id)
    .single();

  if (pResult.data) {
    var p = pResult.data;
    $('upFirstName').value  = p.first_name  || '';
    $('upLastName').value   = p.last_name   || '';
    $('upPhone').value      = p.phone       || '';
    $('upStreetName').value = p.street_name || '';
  }

  /* ── Update Profile field validation ────────────────────── */
  $('upFirstName').addEventListener('input', function () {
    if (!this.value) { this.classList.remove('is-error','is-valid'); return; }
    /^[A-Za-z ]+$/.test(this.value)
      ? setValid(this, $('upFirstNameErr'))
      : setError(this, $('upFirstNameErr'), 'Letters and spaces only.');
  });

  $('upLastName').addEventListener('input', function () {
    if (!this.value) { this.classList.remove('is-error','is-valid'); return; }
    /^[A-Za-z ]+$/.test(this.value)
      ? setValid(this, $('upLastNameErr'))
      : setError(this, $('upLastNameErr'), 'Letters and spaces only.');
  });

  $('upPhone').addEventListener('input', function () {
    if (!this.value) { this.classList.remove('is-error','is-valid'); return; }
    if (/\D/.test(this.value)) setError(this, $('upPhoneErr'), 'Numeric digits only.');
    else if (this.value.length < 10) setError(this, $('upPhoneErr'), 'Must be 10 digits.');
    else setValid(this, $('upPhoneErr'));
  });

  /* ── Update Profile submit ──────────────────────────────── */
  $('updateProfileBtn').addEventListener('click', async function () {
    $('updateSuccess').classList.remove('visible');
    $('updateError').classList.remove('visible');

    /* Trigger validations */
    ['upFirstName','upLastName','upPhone'].forEach(function (id) {
      $(id).dispatchEvent(new Event('input'));
    });

    if (document.querySelectorAll('.field-error.visible').length > 0) return;

    var btn = $('updateProfileBtn');
    btn.textContent = 'Saving…';
    btn.disabled    = true;

    var updates = {};
    if ($('upFirstName').value.trim())  updates.first_name  = $('upFirstName').value.trim();
    if ($('upLastName').value.trim())   updates.last_name   = $('upLastName').value.trim();
    if ($('upPhone').value.trim())      updates.phone       = $('upPhone').value.trim();
    if ($('upStreetName').value.trim()) updates.street_name = $('upStreetName').value.trim();

    var result = await DAM.db()
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    btn.textContent = 'Save Changes';
    btn.disabled    = false;

    if (result.error) {
      $('updateError').classList.add('visible');
    } else {
      $('updateSuccess').classList.add('visible');
      setTimeout(function () { $('updateSuccess').classList.remove('visible'); }, 4000);
    }
  });

  /* ── Delete Modal open/close ────────────────────────────── */
  $('openDeleteModalBtn').addEventListener('click', function () {
    $('deleteModal').classList.add('is-open');
    $('deleteEmail').focus();
  });

  $('cancelDeleteBtn').addEventListener('click', function () {
    closeModal();
  });

  /* Close modal on overlay click */
  $('deleteModal').addEventListener('click', function (e) {
    if (e.target === $('deleteModal')) closeModal();
  });

  /* Close on Escape key */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  function closeModal() {
    $('deleteModal').classList.remove('is-open');
    /* Reset form */
    $('deleteReason').value   = '';
    $('deleteEmail').value    = '';
    $('deletePassword').value = '';
    ['deleteEmailErr','deletePasswordErr','deleteAuthErr'].forEach(function (id) {
      $(id).classList.remove('visible');
    });
    ['deleteEmail','deletePassword'].forEach(function (id) {
      $(id).classList.remove('is-error','is-valid');
    });
    $('deleteForm').style.display       = 'block';
    $('deleteSuccessMsg').style.display = 'none';
  }

  /* ── Delete Profile confirmation ────────────────────────── */
  $('confirmDeleteBtn').addEventListener('click', async function () {
    var email    = ($('deleteEmail').value    || '').trim();
    var password = ($('deletePassword').value || '');
    $('deleteAuthErr').classList.remove('visible');

    /* Validate required fields */
    var valid = true;
    if (!email) {
      setError($('deleteEmail'), $('deleteEmailErr'), 'Email address is required.');
      valid = false;
    } else {
      setValid($('deleteEmail'), $('deleteEmailErr'));
    }
    if (!password) {
      setError($('deletePassword'), $('deletePasswordErr'), 'Password is required.');
      valid = false;
    } else {
      setValid($('deletePassword'), $('deletePasswordErr'));
    }
    if (!valid) return;

    /* Verify email matches logged-in user */
    if (email.toLowerCase() !== user.email.toLowerCase()) {
      $('deleteAuthErr').textContent = '⚠ Email does not match your account.';
      $('deleteAuthErr').classList.add('visible');
      return;
    }

    var btn = $('confirmDeleteBtn');
    btn.textContent = 'Deleting…';
    btn.disabled    = true;

    /* ── Re-authenticate with Supabase ───────────────────────
       We sign in again to confirm the password is correct
       before proceeding with the deletion.
    ─────────────────────────────────────────────────────────── */
    var authResult = await DAM.auth().signInWithPassword({
      email: email, password: password
    });

    if (authResult.error) {
      btn.textContent = 'Delete My Account';
      btn.disabled    = false;
      $('deleteAuthErr').textContent = '⚠ Incorrect email or password. Please try again.';
      $('deleteAuthErr').classList.add('visible');
      return;
    }

    /* ── Mark profile as Closed / Past Customer ─────────────
       Call close_profile_before_delete() FIRST so the status
       is updated in the profiles table before the auth user
       row is deleted (which would cascade-delete the profile).
    ─────────────────────────────────────────────────────────── */
    await DAM.db().rpc('close_profile_before_delete');

    /* ── Delete the user's groups first (clean data) ─────── */
    await DAM.db().from('groups').delete().eq('created_by', user.id);

    /* ── Call RPC to delete auth user (cascades to profile) ─ */
    var deleteResult = await DAM.db().rpc('delete_current_user');

    /* Sign out regardless */
    await DAM.auth().signOut();

    /* Show success message */
    $('deleteForm').style.display       = 'none';
    $('deleteSuccessMsg').style.display = 'block';

    /* Redirect to home after 3.5 seconds */
    setTimeout(function () {
      window.location.href = 'index.html';
    }, 3500);
  });

});
