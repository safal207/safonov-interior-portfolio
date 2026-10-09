(() => {
  const urlLanguage = new URLSearchParams(location.search).get('lang');
  let remembered;
  try { remembered = localStorage.getItem('safonov-interiors-language'); } catch {}
  document.documentElement.lang = (urlLanguage === 'en' || (!urlLanguage && remembered === 'en')) ? 'en' : 'ru';
})();
