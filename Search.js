/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/Search.js */

(function() {
    class Search {
        constructor() {
            this.searchTimer = null; // FASE 3: Debounce timer
            this.initListeners();
        }

        initListeners() {
            document.addEventListener('focusin', (e) => {
                if (e.target.id === 'spotlight-search') {
                    const container = e.target.closest('.search-bar');
                    if (container) container.classList.add('active');
                }
            });

            document.addEventListener('keyup', (e) => {
                if (e.target.id === 'spotlight-search') {
                    const container = e.target.closest('.search-bar');
                    const clearBtn = document.getElementById('search-clear');
                    
                    if (e.key === 'Escape') {
                        e.target.blur();
                        if (container) container.classList.remove('active');
                        return;
                    }
                    
                    // FASE 3 FIX: Debouncing toegepast om browser-haperingen (freezes) te voorkomen
                    if (window.App && window.App.filterEngine) {
                        clearTimeout(this.searchTimer);
                        this.searchTimer = setTimeout(() => {
                            window.App.filterEngine.setSearch(e.target.value);
                            if (window.App.renderEngine) window.App.renderEngine.render();
                        }, 300); // Wacht 300ms na de laatste toetsaanslag
                    }
                    
                    if (clearBtn) clearBtn.style.display = e.target.value ? 'inline-block' : 'none';
                }
            });

            document.addEventListener('input', (e) => {
                if (e.target.id === 'spotlight-search') {
                    const clearBtn = document.getElementById('search-clear');
                    if (clearBtn) clearBtn.style.display = e.target.value ? 'inline-block' : 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (e.target.id === 'search-clear') {
                    const input = document.getElementById('spotlight-search');
                    if (input) {
                        input.value = '';
                        e.target.style.display = 'none';
                        input.focus();
                    }
                    if (window.App && window.App.filterEngine) {
                        window.App.filterEngine.setSearch('');
                        if (window.App.renderEngine) window.App.renderEngine.render();
                    }
                } else {
                    const container = document.querySelector('.search-bar');
                    const input = document.getElementById('spotlight-search');
                    if (container && container.classList.contains('active') && !container.contains(e.target)) {
                        container.classList.remove('active');
                        if (input) input.blur();
                    }
                }
            });

            document.addEventListener('keydown', (e) => {
                const container = document.querySelector('.search-bar');
                const input = document.getElementById('spotlight-search');
                
                if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
                    e.preventDefault();
                    if (container && input) {
                        container.classList.add('active');
                        input.focus();
                    }
                }
                
                if (e.key === 'Escape' && container && container.classList.contains('active')) {
                    e.preventDefault();
                    container.classList.remove('active');
                    if (input) input.blur();
                }
            });
        }
    }

    const initApp = () => {
        window.App = window.App || {};
        window.App.search = new Search();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
})();