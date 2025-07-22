// Landing Page Language Switcher
class LandingLanguageSwitcher {
    constructor() {
        this.currentLanguage = localStorage.getItem('i18nextLng') || 'en';
        this.init();
    }

    init() {
        this.createLanguageSwitcher();
        this.bindEvents();
    }

    createLanguageSwitcher() {
        // Create language switcher HTML
        const switcherHTML = `
            <div class="landing-language-switcher">
                <button class="landing-language-btn" id="landing-language-btn">
                    <span class="landing-language-icon">🌐</span>
                    <span class="landing-current-lang">${this.currentLanguage === 'en' ? 'EN' : 'EL'}</span>
                    <span class="landing-dropdown-arrow">▼</span>
                </button>
                <div class="landing-language-dropdown" id="landing-language-dropdown">
                    <div class="landing-language-option" data-lang="en">
                        <span class="landing-flag">🇺🇸</span>
                        <span class="landing-lang-name">English</span>
                    </div>
                    <div class="landing-language-option" data-lang="el">
                        <span class="landing-flag">🇬🇷</span>
                        <span class="landing-lang-name">Ελληνικά</span>
                    </div>
                </div>
            </div>
        `;

        // Insert into the navigation actions
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            navActions.insertAdjacentHTML('afterbegin', switcherHTML);
        }
    }

    bindEvents() {
        const languageBtn = document.getElementById('landing-language-btn');
        const languageDropdown = document.getElementById('landing-language-dropdown');
        const languageOptions = document.querySelectorAll('.landing-language-option');

        if (languageBtn) {
            languageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                languageDropdown.classList.toggle('show');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (languageDropdown) {
                languageDropdown.classList.remove('show');
            }
        });

        // Handle language selection
        languageOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = option.getAttribute('data-lang');
                this.changeLanguage(lang);
                languageDropdown.classList.remove('show');
            });
        });
    }

    changeLanguage(lang) {
        if (window.changeLanguage) {
            window.changeLanguage(lang);
            this.currentLanguage = lang;
            this.updateLanguageButton();
        }
    }

    updateLanguageButton() {
        const currentLangSpan = document.querySelector('.landing-current-lang');
        if (currentLangSpan) {
            currentLangSpan.textContent = this.currentLanguage === 'en' ? 'EN' : 'EL';
        }
    }
}

// Initialize landing language switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LandingLanguageSwitcher();
}); 