/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/Sidebar.js */

// ANTI-FOUC: Voorkom dat de standaard zijbalk een split-seconde "flitst" voor JS laadt
document.head.insertAdjacentHTML('beforeend', '<style id="fouc-style">#sidebar .nav-group { opacity: 0 !important; visibility: hidden !important; }</style>');

class Sidebar {
    constructor() {
        this.el = document.getElementById('sidebar');
        if (!this.el) return;
        
        if (this.el.dataset.sidebarInit === 'true') return;
        this.el.dataset.sidebarInit = 'true';

        this.resizer = document.getElementById('resizer');
        this.isResizing = false;
        this.minWidth = 70;
        this.collapseThreshold = 180;
        this.maxWidth = 500;
        this.prefSaveTimer = null;
        
        this.originalNodes = {};
        this.albumsNode = null;
        this.tagsNode = null;

        const defaultOrder = ['dashboard', 'files', 'favorites', 'recent', 'slideshows', 'shares', 'shared_with_me', 'trash'];

        let savedOrder = JSON.parse(localStorage.getItem('fm_sb_order'));
        let savedHidden = JSON.parse(localStorage.getItem('fm_sb_hidden')) || [];
        
        if (savedOrder && Array.isArray(savedOrder) && !savedOrder.includes('slideshows')) {
            if (!savedHidden.includes('slideshows')) {
                const recentIdx = savedOrder.indexOf('recent');
                if (recentIdx !== -1) savedOrder.splice(recentIdx + 1, 0, 'slideshows');
                else savedOrder.push('slideshows');
                localStorage.setItem('fm_sb_order', JSON.stringify(savedOrder));
            }
        }

        this.prefs = {
            sb_compact: localStorage.getItem('fm_sb_compact') === 'true',
            sb_autoclose: localStorage.getItem('fm_sb_autoclose') === 'true',
            acc_albums: localStorage.getItem('fm_acc_albums') || 'remember', 
            acc_tags: localStorage.getItem('fm_acc_tags') || 'remember',
            style_albums: localStorage.getItem('fm_style_albums') || 'cards',
            style_tags: localStorage.getItem('fm_style_tags') || 'cloud',
            quick_add: localStorage.getItem('fm_sb_quick') !== 'false',
            storage_pulse: localStorage.getItem('fm_sb_pulse') !== 'false',
            sb_order: savedOrder || defaultOrder,
            sb_hidden: savedHidden
        };

        this.injectSidebarStyles();
        
        this.cacheOriginalNodes();
        this.applySidebarVisibilityAndOrder();
        this.applyAccordionStates();
        
        const fouc = document.getElementById('fouc-style');
        if (fouc) fouc.remove();
        
        this.initResizer();
        this.initNavigation();
        this.initTags();
        this.initAlbums();
        this.initSidebarSettings(); 
        this.initHistoryContainer(); 
        this.initRecentContainer();  
        
        // FASE 5 FIX: Genereer de overlay die achter de mobiele sidebar valt
        this.initMobileOverlay();

        this.loadRecent();
        this.loadStorageQuota(); 
        
        this.initPreferences().then(() => {
            this.loadDynamicData().catch(e => console.warn("API niet bereikbaar (404)."));
        });

        if (window.EventBus) {
            window.EventBus.on('view:refresh', () => {
                this.loadDynamicData().catch(e => {});
                this.loadStorageQuota();
            });
            window.EventBus.on('navigation:navigate', (path) => {
                setTimeout(() => {
                    this.loadRecent();
                    this.setActivePath(path);
                    this.closeMobileMenu(); // FASE 5: Menu sluiten na navigatie
                }, 100);
            });
            window.EventBus.on('navigation:action', (action) => {
                this.setActiveAction(action);
                this.closeMobileMenu(); // FASE 5: Menu sluiten na navigatie
            });
        }
    }

    // FASE 5: Mobiele Overlay Logica
    initMobileOverlay() {
        let overlay = document.querySelector('.mobile-sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-sidebar-overlay';
            // De overlay wordt geplaatst in de main-container, vlak voor de file view
            const container = document.querySelector('.main-content') || document.body;
            container.appendChild(overlay);
            
            overlay.addEventListener('click', () => this.closeMobileMenu());
            
            // Touch Swipe om te sluiten (optioneel, maar goed voor UX)
            let startX = 0;
            overlay.addEventListener('touchstart', e => startX = e.touches[0].clientX);
            overlay.addEventListener('touchend', e => {
                if (startX - e.changedTouches[0].clientX > 50) this.closeMobileMenu();
            });
        }
    }

    closeMobileMenu() {
        if (document.body.classList.contains('mobile-menu-open')) {
            document.body.classList.remove('mobile-menu-open');
        }
    }

    cacheOriginalNodes() {
        const navContainer = this.el.querySelector('.nav-group');
        if (!navContainer) return;

        const map = {
            'dashboard': '[data-path="dashboard"]',
            'files': '[data-path="root"], [data-path="/"]',
            'recent': '.nav-recent-parent, [data-path="recent"]',
            'favorites': '[data-path="favorites"], [data-path="favorieten"]',
            'slideshows': '[data-action="slideshows"], [data-path="slideshows"]',
            'shares': '[data-path="shares"], [data-path="gedeelde_links"]',
            'shared_with_me': '[data-action="shared_with_me"], [data-path="shared_with_me"]',
            'trash': '[data-path="trash"]'
        };

        Object.keys(map).forEach(key => {
            let target = this.el.querySelector(map[key]);
            if (target) {
                if (key === 'shares' || key === 'shared_with_me') {
                    target.style.paddingLeft = '12px'; 
                    target.classList.remove('nav-subitem');
                } else if (key === 'recent') {
                    while (target.parentElement && target.parentElement !== navContainer && !target.parentElement.classList.contains('accordion-content')) {
                        if (target.parentElement.classList.contains('accordion')) { target = target.parentElement; break; }
                        target = target.parentElement;
                    }
                } else {
                    while (target.parentElement && target.parentElement !== navContainer && !target.parentElement.classList.contains('accordion-content')) {
                        target = target.parentElement;
                    }
                }
                this.originalNodes[key] = target;

                const iconSvg = this.getIconForPath(key === 'files' ? 'root' : key);
                const oldIcon = target.querySelector('svg:not(.nav-chevron)');
                if (oldIcon) {
                    oldIcon.outerHTML = iconSvg;
                }
            }
        });

        const collabGroup = document.getElementById('group-collab');
        if (collabGroup) collabGroup.remove();

        const ensureNode = (key, dataAttr, label) => {
            if (!this.originalNodes[key]) {
                const div = document.createElement('div');
                div.innerHTML = `<div class="nav-item" ${dataAttr}>${this.getIconForPath(key === 'files' ? 'root' : key)}<span class="label">${label}</span></div>`;
                this.originalNodes[key] = div.firstElementChild;
            }
        };

        ensureNode('dashboard', 'data-path="dashboard"', 'Dashboard');
        ensureNode('files', 'data-path="root"', 'Mijn Bestanden');
        ensureNode('favorites', 'data-path="favorites"', 'Favorieten');
        ensureNode('slideshows', 'data-action="slideshows"', 'Mijn Slideshows');
        ensureNode('shares', 'data-path="shares"', 'Mijn Externe Links');
        ensureNode('shared_with_me', 'data-action="shared_with_me"', 'Gedeeld met mij');
        ensureNode('trash', 'data-path="trash"', 'Prullenbak');
        
        if (!this.originalNodes['recent']) {
            const div = document.createElement('div');
            div.innerHTML = `
                <div class="accordion collapsed" id="group-recent">
                    <div class="accordion-header nav-item nav-recent-parent" style="position: relative; padding-right: 40px;">
                        ${this.getIconForPath('recent')}
                        <span class="label" style="flex:1;">Recent & Geschiedenis</span>
                        <button class="btn-icon-small nav-chevron" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                    </div>
                    <div class="accordion-content" id="sidebar-recent-list" style="display: none; padding-bottom: 10px;"></div>
                </div>
            `.trim();
            this.originalNodes['recent'] = div.firstElementChild;
        }

        this.albumsNode = document.getElementById('group-albums');
        this.tagsNode = document.getElementById('group-tags');
    }

