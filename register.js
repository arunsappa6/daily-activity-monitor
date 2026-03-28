/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — register.js
   Phase 3 + Improvements:
   • All field validations
   • Age gate (18+)
   • Duplicate detection (firstName + lastName + email + phone)
   • Saves registered users to localStorage (dam_users)
   • Triggers download of updated Users.txt on each registration
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  // ── Province / State Data ──────────────────────────────
  var provinces = {
    Canada: [
      'AB — Alberta', 'BC — British Columbia', 'MB — Manitoba',
      'NB — New Brunswick', 'NL — Newfoundland and Labrador',
      'NS — Nova Scotia', 'NT — Northwest Territories',
      'NU — Nunavut', 'ON — Ontario', 'PE — Prince Edward Island',
      'QC — Quebec', 'SK — Saskatchewan', 'YT — Yukon'
    ],
    'United States': [
      'AL — Alabama', 'AK — Alaska', 'AZ — Arizona', 'AR — Arkansas',
      'CA — California', 'CO — Colorado', 'CT — Connecticut', 'DE — Delaware',
      'FL — Florida', 'GA — Georgia', 'HI — Hawaii', 'ID — Idaho',
      'IL — Illinois', 'IN — Indiana', 'IA — Iowa', 'KS — Kansas',
      'KY — Kentucky', 'LA — Louisiana', 'ME — Maine', 'MD — Maryland',
      'MA — Massachusetts', 'MI — Michigan', 'MN — Minnesota', 'MS — Mississippi',
      'MO — Missouri', 'MT — Montana', 'NE — Nebraska', 'NV — Nevada',
      'NH — New Hampshire', 'NJ — New Jersey', 'NM — New Mexico', 'NY — New York',
      'NC — North Carolina', 'ND — North Dakota', 'OH — Ohio', 'OK — Oklahoma',
      'OR — Oregon', 'PA — Pennsylvania', 'RI — Rhode Island', 'SC — South Carolina',
      'SD — South Dakota', 'TN — Tennessee', 'TX — Texas', 'UT — Utah',
      'VT — Vermont', 'VA — Virginia', 'WA — Washington', 'WV — West Virginia',
      'WI — Wisconsin', 'WY — Wyoming', 'DC — District of Columbia'
    ],
    India: [
      'AP — Andhra Pradesh', 'AR — Arunachal Pradesh', 'AS — Assam',
      'BR — Bihar', 'CG — Chhattisgarh', 'GA — Goa', 'GJ — Gujarat',
      'HR — Haryana', 'HP — Himachal Pradesh', 'JK — Jammu and Kashmir',
      'JH — Jharkhand', 'KA — Karnataka', 'KL — Kerala', 'MP — Madhya Pradesh',
      'MH — Maharashtra', 'MN — Manipur', 'ML — Meghalaya', 'MZ — Mizoram',
      'NL — Nagaland', 'OD — Odisha', 'PB — Punjab', 'RJ — Rajasthan',
      'SK — Sikkim', 'TN — Tamil Nadu', 'TS — Telangana', 'TR — Tripura',
      'UP — Uttar Pradesh', 'UK — Uttarakhand', 'WB — West Bengal',
      'AN — Andaman and Nicobar Islands', 'CH — Chandigarh',
      'DN — Dadra and Nagar Haveli', 'DD — Daman and Diu',
      'DL — Delhi', 'LD — Lakshadweep', 'PY — Puducherry'
    ]
  };

  // ── Populate Day dropdown ──────────────────────────────
  var dobDay = document.getElementById('dobDay');
  dobDay.innerHTML = '<option value="">Day</option>';
  for (var d = 1; d <= 31; d++) {
    var opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    dobDay.appendChild(opt);
  }

  // ── Populate Year dropdown (1900 → current, ascending) ──
  var dobYear = document.getElementById('dobYear');
  var currentYear = new Date().getFullYear();
  dobYear.innerHTML = '<option value="">Year</option>';
  for (var y = 1900; y <= currentYear; y++) {
    var yOpt = document.createElement('option');
    yOpt.value = y; yOpt.textContent = y;
    dobYear.appendChild(yOpt);
  }

  // ── Helpers ────────────────────────────────────────────
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

  function clearState(el, errEl) {
    el.classList.remove('is-error', 'is-valid');
    if (errEl) errEl.classList.remove('visible');
  }

  // ── Age verification ───────────────────────────────────
  function checkAge() {
    var day   = parseInt($('dobDay').value);
    var month = parseInt($('dobMonth').value);
    var year  = parseInt($('dobYear').value);
    if (!day || !month || !year) return;

    var dob   = new Date(year, month - 1, day);
    var today = new Date();
    var age   = today.getFullYear() - dob.getFullYear();
    var mDiff = today.getMonth() - dob.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--;

    var banner = $('ageGateBanner');
    var wrap   = $('formFieldsWrap');

    if (age < 18) {
      banner.classList.add('visible');
      wrap.classList.add('is-disabled');
      ['dobDay','dobMonth','dobYear'].forEach(function (id) {
        var sw = $(id).closest('.select-wrapper');
        if (sw) { sw.style.pointerEvents = 'auto'; sw.style.opacity = '1'; }
      });
    } else {
      banner.classList.remove('visible');
      wrap.classList.remove('is-disabled');
    }
  }

  ['dobDay','dobMonth','dobYear'].forEach(function (id) {
    $(id).addEventListener('change', checkAge);
  });

  // ── First Name ─────────────────────────────────────────
  $('firstName').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('firstNameErr')); return; }
    /^[A-Za-z ]+$/.test(this.value)
      ? setValid(this, $('firstNameErr'))
      : setError(this, $('firstNameErr'), 'This field should be letters and space only.');
  });

  // ── Last Name ──────────────────────────────────────────
  $('lastName').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('lastNameErr')); return; }
    /^[A-Za-z ]+$/.test(this.value)
      ? setValid(this, $('lastNameErr'))
      : setError(this, $('lastNameErr'), 'This field should be letters and space only.');
  });

  // ── Email ──────────────────────────────────────────────
  $('email').addEventListener('blur', function () {
    if (!this.value) { clearState(this, $('emailErr')); return; }
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)
      ? setValid(this, $('emailErr'))
      : setError(this, $('emailErr'), 'Please enter a valid email address (e.g. user@example.com).');
  });

  // ── Phone Number ───────────────────────────────────────
  $('phoneNumber').addEventListener('input', function () {
    var val = this.value;
    if (!val) { clearState(this, $('phoneErr')); return; }
    if (/\D/.test(val)) {
      setError(this, $('phoneErr'), 'Phone number should be numeric digits only.');
    } else if (val.length < 10) {
      setError(this, $('phoneErr'), 'Please enter a valid phone number. Phone number should be 10 digits.');
    } else {
      setValid(this, $('phoneErr'));
    }
  });

  // ── Street Number ──────────────────────────────────────
  $('streetNumber').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('streetNumberErr')); return; }
    /^\d+$/.test(this.value)
      ? setValid(this, $('streetNumberErr'))
      : setError(this, $('streetNumberErr'), 'Please enter numeric values only.');
  });

  // ── Street Name (max 60) ───────────────────────────────
  $('streetName').addEventListener('input', function () {
    if (this.value.length > 60) {
      setError(this, $('streetNameErr'), 'Maximum 60 characters allowed.');
    } else if (this.value.length > 0) {
      setValid(this, $('streetNameErr'));
    } else {
      clearState(this, $('streetNameErr'));
    }
  });

  // ── Country → Province + Postal Code ──────────────────
  $('country').addEventListener('change', function () {
    var country  = this.value;
    var provSel  = $('province');
    var postalIn = $('postalCode');

    provSel.innerHTML = '';
    if (country && provinces[country]) {
      var blank = document.createElement('option');
      blank.value = ''; blank.textContent = '— Select Province/State —';
      provSel.appendChild(blank);
      provinces[country].forEach(function (p) {
        var o = document.createElement('option');
        o.value = p; o.textContent = p;
        provSel.appendChild(o);
      });
      provSel.disabled = false;
    } else {
      provSel.innerHTML = '<option value="">— Select Country first —</option>';
      provSel.disabled = true;
    }

    postalIn.value = '';
    clearState(postalIn, $('postalCodeErr'));

    if (country === 'Canada') {
      postalIn.disabled = false; postalIn.maxLength = 7;
      postalIn.placeholder = 'e.g. M2R 1Q2';
    } else if (country === 'United States') {
      postalIn.disabled = false; postalIn.maxLength = 5;
      postalIn.placeholder = 'e.g. 10001';
    } else if (country === 'India') {
      postalIn.disabled = false; postalIn.maxLength = 6;
      postalIn.placeholder = 'e.g. 110001';
    } else {
      postalIn.disabled = true;
      postalIn.placeholder = 'Select a country first';
    }
  });

  // ── Postal Code ────────────────────────────────────────
  $('postalCode').addEventListener('input', function () {
    var country = $('country').value;
    var val = this.value.toUpperCase().replace(/\s/g, '');

    if (country === 'Canada') {
      if (val.length > 3) val = val.slice(0, 3) + ' ' + val.slice(3, 6);
      this.value = val;
      var rawLen = val.replace(/\s/g, '').length;
      if (rawLen === 0) { clearState(this, $('postalCodeErr')); return; }
      rawLen < 6
        ? setError(this, $('postalCodeErr'), "Postal code should be 6 characters in format 'M2M 2M2'.")
        : setValid(this, $('postalCodeErr'));
    } else if (country === 'United States') {
      if (!val) { clearState(this, $('postalCodeErr')); return; }
      if (/\D/.test(val)) setError(this, $('postalCodeErr'), 'Postal code should be numeric.');
      else if (val.length < 5) setError(this, $('postalCodeErr'), 'Postal code should be 5 numbers.');
      else setValid(this, $('postalCodeErr'));
    } else if (country === 'India') {
      if (!val) { clearState(this, $('postalCodeErr')); return; }
      if (/\D/.test(val)) setError(this, $('postalCodeErr'), 'Postal code should be numeric.');
      else if (val.length < 6) setError(this, $('postalCodeErr'), 'Postal code should be 6 numbers.');
      else setValid(this, $('postalCodeErr'));
    }
  });

  // ── Password ───────────────────────────────────────────
  $('password').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('passwordErr')); return; }
    this.value.length >= 8
      ? setValid(this, $('passwordErr'))
      : setError(this, $('passwordErr'), 'Password must be at least 8 characters.');
    if ($('confirmPassword').value) $('confirmPassword').dispatchEvent(new Event('input'));
  });

  $('confirmPassword').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('confirmPasswordErr')); return; }
    this.value === $('password').value
      ? setValid(this, $('confirmPasswordErr'))
      : setError(this, $('confirmPasswordErr'), 'Passwords do not match.');
  });

  // ── Duplicate check ────────────────────────────────────
  function isDuplicate(firstName, lastName, email, phone) {
    var users = JSON.parse(localStorage.getItem('dam_users') || '[]');
    return users.some(function (u) {
      return u.firstName.toLowerCase() === firstName.toLowerCase() &&
             u.lastName.toLowerCase()  === lastName.toLowerCase()  &&
             u.email.toLowerCase()     === email.toLowerCase()     &&
             u.phone                   === phone;
    });
  }

  // ── Generate & download Users.txt ─────────────────────
  function downloadUsersTxt() {
    var users = JSON.parse(localStorage.getItem('dam_users') || '[]');
    var header = [
      'First Name', 'Last Name', 'Email', 'Date of Birth', 'Phone Number',
      'House Number', 'Street Number', 'Street Name', 'Province', 'Country',
      'Group Name', 'Is Customer Admin?'
    ].join('\t');

    var rows = users.map(function (u) {
      return [
        u.firstName    || '',
        u.lastName     || '',
        u.email        || '',
        u.dob          || '',
        u.phone        || '',
        u.aptUnit      || '',
        u.streetNumber || '',
        u.streetName   || '',
        u.province     || '',
        u.country      || '',
        (u.groupNames  || []).join('; ') || '',
        u.isAdmin      ? 'Yes' : 'No'
      ].join('\t');
    });

    var content = header + '\n' + rows.join('\n');
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'Users.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // ── Submit ─────────────────────────────────────────────
  $('registerSubmit').addEventListener('click', function () {
    // Hide any existing duplicate banner
    var dupBanner = $('duplicateBanner');
    if (dupBanner) dupBanner.classList.remove('visible');

    // Trigger validations
    ['firstName','lastName','phoneNumber','streetNumber','streetName','password','confirmPassword']
      .forEach(function (id) { $(id).dispatchEvent(new Event('input')); });
    $('email').dispatchEvent(new Event('blur'));

    // Age gate
    if ($('formFieldsWrap').classList.contains('is-disabled')) return;

    // Required fields check
    var required = ['firstName','lastName','email','phoneNumber',
                    'streetNumber','streetName','country','province',
                    'postalCode','password','confirmPassword'];
    var emptyFound = false;
    required.forEach(function (id) {
      var el = $(id);
      if (!el || !el.value || el.value === '') {
        if (el) el.classList.add('is-error');
        emptyFound = true;
      }
    });

    // DOB check
    if (!$('dobDay').value || !$('dobMonth').value || !$('dobYear').value) {
      $('dobErr').classList.add('visible');
      emptyFound = true;
    } else {
      $('dobErr').classList.remove('visible');
    }

    var hasFieldErrors = document.querySelectorAll('.field-error.visible').length > 0;
    if (hasFieldErrors || emptyFound) return;

    // Collect values
    var firstName    = $('firstName').value.trim();
    var lastName     = $('lastName').value.trim();
    var email        = $('email').value.trim();
    var phone        = $('phoneNumber').value.trim();
    var dob          = $('dobYear').value + '-' +
                       String($('dobMonth').value).padStart(2, '0') + '-' +
                       String($('dobDay').value).padStart(2, '0');
    var aptUnit      = $('aptUnit').value.trim();
    var streetNumber = $('streetNumber').value.trim();
    var streetName   = $('streetName').value.trim();
    var country      = $('country').value;
    var province     = $('province').value;
    var postalCode   = $('postalCode').value.trim();
    var password     = $('password').value;

    // ── Duplicate detection ────────────────────────────
    if (isDuplicate(firstName, lastName, email, phone)) {
      if (dupBanner) dupBanner.classList.add('visible');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // ── Generate verification token (simulated) ────────
    // In a real backend this token would be emailed via a server.
    // Here we generate it and store it so verify.html can check it.
    var verifyToken = 'VT-' + Date.now() + '-' +
      Math.random().toString(36).substr(2, 10).toUpperCase();

    // ── Save to localStorage ───────────────────────────
    var newUser = {
      firstName:    firstName,
      lastName:     lastName,
      email:        email,
      dob:          dob,
      phone:        phone,
      password:     password,          // stored for frontend-only demo
      aptUnit:      aptUnit,
      streetNumber: streetNumber,
      streetName:   streetName,
      province:     province,
      country:      country,
      postalCode:   postalCode,
      groupNames:   [],
      isAdmin:      false,
      verified:     false,             // must verify email before login
      verifyToken:  verifyToken,
      registeredAt: new Date().toISOString()
    };

    var users = JSON.parse(localStorage.getItem('dam_users') || '[]');
    users.push(newUser);
    localStorage.setItem('dam_users', JSON.stringify(users));

    // ── Download Users.txt ─────────────────────────────
    downloadUsersTxt();

    // ── Simulate sending verification email ───────────
    // Store pending email so verify-pending.html can display it
    sessionStorage.setItem('dam_pending_email', email);
    // Store token so the simulated link works in same browser
    sessionStorage.setItem('dam_pending_token', verifyToken);

    // ── Show success and redirect to verify-pending ────
    $('registerSubmit').style.display = 'none';
    $('formFieldsWrap').style.display = 'none';
    $('successBanner').classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(function () {
      window.location.href = 'verify-pending.html';
    }, 1800);
  });

});
