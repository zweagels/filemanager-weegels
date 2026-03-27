/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/SidebarHistory.js */

(function() {
    class SidebarHistory {
        constructor() {
            this.storageKey = 'fm_nav_history';
            this.maxItems = 10;
            this.history = this.load();
            
            this.longPressTimer = null;
            this.dropdownMenu = null;

            this.initDOM();
            this.initListeners();
            
            if (window.EventBus) {
                window.EventBus.on('navigation:navigate', (path) => this.add(path));
            }
        }

        load() {
            try {
                const data = localStorage.getItem(this.storageKey);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Fout bij laden geschiedenis', e);
                return [];
            }
        }

        save() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.history));
            } catch (e) {
                console.error('Fout bij opslaan geschiedenis', e);
            }
        }

        add(path) {
            // Sla speciale views of de root over
            if (!path || path === '/' || path === 'root' || path === 'trash' || path === 'favorites' || path === 'recent' || String(path).startsWith('tag_') || String(path).startsWith('album_')) return;

            // Verwijder duplicaten
            this.history = this.history.filter(item => item !== path);

            // Voeg bovenaan toe
            this.history.unshift(path);

            if (this.history.length > this.maxItems) {
                this.history.pop();
            }

            this.save();
        }

        initDOM() {
            // Bouw de zwevende dropdown container (onzichtbaar bij start)
            if (document.getElementById('history-dropdown')) return;
            
            this.dropdownMenu = document.createElement('div');
            this.dropdownMenu.id = 'history-dropdown';
            this.dropdownMenu.className = 'context-menu-root'; // Hergebruik de style van het Context Menu matrix
            this.dropdownMenu.style.cssText = 'position: fixed; z-index: 10001; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s ease;';
            document.body.appendChild(this.dropdownMenu);
            
            // Sluit het menu als je ergens anders klikt
            document.addEventListener('click', (e) => {
                if (this.dropdownMenu && !this.dropdownMenu.contains(e.target)) {
                    this.hideMenu();
                }
            });
            
            // Scrollen = sluiten
            document.addEventListener('scroll', () => this.hideMenu(), true);
        }

        initListeners() {
            // FIX FASE 3: We wachten tot de DOM stabiel is en zoeken de 'Mijn Bestanden' knop
            const attachToRoot = () => {
                const rootBtn = document.querySelector('.sidebar .nav-item[data-path="root"]');
                if (rootBtn && !rootBtn.dataset.historyAttached) {
                    rootBtn.dataset.historyAttached = 'true';
                    
                    // Desktop: Rechtsklik
                    rootBtn.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showMenu(e.clientX, e.clientY);
                    });
                    
                    // Mobiel/Tablet: Long-press
                    rootBtn.addEventListener('touchstart', (e) => {
                        this.longPressTimer = setTimeout(() => {
                            e.preventDefault();
                            const touch = e.touches[0];
                            this.showMenu(touch.clientX, touch.clientY);
                        }, 500); // 500ms vasthouden
                    }, { passive: true });
                    
                    rootBtn.addEventListener('touchend', () => clearTimeout(this.longPressTimer));
                    rootBtn.addEventListener('touchmove', () => clearTimeout(this.longPressTimer));
                }
            };

            // Probeer direct aan te haken, of wacht even tot RenderEngine klaar is
            setTimeout(attachToRoot, 1000);
            if (window.EventBus) window.EventBus.on('render:complete', attachToRoot);
        }

        showMenu(x, y) {
            if (!this.dropdownMenu) return;
            if (this.history.length === 0) {
                if (window.EventBus) window.EventBus.emit('notify:info', 'Geen recente locaties gevonden.');
                return;
            }

            let html = `
                <div class="dropdown-header" style="padding: 12px 16px; font-weight: 700; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-dropdown);">
                    Recente Locaties
                </div>
            `;
            
            // Omdat we map ID's opslaan, maken we een 'Ga naar map...' tekst. 
            // In een volgende iteratie zouden we de map namen in de localStorage kunnen opslaan.
            this.history.forEach((pathId, idx) => {
                html += `
                    <div class="dropdown-item" data-id="${pathId}" style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--text-main);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        Map #${pathId}
                    </div>
                `;
            });
            
            html += `
                <div style="border-top: 1px solid var(--border-dropdown); margin-top: 4px; padding: 4px;">
                    <div id="btn-clear-history" class="dropdown-item" style="color: var(--error); padding: 8px 12px; cursor: pointer; text-align: center; font-size: 0.85rem;">
                        Geschiedenis Wissen
                    </div>
                </div>
            `;

            this.dropdownMenu.innerHTML = html;
            
            // Positionering (Zorg dat het menu niet buiten scherm valt)
            this.dropdownMenu.style.left = `${x}px`;
            this.dropdownMenu.style.top = `${y}px`;
            
            // Toon
            this.dropdownMenu.style.visibility = 'visible';
            this.dropdownMenu.style.opacity = '1';
            this.dropdownMenu.style.transform = 'translateY(0)';
            
            // Voeg klik-events toe aan de opties
            const items = this.dropdownMenu.querySelectorAll('.dropdown-item[data-id]');
            items.forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    this.hideMenu();
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', id);
                });
            });
            
            const clearBtn = this.dropdownMenu.querySelector('#btn-clear-history');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.history = [];
                    this.save();
                    this.hideMenu();
                    if (window.EventBus) window.EventBus.emit('notify:success', 'Geschiedenis gewist.');
                });
            }
        }

        hideMenu() {
            if (this.dropdownMenu) {
                this.dropdownMenu.style.opacity = '0';
                this.dropdownMenu.style.visibility = 'hidden';
                this.dropdownMenu.style.transform = 'translateY(-10px)';
            }
        }
    }

    const initApp = () => {
        window.App = window.App || {};
        if (!window.App.sidebarHistory) window.App.sidebarHistory = new SidebarHistory();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
})();