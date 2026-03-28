/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — create-group.js
   Group creation: creator is admin by default.
   Relationship dropdown per spec.
   Saves group data to localStorage for dashboard display.
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  var memberCount = 0;

  var RELATIONSHIPS = [
    'Father', 'Mother', 'Son', 'Daughter',
    'Sister', 'Brother', 'Nephew', 'Niece',
    'Sister-in-law', 'Brother-in-law', 'Cousin',
    'Father-in-law', 'Mother-in-law', 'Room mate', 'Friend'
  ];

  // ── Helpers ──────────────────────────────────────────────
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

  function attachNameValidator(el, errEl) {
    el.addEventListener('input', function () {
      if (!this.value) {
        this.classList.remove('is-error', 'is-valid');
        if (errEl) errEl.classList.remove('visible');
        return;
      }
      if (/^[A-Za-z ]+$/.test(this.value)) {
        setValid(this, errEl);
      } else {
        setError(this, errEl, 'Name should not contain numeric digits or special characters.');
      }
    });
  }

  function attachPhoneValidator(phoneEl, errEl) {
    phoneEl.addEventListener('input', function () {
      var val = this.value;
      if (!val) {
        this.classList.remove('is-error', 'is-valid');
        if (errEl) errEl.classList.remove('visible');
        return;
      }
      if (/\D/.test(val)) {
        setError(this, errEl, 'Phone number should be numeric digits only.');
      } else if (val.length < 10) {
        setError(this, errEl, 'Phone number should be 10 digits.');
      } else {
        setValid(this, errEl);
      }
    });
  }

  function attachEmailValidator(emailEl, errEl) {
    emailEl.addEventListener('blur', function () {
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!this.value) {
        this.classList.remove('is-error', 'is-valid');
        if (errEl) errEl.classList.remove('visible');
        return;
      }
      emailRe.test(this.value)
        ? setValid(this, errEl)
        : setError(this, errEl, 'Please enter a valid email address.');
    });
  }

  // ── Build relationship <select> options ───────────────────
  function buildRelationshipOptions() {
    var html = '<option value="">— Select Relationship —</option>';
    RELATIONSHIPS.forEach(function (r) {
      html += '<option value="' + r + '">' + r + '</option>';
    });
    return html;
  }

  // ── Welcome message updater ───────────────────────────────
  function updateWelcomeMessage() {
    var groupName = ($('groupName').value || '').trim() || '[Group Name]';
    var firstMemberEl = document.querySelector('.member-first-name');
    var firstName = (firstMemberEl && firstMemberEl.value.trim()) ? firstMemberEl.value.trim() : '[First Name]';
    $('welcomePreview').textContent =
      'Hi ' + firstName + ', Welcome to group ' + groupName + '. Kindly verify the link sent in this email.';
  }

  $('groupName').addEventListener('input', function () {
    if (this.value.trim()) {
      setValid(this, $('groupNameErr'));
    } else {
      setError(this, $('groupNameErr'), 'Group name is required.');
    }
    updateWelcomeMessage();
  });

  // ── Add member card ───────────────────────────────────────
  function addMemberCard() {
    memberCount++;
    var idx = memberCount;
    var container = $('membersContainer');

    var card = document.createElement('div');
    card.className = 'member-card';
    card.id = 'member-' + idx;

    card.innerHTML = [
      '<div class="member-card-title">Member ' + idx + '</div>',
      '<button type="button" class="btn--remove-member" data-idx="' + idx + '">✕ Remove</button>',

      '<div class="form-row form-row--2">',
        '<div class="form-group">',
          '<label>First Name <span class="required">*</span></label>',
          '<input type="text" class="member-first-name" id="mFirstName-' + idx + '" placeholder="e.g. John" />',
          '<span class="field-error" id="mFirstNameErr-' + idx + '">⚠ Name should not contain numeric digits.</span>',
        '</div>',
        '<div class="form-group">',
          '<label>Last Name <span class="required">*</span></label>',
          '<input type="text" id="mLastName-' + idx + '" placeholder="e.g. Doe" />',
          '<span class="field-error" id="mLastNameErr-' + idx + '">⚠ Name should not contain numeric digits.</span>',
        '</div>',
      '</div>',

      '<div class="form-row form-row--1">',
        '<div class="form-group">',
          '<label>Phone Number <span class="required">*</span></label>',
          '<div class="phone-composite">',
            '<div class="select-wrapper">',
              '<select id="mPhoneCode-' + idx + '" aria-label="Country code">',
                '<option value="+91">🇮🇳 +91 (India)</option>',
                '<option value="+1" selected>🇨🇦 +1 (Canada)</option>',
                '<option value="+1">🇺🇸 +1 (United States)</option>',
              '</select>',
            '</div>',
            '<input type="tel" id="mPhone-' + idx + '" placeholder="10-digit number" maxlength="10" />',
          '</div>',
          '<span class="field-error" id="mPhoneErr-' + idx + '">⚠ Phone number should be 10 digits.</span>',
        '</div>',
      '</div>',

      '<div class="form-row form-row--1">',
        '<div class="form-group">',
          '<label>Email <span class="required">*</span></label>',
          '<input type="email" id="mEmail-' + idx + '" placeholder="e.g. john.doe@email.com" />',
          '<span class="field-error" id="mEmailErr-' + idx + '">⚠ Please enter a valid email address.</span>',
        '</div>',
      '</div>',

      '<div class="form-row form-row--1">',
        '<div class="form-group">',
          '<label>Relationship to Group <span class="required">*</span></label>',
          '<div class="select-wrapper">',
            '<select id="mRelationship-' + idx + '">',
              buildRelationshipOptions(),
            '</select>',
          '</div>',
          '<span class="field-error" id="mRelationshipErr-' + idx + '">⚠ Please select a relationship.</span>',
        '</div>',
      '</div>'
    ].join('');

    container.appendChild(card);

    // Attach validators
    attachNameValidator(document.getElementById('mFirstName-' + idx), document.getElementById('mFirstNameErr-' + idx));
    attachNameValidator(document.getElementById('mLastName-' + idx),  document.getElementById('mLastNameErr-' + idx));
    attachPhoneValidator(document.getElementById('mPhone-' + idx),    document.getElementById('mPhoneErr-' + idx));
    attachEmailValidator(document.getElementById('mEmail-' + idx),    document.getElementById('mEmailErr-' + idx));

    // Welcome message on first-name input
    document.getElementById('mFirstName-' + idx).addEventListener('input', updateWelcomeMessage);

    // Remove button
    card.querySelector('.btn--remove-member').addEventListener('click', function () {
      card.remove();
      updateWelcomeMessage();
      renumberMembers();
    });

    updateWelcomeMessage();
  }

  function renumberMembers() {
    var cards = document.querySelectorAll('.member-card');
    cards.forEach(function (card, i) {
      var title = card.querySelector('.member-card-title');
      if (title) title.textContent = 'Member ' + (i + 1);
    });
  }

  $('addMemberBtn').addEventListener('click', addMemberCard);

  // Start with one member card
  addMemberCard();

  // ── Submit ────────────────────────────────────────────────
  $('createGroupSubmit').addEventListener('click', function () {
    var hasErrors = false;

    // Group name
    if (!$('groupName').value.trim()) {
      setError($('groupName'), $('groupNameErr'), 'Group name is required.');
      hasErrors = true;
    }

    // Trigger member field validations
    document.querySelectorAll('.member-first-name').forEach(function (el) {
      el.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll('[id^="mLastName-"]').forEach(function (el) {
      el.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll('[id^="mPhone-"]').forEach(function (el) {
      el.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll('[id^="mEmail-"]').forEach(function (el) {
      el.dispatchEvent(new Event('blur'));
    });

    // Validate relationship dropdowns
    document.querySelectorAll('[id^="mRelationship-"]').forEach(function (sel) {
      var idx = sel.id.split('-')[1];
      var errEl = document.getElementById('mRelationshipErr-' + idx);
      if (!sel.value) {
        sel.classList.add('is-error');
        if (errEl) errEl.classList.add('visible');
        hasErrors = true;
      } else {
        sel.classList.remove('is-error');
        if (errEl) errEl.classList.remove('visible');
      }
    });

    if (document.querySelectorAll('.field-error.visible').length > 0) hasErrors = true;

    if (hasErrors) return;

    // ── Save group to localStorage ────────────────────────
    var groupName = $('groupName').value.trim();
    var members = [];
    document.querySelectorAll('.member-card').forEach(function (card) {
      var idxMatch = card.id.match(/member-(\d+)/);
      if (!idxMatch) return;
      var i = idxMatch[1];
      members.push({
        firstName:    (document.getElementById('mFirstName-' + i) || {}).value || '',
        lastName:     (document.getElementById('mLastName-' + i)  || {}).value || '',
        phone:        (document.getElementById('mPhone-' + i)     || {}).value || '',
        email:        (document.getElementById('mEmail-' + i)     || {}).value || '',
        relationship: (document.getElementById('mRelationship-' + i) || {}).value || ''
      });
    });

    // Get logged-in user from localStorage
    var currentUser = JSON.parse(localStorage.getItem('dam_current_user') || 'null');
    var adminName = currentUser
      ? (currentUser.firstName + ' ' + currentUser.lastName)
      : 'Group Creator';

    var newGroup = {
      id:        Date.now(),
      name:      groupName,
      admin:     adminName,
      isAdmin:   true,
      members:   members,
      createdAt: new Date().toISOString()
    };

    // Append to groups list
    var groups = JSON.parse(localStorage.getItem('dam_groups') || '[]');
    groups.push(newGroup);
    localStorage.setItem('dam_groups', JSON.stringify(groups));

    // Update the current user's group membership in users store
    if (currentUser) {
      var users = JSON.parse(localStorage.getItem('dam_users') || '[]');
      var uIdx = users.findIndex(function (u) { return u.email === currentUser.email; });
      if (uIdx > -1) {
        if (!users[uIdx].groupNames) users[uIdx].groupNames = [];
        users[uIdx].groupNames.push(groupName);
        users[uIdx].isAdmin = true;
        localStorage.setItem('dam_users', JSON.stringify(users));
        // Refresh current user session
        currentUser.groupNames = users[uIdx].groupNames;
        currentUser.isAdmin = true;
        localStorage.setItem('dam_current_user', JSON.stringify(currentUser));
      }
    }

    // Show success
    $('createGroupSubmit').textContent = 'Creating…';
    $('createGroupSubmit').disabled = true;
    setTimeout(function () {
      $('createGroupSubmit').style.display = 'none';
      $('groupSuccess').classList.add('visible');
      setTimeout(function () { window.location.href = 'home.html'; }, 2000);
    }, 600);
  });

});
