/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/Hotkeys.js */

class Hotkeys {
    constructor() {
        this.isMuted = false;
        this.injectStyles();
        this.initListeners();
    }

    injectStyles() {
        if (document.getElementById('hotkeys-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'hotkeys-dynamic-styles';
        style.innerHTML = `
            /* Zen Mode Styling */
            body.zen-mode #sidebar { transform: translateX(-100%); display: none !important; }
            body.zen-mode #main-header { transform: translateY(-100%); display: none !important; }
            body.zen-mode .main-content { margin-left: 0 !important; margin-top: 0 !important; height: 100vh !important; }
            body.zen-mode #main-toolbar { top: 0 !important; border-radius: 0 !important; }
            
            /* Cheat Sheet Overlay */
            .hotkey-cheatsheet-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px);
                z-index: 999999; display: flex; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.2s ease; pointer-events: none;
            }
            .hotkey-cheatsheet-overlay.visible { opacity: 1; pointer-events: auto; }
            .hotkey-cheatsheet {
                background: var(--bg-dropdown); border: 1px solid var(--border-dropdown);
                border-radius: 16px; width: 700px; max-width: 90%; max-height: 80vh;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display: flex; flex-direction: column;
                transform: translateY(20px); transition: transform 0.2s ease; overflow: hidden;
            }
            .hotkey-cheatsheet-overlay.visible .hotkey-cheatsheet { transform: translateY(0); }
            .hotkey-header { padding: 20px 24px; border-bottom: 1px solid var(--border-dropdown); display: flex; justify-content: space-between; align-items: center; background: rgba(128,128,128,0.02); }
            .hotkey-body { padding: 24px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
            .hotkey-category { margin-bottom: 24px; }
            .hotkey-category h4 { margin: 0 0 16px 0; color: var(--primary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            .hotkey-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.9rem; color: var(--text-main); }
            .kbd-badge { background: var(--bg-main); border: 1px solid var(--border-dropdown); padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); box-shadow: 0 2px 0 var(--border-dropdown); }
        `;
        document.head.appendChild(style);
    }

    canExecuteHotkey(e) {
        if (e.key !== 'Escape' && document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return false;
        }
        
        if (e.key !== 'Escape') {
            if (window.ModalService && typeof window.ModalService.isOpen === 'function' && window.ModalService.isOpen()) return false;
            
            const hasModal = document.querySelector('.modal-overlay.visible, #admin-modal-container .admin-modal-overlay, .lightbox.visible');
            if (hasModal) return false;
        }

        return true;
    }

    initListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.canExecuteHotkey(e)) return;

            // -----------------------------------------------------------------
            // 1. SLIMME ESCAPE (Waterval logica)
            // -----------------------------------------------------------------
            if (e.key === 'Escape') {
                e.preventDefault();
                
                const cs = document.getElementById('hotkey-cheatsheet-overlay');
                if (cs && cs.classList.contains('visible')) {
                    cs.classList.remove('visible');
                    setTimeout(() => cs.remove(), 200);
                    return;
                }

                const cm = document.getElementById('context-menu-root');
                if (cm && cm.classList.contains('visible')) {
                    if (window.App && window.App.contextMenu) window.App.contextMenu.close();
                    return;
                }

                const modal = document.querySelector('.modal-overlay.visible, #admin-modal-container .admin-modal-overlay');
                if (modal) {
                    const closeBtn = modal.querySelector('.close-btn, #btn-close-modal, .cancel-btn');
                    if (closeBtn) closeBtn.click();
                    else modal.remove();
                    return;
                }

                if (window.App && window.App.propertiesPanel && window.App.propertiesPanel.panel && window.App.propertiesPanel.panel.classList.contains('visible')) {
                    window.App.propertiesPanel.close();
                    return;
                }

                if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                    document.activeElement.blur();
                    return;
                }

                if (window.App && window.App.selectionManager && window.App.selectionManager.selectedItems.size > 0) {
                    window.App.selectionManager.clearSelection();
                    return;
                }
                return;
            }

