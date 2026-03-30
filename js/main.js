// canLM — Main JS
(function () {
  // Translate placeholders for a given language
  function translatePlaceholders(lang) {
    document.querySelectorAll('[data-ph-' + lang + ']').forEach(function (el) {
      el.setAttribute('placeholder', el.getAttribute('data-ph-' + lang));
    });
  }

  // Language persistence — apply saved language before paint
  var savedLang = localStorage.getItem('canLM_lang');
  if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
    document.documentElement.lang = savedLang;
    document.querySelectorAll('[data-' + savedLang + ']').forEach(function (el) {
      if (el.hasAttribute('data-html')) {
        el.innerHTML = el.getAttribute('data-' + savedLang);
      } else {
        el.textContent = el.getAttribute('data-' + savedLang);
      }
    });
    translatePlaceholders(savedLang);
  }

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
      });
    });
  }

  // Language toggle (EN/FR)
  var langBtns = document.querySelectorAll('.lang-btn');

  // Set active button based on saved language
  if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
    langBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === savedLang);
    });
  }

  langBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = this.getAttribute('data-lang');
      langBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');

      document.querySelectorAll('[data-' + lang + ']').forEach(function (el) {
        if (el.hasAttribute('data-html')) {
          el.innerHTML = el.getAttribute('data-' + lang);
        } else {
          el.textContent = el.getAttribute('data-' + lang);
        }
      });
      translatePlaceholders(lang);

      document.documentElement.lang = lang;
      localStorage.setItem('canLM_lang', lang);
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#' || href === '') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
