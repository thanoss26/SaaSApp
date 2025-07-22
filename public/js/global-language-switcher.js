// Global Language Switcher for all pages
(function() {
    'use strict';

    // Wait for all required libraries to be loaded
    function initGlobalLanguageSwitcher() {
        if (typeof i18next === 'undefined' || 
            typeof i18nextHttpBackend === 'undefined' || 
            typeof i18nextBrowserLanguageDetector === 'undefined') {
            console.log('Waiting for i18next libraries to load...');
            setTimeout(initGlobalLanguageSwitcher, 100);
            return;
        }

        console.log('i18next libraries loaded, initializing global language switcher...');

        // Initialize i18next with all namespaces
        i18next
            .use(i18nextHttpBackend)
            .use(i18nextBrowserLanguageDetector)
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
            })
            .then(() => {
                console.log('Global i18next initialized successfully');
                
                // Apply saved language immediately
                const savedLang = localStorage.getItem('i18nextLng');
                if (savedLang && savedLang !== i18next.language) {
                    i18next.changeLanguage(savedLang).then(() => {
                        console.log(`Applied saved language: ${savedLang}`);
                        updatePageContent();
                    });
                } else {
                    updatePageContent();
                }
                
                initLanguageSwitcher();
            })
            .catch((error) => {
                console.error('Error initializing i18next:', error);
            });
    }

    // Global language switcher functionality
    window.changeLanguage = function(lang) {
        i18next.changeLanguage(lang).then(() => {
            console.log(`Language changed to: ${lang}`);
            updateLanguageButton(lang);
            updatePageContent();
            localStorage.setItem('i18nextLng', lang);
        });
    };

    // Update page content with translations
    function updatePageContent() {
        // Update all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        });

        // Update placeholders
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.placeholder = translation;
            }
        });

        // Update titles
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.title = translation;
            }
        });

        // Update alt text
        const altTexts = document.querySelectorAll('[data-i18n-alt]');
        altTexts.forEach(element => {
            const key = element.getAttribute('data-i18n-alt');
            const translation = i18next.t(key);
            if (translation && translation !== key) {
                element.alt = translation;
            }
        });
    }

    // Initialize language switcher UI
    function initLanguageSwitcher() {
        const languageSwitcher = document.querySelector('.language-switcher');
        if (!languageSwitcher) {
            console.log('No language switcher found on this page - running in global mode only');
            return;
        }

        // Check if this is the landing page (has #currentLanguage element)
        const isLandingPage = document.getElementById('currentLanguage');
        if (isLandingPage) {
            console.log('Landing page detected - skipping global language switcher UI initialization');
            return;
        }

        const languageBtn = languageSwitcher.querySelector('.language-btn');
        const languageDropdown = languageSwitcher.querySelector('.language-dropdown');
        const currentLang = languageSwitcher.querySelector('.current-lang');

        if (!languageBtn || !languageDropdown || !currentLang) {
            console.log('Language switcher elements not found');
            return;
        }

        // Update current language display
        function updateLanguageButton(lang) {
            const langNames = {
                'en': 'English',
                'el': 'Ελληνικά'
            };
            currentLang.textContent = langNames[lang] || lang;
            currentLang.setAttribute('data-lang', lang);
        }

        // Set initial language
        const savedLang = localStorage.getItem('i18nextLng') || 'en';
        updateLanguageButton(savedLang);

        // Toggle dropdown
        languageBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            languageDropdown.classList.toggle('show');
            languageBtn.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            languageDropdown.classList.remove('show');
            languageBtn.classList.remove('active');
        });

        // Handle language selection
        const languageOptions = document.querySelectorAll('.language-option');
        languageOptions.forEach(option => {
            option.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                window.changeLanguage(lang);
                
                // Update UI
                languageDropdown.classList.remove('show');
                languageBtn.classList.remove('active');
                
                // Update active state
                languageOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Set active state for current language
        const currentLangOption = languageSwitcher.querySelector(`[data-lang="${savedLang}"]`);
        if (currentLangOption) {
            currentLangOption.classList.add('active');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlobalLanguageSwitcher);
    } else {
        initGlobalLanguageSwitcher();
    }

})(); 