            // -----------------------------------------------------------------
            // 2. NAVIGATIE & UI HOTKEYS
            // -----------------------------------------------------------------
            if (e.ctrlKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('spotlight-search');
                if (searchInput) searchInput.focus();
                return;
            }

            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                const btn = document.getElementById('btn-toggle-sidebar');
                if (btn) btn.click();
                return;
            }

            if (e.altKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                document.body.classList.toggle('zen-mode');
                if (window.EventBus) window.EventBus.emit('notify:info', document.body.classList.contains('zen-mode') ? 'Zen Mode Actief' : 'Zen Mode Uitgeschakeld');
                setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
                return;
            }

            if (e.ctrlKey && (e.key === '=' || e.key === '+' || e.key === '-')) {
                e.preventDefault();
                if (window.App && window.App.renderEngine && window.ViewState) {
                    const ctx = window.App.renderEngine.getContextKey();
                    let currentZoom = parseInt(window.ViewState.get(ctx).zoom || 150, 10);
                    if (e.key === '-border' || e.key === '-') currentZoom = Math.max(80, currentZoom - 20);
                    else currentZoom = Math.min(300, currentZoom + 20);
                    
                    window.ViewState.setZoom(ctx, currentZoom);
                    document.documentElement.style.setProperty('--zoom-level', `${currentZoom}px`);
                }
                return;
            }

            if (e.shiftKey && e.key === '?') {
                e.preventDefault();
                this.showCheatSheet();
                return;
            }

            if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                this.isMuted = !this.isMuted;
                if (window.EventBus) window.EventBus.emit('notify:info', this.isMuted ? 'Systeem Audio Gedempt' : 'Systeem Audio Actief');
                return;
            }

            // -----------------------------------------------------------------
            // 3. SELECTIE & INFO HOTKEYS
            // -----------------------------------------------------------------
            if (e.ctrlKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                if (window.App && window.App.contextMenu) {
                    window.App.contextMenu.activeType = 'whitespace'; 
                    window.App.contextMenu.executeAction('select_all');
                }
                return;
            }

            const getSelectedIds = () => {
                if (window.App && window.App.selectionManager) {
                    return Array.from(window.App.selectionManager.selectedItems.keys());
                }
                return [];
            };

            const setupContextMenuContext = (ids) => {
                if (window.App && window.App.contextMenu) {
                    window.App.contextMenu.activeIds = ids;
                    window.App.contextMenu.activeId = ids[0];
                    window.App.contextMenu.activeType = 'file'; 
                }
            };

            if (e.ctrlKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length === 1) {
                    setupContextMenuContext(ids);
                    window.App.contextMenu.executeAction('properties');
                } else if (ids.length > 1 && window.EventBus) {
                    window.EventBus.emit('notify:info', 'Eigenschappen werken momenteel per 1 bestand.');
                }
                return;
            }

            if (e.key === ' ' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length === 1) {
                    setupContextMenuContext(ids);
                    window.App.contextMenu.executeAction('preview');
                }
                return;
            }

            if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length > 0 && window.App && window.App.itemActions) {
                    ids.forEach(id => {
                        let type = 'file';
                        const el = document.querySelector(`.grid-tile[data-id="${id}"], .list-row[data-id="${id}"], .masonry-tile[data-id="${id}"]`);
                        if (el && el.dataset && el.dataset.type) type = el.dataset.type;
                        window.App.itemActions.toggleFavorite(id, type);
                    });
                }
                return;
            }

            // -----------------------------------------------------------------
            // 4. BESTANDSBEHEER (CRUD) HOTKEYS
            // -----------------------------------------------------------------
            if (e.key === 'F2') {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length === 1) {
                    setupContextMenuContext(ids);
                    const el = document.querySelector(`.grid-tile[data-id="${ids[0]}"], .list-row[data-id="${ids[0]}"]`);
                    if (el) window.App.contextMenu.activeTarget = el;
                    window.App.contextMenu.executeAction('rename');
                }
                return;
            }

            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                if (window.App && window.App.contextMenu) {
                    window.App.contextMenu.activeType = 'whitespace';
                    window.App.contextMenu.executeAction('new_folder');
                }
                return;
            }

            if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length > 0) {
                    setupContextMenuContext(ids);
                    window.App.contextMenu.executeAction('copy');
                }
                return;
            }

            if (e.key === 'Delete' && !e.shiftKey) {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length > 0) {
                    setupContextMenuContext(ids);
                    const mode = window.App.renderEngine ? window.App.renderEngine.currentMode : 'folder';
                    
                    if (mode === 'album_detail') {
                        window.App.contextMenu.executeAction('remove_from_album');
                    } else if (mode === 'tag_detail') {
                        window.App.contextMenu.executeAction('remove_from_tag');
                    } else if (mode === 'trash') {
                        // Niets doen
                    } else {
                        window.App.contextMenu.executeAction('delete');
                    }
                }
                return;
            }

            if (e.shiftKey && e.key === 'Delete') {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length > 0) {
                    setupContextMenuContext(ids);
                    window.App.contextMenu.executeAction('force_delete');
                }
                return;
            }

            // -----------------------------------------------------------------
            // 5. KLEMBORD (CLIPBOARD MANAGER) HOTKEYS
            // -----------------------------------------------------------------
            if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                const ids = getSelectedIds();
                if (ids.length > 0) {
                    e.preventDefault();
                    localStorage.setItem('fm_clipboard', JSON.stringify({ action: 'copy', items: ids }));
                    if (window.EventBus) {
                        window.EventBus.emit('clipboard:updated');
                        window.EventBus.emit('notify:info', `${ids.length} item(s) gekopieerd naar klembord`);
                    }
                }
                return;
            }

            if (e.ctrlKey && e.key.toLowerCase() === 'x') {
                const ids = getSelectedIds();
                if (ids.length > 0) {
                    e.preventDefault();
                    localStorage.setItem('fm_clipboard', JSON.stringify({ action: 'cut', items: ids }));
                    if (window.EventBus) {
                        window.EventBus.emit('clipboard:updated');
                        window.EventBus.emit('notify:info', `${ids.length} item(s) geknipt naar klembord`);
                    }
                    
                    ids.forEach(id => {
                        const el = document.querySelector(`.grid-tile[data-id="${id}"], .list-row[data-id="${id}"]`);
                        if (el) { el.style.opacity = '0.5'; el.style.filter = 'grayscale(50%)'; }
                    });
                }
                return;
            }

            if (e.ctrlKey && e.key.toLowerCase() === 'v') {
                if (document.activeElement && document.activeElement.id === 'spotlight-search') return;
                
                e.preventDefault();
                this.pasteFromClipboard();
                return;
            }

            // -----------------------------------------------------------------
            // 6. TAGS (QUICK ASSIGN)
            // -----------------------------------------------------------------
            if (e.altKey && ['1','2','3'].includes(e.key)) {
                e.preventDefault();
                const ids = getSelectedIds();
                if (ids.length === 0) return;

                if (window.App && window.App.tagManager && window.App.tagManager.availableTags) {
                    const tagIndex = parseInt(e.key) - 1;
                    const targetTag = window.App.tagManager.availableTags[tagIndex];
                    if (targetTag) {
                        setupContextMenuContext(ids);
                        window.App.contextMenu.executeAction('tag_toggle', targetTag.name);
                    } else {
                        if (window.EventBus) window.EventBus.emit('notify:warning', `Geen label gevonden op positie ${e.key}.`);
                    }
                }
            }

        }, true); // Gebruik capture-phase (true) zodat we de Delete-toets afvangen vóór andere scripts!
    }

    async pasteFromClipboard() {
        const clipStr = localStorage.getItem('fm_clipboard');
        if (!clipStr) {
            if (window.EventBus) window.EventBus.emit('notify:warning', 'Klembord is leeg.');
            return;
        }

        let clipData;
        try { clipData = JSON.parse(clipStr); } catch (e) { return; }
        if (!clipData || !clipData.items || clipData.items.length === 0) return;

        if (window.App && window.App.renderEngine && typeof window.App.renderEngine.hasPerm === 'function') {
            if (!window.App.renderEngine.hasPerm('item_move')) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Je mist de benodigde rechten om bestanden te verplaatsen/kopiëren.');
                return;
            }
        }

        const currentFolderId = (window.App && window.App.renderEngine) ? window.App.renderEngine.currentFolderId : null;
        const currentMode = (window.App && window.App.renderEngine) ? window.App.renderEngine.currentMode : 'folder';

        if (currentMode !== 'folder' && currentMode !== 'root') {
            if (window.EventBus) window.EventBus.emit('notify:error', 'Je kunt hier niets plakken.');
            return;
        }

        try {
            const resToken = await fetch('/api/csrf');
            const dataToken = await resToken.json();
            const endpoint = clipData.action === 'cut' ? '/api/files/move' : '/api/files/copy';
            
            let success = 0;
            for (const id of clipData.items) {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'file', id: id, new_folder_id: currentFolderId, csrf_token: dataToken.csrf_token })
                });
                if (res.ok) success++;
            }

            if (success > 0) {
                if (window.EventBus) {
                    const actieWoord = clipData.action === 'cut' ? 'verplaatst' : 'geplakt';
                    window.EventBus.emit('notify:success', `${success} item(s) succesvol ${actieWoord}!`);
                    window.EventBus.emit('view:refresh');
                }
                if (clipData.action === 'cut') {
                    localStorage.removeItem('fm_clipboard');
                    if (window.EventBus) window.EventBus.emit('clipboard:updated');
                }
            } else {
                throw new Error("Plakken mislukt.");
            }

        } catch (err) {
            if (window.EventBus) window.EventBus.emit('notify:error', 'Systeemfout tijdens het plakken.');
            console.error(err);
        }
    }

    showCheatSheet() {
        if (document.getElementById('hotkey-cheatsheet-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'hotkey-cheatsheet-overlay';
        overlay.className = 'hotkey-cheatsheet-overlay';
        
        overlay.innerHTML = `
            <div class="hotkey-cheatsheet" onclick="event.stopPropagation()">
                <div class="hotkey-header">
                    <h3 style="margin:0; color:var(--text-main); font-weight:800; font-size:1.4rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:8px; color:var(--primary);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Sneltoetsen (Cheat Sheet)
                    </h3>
                    <button class="btn-icon-small close-btn" style="background:none; border:none; font-size:1.5rem; color:var(--text-muted); cursor:pointer;">&times;</button>
                </div>
                <div class="hotkey-body">
                    
                    <div class="hotkey-category">
                        <h4>Bestandsbeheer</h4>
                        <div class="hotkey-row"><span>Hernoemen</span> <span class="kbd-badge">F2</span></div>
                        <div class="hotkey-row"><span>Nieuwe Map</span> <span class="kbd-badge">Ctrl + Shift + N</span></div>
                        <div class="hotkey-row"><span>Dupliceren</span> <span class="kbd-badge">Ctrl + D</span></div>
                        <div class="hotkey-row"><span>Verplaats naar Prullenbak</span> <span class="kbd-badge">Del</span></div>
                        <div class="hotkey-row"><span>Definitief Wissen</span> <span class="kbd-badge">Shift + Del</span></div>
                    </div>

                    <div class="hotkey-category">
                        <h4>Navigatie & UI</h4>
                        <div class="hotkey-row"><span>Zoeken in Spotlight</span> <span class="kbd-badge">Ctrl + F</span></div>
                        <div class="hotkey-row"><span>Zijbalk In/Uitklappen</span> <span class="kbd-badge">Alt + S</span></div>
                        <div class="hotkey-row"><span>Zen Mode Activeren</span> <span class="kbd-badge">Alt + Z</span></div>
                        <div class="hotkey-row"><span>Zoom In / Uit (Tegels)</span> <span class="kbd-badge">Ctrl + +/-</span></div>
                        <div class="hotkey-row"><span>Alles Sluiten</span> <span class="kbd-badge">Esc</span></div>
                    </div>

                    <div class="hotkey-category">
                        <h4>Selectie & Info</h4>
                        <div class="hotkey-row"><span>Selecteer Alles</span> <span class="kbd-badge">Ctrl + A</span></div>
                        <div class="hotkey-row"><span>Favoriet Togglen</span> <span class="kbd-badge">S</span></div>
                        <div class="hotkey-row"><span>Eigenschappen Paneel</span> <span class="kbd-badge">Ctrl + I</span></div>
                        <div class="hotkey-row"><span>Top 3 Labels Toewijzen</span> <span class="kbd-badge">Alt + 1 / 2 / 3</span></div>
                    </div>

                    <div class="hotkey-category">
                        <h4>Media & Overig</h4>
                        <div class="hotkey-row"><span>Quick Look (Voorbeeld)</span> <span class="kbd-badge">Space</span></div>
                        <div class="hotkey-row"><span>Kopiëren (Klembord)</span> <span class="kbd-badge">Ctrl + C</span></div>
                        <div class="hotkey-row"><span>Plakken (Klembord)</span> <span class="kbd-badge">Ctrl + V</span></div>
                        <div class="hotkey-row"><span>Deze Help Tonen</span> <span class="kbd-badge">Shift + ?</span></div>
                    </div>

                </div>
                <div style="background:var(--primary); color:white; padding:12px; text-align:center; font-size:0.85rem; font-weight:600;">
                    Tip: Alle sneltoetsen worden uitgeschakeld zodra je typt of een pop-up opent.
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add('visible'));

        overlay.querySelector('.close-btn').onclick = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 200);
        };
        overlay.onclick = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 200);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.App = window.App || {};
    window.App.hotkeys = new Hotkeys();
});