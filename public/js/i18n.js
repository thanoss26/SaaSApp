// i18next configuration
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Initialize i18next
i18next
  .use(Backend)
  .use(LanguageDetector)
  .init({
    debug: false,
    fallbackLng: 'en',
    supportedLngs: ['en', 'el'],
    ns: ['common', 'auth', 'dashboard', 'organizations', 'payroll', 'profile', 'settings', 'landing'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Language switcher functionality
window.changeLanguage = function(lang) {
  i18next.changeLanguage(lang).then(() => {
    localStorage.setItem('i18nextLng', lang);
    updatePageContent();
  });
};

// Update all page content when language changes
function updatePageContent() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = i18next.t(key);
    if (translation && translation !== key) {
      element.textContent = translation;
    }
  });

  // Update all elements with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = i18next.t(key);
    if (translation && translation !== key) {
      element.placeholder = translation;
    }
  });

  // Update all elements with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    const translation = i18next.t(key);
    if (translation && translation !== key) {
      element.title = translation;
    }
  });

  // Update page title
  const pageTitle = document.querySelector('title');
  if (pageTitle && pageTitle.getAttribute('data-i18n')) {
    const key = pageTitle.getAttribute('data-i18n');
    const translation = i18next.t(key);
    if (translation && translation !== key) {
      pageTitle.textContent = translation;
    }
  }

  // Trigger custom event for components that need to update
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: i18next.language } }));
}

// Export for use in other modules
window.i18next = i18next;
window.updatePageContent = updatePageContent;

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
  // Set initial language from localStorage or default to English
  const savedLang = localStorage.getItem('i18nextLng') || 'en';
  i18next.changeLanguage(savedLang).then(() => {
    updatePageContent();
  });
});

export default i18next; 