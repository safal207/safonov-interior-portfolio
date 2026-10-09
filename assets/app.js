(() => {
  const languageButtons = [...document.querySelectorAll('[data-set-lang]')];
  function applyLanguage(language, persist = false) {
    const lang = language === 'en' ? 'en' : 'ru';
    document.documentElement.lang = lang;
    document.title = document.body.dataset[lang === 'en' ? 'titleEn' : 'titleRu'];
    for (const button of languageButtons) {
      if (button.tagName === 'A') {
        if(button.dataset.setLang === lang) button.setAttribute('aria-current','page');
        else button.removeAttribute('aria-current');
      } else button.setAttribute('aria-pressed', String(button.dataset.setLang === lang));
    }
    for (const node of document.querySelectorAll('[data-alt-ru]')) node.alt = node.dataset[lang === 'en' ? 'altEn' : 'altRu'];
    for (const node of document.querySelectorAll('[data-label-ru]')) node.setAttribute('aria-label', node.dataset[lang === 'en' ? 'labelEn' : 'labelRu']);
    for (const anchor of document.body.dataset.languageRoutes ? [] : document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href)) continue;
      const url = new URL(href, document.baseURI);
      if (!url.pathname.endsWith('.html')) continue;
      const clean = href.split('?')[0].split('#')[0];
      anchor.setAttribute('href', clean + (lang === 'en' ? '?lang=en' : '') + url.hash);
    }
    if (persist) {
      try { localStorage.setItem('safonov-interiors-language', lang); } catch {}
      const url = new URL(location.href);
      if (lang === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
      try { history.replaceState(null, '', url); } catch {}
    }
  }
  applyLanguage(document.documentElement.lang);
  languageButtons.forEach(button => button.addEventListener('click', () => {
    if(button.tagName==='A' && window.parent===window) {
      try { localStorage.setItem('safonov-interiors-language',button.dataset.setLang); } catch {}
      return;
    }
    applyLanguage(button.dataset.setLang, true);
  }));

  const cards = [...document.querySelectorAll('[data-project-type]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const filterProjects = selected => {
    filters.forEach(other => other.setAttribute('aria-pressed', String(other.dataset.filter === selected)));
    let count = 0;
    cards.forEach(card => {
      card.hidden = selected !== 'all' && card.dataset.projectType !== selected && card.dataset.projectCollection !== selected;
      if (!card.hidden) count++;
    });
    const shown = document.getElementById('shown-count');
    if (shown) shown.textContent = String(count);
  };
  filters.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
  document.querySelectorAll('[data-select-collection]').forEach(anchor => anchor.addEventListener('click', () => filterProjects(anchor.dataset.selectCollection)));

  const dialog = document.querySelector('.lightbox');
  if (dialog) {
    document.querySelectorAll('[data-lightbox]').forEach(button => button.addEventListener('click', () => {
      const img = dialog.querySelector('img');
      img.src = button.dataset.lightbox;
      img.alt = button.querySelector('img').alt;
      dialog.showModal();
      document.body.classList.add('modal-open');
    }));
    dialog.querySelector('[data-close-lightbox]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  }
})();
