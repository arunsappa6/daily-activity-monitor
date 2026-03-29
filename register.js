/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — register.js  (Supabase version)

   What changed from the localStorage version:
   • Duplicate check → Supabase Auth handles this (email unique)
   • Save user       → supabase.auth.signUp() with metadata
   • Verify email    → Supabase sends the real email automatically
   • No tokens, no localStorage, no simulation panel needed
   • Users.txt download still works (reads from Supabase)
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Province / State data ─────────────────────────────── */
  var provinces = {
    Canada: [
      'AB — Alberta','BC — British Columbia','MB — Manitoba',
      'NB — New Brunswick','NL — Newfoundland and Labrador',
      'NS — Nova Scotia','NT — Northwest Territories',
      'NU — Nunavut','ON — Ontario','PE — Prince Edward Island',
      'QC — Quebec','SK — Saskatchewan','YT — Yukon'
    ],
    'United States': [
      'AL — Alabama','AK — Alaska','AZ — Arizona','AR — Arkansas',
      'CA — California','CO — Colorado','CT — Connecticut','DE — Delaware',
      'FL — Florida','GA — Georgia','HI — Hawaii','ID — Idaho',
      'IL — Illinois','IN — Indiana','IA — Iowa','KS — Kansas',
      'KY — Kentucky','LA — Louisiana','ME — Maine','MD — Maryland',
      'MA — Massachusetts','MI — Michigan','MN — Minnesota','MS — Mississippi',
      'MO — Missouri','MT — Montana','NE — Nebraska','NV — Nevada',
      'NH — New Hampshire','NJ — New Jersey','NM — New Mexico','NY — New York',
      'NC — North Carolina','ND — North Dakota','OH — Ohio','OK — Oklahoma',
      'OR — Oregon','PA — Pennsylvania','RI — Rhode Island','SC — South Carolina',
      'SD — South Dakota','TN — Tennessee','TX — Texas','UT — Utah',
      'VT — Vermont','VA — Virginia','WA — Washington','WV — West Virginia',
      'WI — Wisconsin','WY — Wyoming','DC — District of Columbia'
    ],
    India: [
      'AP — Andhra Pradesh','AR — Arunachal Pradesh','AS — Assam',
      'BR — Bihar','CG — Chhattisgarh','GA — Goa','GJ — Gujarat',
      'HR — Haryana','HP — Himachal Pradesh','JK — Jammu and Kashmir',
      'JH — Jharkhand','KA — Karnataka','KL — Kerala','MP — Madhya Pradesh',
      'MH — Maharashtra','MN — Manipur','ML — Meghalaya','MZ — Mizoram',
      'NL — Nagaland','OD — Odisha','PB — Punjab','RJ — Rajasthan',
      'SK — Sikkim','TN — Tamil Nadu','TS — Telangana','TR — Tripura',
      'UP — Uttar Pradesh','UK — Uttarakhand','WB — West Bengal',
      'AN — Andaman and Nicobar Islands','CH — Chandigarh',
      'DN — Dadra and Nagar Haveli','DD — Daman and Diu',
      'DL — Delhi','LD — Lakshadweep','PY — Puducherry'
    ]
  };

  /* ── Populate dropdowns ─────────────────────────────────── */
  var dobDay = document.getElementById('dobDay');
  dobDay.innerHTML = '<option value="">Day</option>';
  for (var d = 1; d <= 31; d++) {
    var o = document.createElement('option');
    o.value = d; o.textContent = d; dobDay.appendChild(o);
  }

  var dobYear = document.getElementById('dobYear');
  var currentYear = new Date().getFullYear();
  dobYear.innerHTML = '<option value="">Year</option>';
  for (var y = 1900; y <= currentYear; y++) {
    var yo = document.createElement('option');
    yo.value = y; yo.textContent = y; dobYear.appendChild(yo);
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  /* ── Issue #2: Clear all form fields on every page load ──
     Prevents browser autocomplete from pre-filling data from
     a previous session. Each visit starts with a blank form.
  ─────────────────────────────────────────────────────────── */
  var allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach(function (el) {
    if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else {
      el.value = '';
    }
    el.classList.remove('is-error', 'is-valid');
  });
  /* Reset DOB dropdowns explicitly */
  ['dobDay','dobMonth','dobYear'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  /* Disable province and postal code until country is chosen */
  var provinceEl  = document.getElementById('province');
  var postalEl    = document.getElementById('postalCode');
  if (provinceEl) { provinceEl.disabled = true; provinceEl.innerHTML = '<option value="">— Select Country first —</option>'; }
  if (postalEl)   { postalEl.disabled   = true; postalEl.placeholder = 'Select a country first'; }

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

  /* ── Age gate ───────────────────────────────────────────── */
  function checkAge() {
    var day = parseInt($('dobDay').value);
    var mon = parseInt($('dobMonth').value);
    var yr  = parseInt($('dobYear').value);
    if (!day || !mon || !yr) return;

    var dob   = new Date(yr, mon - 1, day);
    var today = new Date();
    var age   = today.getFullYear() - dob.getFullYear();
    var md    = today.getMonth() - dob.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;

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

  /* ── Field validators ───────────────────────────────────── */
  $('firstName').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('firstNameErr')); return; }
    /^[A-Za-z ]+$/.test(this.value)
      ? setValid(this, $('firstNameErr'))
      : setError(this, $('firstNameErr'), 'Letters and spaces only.');
  });

  $('lastName').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('lastNameErr')); return; }
    /^[A-Za-z ]+$/.test(this.value)
      ? setValid(this, $('lastNameErr'))
      : setError(this, $('lastNameErr'), 'Letters and spaces only.');
  });

  /* ── Email — format check + real-time Supabase existence check ── */
  $('email').addEventListener('blur', async function () {
    var val = this.value.trim();

    /* Hide any previous existing-customer banner */
    var existBanner = $('existingCustomerBanner');
    if (existBanner) existBanner.classList.remove('visible');
    unlockFieldsAfterEmail();

    if (!val) { clearState(this, $('emailErr')); return; }

    /* Format check first */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError(this, $('emailErr'), 'Please enter a valid email address.');
      return;
    }

    setValid(this, $('emailErr'));

    /* ── Check Supabase for existing account ───────────────
       Uses check_email_exists() RPC — returns profile_status
       and profile_type if the email is already registered.
    ─────────────────────────────────────────────────────────── */
    var result = await _supabaseClient.rpc('check_email_exists', { p_email: val });

    if (result.data && result.data.length > 0) {
      var profile = result.data[0];
      var status  = profile.profile_status || 'Active';

      if (existBanner) {
        if (status === 'Closed') {
          existBanner.innerHTML =
            '⚠ This email belongs to a <strong>past account</strong> that was deleted. ' +
            'Please use a different email or <a href="contact.html">contact us</a> for assistance.';
        } else {
          existBanner.innerHTML =
            '⚠ You are already an existing customer. Please <a href="login.html">sign in here</a> instead.';
        }
        existBanner.classList.add('visible');
      }

      /* Lock all fields below email and disable submit */
      lockFieldsAfterEmail();
    } else {
      /* Email is free — make sure everything is unlocked */
      unlockFieldsAfterEmail();
    }
  });

  /* ── Also unlock when user types a new email ─────────── */
  $('email').addEventListener('input', function () {
    var existBanner = $('existingCustomerBanner');
    if (existBanner) existBanner.classList.remove('visible');
    unlockFieldsAfterEmail();
  });

  /* ── Lock / unlock fields below email ────────────────── */
  var LOCKABLE_FIELDS = [
    'phoneNumber','aptUnit','streetNumber','streetName',
    'country','province','postalCode','password','confirmPassword',
    'dobDay','dobMonth','dobYear','firstName','lastName'
  ];

  function lockFieldsAfterEmail() {
    var btn = $('registerSubmit');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.45'; btn.title = 'Resolve the email issue above.'; }
    LOCKABLE_FIELDS.forEach(function (id) {
      var el = $(id);
      if (el) { el.disabled = true; el.style.opacity = '0.45'; }
    });
  }

  function unlockFieldsAfterEmail() {
    var btn = $('registerSubmit');
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.title = ''; }
    LOCKABLE_FIELDS.forEach(function (id) {
      var el = $(id);
      if (el) { el.disabled = false; el.style.opacity = ''; }
    });
    /* Re-lock province/postal if no country chosen yet */
    var countryEl = $('country');
    if (countryEl && !countryEl.value) {
      var prov = $('province'); var post = $('postalCode');
      if (prov)  { prov.disabled  = true; prov.style.opacity  = ''; }
      if (post)  { post.disabled  = true; post.style.opacity  = ''; }
    }
  }

  $('phoneNumber').addEventListener('input', function () {
    var v = this.value;
    if (!v) { clearState(this, $('phoneErr')); return; }
    if (/\D/.test(v)) setError(this, $('phoneErr'), 'Numeric digits only.');
    else if (v.length < 10) setError(this, $('phoneErr'), 'Phone number must be 10 digits.');
    else setValid(this, $('phoneErr'));
  });

  $('streetNumber').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('streetNumberErr')); return; }
    /^\d+$/.test(this.value)
      ? setValid(this, $('streetNumberErr'))
      : setError(this, $('streetNumberErr'), 'Numeric values only.');
  });

  $('streetName').addEventListener('input', function () {
    if (this.value.length > 60) setError(this, $('streetNameErr'), 'Maximum 60 characters.');
    else if (this.value.length > 0) setValid(this, $('streetNameErr'));
    else clearState(this, $('streetNameErr'));
  });

  $('country').addEventListener('change', function () {
    var country = this.value;
    var provSel = $('province');
    var postalIn = $('postalCode');

    provSel.innerHTML = '';
    if (country && provinces[country]) {
      var blank = document.createElement('option');
      blank.value = ''; blank.textContent = '— Select Province/State —';
      provSel.appendChild(blank);
      provinces[country].forEach(function (p) {
        var op = document.createElement('option');
        op.value = p; op.textContent = p; provSel.appendChild(op);
      });
      provSel.disabled = false;
    } else {
      provSel.innerHTML = '<option value="">— Select Country first —</option>';
      provSel.disabled = true;
    }

    postalIn.value = ''; clearState(postalIn, $('postalCodeErr'));
    if (country === 'Canada')        { postalIn.disabled = false; postalIn.maxLength = 7; postalIn.placeholder = 'e.g. M2R 1Q2'; }
    else if (country === 'United States') { postalIn.disabled = false; postalIn.maxLength = 5; postalIn.placeholder = 'e.g. 10001'; }
    else if (country === 'India')    { postalIn.disabled = false; postalIn.maxLength = 6; postalIn.placeholder = 'e.g. 110001'; }
    else { postalIn.disabled = true; postalIn.placeholder = 'Select a country first'; }
  });

  $('postalCode').addEventListener('input', function () {
    var country = $('country').value;
    var val = this.value.toUpperCase().replace(/\s/g, '');
    if (country === 'Canada') {
      if (val.length > 3) val = val.slice(0,3) + ' ' + val.slice(3,6);
      this.value = val;
      var rawLen = val.replace(/\s/g,'').length;
      if (!rawLen) { clearState(this, $('postalCodeErr')); return; }
      rawLen < 6 ? setError(this, $('postalCodeErr'), "Format must be 'M2M 2M2' (6 characters).") : setValid(this, $('postalCodeErr'));
    } else if (country === 'United States') {
      if (!val) { clearState(this, $('postalCodeErr')); return; }
      if (/\D/.test(val)) setError(this, $('postalCodeErr'), 'Numeric only.');
      else if (val.length < 5) setError(this, $('postalCodeErr'), '5 digits required.');
      else setValid(this, $('postalCodeErr'));
    } else if (country === 'India') {
      if (!val) { clearState(this, $('postalCodeErr')); return; }
      if (/\D/.test(val)) setError(this, $('postalCodeErr'), 'Numeric only.');
      else if (val.length < 6) setError(this, $('postalCodeErr'), '6 digits required.');
      else setValid(this, $('postalCodeErr'));
    }
  });

  $('password').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('passwordErr')); return; }
    this.value.length >= 8 ? setValid(this, $('passwordErr')) : setError(this, $('passwordErr'), 'At least 8 characters required.');
    if ($('confirmPassword').value) $('confirmPassword').dispatchEvent(new Event('input'));
  });

  $('confirmPassword').addEventListener('input', function () {
    if (!this.value) { clearState(this, $('confirmPasswordErr')); return; }
    this.value === $('password').value
      ? setValid(this, $('confirmPasswordErr'))
      : setError(this, $('confirmPasswordErr'), 'Passwords do not match.');
  });

  /* ── Download Users.txt from Supabase profiles ──────────── */
  async function downloadUsersTxt() {
    var result = await DAM.db()
      .from('profiles')
      .select('first_name,last_name,date_of_birth,phone,apt_unit,street_number,street_name,province,country,postal_code,is_admin,created_at');

    if (result.error || !result.data) return;

    var header = [
      'First Name','Last Name','Email','Date of Birth','Phone Number',
      'House Number','Street Number','Street Name','Province','Country',
      'Group Name','Is Customer Admin?'
    ].join('\t');

    var rows = result.data.map(function (u) {
      return [
        u.first_name    || '',
        u.last_name     || '',
        '',
        u.date_of_birth || '',
        u.phone         || '',
        u.apt_unit      || '',
        u.street_number || '',
        u.street_name   || '',
        u.province      || '',
        u.country       || '',
        '',
        u.is_admin ? 'Yes' : 'No'
      ].join('\t');
    });

    var content = header + '\n' + rows.join('\n');
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'Users.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ── Submit ─────────────────────────────────────────────── */
  $('registerSubmit').addEventListener('click', async function () {

    var dupBanner = $('duplicateBanner');
    if (dupBanner) dupBanner.classList.remove('visible');

    /* Trigger all field validations */
    ['firstName','lastName','phoneNumber','streetNumber','streetName','password','confirmPassword']
      .forEach(function (id) { $(id).dispatchEvent(new Event('input')); });
    $('email').dispatchEvent(new Event('blur'));

    /* Age gate */
    if ($('formFieldsWrap').classList.contains('is-disabled')) return;

    /* Required fields */
    var required = ['firstName','lastName','email','phoneNumber',
                    'streetNumber','streetName','country','province',
                    'postalCode','password','confirmPassword'];
    var emptyFound = false;
    required.forEach(function (id) {
      var el = $(id);
      if (!el || !el.value) { if (el) el.classList.add('is-error'); emptyFound = true; }
    });

    if (!$('dobDay').value || !$('dobMonth').value || !$('dobYear').value) {
      $('dobErr').classList.add('visible'); emptyFound = true;
    } else {
      $('dobErr').classList.remove('visible');
    }

    if (document.querySelectorAll('.field-error.visible').length > 0 || emptyFound) return;

    /* Collect form values */
    var email     = $('email').value.trim();
    var password  = $('password').value;
    var firstName = $('firstName').value.trim();
    var lastName  = $('lastName').value.trim();
    var dob       = $('dobYear').value + '-' +
                    String($('dobMonth').value).padStart(2,'0') + '-' +
                    String($('dobDay').value).padStart(2,'0');

    /* Disable button while submitting */
    var btn = $('registerSubmit');
    btn.textContent = 'Creating account…';
    btn.disabled    = true;

    /* ── Call Supabase Auth signUp ────────────────────────────
       emailRedirectTo must include the full path to verify.html
       including any GitHub Pages subfolder (e.g. /repo-name/).
       We derive this from the current page's URL so it always
       matches regardless of how the site is deployed.
    ─────────────────────────────────────────────────────────── */
    var verifyUrl = window.location.href
      .replace(/\/[^\/]*$/, '/verify.html')  // replace current filename with verify.html
      .split('?')[0];                         // strip any query string

    var result = await DAM.auth().signUp({
      email:    email,
      password: password,
      options: {
        emailRedirectTo: verifyUrl,
        data: {
          first_name:    firstName,
          last_name:     lastName,
          date_of_birth: dob,
          phone:         $('phoneNumber').value.trim(),
          apt_unit:      $('aptUnit').value.trim(),
          street_number: $('streetNumber').value.trim(),
          street_name:   $('streetName').value.trim(),
          province:      $('province').value,
          country:       $('country').value,
          postal_code:   $('postalCode').value.trim()
        }
      }
    });

    if (result.error) {
      btn.textContent = 'Create Account';
      btn.disabled    = false;

      /* Supabase returns "User already registered" for duplicate emails */
      if (result.error.message &&
          result.error.message.toLowerCase().includes('already registered')) {
        if (dupBanner) dupBanner.classList.add('visible');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        /* Show generic error */
        var genErr = $('duplicateBanner') || document.createElement('div');
        genErr.textContent = '⚠ ' + result.error.message;
        genErr.classList.add('duplicate-banner','visible');
        $('formFieldsWrap').before(genErr);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    /* ── Success ─────────────────────────────────────────────
       Supabase has sent the verification email.
       Redirect to verify-pending.html which shows
       "Check your inbox" — the demo simulation button is
       gone because Supabase sends the real email.
    ─────────────────────────────────────────────────────────── */
    sessionStorage.setItem('dam_pending_email', email);

    /* Users.txt download removed — all user data is now stored
       securely in Supabase. No local file download needed. */

    $('registerSubmit').style.display = 'none';
    $('formFieldsWrap').style.display = 'none';
    $('successBanner').classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(function () {
      window.location.href = 'verify-pending.html';
    }, 1600);
  });

});
