/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — create-group.js  (Supabase version)
   Saves groups and members to Supabase PostgreSQL tables.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  var memberCount = 0;

  var RELATIONSHIPS = [
    'Father','Mother','Son','Daughter',
    'Sister','Brother','Nephew','Niece',
    'Sister-in-law','Brother-in-law','Cousin',
    'Father-in-law','Mother-in-law','Room mate','Friend'
  ];

  function $(id) { return document.getElementById(id); }

  function setError(el, errEl, msg) {
    el.classList.add('is-error'); el.classList.remove('is-valid');
    if (errEl) { errEl.textContent = '⚠ ' + msg; errEl.classList.add('visible'); }
  }
  function setValid(el, errEl) {
    el.classList.remove('is-error'); el.classList.add('is-valid');
    if (errEl) errEl.classList.remove('visible');
  }

  function attachNameValidator(el, errEl) {
    el.addEventListener('input', function () {
      if (!this.value) { this.classList.remove('is-error','is-valid'); if (errEl) errEl.classList.remove('visible'); return; }
      /^[A-Za-z ]+$/.test(this.value) ? setValid(this, errEl) : setError(this, errEl, 'Letters and spaces only.');
    });
  }
  function attachPhoneValidator(phoneEl, errEl) {
    phoneEl.addEventListener('input', function () {
      var v = this.value;
      if (!v) { this.classList.remove('is-error','is-valid'); if (errEl) errEl.classList.remove('visible'); return; }
      if (/\D/.test(v)) setError(this, errEl, 'Numeric digits only.');
      else if (v.length < 10) setError(this, errEl, 'Must be 10 digits.');
      else setValid(this, errEl);
    });
  }
  function attachEmailValidator(emailEl, errEl) {
    emailEl.addEventListener('blur', function () {
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!this.value) { this.classList.remove('is-error','is-valid'); if (errEl) errEl.classList.remove('visible'); return; }
      re.test(this.value) ? setValid(this, errEl) : setError(this, errEl, 'Enter a valid email address.');
    });
  }

  function buildRelationshipOptions() {
    var html = '<option value="">— Select Relationship —</option>';
    RELATIONSHIPS.forEach(function (r) { html += '<option value="'+r+'">'+r+'</option>'; });
    return html;
  }

  function updateWelcomeMessage() {
    var groupName = ($('groupName').value || '').trim() || '[Group Name]';
    var firstMemberEl = document.querySelector('.member-first-name');
    var firstName = (firstMemberEl && firstMemberEl.value.trim()) ? firstMemberEl.value.trim() : '[First Name]';
    $('welcomePreview').textContent =
      'Hi ' + firstName + ', Welcome to group ' + groupName + '. Kindly verify the link sent in this email.';
  }

  $('groupName').addEventListener('input', function () {
    this.value.trim() ? setValid(this, $('groupNameErr')) : setError(this, $('groupNameErr'), 'Group name is required.');
    updateWelcomeMessage();
  });

  /* ── Add member card ───────────────────────────────────── */
  function addMemberCard() {
    memberCount++;
    var idx = memberCount;
    var card = document.createElement('div');
    card.className = 'member-card';
    card.id = 'member-' + idx;
    card.innerHTML = [
      '<div class="member-card-title">Member ' + idx + '</div>',
      '<button type="button" class="btn--remove-member" data-idx="' + idx + '">✕ Remove</button>',
      '<div class="form-row form-row--2">',
        '<div class="form-group"><label>First Name <span class="required">*</span></label>',
          '<input type="text" class="member-first-name" id="mFirstName-'+idx+'" placeholder="e.g. John" />',
          '<span class="field-error" id="mFirstNameErr-'+idx+'">⚠ Letters and spaces only.</span></div>',
        '<div class="form-group"><label>Last Name <span class="required">*</span></label>',
          '<input type="text" id="mLastName-'+idx+'" placeholder="e.g. Doe" />',
          '<span class="field-error" id="mLastNameErr-'+idx+'">⚠ Letters and spaces only.</span></div>',
      '</div>',
      '<div class="form-row form-row--1"><div class="form-group"><label>Phone <span class="required">*</span></label>',
        '<div class="phone-composite">',
          '<div class="select-wrapper"><select id="mPhoneCode-'+idx+'">',
            '<option value="+91">🇮🇳 +91 (India)</option>',
            '<option value="+1" selected>🇨🇦 +1 (Canada)</option>',
            '<option value="+1">🇺🇸 +1 (United States)</option>',
          '</select></div>',
          '<input type="tel" id="mPhone-'+idx+'" placeholder="10-digit number" maxlength="10" />',
        '</div>',
        '<span class="field-error" id="mPhoneErr-'+idx+'">⚠ Must be 10 digits.</span></div></div>',
      '<div class="form-row form-row--1"><div class="form-group"><label>Email <span class="required">*</span></label>',
        '<input type="email" id="mEmail-'+idx+'" placeholder="e.g. john@email.com" />',
        '<span class="field-error" id="mEmailErr-'+idx+'">⚠ Enter a valid email.</span></div></div>',
      '<div class="form-row form-row--1"><div class="form-group"><label>Relationship <span class="required">*</span></label>',
        '<div class="select-wrapper"><select id="mRelationship-'+idx+'">',
          buildRelationshipOptions(),
        '</select></div>',
        '<span class="field-error" id="mRelationshipErr-'+idx+'">⚠ Please select a relationship.</span></div></div>'
    ].join('');

    document.getElementById('membersContainer').appendChild(card);

    attachNameValidator(document.getElementById('mFirstName-'+idx), document.getElementById('mFirstNameErr-'+idx));
    attachNameValidator(document.getElementById('mLastName-'+idx),  document.getElementById('mLastNameErr-'+idx));
    attachPhoneValidator(document.getElementById('mPhone-'+idx),    document.getElementById('mPhoneErr-'+idx));
    attachEmailValidator(document.getElementById('mEmail-'+idx),    document.getElementById('mEmailErr-'+idx));
    document.getElementById('mFirstName-'+idx).addEventListener('input', updateWelcomeMessage);

    card.querySelector('.btn--remove-member').addEventListener('click', function () {
      card.remove(); updateWelcomeMessage(); renumberMembers();
    });

    updateWelcomeMessage();
  }

  function renumberMembers() {
    document.querySelectorAll('.member-card').forEach(function (c, i) {
      var t = c.querySelector('.member-card-title');
      if (t) t.textContent = 'Member ' + (i + 1);
    });
  }

  $('addMemberBtn').addEventListener('click', addMemberCard);
  addMemberCard(); // start with one card

  /* ── Submit ────────────────────────────────────────────── */
  $('createGroupSubmit').addEventListener('click', async function () {
    var hasErrors = false;

    if (!$('groupName').value.trim()) {
      setError($('groupName'), $('groupNameErr'), 'Group name is required.');
      hasErrors = true;
    }

    document.querySelectorAll('.member-first-name').forEach(function (el) { el.dispatchEvent(new Event('input')); });
    document.querySelectorAll('[id^="mLastName-"]').forEach(function (el)  { el.dispatchEvent(new Event('input')); });
    document.querySelectorAll('[id^="mPhone-"]').forEach(function (el)     { el.dispatchEvent(new Event('input')); });
    document.querySelectorAll('[id^="mEmail-"]').forEach(function (el)     { el.dispatchEvent(new Event('blur')); });

    document.querySelectorAll('[id^="mRelationship-"]').forEach(function (sel) {
      var idx = sel.id.split('-')[1];
      var errEl = document.getElementById('mRelationshipErr-' + idx);
      if (!sel.value) { sel.classList.add('is-error'); if (errEl) errEl.classList.add('visible'); hasErrors = true; }
      else            { sel.classList.remove('is-error'); if (errEl) errEl.classList.remove('visible'); }
    });

    if (document.querySelectorAll('.field-error.visible').length > 0) hasErrors = true;
    if (hasErrors) return;

    var btn = $('createGroupSubmit');
    btn.textContent = 'Creating…';
    btn.disabled    = true;

    /* ── Get current Supabase user ──────────────────────────── */
    var sessionResult = await DAM.auth().getSession();
    var user = sessionResult.data && sessionResult.data.session
      ? sessionResult.data.session.user : null;

    if (!user) { window.location.href = 'login.html'; return; }

    /* ── Get user's profile for admin_name ────────────────── */
    var profileResult = await DAM.db()
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    var adminName = profileResult.data
      ? (profileResult.data.first_name + ' ' + profileResult.data.last_name)
      : user.email;

    /* ── Insert group row ─────────────────────────────────── */
    var groupResult = await DAM.db()
      .from('groups')
      .insert({
        name:       $('groupName').value.trim(),
        created_by: user.id,
        admin_name: adminName
      })
      .select()
      .single();

    if (groupResult.error) {
      btn.textContent = 'Create Group';
      btn.disabled    = false;
      alert('Error creating group: ' + groupResult.error.message);
      return;
    }

    var groupId = groupResult.data.id;

    /* ── Insert member rows ───────────────────────────────── */
    var members = [];
    document.querySelectorAll('.member-card').forEach(function (card) {
      var m = card.id.match(/member-(\d+)/);
      if (!m) return;
      var i = m[1];
      members.push({
        group_id:     groupId,
        first_name:   (document.getElementById('mFirstName-'+i) || {}).value || '',
        last_name:    (document.getElementById('mLastName-'+i)  || {}).value || '',
        phone:        (document.getElementById('mPhone-'+i)     || {}).value || '',
        email:        (document.getElementById('mEmail-'+i)     || {}).value || '',
        relationship: (document.getElementById('mRelationship-'+i) || {}).value || ''
      });
    });

    if (members.length > 0) {
      var memberResult = await DAM.db()
        .from('group_members')
        .insert(members);

      if (memberResult.error) {
        console.warn('Member insert warning:', memberResult.error.message);
      }
    }

    /* ── Update profile is_admin flag ─────────────────────── */
    await DAM.db()
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id);

    /* Success */
    btn.style.display = 'none';
    $('groupSuccess').classList.add('visible');
    setTimeout(function () { window.location.href = 'home.html'; }, 2000);
  });

});
