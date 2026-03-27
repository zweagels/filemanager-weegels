/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Organization | FILE: public/js/modules/organization/Albums.js */

class AlbumManager {
    constructor() {
        this.albums = [];
        this.pollingInterval = null;
        this.injectStyles();
        this.initListeners();
    }

    injectStyles() {
        if (document.getElementById('albums-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'albums-dynamic-styles';
        style.innerHTML = `
            /* Polaroid Stijl voor Album Overzicht (Fase 6) */
            .album-polaroid {
                background: #ffffff;
                padding: 12px 12px 24px 12px;
                border-radius: 4px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                cursor: pointer;
                display: flex;
                flex-direction: column;
                position: relative;
                border: 1px solid rgba(0,0,0,0.05);
            }
            .theme-dark .album-polaroid {
                background: var(--bg-surface);
                border: 1px solid var(--border-dropdown);
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .album-polaroid:hover {
                transform: translateY(-8px) rotate(1.5deg) scale(1.02);
                box-shadow: 0 20px 30px rgba(0,0,0,0.15);
                z-index: 10;
            }
            .album-polaroid-cover {
                width: 100%;
                aspect-ratio: 1 / 1;
                object-fit: cover;
                border-radius: 2px;
                margin-bottom: 16px;
                background: rgba(128,128,128,0.05);
            }
            .album-polaroid-title {
                font-family: 'Inter', sans-serif;
                font-weight: 800;
                font-size: 1.05rem;
                text-align: center;
                color: var(--text-main);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .album-polaroid-meta {
                font-size: 0.75rem;
                font-weight: 600;
                text-align: center;
                color: var(--text-muted);
                margin-top: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .album-actions {
                position: absolute;
                top: 18px;
                right: 18px;
                display: flex;
                gap: 6px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .album-polaroid:hover .album-actions {
                opacity: 1;
            }

            /* Premium Tile Styles voor Koppel Modal */
            .album-file-tile {
                background: var(--bg-surface);
                border: 2px solid var(--border-dropdown);
                border-radius: 12px;
                padding: 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.15s ease;
                position: relative;
                user-select: none;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .album-file-tile:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 15px rgba(0,0,0,0.08);
            }
            .album-file-tile.is-linked {
                border-color: var(--primary);
                background: rgba(37,99,235,0.03);
            }
            .album-file-tile.selected {
                border-color: var(--primary) !important;
                background: rgba(37,99,235,0.15) !important;
                box-shadow: 0 0 0 3px rgba(37,99,235,0.3) !important;
                transform: scale(0.98);
            }
            .linked-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: var(--primary);
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                z-index: 10;
                border: 2px solid var(--bg-main);
            }

            /* FASE D: Live Avatars, ZIP & Pincode */
            .album-enhanced-header { max-width: 1400px; margin: 0 auto 24px auto; padding: 24px 30px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); border-bottom: 1px solid var(--border-dropdown); border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); animation: fadeIn 0.3s ease; }
            .album-enhanced-title { font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 12px; }
            .album-enhanced-actions { display: flex; align-items: center; gap: 16px; }
            
            .live-avatars-container { display: flex; align-items: center; }
            .live-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--bg-surface); background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; margin-left: -12px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: transform 0.2s; position: relative; }
            .live-avatar:hover { transform: translateY(-4px); z-index: 10; }
            .live-avatar:first-child { margin-left: 0; }
            
            .btn-download-zip { background: rgba(37,99,235,0.1); color: var(--primary); border: 1px solid rgba(37,99,235,0.2); padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
            .btn-download-zip:hover { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

            .pin-input-wrapper { display: flex; justify-content: center; gap: 12px; margin: 24px 0; }
            .pin-digit { width: 50px; height: 60px; font-size: 1.8rem; text-align: center; border: 2px solid var(--border-dropdown); border-radius: 12px; background: var(--bg-main); color: var(--text-main); outline: none; transition: all 0.2s; font-family: monospace; font-weight: bold; }
            .pin-digit:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(37,99,235,0.15); transform: translateY(-2px); }
        `;
        document.head.appendChild(style);
    }

    initListeners() {
        if (window.EventBus) {
            window.EventBus.on('album:assign', (fileIds) => {
                const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
                this.showModal(ids);
            });
            window.EventBus.on('album:add_files', (albumId) => this.showAddFilesModal(albumId));
            window.EventBus.on('album:edit', (albumId) => this.showEditModal(albumId));
            window.EventBus.on('albums:render_overview', (container) => this.renderOverview(container));
            
            // FASE D: Haak in op de render:complete van Render.js om de Album Header en Pincode te injecteren
            window.EventBus.on('render:complete', () => {
                this.handleAlbumRenderHook();
            });

            // FASE D: Stop polling als we weg navigeren uit een album
            window.EventBus.on('navigation:navigate', (path) => {
                if (!path || !path.startsWith('album_')) {
                    this.stopAvatarPolling();
                }
            });
        }
    }

    async fetchAlbums() {
        try {
            const res = await fetch('/api/albums');
            const json = await res.json();
            if (json.status === 'success') {
                this.albums = json.data;
                return this.albums;
            }
        } catch (e) {
            console.error("Albums laden mislukt", e);
        }
        return [];
    }

    // ============================================================================
    // FASE D: ALBUM HEADER INJECTIE & SMART POLLING (LIVE AVATARS)
    // ============================================================================

    handleAlbumRenderHook() {
        if (!window.App || !window.App.renderEngine) return;
        
        const isAlbumMode = window.App.renderEngine.currentMode === 'album_detail';
        const albumId = window.App.renderEngine.currentAlbumId;
        const data = window.App.renderEngine.currentData;

        if (!isAlbumMode || !albumId) {
            this.stopAvatarPolling();
            return;
        }

        // 1. Is het album vergrendeld via Pincode?
        if (data && data.status === 'locked') {
            this.showPincodeChallenge(albumId);
            return;
        }

        // 2. Het is een succesvol geopend album: Teken de Enhanced Header!
        if (data && data.album) {
            this.injectAlbumHeader(albumId, data.album);
            this.startAvatarPolling(albumId);
        }
    }

    injectAlbumHeader(albumId, album) {
        const container = document.getElementById('file-view');
        if (!container) return;

        // Verwijder oude header indien aanwezig om duplicaten te voorkomen
        const oldHeader = document.getElementById('album-enhanced-header');
        if (oldHeader) oldHeader.remove();

        const headerHtml = `
            <div id="album-enhanced-header" class="album-enhanced-header">
                <h1 class="album-enhanced-title">
                    <div style="width:20px; height:20px; border-radius:50%; background:${album.color || 'var(--primary)'}; box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>
                    ${album.name}
                </h1>
                <div class="album-enhanced-actions">
                    <div id="album-live-avatars" class="live-avatars-container"></div>
                    <button id="btn-album-zip-download" class="btn-download-zip" title="Download dit album als ZIP">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download Album
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('afterbegin', headerHtml);

        const btnZip = document.getElementById('btn-album-zip-download');
        if (btnZip) {
            btnZip.onclick = () => {
                if (window.EventBus) window.EventBus.emit('notify:info', 'Bezig met inpakken... Een moment geduld a.u.b.');
                window.location.href = `/api/files?action=zip&type=album&id=${albumId}`;
            };
        }
    }

    startAvatarPolling(albumId) {
        this.stopAvatarPolling();
        this.pollAvatars(albumId);
        this.pollingInterval = setInterval(() => this.pollAvatars(albumId), 10000); // Smart Polling (Elke 10s)
    }

    stopAvatarPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async pollAvatars(albumId) {
        if (!window.App || !window.App.renderEngine) return;
        if (window.App.renderEngine.currentMode !== 'album_detail' || window.App.renderEngine.currentAlbumId !== albumId) {
            this.stopAvatarPolling();
            return;
        }
        try {
            const res = await fetch(`/api/files?action=album_ping&album_id=${albumId}`);
            if (res.ok) {
                const json = await res.json();
                if (json.status === 'success') {
                    this.renderAvatars(json.data);
                }
            }
        } catch(e) {}
    }

    renderAvatars(users) {
        const container = document.getElementById('album-live-avatars');
        if (!container) return;

        // Als alleen jij er bent, tonen we niets (hou de UI rustig)
        if (!users || users.length <= 1) { 
            container.innerHTML = '';
            return;
        }

        let html = '';
        users.forEach(user => {
            const initial = user.first_name ? user.first_name.charAt(0).toUpperCase() : '?';
            const color = user.id === window.currentUser?.id ? 'var(--primary)' : '#10b981';
            html += `<div class="live-avatar" style="background:${color};" title="${user.first_name || 'Gebruiker'} kijkt momenteel mee">${initial}</div>`;
        });
        container.innerHTML = html;
    }

    // ============================================================================
    // FASE D: PINCODE UITDAGING UI
    // ============================================================================

    showPincodeChallenge(albumId) {
        const container = document.getElementById('file-view');
        if (!container) return;

        // Wis de pagina en toon de beveiligde modal
        container.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height: 70vh;">
                <div class="modal-box" style="width: 420px; background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 16px; text-align:center; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); animation: slideInFade 0.4s ease;">
                    <div style="width: 72px; height: 72px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <h2 style="margin:0 0 10px 0; color:var(--text-main); font-weight:800;">Beveiligd Album</h2>
                    <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:24px;">Dit album is afgeschermd door de eigenaar. Voer de pincode in om toegang te krijgen.</p>
                    
                    <div class="pin-input-wrapper">
                        <input type="password" maxlength="1" class="pin-digit" autofocus>
                        <input type="password" maxlength="1" class="pin-digit">
                        <input type="password" maxlength="1" class="pin-digit">
                        <input type="password" maxlength="1" class="pin-digit">
                    </div>
                    
                    <div style="display:flex; justify-content:center; gap:12px; margin-top:24px;">
                        <button id="btn-pin-cancel" class="btn-modal btn-secondary" style="padding:10px 24px; border-radius:8px; font-weight:600;">Terug</button>
                        <button id="btn-pin-submit" class="btn-modal btn-primary" style="padding:10px 24px; border-radius:8px; font-weight:600;">Ontgrendelen</button>
                    </div>
                </div>
            </div>
        `;

        const inputs = container.querySelectorAll('.pin-digit');
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                    inputs[index - 1].focus();
                } else if (e.key === 'Enter') {
                    submitPin();
                }
            });
        });

        const submitPin = async () => {
            let pin = '';
            inputs.forEach(i => pin += i.value);
            if (pin.length < 4) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Voer de volledige 4-cijferige code in.');
                return;
            }

            const btn = container.querySelector('#btn-pin-submit');
            btn.disabled = true;
            btn.textContent = 'Controleren...';

            try {
                let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                if (!csrfToken) {
                    const tokenRes = await fetch('/api/csrf');
                    const tokenData = await tokenRes.json();
                    csrfToken = tokenData.csrf_token;
                }

                const res = await fetch('/api/files', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ action: 'verify_pincode', album_id: albumId, pincode: pin, csrf_token: csrfToken })
                });
                const data = await res.json();

                if (res.ok && data.status === 'success') {
                    if (window.EventBus) {
                        window.EventBus.emit('notify:success', 'Toegang verleend!');
                        window.EventBus.emit('view:refresh'); // Herlaad Render.js nu MET de geactiveerde sessie!
                    }
                } else {
                    throw new Error(data.message);
                }
            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', e.message);
                inputs.forEach(i => i.value = '');
                inputs[0].focus();
                btn.disabled = false;
                btn.textContent = 'Ontgrendelen';
            }
        };

        container.querySelector('#btn-pin-submit').onclick = submitPin;
        container.querySelector('#btn-pin-cancel').onclick = () => {
            if (window.EventBus) window.EventBus.emit('navigation:navigate', 'albums_overview');
        };
    }

    // ============================================================================
    // OUDE MODALS & WEERGAVEN (Behouden, incl. toevoeging Pincode bij Create)
    // ============================================================================

    async showModal(fileIds = []) {
        const isManageMode = (fileIds.length === 0);
        const modalTitle = isManageMode ? 'Mijn Albums Beheren' : 'Koppel aan Album';
        let filePreviewHtml = '';

        if (!isManageMode && fileIds.length === 1) {
            try {
                const resF = await fetch(`/api/properties?type=file&id=${fileIds[0]}`);
                const dataF = await resF.json();
                if (dataF.status === 'success') {
                    const f = dataF.data;
                    const isImg = ['jpg','jpeg','png','gif','webp'].includes(f.extension?.toLowerCase());
                    let thumbHtml = `<div style="width:40px; height:40px; background:rgba(37,99,235,0.1); color:var(--primary); border-radius:8px; display:flex; align-items:center; justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></div>`;
                    if (isImg) {
                        let dateStr = f.updated_at || f.created_at || '';
                        if (typeof dateStr === 'string') dateStr = dateStr.replace(' ', 'T');
                        const t = dateStr ? new Date(dateStr).getTime() : Date.now();
                        thumbHtml = `<img src="/api/files?action=thumb&id=${f.id}&t=${t}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; border:1px solid rgba(0,0,0,0.1);">`;
                    }
                    filePreviewHtml = `<div style="padding:16px 24px; background:var(--bg-surface); border-bottom:1px solid var(--border-dropdown); display:flex; align-items:center; gap:16px;">${thumbHtml}<div style="flex:1; overflow:hidden;"><div style="font-weight:600; color:var(--text-main); font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name || f.original_name}</div><div style="font-size:0.8rem; color:var(--text-muted);">${f.formatted_size} • ${f.extension?.toUpperCase() || 'BESTAND'}</div></div></div>`;
                }
            } catch (e) { console.error(e); }
        }

        const existing = document.getElementById('album-manager-modal-unique');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'album-manager-modal-unique';
        overlay.className = 'modal-overlay visible';
        overlay.style.setProperty('z-index', '8000', 'important');
        
        let currentColor = '#3b82f6';
        let currentIcon = 'none';

        overlay.innerHTML = `
            <div class="modal-box" style="width: 500px; max-width: 95vw; background: var(--bg-main); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; max-height: 85vh;">
                <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">${modalTitle}</h3>
                    <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                ${filePreviewHtml}
                <div style="padding:20px 24px; background:rgba(37, 99, 235, 0.03); border-bottom:1px solid var(--border-dropdown);">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:12px;">Nieuw Album Maken</div>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <input type="text" id="new-album-name" placeholder="Naam van album..." style="width:100%; padding:10px 14px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-dropdown); color:var(--text-main); outline:none;">
                        <div style="display:flex; gap:12px;">
                            <button id="btn-pick-color" class="btn-secondary" style="flex:1; justify-content:center; display:flex; align-items:center; gap:8px;">
                                <span id="color-indicator" style="width:14px; height:14px; border-radius:50%; background:${currentColor}; border:1px solid rgba(0,0,0,0.1);"></span> Kleur
                            </button>
                            <button id="btn-pick-icon" class="btn-secondary" style="flex:1; justify-content:center; display:flex; align-items:center; gap:8px;">
                                <span id="icon-indicator">✨</span> Icoon
                            </button>
                            <button id="btn-create-album" class="btn-primary" style="padding:0 24px;">Maken</button>
                        </div>
                    </div>
                </div>
                <div id="album-list-container" style="flex:1; overflow-y:auto; padding:16px 24px;">
                    <div style="text-align:center; padding: 40px;"><div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.querySelector('.close-btn').onclick = () => overlay.remove();

        overlay.querySelector('#btn-pick-color').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.colorPicker) {
                const c = await window.App.colorPicker.show(currentColor);
                if (c) { currentColor = c; document.getElementById('color-indicator').style.background = c; }
            }
        };

        overlay.querySelector('#btn-pick-icon').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.iconPicker) {
                const i = await window.App.iconPicker.show(currentIcon);
                if (i) { currentIcon = i; document.getElementById('icon-indicator').innerHTML = '✅'; }
            }
        };

        const loadAlbums = async () => {
            const list = overlay.querySelector('#album-list-container');
            const data = await this.fetchAlbums();
            
            if (data.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Je hebt nog geen albums.</div>`;
            } else {
                let html = `<div style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:12px;">Bestaande albums</div>`;
                data.forEach(album => {
                    const actionBtn = isManageMode 
                        ? `<button class="btn-icon-tiny delete-album-btn" style="color:var(--error); background:rgba(239,68,68,0.1); padding:6px; border-radius:6px;" title="Verwijderen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`
                        : `<button class="btn-sm btn-secondary assign-btn" style="pointer-events:none;">Koppelen</button>`;
                    
                    html += `<div class="album-item" data-id="${album.id}" data-name="${album.name}" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border:1px solid var(--border-dropdown); border-radius:10px; margin-bottom:8px; cursor:pointer; background:var(--bg-dropdown); transition:all 0.2s;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <span style="width:14px; height:14px; border-radius:50%; background:${album.color || 'var(--primary)'}; box-shadow:0 2px 4px rgba(0,0,0,0.2);"></span>
                                    <span style="font-weight:600; color:var(--text-main); font-size:0.95rem;">${album.name} ${album.pincode ? '🔒' : ''}</span>
                                </div>
                                ${actionBtn}
                            </div>`;
                });
                list.innerHTML = html;

                list.querySelectorAll('.album-item').forEach(item => {
                    item.onmouseover = () => { item.style.background = 'rgba(37,99,235,0.05)'; item.style.borderColor = 'var(--primary)'; };
                    item.onmouseout = () => { item.style.background = 'var(--bg-dropdown)'; item.style.borderColor = 'var(--border-dropdown)'; };
                    
                    item.onclick = async (e) => {
                        if (e.target.closest('.delete-album-btn')) {
                            e.stopPropagation();
                            if (window.ModalService) {
                                overlay.style.display = 'none';
                                window.ModalService.confirm('Album Verwijderen', `Weet je zeker dat je het album '${item.dataset.name}' wilt wissen? Bestanden blijven behouden.`, { danger: true, yesText: 'Ja, verwijderen' })
                                .then(async agreed => {
                                    if (agreed) {
                                        const tokenRes = await fetch('/api/csrf');
                                        const tokenData = await tokenRes.json();
                                        await fetch('/api/albums/delete', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ album_id: parseInt(item.dataset.id, 10), csrf_token: tokenData.csrf_token })
                                        });
                                        overlay.remove();
                                        if(window.EventBus) window.EventBus.emit('view:refresh');
                                    } else {
                                        overlay.style.display = 'flex';
                                    }
                                });
                            }
                            return;
                        }
                        
                        if (isManageMode) {
                            if (window.EventBus) window.EventBus.emit('navigation:navigate', 'album_' + item.dataset.id);
                            overlay.remove();
                        } else {
                            const btn = item.querySelector('.assign-btn');
                            if(btn) btn.textContent = 'Bezig...';
                            try {
                                const tokenRes = await fetch('/api/csrf');
                                const tokenData = await tokenRes.json();
                                
                                let successCount = 0;
                                for (const fId of fileIds) {
                                    const res = await fetch('/api/albums/assign', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ 
                                            file_id: parseInt(fId, 10), 
                                            album_id: parseInt(item.dataset.id, 10), 
                                            csrf_token: tokenData.csrf_token 
                                        })
                                    });
                                    if (res.ok) successCount++;
                                }
                                if (successCount > 0) {
                                    if (window.EventBus) window.EventBus.emit('notify:success', `${successCount} bestand(en) gekoppeld!`);
                                    if (window.EventBus) window.EventBus.emit('view:refresh');
                                    overlay.remove();
                                }
                            } catch(err) {
                                console.error(err);
                                if(btn) btn.textContent = 'Koppelen';
                            }
                        }
                    };
                });
            }
        };

        overlay.querySelector('#btn-create-album').onclick = async () => {
            const name = overlay.querySelector('#new-album-name').value.trim();
            if (name) {
                const btn = overlay.querySelector('#btn-create-album');
                btn.textContent = '...';
                try {
                    const tokenRes = await fetch('/api/csrf');
                    const tokenData = await tokenRes.json();
                    await fetch('/api/albums/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, color: currentColor, icon: currentIcon, csrf_token: tokenData.csrf_token })
                    });
                    overlay.querySelector('#new-album-name').value = '';
                    loadAlbums();
                    if (window.EventBus) window.EventBus.emit('view:refresh');
                } catch(e) { console.error(e); }
                btn.textContent = 'Maken';
            }
        };

        loadAlbums();
    }

    showEditModal(albumId = null) {
        const isNew = albumId === null;
        const albumObj = isNew ? null : this.albums.find(a => String(a.id) === String(albumId));
        
        let currentName = albumObj ? albumObj.name : '';
        let currentColor = albumObj ? (albumObj.color || '#3b82f6') : '#3b82f6';
        let currentIcon = albumObj ? (albumObj.icon || 'none') : 'none';
        let hasPin = albumObj && albumObj.pincode ? true : false;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        overlay.style.setProperty('z-index', '8000', 'important');
        
        let extraActionsHtml = '';
        if (!isNew) {
            extraActionsHtml = `
                <div style="display:flex; gap:12px; margin-top:4px;">
                    <button id="btn-set-cover" style="flex:1; justify-content:center; display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); cursor:pointer; font-weight:500; transition:all 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Cover
                    </button>
                    <button id="btn-set-pincode" style="flex:1; justify-content:center; display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); cursor:pointer; font-weight:500; transition:all 0.2s;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${hasPin ? 'var(--primary)' : 'currentColor'}" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> 
                        ${hasPin ? 'Pincode Wijzigen' : 'Pincode Instellen'}
                    </button>
                </div>
            `;
        }

        const createPinHtml = isNew ? `
            <div style="margin-bottom: 16px;">
                <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:8px;">Optioneel: Pincode Beveiliging (4 cijfers)</label>
                <input type="text" id="edit-album-pin" placeholder="Leeg laten voor geen code" maxlength="4" style="width:100%; padding:12px 14px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-surface); color:var(--text-main); font-size:1.1rem; outline:none; font-family:monospace; letter-spacing:2px; text-align:center;">
            </div>
        ` : '';

        overlay.innerHTML = `
            <div class="modal-box" style="width: 420px; max-width: 95vw; background: var(--bg-main); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column;">
                <div style="padding:24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:36px; height:36px; border-radius:50%; background:rgba(59, 130, 246, 0.1); color:#3b82f6; display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">${isNew ? 'Nieuw Album Maken' : 'Album Bewerken'}</h3>
                    </div>
                    <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding:24px; display:flex; flex-direction:column; gap:20px;">
                    <div>
                        <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:8px;">Naam van album</label>
                        <input type="text" id="edit-album-name" value="${currentName}" placeholder="Bijv. Vakantie 2024..." style="width:100%; padding:12px 14px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-surface); color:var(--text-main); font-size:0.95rem; outline:none;">
                    </div>
                    <div style="display:flex; gap:16px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:8px;">Kleur</label>
                            <button id="btn-edit-color" style="width:100%; justify-content:center; display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); cursor:pointer; font-weight:500;">
                                <span id="edit-color-indicator" style="width:16px; height:16px; border-radius:50%; background:${currentColor}; box-shadow:0 2px 4px rgba(0,0,0,0.2);"></span> Kies Kleur
                            </button>
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:8px;">Icoon</label>
                            <button id="btn-edit-icon" style="width:100%; justify-content:center; display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-dropdown); color:var(--text-main); cursor:pointer; font-weight:500;">
                                <span id="edit-icon-indicator">${currentIcon !== 'none' ? '✅' : '✨'}</span> Kies Icoon
                            </button>
                        </div>
                    </div>
                    ${createPinHtml}
                    ${extraActionsHtml}
                </div>
                
                <div style="padding:16px 24px; border-top:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:flex-end; gap:12px;">
                    <button class="btn-modal btn-secondary cancel-btn" style="padding:8px 20px; border-radius:8px; font-weight:600; border:none; background:transparent; color:var(--text-muted); cursor:pointer;">Annuleren</button>
                    <button class="btn-modal btn-primary save-btn" style="padding:8px 24px; border-radius:8px; font-weight:600; background:var(--primary); color:white; border:none; cursor:pointer; box-shadow:0 4px 10px rgba(37,99,235,0.2);">Opslaan</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const inputField = overlay.querySelector('#edit-album-name');
        setTimeout(() => inputField.focus(), 100);

        overlay.querySelector('.close-btn').onclick = (e) => { e.preventDefault(); overlay.remove(); };
        overlay.querySelector('.cancel-btn').onclick = (e) => { e.preventDefault(); overlay.remove(); };

        overlay.querySelector('#btn-edit-color').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.colorPicker) {
                const c = await window.App.colorPicker.show(currentColor);
                if (c) { currentColor = c; document.getElementById('edit-color-indicator').style.background = c; }
            }
        };

        overlay.querySelector('#btn-edit-icon').onclick = async (e) => {
            e.preventDefault();
            if (window.App && window.App.iconPicker) {
                const i = await window.App.iconPicker.show(currentIcon);
                if (i) { currentIcon = i; document.getElementById('edit-icon-indicator').innerHTML = '✅'; }
            }
        };

        const btnCover = overlay.querySelector('#btn-set-cover');
        if (btnCover) {
            btnCover.onclick = (e) => {
                e.preventDefault();
                overlay.style.display = 'none'; 
                this.showCoverModal(albumId, overlay);
            };
        }

        const btnPin = overlay.querySelector('#btn-set-pincode');
        if (btnPin) {
            btnPin.onclick = (e) => {
                e.preventDefault();
                overlay.style.display = 'none';
                if (window.ModalService) {
                    window.ModalService.prompt('Album Beveiligen', 'Voer een nieuwe pincode in. Laat leeg om bestaande beveiliging te verwijderen.', '', 'Bijv. 1234 of 9999').then(async pin => {
                        if (pin !== null) { 
                            try {
                                const tokenRes = await fetch('/api/csrf');
                                const tokenData = await tokenRes.json();
                                await fetch('/api/albums/pincode', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ album_id: albumId, pincode: pin.trim(), csrf_token: tokenData.csrf_token })
                                });
                                if (window.EventBus) {
                                    window.EventBus.emit('notify:success', pin.trim() === '' ? 'Beveiliging verwijderd.' : 'Pincode succesvol ingesteld!');
                                    window.EventBus.emit('view:refresh');
                                }
                            } catch(err) { console.error(err); }
                        }
                        overlay.style.display = 'flex'; 
                    });
                }
            };
        }

        overlay.querySelector('.save-btn').onclick = async (e) => {
            e.preventDefault();
            const btn = overlay.querySelector('.save-btn');
            const newName = inputField.value.trim();
            if (!newName) return;

            btn.disabled = true;
            btn.textContent = 'Opslaan...';

            try {
                const tokenRes = await fetch('/api/csrf');
                const tokenData = await tokenRes.json();
                
                const route = isNew ? '/api/albums/create' : '/api/albums/update';
                const payload = { id: isNew ? null : albumId, name: newName, color: currentColor, icon: currentIcon, csrf_token: tokenData.csrf_token };
                
                const res = await fetch(route, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const json = await res.json();
                if (json.status === 'success') {
                    const pinInput = overlay.querySelector('#edit-album-pin');
                    if (isNew && pinInput && pinInput.value.trim() !== '') {
                        await fetch('/api/albums/pincode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ album_id: json.id, pincode: pinInput.value.trim(), csrf_token: tokenData.csrf_token })
                        });
                    }

                    if (window.EventBus) window.EventBus.emit('view:refresh');
                    overlay.remove();
                } else {
                    if (window.ModalService) window.ModalService.alert('Fout', json.message);
                    btn.disabled = false;
                    btn.textContent = 'Opslaan';
                }
            } catch (err) {
                console.error(err);
                btn.disabled = false;
                btn.textContent = 'Opslaan';
            }
        };
    }

    async showCoverModal(albumId, parentOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay visible';
        overlay.style.setProperty('z-index', '8005', 'important');
        
        overlay.innerHTML = `
            <div class="modal-box" style="width: 700px; max-width: 95vw; background: var(--bg-main); border: 1px solid var(--border-dropdown); border-radius: 16px; display:flex; flex-direction:column; height: 75vh;">
                <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); display:flex; justify-content:space-between; align-items:center; background: rgba(128,128,128,0.02);">
                    <div>
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">Kies een Coverfoto</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Klik op een afbeelding om deze in te stellen als album cover.</div>
                    </div>
                    <button class="btn-icon-small close-cover-btn" style="border:none; background:transparent; font-size:1.5rem; cursor:pointer; color:var(--text-muted);">&times;</button>
                </div>
                <div id="cover-grid" style="flex:1; overflow-y:auto; padding:24px; display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:16px; align-content:start; background:var(--bg-surface);">
                    <div style="grid-column:1/-1; text-align:center; padding:40px;"><div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const close = () => {
            overlay.remove();
            if (parentOverlay) parentOverlay.style.display = 'flex';
        };
        overlay.querySelector('.close-cover-btn').onclick = close;

        const grid = overlay.querySelector('#cover-grid');
        try {
            const res = await fetch(`/api/albums/contents?id=${albumId}`);
            const data = await res.json();
            
            if (data.status === 'success' && data.data.files && data.data.files.length > 0) {
                const images = data.data.files.filter(f => ['jpg','jpeg','png','gif','webp'].includes(f.extension?.toLowerCase()));
                
                if (images.length === 0) {
                    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">Er zitten geen geschikte afbeeldingen in dit album. Voeg eerst foto's toe.</div>`;
                } else {
                    grid.innerHTML = '';
                    images.forEach(img => {
                        let dateStr = img.updated_at || img.created_at || '';
                        if (typeof dateStr === 'string') dateStr = dateStr.replace(' ', 'T');
                        const t = dateStr ? new Date(dateStr).getTime() : Date.now();

                        const el = document.createElement('div');
                        el.style.cssText = `cursor:pointer; border-radius:8px; overflow:hidden; border:3px solid transparent; aspect-ratio:1/1; position:relative; box-shadow:0 4px 10px rgba(0,0,0,0.1); transition:transform 0.2s, border-color 0.2s; background:var(--bg-dropdown);`;
                        el.innerHTML = `<img src="/api/files?action=thumb&id=${img.id}&t=${t}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
                        
                        el.onmouseover = () => { el.style.borderColor = 'var(--primary)'; el.style.transform = 'scale(1.05)'; };
                        el.onmouseout = () => { el.style.borderColor = 'transparent'; el.style.transform = 'scale(1)'; };
                        
                        el.onclick = async () => {
                            if (window.ModalService) {
                                window.ModalService.confirm('Cover Bevestigen', 'Wil je deze foto instellen als cover?', {yesText: 'Instellen'}).then(async confirmed => {
                                    if (confirmed) {
                                        try {
                                            const tokenRes = await fetch('/api/csrf');
                                            const tokenData = await tokenRes.json();
                                            await fetch('/api/albums/cover', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ album_id: albumId, file_id: img.id, csrf_token: tokenData.csrf_token })
                                            });
                                            if(window.EventBus) window.EventBus.emit('view:refresh');
                                            close();
                                        } catch(e) { console.error(e); }
                                    }
                                });
                            }
                        };
                        grid.appendChild(el);
                    });
                }
            } else {
                grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">Album is leeg. Voeg eerst bestanden toe.</div>`;
            }
        } catch(e) { console.error(e); grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--error);">Fout bij ophalen inhoud.</div>`; }
    }

    async renderOverview(container) {
        if (!container) return;
        
        container.innerHTML = `
            <div style="padding: 40px 30px; max-width: 1400px; margin: 0 auto; width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 32px; border-bottom: 1px solid var(--border-light); padding-bottom: 20px;">
                    <div>
                        <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; display:flex; align-items:center; gap:12px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(236,72,153,0.1); color: #EC4899; display:flex; align-items:center; justify-content:center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            Mijn Albums
                        </h1>
                        <p style="margin:0; color:var(--text-muted); font-size:1.05rem;">Groepeer je mooiste herinneringen en bestanden in albums.</p>
                    </div>
                    <button id="btn-create-album-overview" class="btn-primary" style="padding: 10px 20px; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Nieuw Album
                    </button>
                </div>
                <div id="albums-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px;">
                    <div style="grid-column: 1 / -1; padding: 40px; text-align:center;"><div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); border-width:4px; width:40px; height:40px;"></div></div>
                </div>
            </div>
        `;

        const grid = container.querySelector('#albums-grid-container');
        await this.fetchAlbums();

        if (this.albums.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px; background: var(--bg-surface); border-radius: 16px; border: 2px dashed var(--border-dropdown);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 20px; opacity: 0.4;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.5rem;">Geen albums gevonden</h3>
                    <p style="color: var(--text-muted); font-size: 1.05rem;">Klik rechtsboven op '+ Nieuw Album' om je eerste album te maken.</p>
                </div>
            `;
        } else {
            grid.innerHTML = '';
            this.albums.forEach(album => {
                const card = document.createElement('div');
                card.className = 'album-polaroid';
                card.dataset.id = album.id;

                const t = new Date().getTime();
                const coverSrc = album.cover_file_id ? `/api/files?action=thumb&id=${album.cover_file_id}&t=${t}` : '';
                
                const visualHtml = album.cover_file_id 
                    ? `<img src="${coverSrc}" class="album-polaroid-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="album-polaroid-cover" style="display:none; align-items:center; justify-content:center; background:${album.color || 'var(--primary)'}20; color:${album.color || 'var(--primary)'};"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`
                    : `<div class="album-polaroid-cover" style="display:flex; align-items:center; justify-content:center; background:${album.color || 'var(--primary)'}20; color:${album.color || 'var(--primary)'};"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`;

                const lockIcon = album.pincode 
                    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="position:absolute; top:20px; left:20px; background:rgba(255,255,255,0.9); border-radius:50%; padding:4px; box-shadow:0 4px 10px rgba(0,0,0,0.15);"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>` 
                    : '';

                card.innerHTML = `
                    ${visualHtml}
                    ${lockIcon}
                    <div class="album-actions">
                        <button class="btn-icon-tiny edit-album-btn" style="background:var(--bg-surface); padding:8px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.15);" title="Bewerken"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button class="btn-icon-tiny delete-album-btn" style="background:var(--bg-surface); padding:8px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.15); color:var(--error);" title="Verwijderen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                    <div class="album-polaroid-title">${album.name}</div>
                    <div class="album-polaroid-meta">Bewerkt op: ${new Date(album.updated_at || album.created_at).toLocaleDateString()}</div>
                `;

                card.querySelector('.edit-album-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showEditModal(album.id);
                });

                card.querySelector('.delete-album-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.ModalService) {
                        window.ModalService.confirm('Album Verwijderen', `Weet je zeker dat je het album '${album.name}' wilt wissen? De bestanden zelf blijven veilig in Mijn Bestanden.`, { danger: true, yesText: 'Ja, verwijderen' })
                        .then(async agreed => {
                            if (agreed) {
                                const tokenRes = await fetch('/api/csrf');
                                const tokenData = await tokenRes.json();
                                await fetch('/api/albums/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ album_id: album.id, csrf_token: tokenData.csrf_token })
                                });
                                this.renderOverview(container);
                                if (window.EventBus) window.EventBus.emit('view:refresh');
                            }
                        });
                    }
                });

                card.addEventListener('click', () => {
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', `album_${album.id}`);
                });

                grid.appendChild(card);
            });
        }

        const btnCreate = container.querySelector('#btn-create-album-overview');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => {
                this.showEditModal(null);
            });
        }
    }
}

window.App = window.App || {};
window.App.albumManager = new AlbumManager();