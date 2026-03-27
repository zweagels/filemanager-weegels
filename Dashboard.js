/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Dashboard | FILE: public/js/modules/dashboard/Dashboard.js */

(function() {
    const DEBUG = true;

    class Dashboard {
        constructor() {
            this.container = document.getElementById('file-view');
            this.editMode = false;
            this.layout = []; 
            this.originalLayout = [];
            this.data = { settings: {} }; 
            
            // Custom Drag & Drop status
            this.customDragState = { active: false, el: null, ghost: null, offsetX: 0, offsetY: 0 };
            
            this.refreshInterval = null;
            this.saveTimer = null;
            this.prefSaveTimer = null; 
            this.cacheKey = 'fm_dashboard_cache';

            // Bindings voor de nieuwe Pointer Drag Engine
            this.onPointerDown = this.onPointerDown.bind(this);
            this.onPointerMove = this.onPointerMove.bind(this);
            this.onPointerUp = this.onPointerUp.bind(this);

            if (window.EventBus) {
                window.EventBus.on('navigation:navigate', (path) => {
                    if (path === 'dashboard') {
                        if(DEBUG) console.log("[Dashboard] Navigating to dashboard");
                        document.body.classList.add('dashboard-view-active');
                        this.mount();
                    } else {
                        document.body.classList.remove('dashboard-view-active');
                        this.stopAutoRefresh(); 
                    }
                });

                window.EventBus.on('view:refresh', () => {
                    if (document.body.classList.contains('dashboard-view-active') && !this.editMode) {
                        this.refreshAllWidgetsAsynchronously();
                    }
                });
            }

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stopAutoRefresh();
                } else if (document.body.classList.contains('dashboard-view-active')) {
                    this.refreshAllWidgetsAsynchronously();
                    this.startAutoRefresh();
                }
            });
            
            this.injectStyles();
        }

        injectStyles() {
            if (document.getElementById('dashboard-reparatie-styles')) return;
            const style = document.createElement('style');
            style.id = 'dashboard-reparatie-styles';
            style.innerHTML = `
                .dashboard-widget[data-type="welcome"] { overflow: visible !important; }
                .dashboard-widget[data-type="welcome"] > div { overflow: visible !important; }

                .dashboard-container-grid { 
                    display: grid; 
                    grid-template-columns: repeat(4, 1fr); 
                    grid-auto-rows: 240px; 
                    grid-auto-flow: dense;
                    gap: 24px; 
                    padding-bottom: 40px;
                    position: relative;
                }
                
                .dashboard-widget {
                    background: var(--bg-surface); 
                    border-radius: 16px; 
                    border: 1px solid var(--border-dropdown); 
                    box-shadow: 0 4px 10px rgba(0,0,0,0.02); 
                    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s, background-color 0.3s; 
                    position: relative; 
                    display: flex; 
                    flex-direction: column;
                    height: 100%; 
                    overflow: hidden; 
                }

                /* Edit Mode Visuals */
                .dashboard-edit-mode .dashboard-widget { 
                    animation: jiggle 0.3s infinite; 
                    z-index: 10; 
                    border: 2px solid var(--primary) !important;
                }

                /* FORCEER BOLLETJES ZICHTBAARHEID OP DE VOORGROND */
                .widget-drag-handle {
                    display: none !important;
                    width: 32px;
                    height: 32px;
                    background: var(--primary) !important;
                    color: white !important;
                    border-radius: 8px;
                    cursor: grab !important;
                    align-items: center;
                    justify-content: center;
                    position: absolute;
                    top: 10px;
                    right: 45px;
                    z-index: 1000 !important;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                }
                .dashboard-edit-mode .widget-drag-handle { display: flex !important; }

                .dashboard-widget.is-dragging-custom {
                    opacity: 0.1 !important; 
                    transform: scale(0.9) !important;
                    pointer-events: none !important;
                }

                .dashboard-ghost {
                    position: fixed !important;
                    pointer-events: none !important;
                    z-index: 100000 !important;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.4) !important;
                    border: 2px solid var(--primary) !important;
                    background: var(--bg-surface) !important;
                    border-radius: 16px !important;
                    opacity: 0.9 !important;
                    transform: scale(1.05) !important;
                    margin: 0 !important;
                }

                @keyframes jiggle { 0% { transform: rotate(-0.5deg); } 50% { transform: rotate(0.5deg); } 100% { transform: rotate(-0.5deg); } }

                .widget-1x1 { grid-column: span 1; grid-row: span 1; }
                .widget-2x1 { grid-column: span 2; grid-row: span 1; }
                .widget-1x2 { grid-column: span 1; grid-row: span 2; }
                .widget-2x2 { grid-column: span 2; grid-row: span 2; }
                .widget-full { grid-column: 1 / -1; grid-row: span 1; }

                @media (max-width: 1200px) {
                    .dashboard-container-grid { grid-template-columns: repeat(2, 1fr); }
                    .widget-1x1 { grid-column: span 1; }
                    .widget-2x1, .widget-1x2, .widget-2x2, .widget-full { grid-column: span 2; }
                }
                @media (max-width: 768px) {
                    .dashboard-container-grid { grid-template-columns: 1fr; grid-auto-rows: minmax(200px, auto); }
                    .widget-1x1, .widget-2x1, .widget-1x2, .widget-2x2, .widget-full { grid-column: span 1; grid-row: auto; min-height: 240px; }
                }

                @keyframes skeleton-pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.6; }
                }
                .skeleton-box { 
                    background: var(--border-dropdown); 
                    animation: skeleton-pulse 1.5s infinite ease-in-out; 
                    border-radius: 16px; 
                    border: none;
                    width: 100%;
                    height: 100%;
                }
            `;
            document.head.appendChild(style);
        }

        async mount() {
            if (!this.container) return;
            
            if (window.App && window.App.propertiesPanel && window.App.propertiesPanel.panel) {
                window.App.propertiesPanel.panel.classList.remove('visible');
            }
            const mainToolbar = document.getElementById('main-toolbar');
            if (mainToolbar) mainToolbar.style.display = 'none';

            this.container.innerHTML = `
                <div style="max-width: 1400px; margin: 0 auto; padding: 24px 24px 0 24px; display: flex; justify-content: flex-end; align-items: center; margin-bottom: 16px;">
                    <div class="skeleton-box" style="width:160px; height:38px; border-radius:10px;"></div>
                </div>
                <div style="max-width: 1400px; margin: 0 auto;">
                    <div class="dashboard-container-grid" id="dashboard-grid">
                        <div class="widget-full"><div class="skeleton-box"></div></div>
                        <div class="widget-full" style="height: 150px;"><div class="skeleton-box"></div></div>
                        <div class="widget-1x1"><div class="skeleton-box"></div></div>
                        <div class="widget-1x1"><div class="skeleton-box"></div></div>
                        <div class="widget-2x2"><div class="skeleton-box"></div></div>
                    </div>
                </div>
            `;

            await this.loadInitialLayout();
            this.startAutoRefresh();
        }

        async loadInitialLayout() {
            try {
                if(DEBUG) console.log("[Dashboard] Loading layout from server...");
                
                let serverPrefs = {};
                try {
                    const prefRes = await fetch('/api/files?action=preferences');
                    if(prefRes.ok) {
                        const prefJson = await prefRes.json();
                        if(prefJson.status === 'success' && prefJson.data) serverPrefs = prefJson.data;
                    }
                } catch(e) {}

                try {
                    const userRes = await fetch('/api/settings');
                    if (userRes.ok) {
                        const userJson = await userRes.json();
                        if (userJson.status === 'success' && userJson.data && userJson.data.user) {
                            window.currentUser = userJson.data.user;
                            if(DEBUG) console.log("[Dashboard] User profile updated in session:", window.currentUser.first_name);
                        }
                    }
                } catch(e) {}

                const res = await fetch('/api/dashboard');
                if (res.status === 404) throw new Error("API Route is niet gevonden.");
                const json = await res.json();
                
                if (json.status === 'success') {
                    this.data = json.data || { settings: {} };
                    this.data.settings = { ...this.data.settings, ...serverPrefs };
                    
                    if(DEBUG) console.log("[Dashboard] Received layout:", json.layout);
                    
                    const savedLayout = json.layout;
                    this.parseLayout(savedLayout);
                    
                    localStorage.setItem(this.cacheKey, JSON.stringify({ data: this.data, layout: this.layout }));
                    this.renderLayout();
                    this.refreshAllWidgetsAsynchronously();
                } else {
                    throw new Error(json.message);
                }
            } catch (error) {
                console.error("[Dashboard] Load error:", error);
                
                const cached = localStorage.getItem(this.cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        this.data = parsed.data || { settings: {} }; 
                        this.parseLayout(parsed.layout);
                        this.renderLayout();
                        this.refreshAllWidgetsAsynchronously(); 
                        return;
                    } catch(e) {}
                }

                if (!this.data) {
                    this.data = { settings: {} };
                    this.parseLayout(null);
                    this.renderLayout();
                }
            }
        }

        parseLayout(savedLayout) {
            const defaultLayout = [
                { id: 'welcome_1', type: 'welcome', size: 'widget-full', color: '' },
                { id: 'shortcuts_1', type: 'shortcuts', size: 'widget-full', color: '' },
                { id: 'upload_1', type: 'upload', size: 'widget-2x1', color: '' },
                { id: 'storage_1', type: 'storage', size: 'widget-1x1', color: '' },
                { id: 'types_1', type: 'types', size: 'widget-1x1', color: '' },
                { id: 'activity_1', type: 'activity', size: 'widget-2x2', color: '' },
                { id: 'notes_1', type: 'notes', size: 'widget-2x2', color: 'var(--bg-surface)' }
            ];

            if (!savedLayout || savedLayout.length === 0) {
                this.layout = defaultLayout;
                return;
            }

            if (typeof savedLayout[0] === 'string') {
                this.layout = savedLayout.map(id => {
                    const def = defaultLayout.find(d => d.type === id);
                    return { id: `${id}_1`, type: id, size: def ? def.size : 'widget-1x1', color: '' };
                });
            } else {
                this.layout = savedLayout.map(item => {
                    if (!item.type || item.type === 'undefined') {
                        const guessedType = (item.id && !item.id.includes('undefined')) ? item.id.replace(/_\d+$/, '') : 'storage';
                        return { id: `${guessedType}_${Date.now()}`, type: guessedType, size: item.size, color: item.color || '' };
                    }
                    return item;
                });
            }

            if (this.layout.some(w => w.type === 'undefined' || !w.type)) {
                this.layout = defaultLayout;
            }
        }

        startAutoRefresh() {
            this.stopAutoRefresh();
            this.refreshInterval = setInterval(() => {
                if (this.editMode) return; 
                if (document.activeElement && (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT')) return;
                this.refreshAllWidgetsAsynchronously();
            }, 30000); 
        }

        stopAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        }

        async refreshAllWidgetsAsynchronously() {
            const widgetTypesToLoad = [...new Set(this.layout.map(w => w.type))];
            
            this.loadSpecificWidgetData('settings');

            widgetTypesToLoad.forEach(type => {
                if (['welcome', 'upload', 'notes'].includes(type)) return; 
                this.loadSpecificWidgetData(type);
            });
        }

        async loadSpecificWidgetData(widgetType) {
            if (!widgetType || widgetType === 'undefined') return; 

            try {
                const res = await fetch(`/api/dashboard?widget=${widgetType}`);
                if (!res.ok) return;
                const json = await res.json();
                
                if (json.status === 'success') {
                    if (!this.data) this.data = { settings: {} };

                    if (widgetType === 'settings') {
                         this.data.settings = json.data;
                    } else if (widgetType === 'trash') {
                         this.data.trash_count = json.data.trash_count;
                    } else if (widgetType === 'active_links') {
                         this.data.active_shares = json.data.active_shares;
                    } else {
                         this.data[widgetType] = json.data;
                    }

                    this.updateAllInstancesOfWidget(widgetType);
                }
            } catch(e) {
                console.error(`[Dashboard] Failed to lazy load widget: ${widgetType}`, e);
            }
        }

        updateAllInstancesOfWidget(widgetType) {
            const grid = document.getElementById('dashboard-grid');
            if (!grid) return;
            
            const widgetEls = grid.querySelectorAll(`.dashboard-widget[data-type="${widgetType}"]`);
            
            widgetEls.forEach(widgetEl => {
                const id = widgetEl.dataset.id;
                try {
                    if (window.DashboardWidgets && typeof window.DashboardWidgets[widgetType] === 'function') {
                        widgetEl.innerHTML = window.DashboardWidgets[widgetType](this.data, id);
                    }
                    if (window.DashboardWidgets && typeof window.DashboardWidgets[`init_${widgetType}`] === 'function') {
                        window.DashboardWidgets[`init_${widgetType}`](widgetEl, this.data, id);
                    }
                } catch(e) {
                    console.error(`[Dashboard] Silent update failed for instance ${id}`, e);
                }
            });
        }

        updateWidgetSilently(id) {
            const grid = document.getElementById('dashboard-grid');
            if (!grid) return;
            
            const widgetEl = grid.querySelector(`.dashboard-widget[data-id="${id}"]`);
            if (!widgetEl) return;
            
            const type = widgetEl.dataset.type; 
            if (!type) return;

            try {
                if (window.DashboardWidgets && typeof window.DashboardWidgets[type] === 'function') {
                    widgetEl.innerHTML = window.DashboardWidgets[type](this.data, id);
                }
                if (window.DashboardWidgets && typeof window.DashboardWidgets[`init_${type}`] === 'function') {
                    window.DashboardWidgets[`init_${type}`](widgetEl, this.data, id);
                }
            } catch(e) {
                console.error(`[Dashboard] Silent update failed for ${id} (type: ${type})`, e);
            }
        }

        renderLayout() {
            if (!this.data) return;

            const wrapperHtml = `
                <div style="max-width: 1400px; margin: 0 auto; padding: 24px 24px 0 24px; display: flex; justify-content: flex-end; align-items: center;">
                    <button id="btn-toggle-edit-mode" class="${this.editMode ? 'btn-primary' : 'btn-secondary'}" style="background: ${this.editMode ? 'var(--primary)' : 'var(--bg-main)'}; color: ${this.editMode ? 'white' : 'var(--text-main)'}; border: 1px solid ${this.editMode ? 'var(--primary)' : 'var(--border-dropdown)'}; box-shadow: 0 2px 6px rgba(0,0,0,0.05); font-weight: 600; display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${this.editMode ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>'}
                        </svg>
                        <span>${this.editMode ? 'Bewerken Voltooid' : 'Dashboard Bewerken'}</span>
                    </button>
                </div>
                <div style="max-width: 1400px; margin: 0 auto; padding-top: 16px;">
                    <div id="dashboard-edit-toolbar-container"></div>
                    <div id="dashboard-grid" class="dashboard-container-grid ${this.editMode ? 'dashboard-edit-mode' : ''}"></div>
                </div>
            `;
            
            this.container.innerHTML = wrapperHtml;
            const grid = document.getElementById('dashboard-grid');
            const tbContainer = document.getElementById('dashboard-edit-toolbar-container');

            if (this.editMode) {
                this.renderEditToolbar(tbContainer);
            }

            this.layout.forEach(item => {
                const widgetEl = this.createWidgetElement(item);
                if (widgetEl) grid.appendChild(widgetEl);
            });

            const btnEdit = document.getElementById('btn-toggle-edit-mode');
            if (btnEdit) {
                btnEdit.onclick = () => this.toggleEditMode();
            }

            if (this.editMode) {
                this.enableDragAndDrop(grid);
            }
        }

        createWidgetElement(item) {
            const el = document.createElement('div');
            el.className = `dashboard-widget ${item.size || 'widget-1x1'}`;
            el.dataset.id = item.id;
            el.dataset.type = item.type; 
            
            if (item.color && item.color !== '') {
                el.style.backgroundColor = item.color;
            }
            
            try {
                if (window.DashboardWidgets && typeof window.DashboardWidgets[item.type] === 'function') {
                    el.innerHTML = window.DashboardWidgets[item.type](this.data, item.id);
                } else {
                    el.innerHTML = `<div class="widget-content" style="color:var(--error); padding:20px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:10px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Widget module ('${item.type}') ontbreekt!</div>`;
                }
            } catch (err) {
                console.error(`[Dashboard] Crash in widget ${item.id}:`, err);
                el.innerHTML = `<div class="widget-content" style="color:var(--error); padding:20px; text-align:center;">Fout in widget code</div>`;
            }

            setTimeout(() => {
                try {
                    if (window.DashboardWidgets && typeof window.DashboardWidgets[`init_${item.type}`] === 'function') {
                        window.DashboardWidgets[`init_${item.type}`](el, this.data, item.id);
                    }
                } catch(e) { console.error(`[Dashboard] Init crash in widget ${item.id}`, e); }
                
                const sizeBtns = el.querySelectorAll('.size-btn');
                sizeBtns.forEach(btn => {
                    if (btn.dataset.size === item.size) btn.classList.add('active-size');
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        this.handleSpecificResize(item.id, el, btn.dataset.size);
                    };
                });

                const btnDelete = el.querySelector('.widget-control-btn.delete');
                if (btnDelete) {
                    btnDelete.onclick = (e) => {
                        e.stopPropagation();
                        this.handleDelete(item.id, el);
                    };
                }

                const controlsBlock = el.querySelector('.widget-controls');
                if (controlsBlock) {
                    controlsBlock.addEventListener('mousedown', e => e.stopPropagation());
                }

            }, 50);

            return el;
        }

        toggleEditMode() {
            if (!this.editMode) {
                this.originalLayout = JSON.parse(JSON.stringify(this.layout));
            }
            
            this.editMode = !this.editMode;
            if(DEBUG) console.log("[Dashboard] Edit Mode is nu:", this.editMode);
            this.renderLayout(); 

            if (!this.editMode) {
                this.saveLayout(true); 
            }
        }

        renderEditToolbar(container) {
            container.innerHTML = `
                <div class="dashboard-edit-toolbar" style="margin-bottom: 24px; border-radius: 12px; background: var(--bg-hover, rgba(37,99,235,0.05)); border: 1px dashed var(--primary); display: flex; justify-content: space-between; padding: 16px; align-items: center; flex-wrap:wrap; gap:16px;">
                    <div class="edit-toolbar-title" style="color: var(--primary); font-weight: 700; display:flex; align-items:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Gebruik de bolletjes-knop in de widget om hem te verslepen
                    </div>
                    <div class="edit-toolbar-actions" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                        <button id="btn-dash-undo" class="btn-sm btn-secondary" style="border: 1px solid var(--border-dropdown); background: var(--bg-main); color: var(--text-muted); padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer;" title="Wijzigingen ongedaan maken">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                            Herstel
                        </button>
                        <div style="width:1px; height:24px; background:var(--border-dropdown);"></div>
                        <button id="btn-dash-edit-banner" class="btn-sm btn-secondary" style="border: 1px solid var(--border-dropdown); background: var(--bg-main); color: var(--primary); padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            Banner Aanpassen
                        </button>
                        <button id="btn-add-widget-toolbar" class="btn-sm btn-primary" style="background: var(--primary); color: white; border: none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Nieuwe Widget
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('btn-add-widget-toolbar').onclick = () => this.showAddWidgetModal();
            
            const btnBanner = document.getElementById('btn-dash-edit-banner');
            if (btnBanner) {
                btnBanner.onclick = () => {
                    if (window.DashboardWidgets && typeof window.DashboardWidgets.openBannerEditor === 'function') {
                        window.DashboardWidgets.openBannerEditor(this.data);
                    }
                };
            }
            
            document.getElementById('btn-dash-undo').onclick = () => {
                if(DEBUG) console.log("[Dashboard] Undo actie: herstellen naar origineel");
                this.layout = JSON.parse(JSON.stringify(this.originalLayout));
                this.renderLayout();
                if (window.EventBus) window.EventBus.emit('notify:info', 'Layout hersteld naar originele staat.');
            };
        }

        async saveSettings(field, value, instant = false) {
            try {
                if (!this.data.settings) this.data.settings = {};
                this.data.settings[field] = value;
                localStorage.setItem(this.cacheKey, JSON.stringify({ data: this.data, layout: this.layout }));

                if(DEBUG) console.log(`[Dashboard] Settings opslaan - Field: ${field}, Instant: ${instant}`);

                const executeSave = async () => {
                    try {
                        const tokenRes = await fetch('/api/csrf');
                        const tokenData = await tokenRes.json();
                        
                        const res = await fetch('/api/dashboard?action=settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                field: field, 
                                data: value, 
                                csrf_token: tokenData.csrf_token 
                            })
                        });
                        if(DEBUG && !res.ok) console.error("[Dashboard] Settings opslaan API faalde met status", res.status);
                    } catch(e) { console.error('[Dashboard] Save to MySQL failed:', e); }
                };

                if (instant) {
                    executeSave();
                } else {
                    clearTimeout(this.prefSaveTimer);
                    this.prefSaveTimer = setTimeout(executeSave, 800);
                }

            } catch(e) { console.error('[Dashboard] Save settings failed:', e); }
        }

        handleSpecificResize(widgetId, el, newSize) {
            const item = this.layout.find(w => w.id === widgetId);
            if (!item) return;
            
            if(DEBUG) console.log(`[Dashboard] Widget Resize -> ${widgetId} naar ${newSize}`);
            
            const sizes = ['widget-1x1', 'widget-2x1', 'widget-1x2', 'widget-2x2', 'widget-full'];
            sizes.forEach(s => el.classList.remove(s));
            
            el.classList.add(newSize);
            if(el.classList.contains('is-dragging-custom')) el.classList.add('is-dragging-custom');
            
            const btns = el.querySelectorAll('.size-btn');
            btns.forEach(b => b.classList.remove('active-size'));
            const activeBtn = el.querySelector(`.size-btn[data-size="${newSize}"]`);
            if (activeBtn) activeBtn.classList.add('active-size');

            if (window.DashboardWidgets && typeof window.DashboardWidgets[`init_${item.type}`] === 'function') {
                setTimeout(() => window.DashboardWidgets[`init_${item.type}`](el, this.data, item.id), 150);
            }

            this.saveLayout(true); 
        }

        handleDelete(widgetId, el) {
            if (window.ModalService) {
                window.ModalService.confirm('Widget Verwijderen', 'Weet je zeker dat je deze widget wilt weghalen? Je kunt hem later weer toevoegen.', {danger: true, yesText: 'Verwijderen'})
                .then(agreed => {
                    if (agreed) {
                        if(DEBUG) console.log(`[Dashboard] Widget Verwijderen -> ${widgetId}`);
                        this.layout = this.layout.filter(w => w.id !== widgetId);
                        el.style.transform = 'scale(0)';
                        el.style.opacity = '0';
                        setTimeout(() => {
                            el.remove(); 
                            this.saveLayout(true); 
                        }, 300);
                    }
                });
            }
        }

        showAddWidgetModal() {
            const allWidgets = [
                { type: 'welcome', name: 'Welkomstbanner', icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>' },
                { type: 'shortcuts', name: 'Snelle Toegang', icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>' },
                { type: 'upload', name: 'Snel Uploaden', icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>' },
                { type: 'storage', name: 'Opslag Capaciteit', icon: '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>' },
                { type: 'types', name: 'Bestandstypen Chart', icon: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>' },
                { type: 'activity', name: 'Recente Activiteit', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>' },
                { type: 'activity_chart', name: 'Activiteit Grafiek (Line)', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>' },
                { type: 'heatmap', name: 'Activiteit Heatmap (GitHub)', icon: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>' },
                { type: 'notes', name: 'Plaknotities (To-Do)', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>' },
                { type: 'shared_with_me', name: 'Gedeeld met mij', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>' },
                { type: 'trash', name: 'Prullenbak Status', icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' },
                { type: 'bookmarks', name: 'URL Bladwijzers', icon: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>' },
                { type: 'active_links', name: 'Actieve Externe Links', icon: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>' },
                { type: 'top_folders', name: 'Ruimtevretende Mappen', icon: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>' },
                { type: 'file_requests', name: 'Bestandsverzoeken', icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>' },
                { type: 'sys_notices', name: 'Systeem Mededelingen', icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>' }
            ];
            
            const activeTypes = this.layout.map(w => w.type);
            const available = allWidgets.filter(w => !activeTypes.includes(w.type));

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay visible';
            overlay.style.zIndex = '100000';
            
            overlay.addEventListener('mousedown', (e) => {
                if (e.target === overlay) overlay.remove();
            });
            
            let html = `
                <div class="modal-box" style="width: 450px; max-width: 90vw; background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 85vh;">
                    <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); display:flex; justify-content:space-between; align-items:center; background: var(--bg-hover, rgba(128,128,128,0.02)); flex-shrink:0;">
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700;">Kies een Widget</h3>
                        <button class="btn-icon-small" id="btn-close-add-widget" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px; overflow-y:auto; background:var(--bg-main); flex:1;">
            `;
            
            if (available.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted);">Alle beschikbare widgets staan al op je dashboard.</div>`;
            } else {
                available.forEach(w => {
                    html += `
                        <div class="add-widget-item" data-type="${w.type}" style="padding:16px; margin-bottom:8px; background:var(--bg-surface); border:1px solid var(--border-dropdown); border-radius:12px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:12px; transition:all 0.2s;">
                            <div style="width:36px; height:36px; background:var(--primary-light, rgba(37,99,235,0.1)); color:var(--primary); border-radius:8px; display:flex; align-items:center; justify-content:center;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${w.icon}</svg>
                            </div>
                            <span style="flex:1; color:var(--text-main);">${w.name}</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                    `;
                });
            }
            
            html += `</div></div>`;
            overlay.innerHTML = html;
            document.body.appendChild(overlay);
            
            overlay.querySelectorAll('.add-widget-item').forEach(el => {
                el.onmouseover = () => { el.style.borderColor = 'var(--primary)'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)'; };
                el.onmouseout = () => { el.style.borderColor = 'var(--border-dropdown)'; el.style.transform = 'none'; el.style.boxShadow = 'none'; };
                el.onclick = () => {
                    const type = el.dataset.type;
                    const uniqueId = type + '_' + Date.now(); 
                    const newWidget = { 
                        id: uniqueId, 
                        type: type, 
                        size: (type==='welcome'||type==='shortcuts') ? 'widget-full' : 'widget-2x1',
                        color: ''
                    };
                    
                    if(DEBUG) console.log(`[Dashboard] Adding new widget: ${type} (${uniqueId})`);
                    
                    this.layout.push(newWidget);
                    
                    const grid = document.getElementById('dashboard-grid');
                    if (grid) {
                        const widgetEl = this.createWidgetElement(newWidget);
                        if (widgetEl) {
                            grid.appendChild(widgetEl);
                            if (this.editMode) {
                                this.attachDragEventsToWidget(widgetEl);
                            }
                            this.loadSpecificWidgetData(type);
                            this.saveLayout(true); 
                        }
                    }
                    overlay.remove();
                };
            });
            
            overlay.querySelector('#btn-close-add-widget').onclick = () => overlay.remove();
        }

        attachDragEventsToWidget(widget) {
            const handle = widget.querySelector('.widget-drag-handle');
            if (handle) {
                widget.removeAttribute('draggable'); 
                handle.addEventListener('mousedown', this.onPointerDown);
                handle.addEventListener('touchstart', this.onPointerDown, {passive: false});
            }
        }

        enableDragAndDrop(grid) {
            const widgets = grid.querySelectorAll('.dashboard-widget');
            widgets.forEach(widget => this.attachDragEventsToWidget(widget));
        }

        disableDragAndDrop(grid) {
            const handles = grid.querySelectorAll('.widget-drag-handle');
            handles.forEach(handle => {
                handle.removeEventListener('mousedown', this.onPointerDown);
                handle.removeEventListener('touchstart', this.onPointerDown);
            });
        }

        onPointerDown(e) {
            if (!this.editMode) return;
            const handle = e.target.closest('.widget-drag-handle');
            if (!handle) return;
            
            if(e.cancelable) e.preventDefault(); 
            
            const widget = handle.closest('.dashboard-widget');
            const rect = widget.getBoundingClientRect();
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            if(DEBUG) console.log(`[Dashboard] Drag Start - Widget: ${widget.dataset.id}`);

            const ghost = widget.cloneNode(true);
            ghost.classList.add('dashboard-ghost');
            
            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.left = rect.left + 'px';
            ghost.style.top = rect.top + 'px';
            
            document.body.appendChild(ghost);
            
            this.customDragState = {
                active: true,
                el: widget,
                ghost: ghost,
                offsetX: clientX - rect.left,
                offsetY: clientY - rect.top
            };

            widget.classList.add('is-dragging-custom');

            document.addEventListener('mousemove', this.onPointerMove);
            document.addEventListener('touchmove', this.onPointerMove, {passive: false});
            document.addEventListener('mouseup', this.onPointerUp);
            document.addEventListener('touchend', this.onPointerUp);
        }

        onPointerMove(e) {
            if (!this.customDragState.active) return;
            if(e.cancelable) e.preventDefault();
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            this.customDragState.ghost.style.left = (clientX - this.customDragState.offsetX) + 'px';
            this.customDragState.ghost.style.top = (clientY - this.customDragState.offsetY) + 'px';
            
            this.customDragState.ghost.style.visibility = 'hidden';
            const target = document.elementFromPoint(clientX, clientY);
            this.customDragState.ghost.style.visibility = 'visible';
            
            if (!target) return;
            
            const targetWidget = target.closest('.dashboard-widget:not(.dashboard-ghost)');
            if (targetWidget && targetWidget !== this.customDragState.el) {
                const grid = document.getElementById('dashboard-grid');
                const children = Array.from(grid.children);
                const draggedIdx = children.indexOf(this.customDragState.el);
                const targetIdx = children.indexOf(targetWidget);
                
                if (draggedIdx < targetIdx) {
                    targetWidget.parentNode.insertBefore(this.customDragState.el, targetWidget.nextSibling);
                } else {
                    targetWidget.parentNode.insertBefore(this.customDragState.el, targetWidget);
                }
            }
        }

        onPointerUp(e) {
            if (!this.customDragState.active) return;
            
            document.removeEventListener('mousemove', this.onPointerMove);
            document.removeEventListener('touchmove', this.onPointerMove);
            document.removeEventListener('mouseup', this.onPointerUp);
            document.removeEventListener('touchend', this.onPointerUp);
            
            this.customDragState.el.classList.remove('is-dragging-custom');
            this.customDragState.ghost.remove();
            this.customDragState.active = false;
            
            if(DEBUG) console.log("[Dashboard] Drag End - Dropped, triggering saveLayout()");
            this.saveLayout(true); 
        }

        async saveLayout(force = false) {
            const grid = document.getElementById('dashboard-grid');
            if (!grid) return;
            
            const newLayout = Array.from(grid.children).map(w => {
                if (w.style.opacity === '0') return null;

                const item = this.layout.find(i => i.id === w.dataset.id) || this.originalLayout.find(i => i.id === w.dataset.id);
                if (item) {
                    const sizes = ['widget-1x1', 'widget-2x1', 'widget-1x2', 'widget-2x2', 'widget-full'];
                    const currentSize = sizes.find(s => w.classList.contains(s)) || item.size;
                    return { ...item, size: currentSize };
                }
                return null;
            }).filter(Boolean);
            
            if (!force && JSON.stringify(newLayout) === JSON.stringify(this.layout)) {
                if(DEBUG) console.log("[Dashboard] Geen verandering in volgorde of formaat, opslaan overgeslagen.");
                return;
            }
            
            this.layout = newLayout;
            localStorage.setItem(this.cacheKey, JSON.stringify({ data: this.data, layout: this.layout }));

            if(DEBUG) console.log("[Dashboard] Start opslaan naar database...", this.layout);

            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();

                const res = await fetch('/api/dashboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        layout: this.layout, 
                        csrf_token: csrfData.csrf_token 
                    })
                });

                const result = await res.json();
                
                if (res.ok && result.status === 'success') {
                    if(DEBUG) console.log("[Dashboard] Database opslaan geslaagd!");
                    if (window.EventBus) window.EventBus.emit('notify:success', 'Dashboard layout succesvol opgeslagen.');
                } else {
                    throw new Error(result.message || 'Server weigerde de lay-out.');
                }
            } catch (err) {
                console.error("[Dashboard] Database opslaan MISLUKT:", err);
                if (window.EventBus) window.EventBus.emit('notify:error', 'Fout bij opslaan layout (Check Console): ' + err.message);
            }
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.dashboard = new Dashboard();
        
        // FASE F: NATIVE HEATMAP WIDGET INJECTIE
        window.DashboardWidgets = window.DashboardWidgets || {};
        window.DashboardWidgets.heatmap = function(data, instanceId) {
            return `
                <div class="widget-controls" style="z-index: 100;">
                    <div class="size-controls" title="Kies widget formaat">
                        <button class="size-btn" data-size="widget-1x1">1x1</button>
                        <button class="size-btn" data-size="widget-2x1">2x1</button>
                        <button class="size-btn" data-size="widget-1x2">1x2</button>
                        <button class="size-btn" data-size="widget-2x2">2x2</button>
                        <button class="size-btn" data-size="widget-full">Max</button>
                    </div>
                    <div class="widget-actions-right">
                        <div class="widget-drag-handle" title="Versleep widget">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                        </div>
                        <button class="widget-control-btn delete" title="Widget verbergen">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="var(--success, #10b981)" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                        Activiteit Heatmap
                    </div>
                </div>
                <div class="hide-scrollbars" style="flex:1; overflow-x:auto; padding: 16px; display:flex; align-items:center;">
                    <div id="heatmap-container-${instanceId}" style="display:flex; gap:3px;"></div>
                </div>
            `;
        };

        window.DashboardWidgets.init_heatmap = function(el, data, instanceId) {
            const container = el.querySelector(`#heatmap-container-${instanceId}`);
            if (!container || !data.heatmap) return;
            
            const heatmapData = data.heatmap || [];
            const countsByDate = {};
            let maxCount = 1;
            heatmapData.forEach(d => {
                countsByDate[d.date] = d.count;
                if(d.count > maxCount) maxCount = d.count;
            });

            let html = '';
            const today = new Date();
            let currentDay = new Date(today);
            currentDay.setDate(currentDay.getDate() - 364);

            let cols = [];
            for (let c = 0; c < 52; c++) {
                let colHtml = '<div style="display:flex; flex-direction:column; gap:3px;">';
                for (let r = 0; r < 7; r++) {
                    const dateStr = currentDay.toISOString().split('T')[0];
                    const count = countsByDate[dateStr] || 0;
                    
                    // FASE 4 FIX: Dynamische kleuren gebruikt voor de vakjes
                    let bg = 'var(--border-dropdown, rgba(128,128,128,0.1))';
                    if (count > 0) {
                        const intensity = Math.max(0.2, count / maxCount);
                        // Behoud de specifieke groene tint, maar met dynamische opacity
                        bg = `rgba(16, 185, 129, ${intensity})`; 
                    }
                    
                    colHtml += `<div style="width:10px; height:10px; border-radius:2px; background:${bg}; cursor:pointer;" title="${dateStr}: ${count} acties"></div>`;
                    currentDay.setDate(currentDay.getDate() + 1);
                    if (currentDay > today) break;
                }
                colHtml += '</div>';
                cols.push(colHtml);
            }
            container.innerHTML = cols.join('');
        };
    });
})();