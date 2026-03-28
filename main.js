/* ═══════════════════════════════════════════════════════════
   DAILY ACTIVITY MONITOR — main.js
   Phase 2: Cross-browser, cross-device shared JS
   Supports: Chrome · Safari · Edge (all platforms)
             iOS Safari · iPhone Chrome/Edge
             Android Chrome/Edge/Samsung Internet
             Windows Chrome/Safari/Edge
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. DOMContentLoaded wrapper ───────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {

    /* ── 2. Mobile hamburger menu ────────────────────────── */
    var hamburger = document.getElementById('hamburger');
    var navLinks  = document.getElementById('navLinks');

    if (hamburger && navLinks) {

      hamburger.addEventListener('click', function () {
        var isOpen = navLinks.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        animateHamburger(isOpen);
      });

      /* Close menu on outside tap/click — works on iOS Safari */
      document.addEventListener('click', function (e) {
        if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
          closeMenu();
        }
      });

      /* Close menu on nav-link tap (mobile UX) */
      navLinks.querySelectorAll('.nav-link, .nav-btn').forEach(function (link) {
        link.addEventListener('click', function () {
          closeMenu();
        });
      });

      /* Close menu on Escape key */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
          closeMenu();
          hamburger.focus();
        }
      });
    }

    function animateHamburger(isOpen) {
      var spans = hamburger.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.opacity   = '0';
        spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity   = '';
        spans[2].style.transform = '';
      }
    }

    function closeMenu() {
      if (navLinks) {
        navLinks.classList.remove('is-open');
        hamburger && hamburger.setAttribute('aria-expanded', 'false');
        animateHamburger(false);
      }
    }

    /* ── 3. Navbar scroll shadow ─────────────────────────── */
    var navbar = document.getElementById('navbar');
    if (navbar) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (!ticking) {
          /* requestAnimationFrame for smooth performance on all browsers */
          window.requestAnimationFrame(function () {
            if (window.scrollY > 8 || window.pageYOffset > 8) {
              navbar.style.boxShadow = '0 2px 16px rgba(0,0,0,0.13)';
            } else {
              navbar.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    /* ── 4. iOS Safari viewport height fix ───────────────── */
    /* Fixes 100vh bug on iOS (bottom bar affects viewport) */
    function setVh() {
      var vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', vh + 'px');
    }
    setVh();
    window.addEventListener('resize', setVh, { passive: true });
    window.addEventListener('orientationchange', function () {
      /* Slight delay for iOS to settle after rotation */
      setTimeout(setVh, 300);
    }, { passive: true });

    /* ── 5. Focus-visible polyfill hint ──────────────────── */
    /* Add keyboard-navigation class for focus ring visibility */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' || e.keyCode === 9) {
        document.body.classList.add('keyboard-nav');
      }
    });
    document.addEventListener('mousedown', function () {
      document.body.classList.remove('keyboard-nav');
    });
    document.addEventListener('touchstart', function () {
      document.body.classList.remove('keyboard-nav');
    }, { passive: true });

    /* ── 6. Android/iOS back-forward cache fix ───────────── */
    /* Restore page state after bfcache restore (Safari/Chrome) */
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) {
        /* Re-enable any disabled buttons (e.g. after back navigation) */
        document.querySelectorAll('button:disabled').forEach(function (btn) {
          btn.disabled = false;
          btn.textContent = btn.getAttribute('data-original-text') || btn.textContent;
        });
      }
    });

    /* Store original button text for bfcache restore */
    document.querySelectorAll('.btn--submit').forEach(function (btn) {
      btn.setAttribute('data-original-text', btn.textContent);
    });

    /* ── 7. Active nav link highlight ───────────────────── */
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href === currentPage) {
        link.classList.add('nav-link--active');
      }
    });

    /* ── 8. Smooth internal anchor scrolling fallback ────── */
    /* For browsers that don't support scroll-behavior: smooth */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

  }); /* end DOMContentLoaded */

})();
