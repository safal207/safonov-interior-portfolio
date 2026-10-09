(() => {
  const urlLanguage = new URLSearchParams(location.search).get('lang');
  if ((urlLanguage === 'en' || urlLanguage === 'ru') && urlLanguage !== document.documentElement.lang) {
    const target = new URL(document.documentElement.dataset[urlLanguage === 'en' ? 'langEnUrl' : 'langRuUrl'], location.href);
    target.search = location.search;
    target.searchParams.delete('lang');
    target.hash = location.hash;
    location.replace(target.href);
  }
})();
