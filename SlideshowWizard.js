/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/SlideshowWizard.js */

(function() {
    class SlideshowWizard {
        constructor() {
            this.selectedFoldersExact = new Map(); 
            this.selectedFoldersRecursive = new Map(); 
            this.selectedAlbums = new Map();  
            this.injectStyles();
        }

        injectStyles() {
            if (document.getElementById('wizard-multi-styles')) return;
            const style = document.createElement('style');
            style.id = 'wizard-multi-styles';
            style.innerHTML = `
                .sync-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);
                    color: #10b981; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;
                    margin-bottom: 6px;
                }
                .sync-badge button {
                    background: none; border: none; color: inherit; cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; opacity: 0.7; transition: opacity 0.2s;
                }
                .sync-badge button:hover { opacity: 1; color: var(--error); }
            `;
            document.head.appendChild(style);
        }

        async fetchAlbums() {
            try {
                const res = await fetch('/api/albums');
                const json = await res.json();
                return json.status === 'success' ? (json.data || []) : [];
            } catch(e) { return []; }
        }

        async fetchFolders(parentId = 'root') {
            try {
                const query = parentId === 'root' ? '' : `?folder=${parentId}`;
                const res = await fetch(`/api/files${query}`);
                const json = await res.json();
                return json.status === 'success' ? json.data : { folders: [], breadcrumbs: [] };
            } catch(e) { return { folders: [], breadcrumbs: [] }; }
        }

        async show() {
            this.selectedFoldersExact.clear();
            this.selectedFoldersRecursive.clear();
            this.selectedAlbums.clear();

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay visible';
            overlay.style.zIndex = '100050';

            overlay.innerHTML = `
                <div class="modal-box" style="width: 550px; max-width: 90vw; padding: 0; overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-dropdown); box-shadow: var(--apple-shadow); border-radius: 16px;">
                    <div style="padding: 20px 24px; border-bottom: 1px solid var(--border-dropdown); display: flex; justify-content: space-between; align-items: center; background: rgba(128,128,128,0.02);">
                        <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-main); font-weight: 800; display: flex; align-items: center; gap: 10px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                            Nieuwe Slideshow
                        </h3>
                        <button id="btn-wizard-close-top" class="btn-icon-small" style="color: var(--text-muted);">&times;</button>
                    </div>
                    
                    <div style="padding: 24px;">
                        <div style="margin-bottom: 24px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; font-weight: 600; color: var(--text-main);">Titel presentatie <span style="color:var(--error);">*</span></label>
                            <input type="text" id="ss-wizard-title" placeholder="Bijv. Receptie Scherm of Zomervakantie" style="width: 100%; padding: 12px 14px; border: 1px solid var(--border-dropdown); border-radius: 8px; background: var(--bg-main); color: var(--text-main); font-size: 1rem; outline: none; transition: border 0.2s;" autocomplete="off">
                        </div>

                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 4px; font-size: 0.9rem; font-weight: 600; color: var(--text-main);">Multi Smart Sync (Optioneel)</label>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0; margin-bottom: 12px; line-height: 1.4;">Koppel meerdere mappen of fotoalbums. Bestanden verschijnen dan automatisch op de TV.</p>
                            
                            <div style="display:flex; gap:10px;">
                                <button id="btn-sync-folder" style="flex:1; padding:10px; border:1px solid var(--border-dropdown); border-radius:8px; background:var(--bg-main); color:var(--text-main); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:600; transition:all 0.2s;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    Map Toevoegen
                                </button>
                                <button id="btn-sync-album" style="flex:1; padding:10px; border:1px solid var(--border-dropdown); border-radius:8px; background:var(--bg-main); color:var(--text-main); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:600; transition:all 0.2s;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    Album Toevoegen
                                </button>
                            </div>
                            
                            <div id="sync-selection-display" style="display:none; margin-top:16px; padding:12px; background:var(--bg-main); border:1px solid var(--border-dropdown); border-radius:8px; flex-wrap:wrap; gap:6px;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 16px 24px; border-top: 1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display: flex; justify-content: flex-end; gap: 12px;">
                        <button id="btn-wizard-cancel" class="btn-secondary" style="padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-dropdown); background: transparent; color: var(--text-main);">Annuleren</button>
                        <button id="btn-wizard-submit" class="btn-primary" style="padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; background: var(--primary); color: white; display: flex; align-items: center; gap: 8px;">
                            Aanmaken & Bewerken
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            setTimeout(() => {
                const titleInput = document.getElementById('ss-wizard-title');
                if (titleInput) titleInput.focus();
            }, 100);

            const closeModal = () => {
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(0.98)';
                setTimeout(() => overlay.remove(), 200);
            };

            document.getElementById('btn-wizard-close-top').onclick = closeModal;
            document.getElementById('btn-wizard-cancel').onclick = closeModal;

            document.getElementById('btn-sync-folder').onclick = () => this.showFolderPicker();
            document.getElementById('btn-sync-album').onclick = () => this.showAlbumPicker();

            document.getElementById('btn-wizard-submit').onclick = async () => {
                const title = document.getElementById('ss-wizard-title').value.trim();
                const submitBtn = document.getElementById('btn-wizard-submit');
                
                if (!title) {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Vul een titel in.');
                    document.getElementById('ss-wizard-title').focus();
                    return;
                }

                submitBtn.innerHTML = '<div style="width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 1s linear infinite;"></div>';
                submitBtn.disabled = true;

                try {
                    const csrfRes = await fetch('/api/csrf');
                    const csrfData = await csrfRes.json();
                    
                    const payload = { 
                        title: title, 
                        csrf_token: csrfData.csrf_token,
                        folder_ids_exact: Array.from(this.selectedFoldersExact.keys()).map(id => parseInt(id)),
                        folder_ids_recursive: Array.from(this.selectedFoldersRecursive.keys()).map(id => parseInt(id)),
                        album_ids: Array.from(this.selectedAlbums.keys()).map(id => parseInt(id))
                    };

                    const res = await fetch('/api/slideshow/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const json = await res.json();
                    if (res.ok && json.status === 'success') {
                        closeModal();
                        if (window.EventBus) {
                            window.EventBus.emit('notify:success', 'Slideshow aangemaakt en gesynchroniseerd!');
                            window.EventBus.emit('slideshow:refresh_overview'); 
                            setTimeout(() => window.EventBus.emit('slideshow:open_editor', json.data.id), 300);
                        }
                    } else {
                        throw new Error(json.message);
                    }
                } catch (err) {
                    if (window.EventBus) window.EventBus.emit('notify:error', err.message);
                    submitBtn.innerHTML = 'Aanmaken & Bewerken'; 
                    submitBtn.disabled = false;
                }
            };
        }

        updateSyncDisplay() {
            const container = document.getElementById('sync-selection-display');
            let html = '';
            
            this.selectedFoldersExact.forEach((name, id) => {
                html += `<div class="sync-badge">Map: ${name} <button type="button" onclick="window.App.slideshowWizard.removeFolder('${id}', 'exact')">&times;</button></div>`;
            });
            this.selectedFoldersRecursive.forEach((name, id) => {
                html += `<div class="sync-badge">Submappen: ${name} <button type="button" onclick="window.App.slideshowWizard.removeFolder('${id}', 'recursive')">&times;</button></div>`;
            });
            this.selectedAlbums.forEach((name, id) => {
                html += `<div class="sync-badge">Album: ${name} <button type="button" onclick="window.App.slideshowWizard.removeAlbum('${id}')">&times;</button></div>`;
            });
            
            if (this.selectedFoldersExact.size === 0 && this.selectedFoldersRecursive.size === 0 && this.selectedAlbums.size === 0) {
                container.style.display = 'none';
            } else {
                container.style.display = 'flex';
                container.innerHTML = html;
            }
        }

        removeFolder(id, type) { 
            if (type === 'exact') this.selectedFoldersExact.delete(String(id)); 
            if (type === 'recursive') this.selectedFoldersRecursive.delete(String(id)); 
            this.updateSyncDisplay(); 
        }
        removeAlbum(id) { this.selectedAlbums.delete(String(id)); this.updateSyncDisplay(); }

        // FASE 1 FIX: Custom 3-State Picker Dialog ter vervanging van ModalService (z-index bug opgelost!)
        askSyncType(folderName) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed; inset:0; z-index:200000; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;';
                overlay.innerHTML = `
                    <div style="background:var(--bg-surface); padding:24px; border-radius:12px; width:400px; max-width:90vw; border:1px solid var(--border-dropdown); box-shadow:var(--apple-shadow); transform:scale(0.95); transition:transform 0.2s;">
                        <h3 style="margin:0 0 12px 0; font-size:1.2rem; color:var(--text-main);">Map Synchroniseren</h3>
                        <p style="margin:0 0 20px 0; color:var(--text-muted); font-size:0.95rem; line-height:1.5;">Wil je alleen de bestanden in <strong>${folderName}</strong> synchroniseren, of ook alle onderliggende submappen meenemen?</p>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <button id="btn-sync-exact" style="width:100%; padding:12px; border-radius:8px; border:none; background:var(--primary); color:white; font-weight:600; cursor:pointer;">Alleen deze map</button>
                            <button id="btn-sync-rec" style="width:100%; padding:12px; border-radius:8px; border:none; background:#10b981; color:white; font-weight:600; cursor:pointer;">Map + Submappen</button>
                            <button id="btn-sync-cancel" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-dropdown); background:transparent; color:var(--text-main); font-weight:600; cursor:pointer;">Annuleren</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
                
                setTimeout(() => {
                    overlay.style.opacity = '1';
                    overlay.children[0].style.transform = 'scale(1)';
                }, 10);
                
                const cleanup = (val) => {
                    overlay.style.opacity = '0';
                    overlay.children[0].style.transform = 'scale(0.95)';
                    setTimeout(() => { overlay.remove(); resolve(val); }, 200);
                };

                document.getElementById('btn-sync-exact').onclick = () => cleanup('exact');
                document.getElementById('btn-sync-rec').onclick = () => cleanup('recursive');
                document.getElementById('btn-sync-cancel').onclick = () => cleanup(null);
            });
        }

        async showFolderPicker(parentId = 'root') {
            const pickerOverlay = document.createElement('div');
            pickerOverlay.className = 'modal-overlay visible';
            pickerOverlay.style.zIndex = '100060';
            pickerOverlay.innerHTML = `
                <div class="modal-box" style="width: 450px; max-width: 90vw; padding: 0; background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 16px; display:flex; flex-direction:column; height: 500px;">
                    <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-dropdown); background: rgba(128,128,128,0.02);">
                        <h4 style="margin:0; font-size:1.1rem; color:var(--text-main);">Voeg Map Toe</h4>
                        <div id="picker-breadcrumbs" style="font-size:0.8rem; color:var(--primary); margin-top:8px; display:flex; gap:4px; align-items:center; cursor:pointer;">
                            Laden...
                        </div>
                    </div>
                    <div id="picker-list" style="flex:1; overflow-y:auto; padding:10px; background:var(--bg-main);">
                        <div style="text-align:center; padding:20px; color:var(--text-muted);">Mappen ophalen...</div>
                    </div>
                    
                    <div style="padding: 12px 20px; background: var(--bg-main); border-top: 1px solid var(--border-dropdown); display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="picker-include-subfolders" style="width:16px; height:16px; accent-color:var(--primary); cursor:pointer;" checked>
                        <label for="picker-include-subfolders" style="font-size:0.9rem; color:var(--text-main); cursor:pointer; font-weight:500;">Inclusief submappen synchroniseren</label>
                    </div>
                    
                    <div style="padding: 16px 20px; border-top: 1px solid var(--border-dropdown); display:flex; justify-content:space-between; align-items:center;">
                        <button id="btn-picker-cancel" class="btn-secondary" style="padding: 8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); background:transparent; color:var(--text-main); cursor:pointer;">Annuleren</button>
                        <button id="btn-picker-select" class="btn-primary" style="padding: 8px 16px; border-radius:8px; border:none; background:var(--primary); color:white; font-weight:600; cursor:pointer;">Kies Huidige Map</button>
                    </div>
                </div>
            `;
            document.body.appendChild(pickerOverlay);

            const closePicker = () => pickerOverlay.remove();
            document.getElementById('btn-picker-cancel').onclick = closePicker;

            let currentFolderId = parentId;
            let currentFolderName = 'Mijn Bestanden';

            const loadLevel = async (id) => {
                const list = document.getElementById('picker-list');
                const crumbs = document.getElementById('picker-breadcrumbs');
                list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Laden...</div>';
                
                const data = await this.fetchFolders(id);
                currentFolderId = id;

                let crumbHtml = `<span data-id="root" class="crumb-link">Mijn Bestanden</span>`;
                if (data.breadcrumbs && data.breadcrumbs.length > 0) {
                    data.breadcrumbs.forEach(b => {
                        crumbHtml += ` <span style="color:var(--text-muted);">/</span> <span data-id="${b.id}" class="crumb-link">${b.name}</span>`;
                        currentFolderName = b.name;
                    });
                } else if (id === 'root') {
                    currentFolderName = 'Mijn Bestanden';
                }
                crumbs.innerHTML = crumbHtml;
                crumbs.querySelectorAll('.crumb-link').forEach(el => {
                    el.onclick = () => loadLevel(el.dataset.id);
                });

                if (!data.folders || data.folders.length === 0) {
                    list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.9rem;">Deze map bevat geen submappen.</div>`;
                    return;
                }

                let html = '';
                data.folders.forEach(f => {
                    html += `
                        <div class="picker-folder-item" data-id="${f.id}" data-name="${f.name.replace(/"/g, '&quot;')}" style="display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; border-radius:8px; transition:background 0.2s; color:var(--text-main);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                            <span style="font-weight:500;">${f.name}</span>
                            <button class="ss-folder-sync-btn inline-sync-btn" title="Koppel direct" data-id="${f.id}" data-name="${f.name.replace(/"/g, '&quot;')}" style="margin-left:auto; background:rgba(0,0,0,0.1); border:none; border-radius:4px; padding:4px 8px; cursor:pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg></button>
                        </div>
                    `;
                });
                list.innerHTML = html;

                list.querySelectorAll('.picker-folder-item').forEach(el => {
                    el.addEventListener('mouseenter', () => el.style.background = 'rgba(128,128,128,0.1)');
                    el.addEventListener('mouseleave', () => el.style.background = 'transparent');
                    el.addEventListener('click', (e) => {
                        if (!e.target.closest('.inline-sync-btn')) loadLevel(el.dataset.id);
                    });
                });
                
                list.querySelectorAll('.inline-sync-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const fid = btn.dataset.id;
                        const fname = btn.dataset.name;
                        
                        if (this.selectedFoldersExact.has(fid) || this.selectedFoldersRecursive.has(fid)) {
                            this.selectedFoldersExact.delete(fid);
                            this.selectedFoldersRecursive.delete(fid);
                        } else {
                            const choice = await this.askSyncType(fname);
                            if (!choice) return;
                            if (choice === 'recursive') {
                                this.selectedFoldersRecursive.set(String(fid), fname);
                            } else {
                                this.selectedFoldersExact.set(String(fid), fname);
                            }
                        }
                        this.updateSyncDisplay();
                    };
                });
            };

            await loadLevel('root');

            // FASE 1 FIX: Bottom bar selectie maakt nu handig gebruik van de Checkbox!
            document.getElementById('btn-picker-select').onclick = () => {
                if (currentFolderId === 'root') {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Je kunt niet de gehele hoofddirectory koppelen. Kies een map.');
                    return;
                }
                
                const wantSubfolders = document.getElementById('picker-include-subfolders').checked;
                if (wantSubfolders) {
                    this.selectedFoldersRecursive.set(String(currentFolderId), currentFolderName);
                } else {
                    this.selectedFoldersExact.set(String(currentFolderId), currentFolderName);
                }
                
                this.updateSyncDisplay();
                closePicker();
            };
        }

        async showAlbumPicker() {
            const albums = await this.fetchAlbums();
            if (albums.length === 0) {
                if (window.EventBus) window.EventBus.emit('notify:warning', 'Je hebt nog geen fotoalbums gemaakt.');
                return;
            }

            const pickerOverlay = document.createElement('div');
            pickerOverlay.className = 'modal-overlay visible';
            pickerOverlay.style.zIndex = '100060';
            
            let html = '';
            albums.forEach(a => {
                html += `
                    <div class="picker-album-item" data-id="${a.id}" data-name="${a.name.replace(/"/g, '&quot;')}" style="display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; border-radius:8px; border:1px solid var(--border-dropdown); margin-bottom:8px; background:var(--bg-surface); transition:border 0.2s; color:var(--text-main);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <span style="font-weight:600;">${a.name}</span>
                    </div>
                `;
            });

            pickerOverlay.innerHTML = `
                <div class="modal-box" style="width: 450px; max-width: 90vw; padding: 0; background: var(--bg-surface); border: 1px solid var(--border-dropdown); border-radius: 16px; display:flex; flex-direction:column; height: 500px;">
                    <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-dropdown); background: rgba(128,128,128,0.02);">
                        <h4 style="margin:0; font-size:1.1rem; color:var(--text-main);">Voeg Album Toe</h4>
                    </div>
                    <div id="picker-list" style="flex:1; overflow-y:auto; padding:16px; background:var(--bg-main);">
                        ${html}
                    </div>
                    <div style="padding: 16px 20px; border-top: 1px solid var(--border-dropdown); display:flex; justify-content:flex-end;">
                        <button id="btn-picker-cancel" class="btn-secondary" style="padding: 8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); background:transparent; color:var(--text-main); cursor:pointer;">Annuleren</button>
                    </div>
                </div>
            `;
            document.body.appendChild(pickerOverlay);

            document.getElementById('btn-picker-cancel').onclick = () => pickerOverlay.remove();

            pickerOverlay.querySelectorAll('.picker-album-item').forEach(el => {
                el.addEventListener('mouseenter', () => el.style.borderColor = 'var(--primary)');
                el.addEventListener('mouseleave', () => el.style.borderColor = 'var(--border-dropdown)');
                el.addEventListener('click', () => {
                    this.selectedAlbums.set(String(el.dataset.id), el.dataset.name);
                    this.updateSyncDisplay();
                    pickerOverlay.remove();
                });
            });
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.slideshowWizard = new SlideshowWizard();
    });
})();