    async initPreferences() {
        try {
            const res = await fetch('/api/files?action=preferences');
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.data && json.data.sidebar) {
                    this.prefs = { ...this.prefs, ...json.data.sidebar };
                    
                    if (this.prefs.sb_order && !this.prefs.sb_order.includes('slideshows') && (!this.prefs.sb_hidden || !this.prefs.sb_hidden.includes('slideshows'))) {
                        const recentIdx = this.prefs.sb_order.indexOf('recent');
                        if (recentIdx !== -1) this.prefs.sb_order.splice(recentIdx + 1, 0, 'slideshows');
                        else this.prefs.sb_order.push('slideshows');
                        this.savePreferencesDebounced(); 
                    }

                    localStorage.setItem('fm_sidebar_prefs', JSON.stringify(this.prefs));
                    this.applySidebarVisibilityAndOrder();
                    this.applyAccordionStates();
                }
            }
        } catch(e) {}

        if (this.prefs.sb_compact) this.el.classList.add('compact-mode');
        else this.el.classList.remove('compact-mode');
    }

    savePreferencesDebounced() {
        this.applySidebarVisibilityAndOrder();
        this.applyAccordionStates();

        clearTimeout(this.prefSaveTimer);
        this.prefSaveTimer = setTimeout(() => {
            this.savePreferencesToDB();
        }, 800);
    }

    async savePreferencesToDB() {
        localStorage.setItem('fm_sidebar_prefs', JSON.stringify(this.prefs));
        
        try {
            let csrfToken = '';
            const metaToken = document.querySelector('meta[name="csrf-token"]');
            if (metaToken) {
                csrfToken = metaToken.getAttribute('content');
            } else {
                const tokenRes = await fetch('/api/csrf');
                const tokenData = await tokenRes.json();
                csrfToken = tokenData.csrf_token;
            }
            
            const response = await fetch('/api/files/savePreferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_preferences', 
                    preferences: { sidebar: this.prefs }, 
                    csrf_token: csrfToken 
                })
            });

            const data = await response.json();
            if(!response.ok || data.status !== 'success') throw new Error(data.message);
        } catch(e) { 
            console.error('Kon sidebar instellingen niet opslaan:', e);
        }
    }

    injectSidebarStyles() {
        if (document.getElementById('dynamic-sidebar-styles')) return;
        const style = document.createElement('style');
        style.id = 'dynamic-sidebar-styles';
        style.innerHTML = `
            .nav-item[data-path="root"].active, .nav-item[data-path="/"].active { background: linear-gradient(90deg, rgba(37,99,235,0.15) 0%, transparent 100%) !important; border-left: 3px solid #2563EB !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="root"].active .icon, .nav-item[data-path="root"].active .label, .nav-item[data-path="/"].active .icon, .nav-item[data-path="/"].active .label { color: #2563EB !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-path="dashboard"].active { background: linear-gradient(90deg, rgba(6,182,212,0.15) 0%, transparent 100%) !important; border-left: 3px solid #06B6D4 !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="dashboard"].active .icon, .nav-item[data-path="dashboard"].active .label { color: #06B6D4 !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-path="favorites"].active, .nav-item[data-path="favorieten"].active { background: linear-gradient(90deg, rgba(245,158,11,0.15) 0%, transparent 100%) !important; border-left: 3px solid #F59E0B !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="favorites"].active .icon, .nav-item[data-path="favorites"].active .label, .nav-item[data-path="favorieten"].active .icon, .nav-item[data-path="favorieten"].active .label { color: #F59E0B !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-path="recent"].active, .nav-recent-parent.active { background: linear-gradient(90deg, rgba(16,185,129,0.15) 0%, transparent 100%) !important; border-left: 3px solid #10B981 !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="recent"].active .icon, .nav-item[data-path="recent"].active .label, .nav-recent-parent.active .icon, .nav-recent-parent.active .label { color: #10B981 !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-action="slideshows"].active, .nav-item[data-path="slideshows"].active { background: linear-gradient(90deg, rgba(244,63,94,0.15) 0%, transparent 100%) !important; border-left: 3px solid #F43F5E !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-action="slideshows"].active .icon, .nav-item[data-action="slideshows"].active .label, .nav-item[data-path="slideshows"].active .icon, .nav-item[data-path="slideshows"].active .label { color: #F43F5E !important; font-weight: 600; opacity: 1 !important; }

            .nav-item[data-path="shares"].active { background: linear-gradient(90deg, rgba(139,92,246,0.15) 0%, transparent 100%) !important; border-left: 3px solid #8B5CF6 !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="shares"].active .icon, .nav-item[data-path="shares"].active .label { color: #8B5CF6 !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-action="shared_with_me"].active, .nav-item[data-path="shared_with_me"].active { background: linear-gradient(90deg, rgba(20,184,166,0.15) 0%, transparent 100%) !important; border-left: 3px solid #14B8A6 !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-action="shared_with_me"].active .icon, .nav-item[data-action="shared_with_me"].active .label, .nav-item[data-path="shared_with_me"].active .icon, .nav-item[data-path="shared_with_me"].active .label { color: #14B8A6 !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-path="trash"].active, .nav-item[data-action="trash"].active, .sidebar .nav-item.item-red.active { background: linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 100%) !important; border-left: 3px solid #EF4444 !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="trash"].active .icon, .nav-item[data-path="trash"].active .label, .sidebar .nav-item.item-red.active .icon, .sidebar .nav-item.item-red.active .label { color: #EF4444 !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-path="albums_overview"].active, #group-albums .accordion-header.active, .album-item.active, .album-mini-card.active { background: linear-gradient(90deg, rgba(236,72,153,0.15) 0%, transparent 100%) !important; border-left: 3px solid #EC4899 !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="albums_overview"].active .icon, .nav-item[data-path="albums_overview"].active .label, #group-albums .accordion-header.active .icon, #group-albums .accordion-header.active .label, .album-item.active .icon, .album-item.active .label, .album-mini-card.active .label { color: #EC4899 !important; font-weight: 600; opacity: 1 !important; }
            
            .nav-item[data-path="tags_overview"].active, #group-tags .accordion-header.active, .tag-pill.active { background: linear-gradient(90deg, rgba(99,102,241,0.15) 0%, transparent 100%) !important; border-left: 3px solid #6366F1 !important; border-top: none !important; border-bottom: none !important; border-right: none !important; box-shadow: none !important; }
            .nav-item[data-path="tags_overview"].active .icon, .nav-item[data-path="tags_overview"].active .label, #group-tags .accordion-header.active .icon, #group-tags .accordion-header.active .label, .tag-pill.active { color: #6366F1 !important; font-weight: 600; opacity: 1 !important; }

            #sidebar.compact-mode .nav-item { padding: 6px 12px; font-size: 0.8rem; min-height: 32px; }
            #sidebar.compact-mode .accordion-header { padding-top: 6px; padding-bottom: 6px; }
            #sidebar.compact-mode .icon { width: 16px; height: 16px; }
            #sidebar.compact-mode .tag-pill { padding: 2px 8px; font-size: 0.75rem; }

            .sidebar-separator { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 16px; border-radius: 1px; box-shadow: 0 1px 0 rgba(0,0,0,0.2); }
            #sidebar.compact-mode .sidebar-separator { margin: 8px 12px; }

            .apple-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
            .apple-toggle input { opacity: 0; width: 0; height: 0; }
            .apple-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-dropdown); transition: .3s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 24px; }
            .apple-toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
            .apple-toggle input:checked + .apple-toggle-slider { background-color: var(--primary); }
            .apple-toggle input:focus + .apple-toggle-slider { box-shadow: 0 0 1px var(--primary); }
            .apple-toggle input:checked + .apple-toggle-slider:before { transform: translateX(20px); }

            .sb-settings-section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 12px; margin-top: 24px; padding-bottom: 8px; border-bottom: 1px solid var(--border-dropdown); display:flex; justify-content:space-between; align-items:center; }
            .sb-settings-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 10px; margin-bottom: 8px; transition: border-color 0.2s, box-shadow 0.2s; }
            .sb-settings-select { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-dropdown); background: var(--bg-main); color: var(--text-main); font-size: 0.85rem; font-weight: 600; outline: none; cursor: pointer; }
            
            .btn-sort-up, .btn-sort-down { padding: 4px; border-radius: 4px; transition: background 0.2s; outline: none; display: flex; align-items: center; justify-content: center; }
            .btn-sort-up:hover, .btn-sort-down:hover { background: rgba(128,128,128,0.2); color: var(--primary) !important; }
            .btn-del-sep { color: #ef4444 !important; background: rgba(239,68,68,0.1); border-radius: 6px; padding: 4px 8px; font-weight:bold; font-size:0.8rem; cursor:pointer; border:none; transition:0.2s; }
            .btn-del-sep:hover { background: #ef4444; color:white !important; }

            .quick-add-btn { position:absolute; right:35px; top:50%; transform:translateY(-50%); background:var(--bg-surface); border:1px solid var(--border-dropdown); box-shadow:0 2px 4px rgba(0,0,0,0.05); color:var(--text-main); transition:all 0.2s; z-index:10; opacity:0; width:20px; height:20px; display:flex; align-items:center; justify-content:center; border-radius:4px; }
            .accordion-header:hover .quick-add-btn { opacity: 1; }
            .quick-add-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }

            .sidebar-tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 16px 16px; }
            .album-card-list { display: flex; flex-direction: column; gap: 8px; padding: 4px 16px 16px 16px; }
            .album-mini-card { display: flex; align-items: center; gap: 12px; padding: 8px; background: transparent; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; }
            .album-mini-card:hover { background: var(--bg-surface); border-color: var(--border-dropdown); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
            
            .btn-save-custom { background: #2563EB; color: #ffffff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.25); transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; }
            .btn-save-custom:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37,99,235,0.4); filter: brightness(1.05); }
            .btn-save-custom:active { transform: translateY(0); box-shadow: 0 2px 6px rgba(37,99,235,0.2); }
        `;
        document.head.appendChild(style);
    }

    initResizer() {
        if (!this.resizer) return;
        const savedWidth = localStorage.getItem('fm_sidebar_width') || '260px';
        this.setWidth(parseInt(savedWidth));

        this.resizer.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.el.classList.toggle('collapsed');
            if (this.el.classList.contains('collapsed')) {
                this.setWidth(this.minWidth);
            } else {
                const w = parseInt(localStorage.getItem('fm_sidebar_width')) || 260;
                this.setWidth(w > this.minWidth ? w : 260);
            }
            setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        });

        this.resizer.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            document.body.style.cursor = 'col-resize';
            this.resizer.classList.add('resizing');
            e.preventDefault(); 
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < this.minWidth) newWidth = this.minWidth;
            if (newWidth > this.maxWidth) newWidth = this.maxWidth;
            this.setWidth(newWidth);
        });

        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                document.body.style.cursor = 'default';
                this.resizer.classList.remove('resizing');
                localStorage.setItem('fm_sidebar_width', getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'));
                setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
            }
        });
    }

    setWidth(width) {
        document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
        if (width < this.collapseThreshold) {
            this.el.classList.add('collapsed');
        } else {
            this.el.classList.remove('collapsed');
        }
    }

    setActivePath(path) {
        document.querySelectorAll('.sidebar .nav-item, .sidebar .album-mini-card').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`.sidebar [data-path="${path}"]`);
        if (target) target.classList.add('active');
    }

    setActiveAction(action) {
        document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`.sidebar [data-action="${action}"]`);
        if (target) target.classList.add('active');
    }

    initNavigation() {
        document.addEventListener('click', (e) => {
            try {
                const chevronBtn = e.target.closest('.accordion-header');
                if (chevronBtn && chevronBtn.parentElement.classList.contains('accordion')) {
                    if (!e.target.closest('.btn-icon-small')) {
                        const group = chevronBtn.parentElement;
                        const content = group.querySelector('.accordion-content');
                        const groupId = group.id; 
                        
                        let pref = 'remember';
                        if (groupId === 'group-albums') pref = this.prefs.acc_albums;
                        if (groupId === 'group-tags') pref = this.prefs.acc_tags;

                        const isTitleClick = e.target.closest('.title') || e.target.closest('.label') || e.target.tagName === 'SPAN';

                        if (!isTitleClick) {
                            if (pref === 'open' || pref === 'closed' || pref === 'disabled') {
                                return; 
                            }

                            if (content) {
                                const isClosing = !group.classList.contains('collapsed');
                                if (!isClosing && this.prefs.sb_autoclose) {
                                    document.querySelectorAll('.sidebar .accordion').forEach(acc => {
                                        if (acc !== group) {
                                            acc.classList.add('collapsed');
                                            const accContent = acc.querySelector('.accordion-content');
                                            if (accContent) accContent.style.setProperty('display', 'none', 'important');
                                            localStorage.setItem('fm_acc_state_' + acc.id, 'closed');
                                        }
                                    });
                                }
                                
                                group.classList.toggle('collapsed');
                                const newState = group.classList.contains('collapsed') ? 'closed' : 'open';
                                content.style.setProperty('display', newState === 'closed' ? 'none' : 'block', 'important');
                                localStorage.setItem(`fm_acc_state_${groupId}`, newState);
                            }
                            return; 
                        } else {
                            if (groupId === 'group-tags' && window.EventBus) { window.EventBus.emit('navigation:action', 'tags_overview'); return; }
                            if (groupId === 'group-albums' && window.EventBus) { window.EventBus.emit('navigation:action', 'albums_overview'); return; }
                        }
                    }
                }

                const item = e.target.closest('.nav-item, .album-mini-card, .tag-pill');
                if (item && this.el.contains(item)) {
                    if (e.target.closest('.nav-chevron') || e.target.closest('.btn-icon-small')) return;

                    document.querySelectorAll('.sidebar .nav-item, .sidebar .album-mini-card').forEach(el => el.classList.remove('active'));
                    document.querySelectorAll('.tag-pill').forEach(el => {
                        el.classList.remove('active');
                        el.style.transform = 'scale(1)';
                        el.style.boxShadow = 'none';
                    });
                    
                    item.classList.add('active');
                    const path = item.dataset.path;
                    const action = item.dataset.action;
                    
                    if (action === 'shared_with_me') {
                        const badge = document.getElementById('badge-shared');
                        if (badge) badge.style.display = 'none';
                    }

                    if (path && window.EventBus) window.EventBus.emit('navigation:navigate', path);
                    else if (action && window.EventBus) window.EventBus.emit('navigation:action', action);
                }
            } catch(e) { console.warn("Fout in navigatie click handler", e); }
        });
    }

    applySidebarVisibilityAndOrder() {
        const orderArray = this.prefs.sb_order || [];
        const hiddenArray = this.prefs.sb_hidden || [];
        const navContainer = this.el.querySelector('.nav-group');
        
        if (!navContainer || Object.keys(this.originalNodes).length === 0) return;

        navContainer.innerHTML = ''; 

        orderArray.forEach(key => {
            if (key.startsWith('sep_')) {
                const sep = document.createElement('div');
                sep.className = 'sidebar-separator';
                navContainer.appendChild(sep);
                return;
            }

            if (this.originalNodes[key]) {
                if (!hiddenArray.includes(key)) {
                    navContainer.appendChild(this.originalNodes[key]);
                }
            }
        });

        Object.keys(this.originalNodes).forEach(key => {
            if (!orderArray.includes(key) && !hiddenArray.includes(key)) {
                if (this.originalNodes[key]) navContainer.appendChild(this.originalNodes[key]);
            }
        });

        if (this.albumsNode && this.prefs.acc_albums !== 'hide') {
            navContainer.appendChild(this.albumsNode);
        }
        if (this.tagsNode && this.prefs.acc_tags !== 'hide') {
            navContainer.appendChild(this.tagsNode);
        }
    }

    applyAccordionStates() {
        const applyToGroup = (id, pref) => {
            try {
                const group = document.getElementById(id);
                if (!group) return;
                const header = group.querySelector('.accordion-header');
                const content = group.querySelector('.accordion-content');
                const chevron = group.querySelector('.nav-chevron');

                group.classList.add('accordion');
                group.style.removeProperty('display');
                if(header) { header.style.pointerEvents = ''; header.classList.add('accordion-header'); }
                if(chevron) chevron.style.removeProperty('display');
                if(content) content.style.removeProperty('display');

                if (pref === 'hide') {
                    group.style.setProperty('display', 'none', 'important');
                } 
                else if (pref === 'disabled') { 
                    group.classList.remove('accordion', 'collapsed');
                    if(header) { header.style.pointerEvents = 'none'; header.classList.remove('accordion-header'); }
                    if(chevron) chevron.style.setProperty('display', 'none', 'important');
                    if(content) content.style.setProperty('display', 'block', 'important');
                } 
                else if (pref === 'open') {
                    group.classList.remove('collapsed');
                    if(content) content.style.setProperty('display', 'block', 'important');
                } 
                else if (pref === 'closed') {
                    group.classList.add('collapsed');
                    if(content) content.style.setProperty('display', 'none', 'important');
                } 
                else {
                    const state = localStorage.getItem(`fm_acc_state_${id}`);
                    if (state === 'closed') {
                        group.classList.add('collapsed');
                        if(content) content.style.setProperty('display', 'none', 'important');
                    } else {
                        group.classList.remove('collapsed');
                        if(content) content.style.setProperty('display', 'block', 'important');
                    }
                }
            } catch(e) {}
        };

        applyToGroup('group-albums', this.prefs.acc_albums);
        applyToGroup('group-tags', this.prefs.acc_tags);
    }

    initSidebarSettings() {
        if (!document.getElementById('btn-sidebar-settings')) {
            const btn = document.createElement('button');
            btn.id = 'btn-sidebar-settings';
            btn.title = "Zijbalk Weergave Instellen";
            btn.style.cssText = 'position: absolute; top: 18px; right: 18px; z-index: 100; background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: all 0.2s ease; outline: none;';
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
            
            btn.onmouseover = () => { btn.style.color = 'var(--primary)'; btn.style.transform = 'scale(1.1) rotate(-5deg)'; };
            btn.onmouseout = () => { btn.style.color = 'var(--text-muted)'; btn.style.transform = 'scale(1) rotate(0deg)'; };

            this.el.appendChild(btn);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSidebarSettingsModal();
            });
        }
    }

    showSidebarSettingsModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        overlay.style.zIndex = '100050';
        
        const sections = [
            { id: 'dashboard', name: 'Dashboard', icon: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>' },
            { id: 'files', name: 'Mijn Bestanden', icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>' },
            { id: 'favorites', name: 'Favorieten', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' },
            { id: 'recent', name: 'Recent & Geschiedenis', icon: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' },
            { id: 'slideshows', name: 'Mijn Slideshows', icon: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>' },
            { id: 'shares', name: 'Mijn Externe Links', icon: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>' },
            { id: 'shared_with_me', name: 'Gedeeld met mij', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="21"></line>' },
            { id: 'trash', name: 'Prullenbak', icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' }
        ];

        let orderedSections = this.prefs.sb_order.map(id => {
            if (id.startsWith('sep_')) return { id: id, isSep: true };
            return sections.find(s => s.id === id);
        }).filter(Boolean);
        
        const missing = sections.filter(s => !this.prefs.sb_order.includes(s.id));
        orderedSections = [...orderedSections, ...missing];
        
        let sectionsHtml = '';
        orderedSections.forEach(sec => {
            if (sec.isSep) {
                sectionsHtml += `
                    <div class="sb-settings-row sb-sort-item sep-item" data-id="${sec.id}" style="background: rgba(128,128,128,0.05); padding: 8px 16px;">
                        <div style="display:flex; align-items:center; gap:12px; width:100%;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <button class="btn-sort-up" style="background:none; border:none; cursor:pointer; color:var(--text-muted); height: 16px; display:flex; align-items:center;" title="Verplaats Omhoog"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                                <button class="btn-sort-down" style="background:none; border:none; cursor:pointer; color:var(--text-muted); height: 16px; display:flex; align-items:center;" title="Verplaats Omlaag"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                            </div>
                            <div style="flex:1; height: 2px; background: var(--border-dropdown); border-radius: 2px;"></div>
                            <button class="btn-del-sep" title="Lijn verwijderen">X</button>
                        </div>
                    </div>
                `;
            } else {
                const isHidden = this.prefs.sb_hidden.includes(sec.id);
                sectionsHtml += `
                    <div class="sb-settings-row sb-sort-item" data-id="${sec.id}">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <button class="btn-sort-up" style="background:none; border:none; cursor:pointer; color:var(--text-muted); height: 16px; display:flex; align-items:center;" title="Verplaats Omhoog"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                                <button class="btn-sort-down" style="background:none; border:none; cursor:pointer; color:var(--text-muted); height: 16px; display:flex; align-items:center;" title="Verplaats Omlaag"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                            </div>
                            <div style="width:28px; height:28px; background:var(--bg-main); border-radius:6px; display:flex; align-items:center; justify-content:center; color:var(--primary);">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${sec.icon}</svg>
                            </div>
                            <span style="font-weight:600; color:var(--text-main); font-size:0.95rem;">${sec.name}</span>
                        </div>
                        <label class="apple-toggle">
                            <input type="checkbox" class="chk-hide-section auto-save-trigger" data-id="${sec.id}" ${!isHidden ? 'checked' : ''}>
                            <span class="apple-toggle-slider"></span>
                        </label>
                    </div>
                `;
            }
        });

        overlay.innerHTML = `
            <div class="modal-box" style="width: 550px; max-width: 95vw; background: var(--bg-dropdown); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; max-height:85vh;">
                <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; font-size:1.3rem; font-weight:800; color:var(--text-main);">Zijbalk Personaliseren</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Wijzigingen worden live toegepast.</div>
                    </div>
                    <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding:24px; overflow-y:auto; background:var(--bg-main);">
                    
                    <div class="sb-settings-section-title" style="margin-top:0;">Gedrag & Notificaties</div>
                    <div class="sb-settings-row">
                        <div>
                            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">Compacte Weergave</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">Maak de items in de zijbalk kleiner.</div>
                        </div>
                        <label class="apple-toggle">
                            <input type="checkbox" id="chk-sb-compact" class="auto-save-trigger" ${this.prefs.sb_compact ? 'checked' : ''}>
                            <span class="apple-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="sb-settings-row">
                        <div>
                            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">Auto-Sluiten Accordeons</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">Open je de ene map? Dan sluit de andere automatisch.</div>
                        </div>
                        <label class="apple-toggle">
                            <input type="checkbox" id="chk-sb-autoclose" class="auto-save-trigger" ${this.prefs.sb_autoclose ? 'checked' : ''}>
                            <span class="apple-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="sb-settings-row">
                        <div>
                            <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">Opslag Waarschuwing (Pulse)</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">Knipperende rode balk als je opslag boven de 90% komt.</div>
                        </div>
                        <label class="apple-toggle">
                            <input type="checkbox" id="chk-sb-pulse" class="auto-save-trigger" ${this.prefs.storage_pulse ? 'checked' : ''}>
                            <span class="apple-toggle-slider"></span>
                        </label>
                    </div>

                    <div class="sb-settings-section-title">De Weergave Stijlen</div>
                    <div class="sb-settings-row">
                        <div><div style="font-weight:600; font-size:0.9rem; color:var(--text-main);">Snelle Acties (+) Toevoegen</div></div>
                        <label class="apple-toggle"><input type="checkbox" id="chk-sb-quick" class="auto-save-trigger" ${this.prefs.quick_add ? 'checked' : ''}><span class="apple-toggle-slider"></span></label>
                    </div>
                    <div class="sb-settings-row">
                        <div><div style="font-weight:600; font-size:0.9rem; color:var(--text-main);">Albums Lay-out</div></div>
                        <select id="sel-sb-albums" class="sb-settings-select auto-save-trigger">
                            <option value="list" ${this.prefs.style_albums === 'list' ? 'selected' : ''}>Standaard Lijst</option>
                            <option value="cards" ${this.prefs.style_albums === 'cards' ? 'selected' : ''}>Mini-Cards</option>
                        </select>
                    </div>
                    <div class="sb-settings-row">
                        <div><div style="font-weight:600; font-size:0.9rem; color:var(--text-main);">Tags Lay-out</div></div>
                        <select id="sel-sb-tags" class="sb-settings-select auto-save-trigger">
                            <option value="list" ${this.prefs.style_tags === 'list' ? 'selected' : ''}>Standaard Lijst</option>
                            <option value="cloud" ${this.prefs.style_tags === 'cloud' ? 'selected' : ''}>Tag Cloud (Pillen)</option>
                        </select>
                    </div>

                    <div class="sb-settings-section-title">Uitklap-Mappen Acties (Accordion)</div>
                    <div class="sb-settings-row">
                        <div><div style="font-weight:600; font-size:0.9rem; color:var(--text-main);">Mijn Albums</div></div>
                        <select id="sel-acc-albums" class="sb-settings-select auto-save-trigger">
                            <option value="remember" ${this.prefs.acc_albums === 'remember' ? 'selected' : ''}>Vrije Keuze (Onthouden)</option>
                            <option value="open" ${this.prefs.acc_albums === 'open' ? 'selected' : ''}>Altijd Open (Vergrendeld)</option>
                            <option value="closed" ${this.prefs.acc_albums === 'closed' ? 'selected' : ''}>Altijd Dicht (Vergrendeld)</option>
                            <option value="disabled" ${this.prefs.acc_albums === 'disabled' ? 'selected' : ''}>Geen Accordion (Platte lijst)</option>
                            <option value="hide" ${this.prefs.acc_albums === 'hide' ? 'selected' : ''}>Volledig Verbergen</option>
                        </select>
                    </div>
                    <div class="sb-settings-row">
                        <div><div style="font-weight:600; font-size:0.9rem; color:var(--text-main);">Mijn Tags</div></div>
                        <select id="sel-acc-tags" class="sb-settings-select auto-save-trigger">
                            <option value="remember" ${this.prefs.acc_tags === 'remember' ? 'selected' : ''}>Vrije Keuze (Onthouden)</option>
                            <option value="open" ${this.prefs.acc_tags === 'open' ? 'selected' : ''}>Altijd Open (Vergrendeld)</option>
                            <option value="closed" ${this.prefs.acc_tags === 'closed' ? 'selected' : ''}>Altijd Dicht (Vergrendeld)</option>
                            <option value="disabled" ${this.prefs.acc_tags === 'disabled' ? 'selected' : ''}>Geen Accordion (Platte lijst)</option>
                            <option value="hide" ${this.prefs.acc_tags === 'hide' ? 'selected' : ''}>Volledig Verbergen</option>
                        </select>
                    </div>

                    <div class="sb-settings-section-title">
                        <span>Volgorde & Zichtbaarheid</span>
                        <button id="btn-add-separator" style="background:none; border:none; color:var(--primary); font-weight:bold; cursor:pointer; font-size:0.8rem;">+ Voeg Lijn Toe</button>
                    </div>
                    <div id="sb-sort-container" style="display:flex; flex-direction:column; gap:4px;">
                        ${sectionsHtml}
                    </div>

                </div>
                <div style="padding:16px 24px; border-top:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:flex-end; gap:12px;">
                    <button class="btn-save-custom close-btn">Klaar met bewerken</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelectorAll('.close-btn').forEach(b => b.onclick = close);

        const sortContainer = overlay.querySelector('#sb-sort-container');
        
        overlay.querySelector('#btn-add-separator').onclick = () => {
            const sepId = 'sep_' + Date.now();
            const sepHtml = `
                <div class="sb-settings-row sb-sort-item sep-item" data-id="${sepId}" style="background: rgba(128,128,128,0.05); padding: 8px 16px;">
                    <div style="display:flex; align-items:center; gap:12px; width:100%;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <button class="btn-sort-up" style="background:none; border:none; cursor:pointer; color:var(--text-muted); height: 16px; display:flex; align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                            <button class="btn-sort-down" style="background:none; border:none; cursor:pointer; color:var(--text-muted); height: 16px; display:flex; align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                        </div>
                        <div style="flex:1; height: 2px; background: var(--border-dropdown); border-radius: 2px;"></div>
                        <button class="btn-del-sep">X</button>
                    </div>
                </div>
            `;
            sortContainer.insertAdjacentHTML('beforeend', sepHtml);
            updateSettingsAndLivePreview();
        };

        const updateSettingsAndLivePreview = () => {
            this.prefs.sb_compact = overlay.querySelector('#chk-sb-compact').checked;
            this.prefs.sb_autoclose = overlay.querySelector('#chk-sb-autoclose').checked;
            this.prefs.storage_pulse = overlay.querySelector('#chk-sb-pulse').checked;
            this.prefs.quick_add = overlay.querySelector('#chk-sb-quick').checked;
            this.prefs.style_albums = overlay.querySelector('#sel-sb-albums').value;
            this.prefs.style_tags = overlay.querySelector('#sel-sb-tags').value;
            this.prefs.acc_albums = overlay.querySelector('#sel-acc-albums').value;
            this.prefs.acc_tags = overlay.querySelector('#sel-acc-tags').value;
            
            if (this.prefs.sb_compact) this.el.classList.add('compact-mode');
            else this.el.classList.remove('compact-mode');
            
            const newOrder = [];
            const newHidden = [];
            
            sortContainer.querySelectorAll('.sb-sort-item').forEach(item => {
                const id = item.dataset.id;
                newOrder.push(id);
                if (!item.classList.contains('sep-item') && !item.querySelector('.chk-hide-section').checked) {
                    newHidden.push(id);
                }
            });

            this.prefs.sb_order = newOrder;
            this.prefs.sb_hidden = newHidden;

            this.savePreferencesDebounced();
            
            this.loadAlbums();
            this.loadTags();
        };

        overlay.addEventListener('change', (e) => {
            if (e.target.classList.contains('auto-save-trigger')) {
                updateSettingsAndLivePreview();
            }
        });

        sortContainer.addEventListener('click', (e) => {
            const btnUp = e.target.closest('.btn-sort-up');
            const btnDown = e.target.closest('.btn-sort-down');
            const btnDel = e.target.closest('.btn-del-sep');
            
            if (btnDel) {
                btnDel.closest('.sb-sort-item').remove();
                updateSettingsAndLivePreview();
            } else if (btnUp) {
                const item = btnUp.closest('.sb-sort-item');
                if (item.previousElementSibling) {
                    item.parentNode.insertBefore(item, item.previousElementSibling);
                    item.style.transform = 'scale(1.02)'; setTimeout(()=> item.style.transform='none', 150);
                    updateSettingsAndLivePreview();
                }
            } else if (btnDown) {
                const item = btnDown.closest('.sb-sort-item');
                if (item.nextElementSibling) {
                    item.parentNode.insertBefore(item.nextElementSibling, item);
                    item.style.transform = 'scale(1.02)'; setTimeout(()=> item.style.transform='none', 150);
                    updateSettingsAndLivePreview();
                }
            }
        });
    }

    async loadDynamicData() {
        await Promise.all([
            this.loadAlbums(),
            this.loadTags(),
            this.loadSharedFolders() 
        ]);
    }

    async loadSharedFolders() {
        const list = document.getElementById('sidebar-shared-folders');
        if (!list) return;

        try {
            const res = await fetch('/api/files?action=shared_with_me');
            if (!res.ok) throw new Error('API Error');
            const json = await res.json();
            
            if (json.status === 'success') {
                list.innerHTML = '';
                const folders = json.data.folders || [];
                
                if (folders.length === 0) {
                    list.innerHTML = `<div class="nav-item placeholder-item" style="pointer-events:none;"><span class="label" style="opacity:0.5; font-style:italic; font-size:0.85rem; padding-left:12px;">Geen mappen</span></div>`;
                    return;
                }
                
                folders.forEach(folder => {
                    const div = document.createElement('div');
                    div.className = `nav-item nav-subitem shared-folder-item`;
                    div.dataset.path = folder.id;
                    div.style.paddingLeft = '12px';
                    
                    div.innerHTML = `
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; margin-right:8px; opacity:0.7;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        <span class="label" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${folder.name}</span>
                    `;
                    list.appendChild(div);
                });
            }
        } catch(e) {
            list.innerHTML = `<div class="nav-item placeholder-item" style="pointer-events:none;"><span class="label" style="opacity:0.5; font-style:italic; font-size:0.85rem; padding-left:12px;">Fout bij laden</span></div>`;
        }
    }

    async loadAlbums() {
        const list = document.getElementById('sidebar-album-list');
        if (!list) return;

        try {
            const res = await fetch('/api/albums');
            if (!res.ok) throw new Error('API 404');
            const json = await res.json();
            
            if (json.status === 'success') {
                list.innerHTML = '';
                if (window.App && window.App.albumManager) window.App.albumManager.albums = json.data;

                if (json.data.length === 0) {
                    list.innerHTML = `<div class="nav-item placeholder-item" style="pointer-events:none;"><span class="label" style="opacity:0.5; font-style:italic; font-size:0.85rem; padding-left:12px;">Geen albums</span></div>`;
                    return;
                }
                
                const isCards = this.prefs.style_albums === 'cards';
                list.className = isCards ? 'accordion-content album-card-list' : 'accordion-content';

                json.data.forEach(album => {
                    const div = document.createElement('div');
                    div.className = isCards ? 'album-mini-card' : 'nav-item album-item';
                    div.dataset.path = 'album_' + album.id;
                    
                    const t = new Date().getTime();
                    let visualHtml = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
                    
                    if (album.cover_file_id) {
                        visualHtml = `
                            <img src="/api/files?action=thumb&id=${album.cover_file_id}&t=${t}" style="width:18px; height:18px; object-fit:cover; border-radius:4px; margin-right:12px; border:1px solid rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                            <div style="display:none; width:18px; height:18px; border-radius:4px; background:${album.color || 'var(--primary)'}20; color:${album.color || 'var(--primary)'}; align-items:center; justify-content:center; margin-right:12px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                        `;
                    } else if (album.color) {
                        visualHtml = `
                            <div style="width:18px; height:18px; border-radius:4px; background:${album.color}20; color:${album.color}; display:inline-flex; align-items:center; justify-content:center; margin-right:12px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                        `;
                    }
                    
                    div.innerHTML = `${visualHtml}<span class="label">${album.name}</span>`;
                    list.appendChild(div);
                });
            }
        } catch(e) {
            list.innerHTML = `<div class="nav-item placeholder-item" style="pointer-events:none;"><span class="label" style="opacity:0.5; font-style:italic; font-size:0.85rem; padding-left:12px;">Geen albums</span></div>`;
        }
    }

    async loadTags() {
        const container = document.getElementById('sidebar-tag-list');
        if (!container) return;

        try {
            const res = await fetch('/api/tags');
            if (!res.ok) throw new Error('API 404');
            const json = await res.json();
            
            if (json.status === 'success') {
                container.innerHTML = '';
                if (window.App && window.App.tagManager) window.App.tagManager.availableTags = json.data;

                if (json.data.length === 0) {
                    container.innerHTML = `<div class="nav-item placeholder-item" style="pointer-events:none;"><span class="label" style="opacity:0.5; font-style:italic; font-size:0.85rem; padding-left:12px;">Geen tags</span></div>`;
                    return;
                }

                const isCloud = this.prefs.style_tags === 'cloud';
                container.className = isCloud ? 'accordion-content sidebar-tag-cloud' : 'accordion-content'; 

                json.data.forEach(tag => {
                    const el = document.createElement('div');
                    el.className = 'tag-pill';
                    el.dataset.path = `tag_detail_${tag.name}`;
                    
                    let iconHtml = `<span style="width:8px; height:8px; border-radius:50%; background-color:${tag.color}; box-shadow:0 1px 2px rgba(0,0,0,0.2);"></span>`;
                    
                    if (tag.icon && tag.icon !== 'none') {
                        let innerSvg = '';
                        if (window.App && window.App.iconPicker && window.App.iconPicker.icons) {
                            const found = window.App.iconPicker.icons.find(i => i.id === tag.icon);
                            if (found) innerSvg = found.inner;
                        }
                        if (innerSvg) {
                            iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${innerSvg}</svg>`;
                        }
                    }

                    el.innerHTML = `${iconHtml}<span class="tag-label-text">${tag.name}</span>`;
                    el.style.cssText = `display:inline-flex; align-items:center; gap:6px; background:${tag.color}15; color:${tag.color}; border:1px solid ${tag.color}40; cursor:pointer; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:600; margin:0 6px 6px 0; transition:all 0.2s;`;
                    
                    el.addEventListener('mouseover', () => { el.style.transform = 'scale(1.05)'; el.style.boxShadow = `0 4px 8px ${tag.color}30`; });
                    el.addEventListener('mouseout', () => { el.style.transform = 'scale(1)'; el.style.boxShadow = 'none'; });
                    
                    el.addEventListener('click', () => { 
                        if (window.EventBus) window.EventBus.emit('navigation:navigate', `tag_detail_${tag.name}`); 
                    });
                    
                    container.appendChild(el);
                });
            }
        } catch(e) {
             container.innerHTML = `<div class="nav-item placeholder-item" style="pointer-events:none;"><span class="label" style="opacity:0.5; font-style:italic; font-size:0.85rem; padding-left:12px;">Geen tags</span></div>`;
        }
    }

    initAlbums() {
        const btnAddAlbum = document.querySelector('#group-albums .btn-icon-small') || document.getElementById('btn-add-album');
        if (btnAddAlbum) {
            btnAddAlbum.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.el.classList.contains('collapsed')) this.setWidth(260);
                if (window.App && window.App.albumManager) window.App.albumManager.showEditModal(null);
            });
        }
    }

    initTags() {
        const btnAddTag = document.querySelector('#group-tags .btn-icon-small') || document.getElementById('btn-add-tag');
        if (btnAddTag) {
            btnAddTag.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (this.el.classList.contains('collapsed')) this.setWidth(260);
                if (window.App && window.App.tagManager) window.App.tagManager.showEditModal(null);
            });
        }
    }

    async loadStorageQuota() {
        try {
            const res = await fetch('/api/quota');
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success' && json.data) {
                    const total = parseInt(json.data.quota_bytes) || 5368709120; 
                    const used = parseInt(json.data.used_bytes) || 0;
                    
                    let pct = 0;
                    if (total > 0) {
                        pct = Math.min((used / total) * 100, 100);
                    }
                    
                    const formatBytes = (bytes) => {
                        if (bytes === 0) return '0 B';
                        const k = 1024;
                        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                    };
                    
                    this.updateStorage(Math.round(pct), `${formatBytes(used)} van ${formatBytes(total)}`);
                    return;
                }
            }
            this.updateStorage(0, "0 B van 5 GB");
        } catch (e) {
            this.updateStorage(0, "0 B van 5 GB");
        }
    }

    updateStorage(percentage, textStr = null) {
        const fill = document.querySelector('.meter-fill');
        const text = document.getElementById('storage-text');
        if (fill && text) {
            fill.style.width = `${percentage}%`;
            text.textContent = textStr || `${percentage}% gebruikt`;
            if (percentage > 90) fill.style.background = '#ef4444'; 
            else fill.style.background = 'var(--primary)'; 
        }
    }

    initHistoryContainer() {
        const rootBtn = document.querySelector('.nav-history-parent');
        let container = document.getElementById('sidebar-history-list');
        
        if (rootBtn && container) {
            const chevron = rootBtn.querySelector('.nav-chevron');
            const isExpanded = localStorage.getItem('fm_history_expanded');
            
            container.style.display = ''; 
            if (isExpanded === 'true') {
                container.classList.remove('hidden');
                if(chevron) chevron.querySelector('svg').style.transform = 'rotate(90deg)';
            } else {
                container.classList.add('hidden');
                if(chevron) chevron.querySelector('svg').style.transform = 'rotate(0deg)';
            }

            if (chevron) {
                chevron.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.classList.toggle('hidden');
                    const isHidden = container.classList.contains('hidden');
                    chevron.querySelector('svg').style.transform = isHidden ? 'rotate(0deg)' : 'rotate(90deg)';
                    localStorage.setItem('fm_history_expanded', isHidden ? 'false' : 'true');
                    if (window.EventBus && !isHidden) window.EventBus.emit('sidebar:history_opened');
                });
            }
        }
    }

    initRecentContainer() {
        const recentBtn = document.querySelector('.nav-recent-parent');
        let container = document.getElementById('sidebar-recent-list');
        
        if (recentBtn && container) {
            const chevron = recentBtn.querySelector('.nav-chevron');
            const isExpanded = localStorage.getItem('fm_recent_expanded');
            
            container.style.display = ''; 
            if (isExpanded === 'true') {
                container.classList.remove('hidden');
                if(chevron) chevron.querySelector('svg').style.transform = 'rotate(90deg)';
            } else {
                container.classList.add('hidden');
                if(chevron) chevron.querySelector('svg').style.transform = 'rotate(0deg)';
            }

            if (chevron) {
                chevron.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.classList.toggle('hidden');
                    const isHidden = container.classList.contains('hidden');
                    chevron.querySelector('svg').style.transform = isHidden ? 'rotate(0deg)' : 'rotate(90deg)';
                    localStorage.setItem('fm_recent_expanded', isHidden ? 'false' : 'true');
                });
            }
        }
    }

    getIconForPath(path) {
        const styleStr = `margin-right:12px; width:18px; height:18px; transition:all 0.2s;`;
        
        if (!path || path === '/' || path === 'root') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
        if (path === 'dashboard') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
        if (path === 'shares') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
        if (path === 'shared_with_me') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
        if (path.startsWith('album_') || path === 'albums_overview') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        if (path.startsWith('tag_') || path === 'tags_overview') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
        if (path === 'trash') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        if (path === 'favorites' || path === 'favorieten') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        if (path === 'recent') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        if (path === 'slideshows') return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
        
        return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${styleStr}"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    }

    loadRecent() {
        try {
            const history = JSON.parse(localStorage.getItem('fm_nav_history') || '[]');
            this.renderRecent(history.slice(0, 5));
        } catch(e) {}
    }

    renderRecent(paths) {
        const container = document.getElementById('sidebar-recent-list');
        if (!container) return;

        container.innerHTML = ''; 
        
        if (paths.length === 0) {
            container.innerHTML = `<div class="nav-item placeholder-item" style="pointer-events:none;"><span class="label" style="opacity:0.5; font-style:italic; font-size:0.85rem; padding-left:24px;">Geen locaties</span></div>`;
        } else {
            paths.forEach(path => {
                const item = document.createElement('div');
                item.className = 'nav-item nav-subitem';
                item.dataset.path = path;
                item.style.paddingLeft = '24px';
                
                let displayName = 'Mijn Bestanden';
                if (path && path !== '/' && String(path) !== 'null') {
                    if (path.startsWith('album_')) {
                        const id = path.replace('album_', '');
                        const album = (window.App && window.App.albumManager && window.App.albumManager.albums) ? window.App.albumManager.albums.find(a => String(a.id) === id) : null;
                        displayName = album ? album.name : `Album`;
                    } else if (path.startsWith('tag_detail_')) {
                        displayName = 'Tag: ' + path.replace('tag_detail_', '');
                    } else if (path === 'trash') {
                        displayName = 'Prullenbak';
                    } else if (path === 'shares') {
                        displayName = 'Mijn Externe Links'; 
                    } else if (path === 'shared_with_me') {
                        displayName = 'Gedeeld met mij'; 
                    } else if (path === 'slideshows') {
                        displayName = 'Mijn Slideshows';
                    } else {
                        displayName = path; 
                    }
                }
                
                item.setAttribute('data-tooltip', displayName); 
                const iconSvg = this.getIconForPath(path);
                
                item.innerHTML = `
                    ${iconSvg}
                    <span class="label" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">${displayName}</span>
                `;
                
                item.addEventListener('click', () => {
                    if(window.EventBus) window.EventBus.emit('navigation:navigate', path);
                });
                
                container.appendChild(item);
            });
        }
    }
}

window.Sidebar = Sidebar;

document.addEventListener('DOMContentLoaded', () => {
    window.App = window.App || {};
    if (!window.App.sidebar) window.App.sidebar = new Sidebar();
});