/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorLinkModal.js */

(function() {
    class EditorLinkModal {
        constructor() {
            this.slideshowId = null;
            this.currentFolderId = 'root';
            this.breadcrumbs = [{ id: 'root', name: 'Mijn Bestanden' }];
            this.currentTab = 'files'; 
            
            // Selecties
            this.selectedFiles = new Map();   
            this.selectedFoldersExact = new Map();
            this.selectedFoldersRecursive = new Map();
            this.selectedAlbums = new Map(); 
            
            // Te verwijderen
            this.filesToRemove = new Set();   
            this.foldersToUnsync = new Set(); 
            this.albumsToUnsync = new Set();
            
            // Reeds actief in DB
            this.activeSyncFoldersExact = new Set();
            this.activeSyncFoldersRecursive = new Set();
            this.activeSyncAlbums = new Set();

            this.lastSelectedIndex = -1;
            this.currentItems = []; 
            this.isLoading = false;

            this.injectStyles();
            this.initListeners();
        }

        injectStyles() {
            if (document.getElementById('slideshow-link-styles')) return;
            const style = document.createElement('style');
            style.id = 'slideshow-link-styles';
            style.innerHTML = `
                @keyframes linkModalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                
                #ss-link-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); z-index: 100050; display:flex; align-items:center; justify-content:center; opacity:0; visibility:hidden; transition: all 0.3s ease; }
                #ss-link-overlay.visible { opacity:1; visibility:visible; }
                
                .ss-link-modal { width: 85vw; max-width: 1100px; height: 85vh; border-radius: 16px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.8); background: var(--bg-surface); border: 1px solid rgba(255,255,255,0.1); color: var(--text-main); animation: linkModalIn 0.3s cubic-bezier(0.25, 1, 0.5, 1); }
                
                .ss-link-header { height: auto; min-height: 70px; display:flex; align-items:center; justify-content:space-between; padding: 16px 24px; border-bottom: 1px solid var(--border-dropdown); background: var(--bg-main); }
                
                .ss-link-tabs { display: flex; background: var(--bg-main); border-bottom: 1px solid var(--border-dropdown); padding: 0 24px; gap: 20px; }
                .ss-link-tab { padding: 12px 4px; font-size: 0.95rem; font-weight: 600; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; transition: 0.2s; }
                .ss-link-tab:hover { color: var(--text-main); }
                .ss-link-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

                .ss-link-title-area { display:flex; flex-direction:column; gap:4px; }
                .ss-link-title { font-size: 1.2rem; font-weight: 800; display:flex; align-items:center; gap:8px; }
                
                .ss-link-breadcrumbs { display:flex; align-items:center; gap:8px; font-weight:600; font-size:0.9rem; padding: 12px 24px; background: var(--bg-surface); border-bottom: 1px solid var(--border-dropdown); flex-wrap: wrap; }
                .ss-breadcrumb-item { cursor:pointer; color: var(--text-muted); transition: 0.2s; }
                .ss-breadcrumb-item:hover { color: var(--primary); }
                .ss-breadcrumb-separator { color: var(--text-muted); opacity: 0.5; font-size: 0.8rem; }
                .ss-breadcrumb-item.active { color: var(--primary); cursor:default; pointer-events:none; }
                
                .ss-link-body { flex: 1; overflow-y: auto; padding: 24px; position:relative; background: var(--bg-main); }
                .ss-link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
                
                .ss-link-item { background: transparent; cursor: pointer; position: relative; user-select: none; display: flex; flex-direction: column; gap: 8px; }
                
                .ss-link-thumb-box { width: 100%; aspect-ratio: 1; border-radius: 12px; background: var(--bg-surface); border: 2px solid transparent; overflow: hidden; position: relative; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center; }
                .ss-link-item:not(.is-linked):not(.is-removing):not(.locked):hover .ss-link-thumb-box { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.1); border-color: rgba(128,128,128,0.3); }
                
                .ss-link-item.selected .ss-link-thumb-box { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary); }
                
                .ss-link-item.is-linked .ss-link-thumb-box { border-color: var(--success); opacity: 0.85; }
                .ss-link-item.is-linked:hover .ss-link-thumb-box { opacity: 1; border-color: var(--error); transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
                
                .ss-link-item.is-removing .ss-link-thumb-box { border-color: var(--error); border-style: dashed; opacity: 0.5; }
                .ss-link-item.is-removing:hover .ss-link-thumb-box { opacity: 0.8; }

                .ss-link-item.locked .ss-link-thumb-box { border-color: var(--primary); opacity: 0.5; cursor: not-allowed; }
                
                .ss-link-image { width: 100%; height: 100%; object-fit: cover; }
                .ss-link-icon-large { width: 48px; height: 48px; color: var(--text-muted); opacity:0.6; }
                
                .ss-link-info { text-align: center; padding: 0 4px; }
                .ss-link-name { font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main); }
                .ss-link-meta { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
                
                .ss-link-check { position: absolute; top: -6px; right: -6px; width: 24px; height: 24px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transform: scale(0.5); transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10; border: 2px solid var(--bg-main); }
                .ss-link-item.selected .ss-link-check { opacity: 1; transform: scale(1); }
                
                .ss-folder-sync-btn { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; background: rgba(0,0,0,0.3); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; opacity: 0.5; transition: all 0.2s; z-index: 10; }
                .ss-link-item:hover .ss-folder-sync-btn { opacity: 1; background: rgba(0,0,0,0.6); }
                .ss-folder-sync-btn:hover { background: var(--primary) !important; transform: scale(1.1); }
                
                .ss-folder-sync-btn.synced-new { opacity: 1; background: var(--primary); box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4); }
                .ss-folder-sync-btn.synced-db { opacity: 1; background: var(--success); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4); }
                .ss-folder-sync-btn.synced-db:hover { background: var(--error) !important; }
                .ss-folder-sync-btn.synced-db.is-unsyncing { background: var(--error); box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4); }
                
                .ss-link-badge-used { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; display: none; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none; transition: 0.2s; z-index: 5; }
                
                .ss-link-item.is-linked .ss-link-badge-used { display: block; background: var(--success); content: "Zit in Slideshow"; }
                .ss-link-item.is-linked:hover .ss-link-badge-used { background: var(--error); }
                .ss-link-item.is-removing .ss-link-badge-used { display: block; background: var(--error); }
                
                .ss-folder-sync-btn.synced-new ~ .ss-link-badge-used { display: block; background: var(--primary); }
                .ss-folder-sync-btn.synced-db ~ .ss-link-badge-used { display: block; background: var(--success); }
                .ss-folder-sync-btn.synced-db:hover ~ .ss-link-badge-used { background: var(--error); }
                .ss-folder-sync-btn.is-unsyncing ~ .ss-link-badge-used { display: block; background: var(--error); }
                
                .ss-link-footer { height: 70px; display:flex; align-items:center; justify-content:space-between; padding: 0 24px; border-top: 1px solid var(--border-dropdown); background: var(--bg-surface); }
                .ss-link-empty { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; opacity:0.5; }
                .ss-link-loader { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:40px; height:40px; border:3px solid var(--primary); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; }

                .ss-btn-primary { background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display:flex; align-items:center; gap:8px; }
                .ss-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .ss-btn-danger { background: var(--error); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display:flex; align-items:center; gap:8px; }
                .ss-btn-warning { background: var(--warning); color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.2s; display:flex; align-items:center; gap:8px; }
            `;
            document.head.appendChild(style);
        }

        initListeners() {
            if (window.EventBus) {
                window.EventBus.on('slideshow:open_link_modal', (slideshowId) => {
                    this.open(slideshowId);
                });
            }

            document.addEventListener('keydown', (e) => {
                const overlay = document.getElementById('ss-link-overlay');
                if (overlay && overlay.classList.contains('visible')) {
                    if (e.ctrlKey && e.key === 'a' && this.currentTab === 'files') {
                        e.preventDefault();
                        this.selectAllValidFiles();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        this.close();
                    }
                }
            });
        }

        open(slideshowId) {
            this.slideshowId = slideshowId;
            this.currentFolderId = 'root'; 
            this.breadcrumbs = [{ id: 'root', name: 'Mijn Bestanden' }];
            this.currentTab = 'files';
            
            this.selectedFiles.clear();
            this.selectedFoldersExact.clear();
            this.selectedFoldersRecursive.clear();
            this.selectedAlbums.clear();
            this.filesToRemove.clear();
            this.foldersToUnsync.clear();
            this.albumsToUnsync.clear();
            this.lastSelectedIndex = -1;

            const editor = window.App && window.App.slideshowEditor ? window.App.slideshowEditor : null;
            if (editor && editor.data && editor.data.slideshow && editor.data.slideshow.settings) {
                const s = editor.data.slideshow.settings;
                this.activeSyncFoldersExact = new Set(s.sync_folders_exact || s.sync_folders || []);
                this.activeSyncFoldersRecursive = new Set(s.sync_folders_recursive || []);
                this.activeSyncAlbums = new Set(s.sync_albums || []);
                
                if (editor.data.slideshow.album_id && !this.activeSyncAlbums.has(editor.data.slideshow.album_id)) {
                    this.activeSyncAlbums.add(editor.data.slideshow.album_id);
                }
                if (editor.data.slideshow.folder_id && !this.activeSyncFoldersExact.has(editor.data.slideshow.folder_id) && !this.activeSyncFoldersRecursive.has(editor.data.slideshow.folder_id)) {
                    this.activeSyncFoldersExact.add(editor.data.slideshow.folder_id);
                }
            } else {
                this.activeSyncFoldersExact = new Set();
                this.activeSyncFoldersRecursive = new Set();
                this.activeSyncAlbums = new Set();
            }

            this.createOverlay();
            this.loadFolder(this.currentFolderId);
        }

        createOverlay() {
            let overlay = document.getElementById('ss-link-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'ss-link-overlay';
                document.body.appendChild(overlay);
            }

            overlay.innerHTML = `
                <div class="ss-link-modal">
                    <div class="ss-link-header">
                        <div class="ss-link-title-area">
                            <div class="ss-link-title">
                                <div style="width:12px; height:12px; border-radius:50%; background:var(--success);"></div>
                                Media Koppelen
                            </div>
                            <div class="ss-link-subtitle">Voeg bestanden, mappen of fotoalbums toe aan je presentatie.</div>
                        </div>
                        <button class="btn-icon-small" id="btn-link-close" style="background:transparent; border:none; cursor:pointer; color:var(--text-muted); font-size:1.5rem; outline:none;">&times;</button>
                    </div>
                    
                    <div class="ss-link-tabs">
                        <div class="ss-link-tab active" data-tab="files">Mappen & Bestanden</div>
                        <div class="ss-link-tab" data-tab="albums">Fotoalbums</div>
                    </div>

                    <div class="ss-link-breadcrumbs" id="ss-link-breadcrumbs"></div>
                    <div class="ss-link-body custom-scrollbar" id="ss-link-body"></div>
                    
                    <div class="ss-link-footer">
                        <div style="font-size:0.85rem; color:var(--text-muted);">
                            <span id="ss-link-count" style="font-weight:700; color:var(--text-main); font-size:1.1rem;">0</span> wijzigingen klaar
                        </div>
                        <div style="display:flex; gap:12px;">
                            <button id="btn-link-cancel" style="padding:10px 20px; border-radius:8px; border:1px solid var(--border-dropdown); background:transparent; color:var(--text-main); cursor:pointer; font-weight:600;">Annuleren</button>
                            <button id="btn-link-submit" class="ss-btn-primary" disabled>
                                Selecteer actie
                            </button>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => overlay.classList.add('visible'), 10);

            document.getElementById('btn-link-close').onclick = () => this.close();
            document.getElementById('btn-link-cancel').onclick = () => this.close();
            document.getElementById('btn-link-submit').onclick = () => this.submitSelection();

            document.querySelectorAll('.ss-link-tab').forEach(tab => {
                tab.onclick = () => {
                    document.querySelectorAll('.ss-link-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.currentTab = tab.dataset.tab;
                    
                    if (this.currentTab === 'files') {
                        document.getElementById('ss-link-breadcrumbs').style.display = 'flex';
                        this.loadFolder(this.currentFolderId);
                    } else {
                        document.getElementById('ss-link-breadcrumbs').style.display = 'none';
                        this.loadAlbums();
                    }
                };
            });
        }

        // FASE 1 FIX: Custom 3-State Picker Dialog voor Editor Link (z-index safe)
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

        async loadAlbums() {
            this.isLoading = true;
            const body = document.getElementById('ss-link-body');
            body.innerHTML = `<div class="ss-link-loader"></div>`;

            try {
                const res = await fetch('/api/albums');
                const json = await res.json();

                if (json.status === 'success') {
                    this.renderAlbumsContent(json.data || []);
                } else {
                    throw new Error(json.message);
                }
            } catch(e) {
                body.innerHTML = `<div class="ss-link-empty"><div style="color:var(--error); margin-bottom:8px;">Fout bij laden albums</div>${e.message}</div>`;
            } finally {
                this.isLoading = false;
            }
        }

        renderAlbumsContent(albums) {
            const body = document.getElementById('ss-link-body');
            if (albums.length === 0) {
                body.innerHTML = `<div class="ss-link-empty"><h3 style="margin:0 0 4px 0;">Geen albums gevonden</h3><p style="margin:0; font-size:0.85rem;">Maak eerst een fotoalbum aan via het hoofdmenu.</p></div>`;
                return;
            }

            let html = '<div class="ss-link-grid">';
            
            albums.forEach(album => {
                const albumId = parseInt(album.id);
                
                const isSyncedDB = this.activeSyncAlbums.has(albumId);
                const isUnsyncing = this.albumsToUnsync.has(albumId);
                const isSyncingNew = this.selectedAlbums.has(albumId);
                
                let syncClass = '';
                let badgeText = '';
                let badgeDisplay = 'none';
                
                if (isSyncedDB) {
                    badgeDisplay = 'block';
                    if (isUnsyncing) {
                        syncClass = 'synced-db is-unsyncing';
                        badgeText = 'Wordt ontkoppeld';
                    } else {
                        syncClass = 'synced-db';
                        badgeText = 'Album Actief Gekoppeld';
                    }
                } else if (isSyncingNew) {
                    badgeDisplay = 'block';
                    syncClass = 'synced-new';
                    badgeText = 'Wordt gekoppeld';
                }

                html += `
                    <div class="ss-link-item folder-item" data-id="${albumId}">
                        <div class="ss-link-thumb-box">
                            <svg class="ss-link-icon-large" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <div class="ss-folder-sync-btn album-sync-btn ${syncClass}" title="Koppel dit Album" data-id="${albumId}" data-db-synced="${isSyncedDB}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                            </div>
                            <div class="ss-link-badge-used" style="display:${badgeDisplay};">${badgeText}</div>
                        </div>
                        <div class="ss-link-info">
                            <div class="ss-link-name">${album.name}</div>
                            <div class="ss-link-meta">${album.files_count || 0} bestanden</div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            body.innerHTML = html;

            body.querySelectorAll('.album-sync-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const albumId = parseInt(btn.dataset.id);
                    const isSyncedDB = btn.dataset.dbSynced === 'true';
                    
                    if (isSyncedDB) {
                        if (this.albumsToUnsync.has(albumId)) {
                            this.albumsToUnsync.delete(albumId);
                            btn.classList.remove('is-unsyncing');
                            btn.nextElementSibling.textContent = 'Album Actief Gekoppeld';
                        } else {
                            this.albumsToUnsync.add(albumId);
                            btn.classList.add('is-unsyncing');
                            btn.nextElementSibling.textContent = 'Wordt ontkoppeld';
                        }
                    } else {
                        if (this.selectedAlbums.has(albumId)) {
                            this.selectedAlbums.delete(albumId);
                            btn.classList.remove('synced-new');
                            btn.nextElementSibling.style.display = 'none';
                        } else {
                            this.selectedAlbums.set(albumId, true);
                            btn.classList.add('synced-new');
                            btn.nextElementSibling.style.display = 'block';
                            btn.nextElementSibling.textContent = 'Wordt gekoppeld';
                        }
                    }
                    this.updateFooter();
                };
            });
        }

        async loadFolder(folderId) {
            this.isLoading = true;
            this.currentFolderId = folderId;
            this.currentItems = [];
            this.lastSelectedIndex = -1;
            
            const body = document.getElementById('ss-link-body');
            body.innerHTML = `<div class="ss-link-loader"></div>`;
            this.renderBreadcrumbs();

            try {
                const timestamp = new Date().getTime();
                let url = `/api/files?action=list&t=${timestamp}`;
                if (folderId !== 'root' && folderId !== 0 && folderId !== '') {
                    url += `&folder=${folderId}`;
                }

                const res = await fetch(url);
                const json = await res.json();

                if (json.status === 'success') {
                    this.renderContent(json.data.folders || [], json.data.files || []);
                } else {
                    throw new Error(json.message);
                }
            } catch(e) {
                body.innerHTML = `<div class="ss-link-empty"><div style="color:var(--error); margin-bottom:8px;">Fout bij laden map</div>${e.message}</div>`;
            } finally {
                this.isLoading = false;
            }
        }

        renderBreadcrumbs() {
            const container = document.getElementById('ss-link-breadcrumbs');
            if (!container) return;

            let html = '';
            this.breadcrumbs.forEach((crumb, index) => {
                const isLast = index === this.breadcrumbs.length - 1;
                if (!isLast) {
                    html += `
                        <div class="ss-breadcrumb-item" data-index="${index}">
                            ${index === 0 ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>` : ''}
                            ${crumb.name}
                        </div>
                        <div class="ss-breadcrumb-separator"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
                    `;
                } else {
                    html += `<div class="ss-breadcrumb-item active">${crumb.name}</div>`;
                }
            });

            container.innerHTML = html;

            container.querySelectorAll('.ss-breadcrumb-item:not(.active)').forEach(el => {
                el.onclick = () => {
                    const idx = parseInt(el.dataset.index);
                    const targetCrumb = this.breadcrumbs[idx];
                    this.breadcrumbs = this.breadcrumbs.slice(0, idx + 1); 
                    this.loadFolder(targetCrumb.id);
                };
            });
        }

        renderContent(folders, files) {
            const body = document.getElementById('ss-link-body');
            
            const mediaFiles = files.filter(f => {
                const mime = f.mime_type || f.mime || '';
                if (mime.startsWith('image/') || mime.startsWith('video/')) return true;
                const fileName = f.original_name || f.name || '';
                const ext = fileName.split('.').pop().toLowerCase();
                return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
            });

            if (folders.length === 0 && mediaFiles.length === 0 && this.currentFolderId !== 'root') {
                body.innerHTML = `
                    <div class="ss-link-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px; opacity:0.5;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        <h3 style="margin:0 0 4px 0;">Geen media gevonden</h3>
                        <p style="margin:0; font-size:0.85rem;">Deze map bevat geen foto's of video's.</p>
                        <button class="ss-btn-primary" style="margin: 16px auto 0;" onclick="document.querySelector('.ss-breadcrumb-item').click()">Terug naar begin</button>
                    </div>
                `;
                return;
            }

            const editor = window.App && window.App.slideshowEditor ? window.App.slideshowEditor : null;
            let existingItems = editor && editor.data && editor.data.items ? editor.data.items : [];
            let isParentFolderSynced = this.activeSyncFoldersExact.has(parseInt(this.currentFolderId)) || this.activeSyncFoldersRecursive.has(parseInt(this.currentFolderId));

            let html = '<div class="ss-link-grid">';
            this.currentItems = []; 
            let indexCounter = 0;

            if (this.currentFolderId !== 'root') {
                html += `
                    <div class="ss-link-item action-back">
                        <div class="ss-link-thumb-box" style="background:transparent; border:2px dashed var(--border-dropdown);">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </div>
                        <div class="ss-link-info">
                            <div class="ss-link-name" style="color:var(--primary);">Terug (Niveau Hoger)</div>
                        </div>
                    </div>
                `;
            }

            folders.forEach(folder => {
                const folderId = parseInt(folder.id);
                const folderName = folder.name;
                
                const isSyncedExact = this.activeSyncFoldersExact.has(folderId);
                const isSyncedRecursive = this.activeSyncFoldersRecursive.has(folderId);
                const isSyncedDB = isSyncedExact || isSyncedRecursive;
                
                const isUnsyncing = this.foldersToUnsync.has(folderId);
                
                const isSyncingNewExact = this.selectedFoldersExact.has(folderId);
                const isSyncingNewRecursive = this.selectedFoldersRecursive.has(folderId);
                const isSyncingNew = isSyncingNewExact || isSyncingNewRecursive;
                
                let syncClass = '';
                let badgeText = '';
                let badgeDisplay = 'none';
                
                if (isSyncedDB) {
                    badgeDisplay = 'block';
                    if (isUnsyncing) {
                        syncClass = 'synced-db is-unsyncing';
                        badgeText = 'Wordt ontkoppeld';
                    } else {
                        syncClass = 'synced-db';
                        badgeText = isSyncedRecursive ? 'Map + Submappen Sync' : 'Map Live Sync';
                    }
                } else if (isSyncingNew) {
                    badgeDisplay = 'block';
                    syncClass = 'synced-new';
                    badgeText = 'Wordt gekoppeld';
                }
                
                html += `
                    <div class="ss-link-item folder-item" data-id="${folderId}" data-name="${folderName.replace(/"/g, '&quot;')}">
                        <div class="ss-link-thumb-box action-open-folder">
                            <svg class="ss-link-icon-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                            <div class="ss-folder-sync-btn folder-sync-btn ${syncClass}" title="Koppel hele map (Live Sync)" data-id="${folderId}" data-name="${folderName.replace(/"/g, '&quot;')}" data-db-synced="${isSyncedDB}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                            </div>
                            <div class="ss-link-badge-used" style="display:${badgeDisplay};">${badgeText}</div>
                        </div>
                        <div class="ss-link-info action-open-folder">
                            <div class="ss-link-name">${folderName}</div>
                            <div class="ss-link-meta">Map</div>
                        </div>
                    </div>
                `;
            });

            mediaFiles.forEach(file => {
                const isSelected = this.selectedFiles.has(file.id) ? 'selected' : '';
                const usedItem = existingItems.find(i => parseInt(i.file_id) === parseInt(file.id));
                const isUsed = !!usedItem;
                const dbItemId = usedItem ? parseInt(usedItem.id) : null;
                const isRemoving = dbItemId && this.filesToRemove.has(dbItemId);
                
                let linkedClass = '';
                let badgeText = '';

                if (isParentFolderSynced) {
                    linkedClass = 'locked';
                    badgeText = 'Gekoppeld in Map';
                } else if (isUsed) {
                    if (isRemoving) {
                        linkedClass = 'is-removing';
                        badgeText = 'Wordt ontkoppeld';
                    } else {
                        linkedClass = 'is-linked';
                        badgeText = 'Zit in Slideshow';
                    }
                }
                
                const mime = file.mime_type || file.mime || '';
                const isVideo = mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes((file.original_name || file.name || '').split('.').pop().toLowerCase());
                
                const t = new Date().getTime();
                let thumbUrl = `/api/files?action=thumb&id=${file.id}&t=${t}`;
                if (isVideo && file.file_hash) {
                    thumbUrl = `/storage/thumbs/${file.file_hash}.webp`; 
                }
                
                this.currentItems.push({ id: file.id, index: indexCounter, isUsed: isUsed, dbItemId: dbItemId, file: file, isLocked: isParentFolderSynced });
                const displayName = file.original_name || file.name || 'Bestand';

                html += `
                    <div class="ss-link-item file-item ${isSelected} ${linkedClass}" data-index="${indexCounter}" data-id="${file.id}" data-item-id="${dbItemId}">
                        <div class="ss-link-thumb-box">
                            <img src="${thumbUrl}" class="ss-link-image" onerror="this.style.display='none';">
                            ${isVideo ? `<div style="position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.7); padding:4px; border-radius:6px; color:white;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>` : ''}
                            
                            <div class="ss-link-check">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div class="ss-link-badge-used" style="${badgeText ? 'display:block;' : ''}">${badgeText}</div>
                        </div>
                        <div class="ss-link-info">
                            <div class="ss-link-name" title="${displayName}">${displayName}</div>
                            <div class="ss-link-meta">${this.formatBytes(file.size || 0)}</div>
                        </div>
                    </div>
                `;
                indexCounter++;
            });

            html += '</div>';
            body.innerHTML = html;

            this.bindItemEvents(body);
        }

        formatBytes(bytes) {
            if (bytes === 0 || !bytes) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        bindItemEvents(body) {
            const backBtn = body.querySelector('.action-back');
            if (backBtn) {
                backBtn.onclick = () => {
                    if (this.breadcrumbs.length > 1) {
                        this.breadcrumbs.pop();
                        const target = this.breadcrumbs[this.breadcrumbs.length - 1];
                        this.loadFolder(target.id);
                    }
                };
            }

            body.querySelectorAll('.folder-item').forEach(el => {
                const openAreas = el.querySelectorAll('.action-open-folder');
                openAreas.forEach(area => {
                    area.onclick = (e) => {
                        if (e.target.closest('.ss-folder-sync-btn')) return;
                        const id = el.dataset.id;
                        const name = el.dataset.name;
                        this.breadcrumbs.push({ id: id, name: name });
                        this.loadFolder(id);
                    };
                });
            });

            // Map Sync Toggle MET DE NIEUWE OVERLAY
            body.querySelectorAll('.folder-sync-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const folderId = parseInt(btn.dataset.id);
                    const folderName = btn.dataset.name;
                    const isSyncedDB = btn.dataset.dbSynced === 'true';
                    
                    if (isSyncedDB) {
                        if (this.foldersToUnsync.has(folderId)) {
                            this.foldersToUnsync.delete(folderId);
                            btn.classList.remove('is-unsyncing');
                            btn.nextElementSibling.textContent = 'Live Sync Actief';
                        } else {
                            this.foldersToUnsync.add(folderId);
                            btn.classList.add('is-unsyncing');
                            btn.nextElementSibling.textContent = 'Wordt ontkoppeld';
                        }
                    } else {
                        if (this.selectedFoldersExact.has(folderId) || this.selectedFoldersRecursive.has(folderId)) {
                            this.selectedFoldersExact.delete(folderId);
                            this.selectedFoldersRecursive.delete(folderId);
                            btn.classList.remove('synced-new');
                            btn.nextElementSibling.style.display = 'none';
                        } else {
                            const choice = await this.askSyncType(folderName);
                            if (!choice) return;
                            
                            if (choice === 'recursive') {
                                this.selectedFoldersRecursive.set(folderId, true);
                                btn.nextElementSibling.textContent = 'Map + Submappen gekoppeld';
                            } else {
                                this.selectedFoldersExact.set(folderId, true);
                                btn.nextElementSibling.textContent = 'Map gekoppeld';
                            }
                            
                            btn.classList.add('synced-new');
                            btn.nextElementSibling.style.display = 'block';
                        }
                    }
                    this.updateFooter();
                };
            });

            body.querySelectorAll('.file-item').forEach(el => {
                el.onclick = (e) => {
                    if (el.classList.contains('locked')) {
                        if (window.EventBus) window.EventBus.emit('notify:warning', 'Bestanden in een live gesynchroniseerde map kunnen niet los ontkoppeld worden.');
                        return;
                    }

                    const idx = parseInt(el.dataset.index);
                    const itemData = this.currentItems[idx];

                    if (itemData.isUsed) {
                        const dbId = itemData.dbItemId;
                        if (this.filesToRemove.has(dbId)) {
                            this.filesToRemove.delete(dbId); 
                            el.classList.remove('is-removing');
                            el.classList.add('is-linked');
                            el.querySelector('.ss-link-badge-used').textContent = 'Zit in Slideshow';
                        } else {
                            this.filesToRemove.add(dbId); 
                            el.classList.add('is-removing');
                            el.classList.remove('is-linked');
                            el.querySelector('.ss-link-badge-used').textContent = 'Wordt ontkoppeld';
                        }
                        this.updateFooter();
                        return; 
                    }

                    const fileObj = itemData.file;

                    if (e.shiftKey && this.lastSelectedIndex !== -1) {
                        const start = Math.min(this.lastSelectedIndex, idx);
                        const end = Math.max(this.lastSelectedIndex, idx);
                        for (let i = start; i <= end; i++) {
                            const itm = this.currentItems[i];
                            if (!itm.isUsed && !itm.isLocked) {
                                this.selectedFiles.set(itm.id, itm.file);
                                const domEl = body.querySelector(`.file-item[data-index="${i}"]`);
                                if (domEl) domEl.classList.add('selected');
                            }
                        }
                    } else if (e.ctrlKey || e.metaKey) {
                        if (this.selectedFiles.has(fileObj.id)) {
                            this.selectedFiles.delete(fileObj.id);
                            el.classList.remove('selected');
                        } else {
                            this.selectedFiles.set(fileObj.id, fileObj);
                            el.classList.add('selected');
                        }
                        this.lastSelectedIndex = idx;
                    } else {
                        this.selectedFiles.clear();
                        body.querySelectorAll('.file-item.selected').forEach(sel => sel.classList.remove('selected'));
                        this.selectedFiles.set(fileObj.id, fileObj);
                        el.classList.add('selected');
                        this.lastSelectedIndex = idx;
                    }

                    this.updateFooter();
                };
            });
        }

        selectAllValidFiles() {
            if (this.isLoading || this.currentTab !== 'files') return;
            const body = document.getElementById('ss-link-body');
            let addedCount = 0;

            this.currentItems.forEach(item => {
                if (!item.isUsed && !item.isLocked) {
                    this.selectedFiles.set(item.id, item.file);
                    const domEl = body.querySelector(`.file-item[data-index="${item.index}"]`);
                    if (domEl) domEl.classList.add('selected');
                    addedCount++;
                }
            });

            if (addedCount > 0 && window.EventBus) {
                window.EventBus.emit('notify:success', `${addedCount} bestanden geselecteerd.`);
            }
            this.updateFooter();
        }

        updateFooter() {
            const addCount = this.selectedFiles.size + this.selectedFoldersExact.size + this.selectedFoldersRecursive.size + this.selectedAlbums.size;
            const removeCount = this.filesToRemove.size + this.foldersToUnsync.size + this.albumsToUnsync.size;
            const totalActions = addCount + removeCount;
            
            let label = '0 wijzigingen klaar';
            if (totalActions > 0) {
                if (addCount > 0 && removeCount > 0) label = `${addCount} toevoegen, ${removeCount} ontkoppelen`;
                else if (addCount > 0) label = `${addCount} item(s) klaar om toe te voegen`;
                else if (removeCount > 0) label = `${removeCount} item(s) klaar om te ontkoppelen`;
            }

            document.getElementById('ss-link-count').textContent = label;
            
            const submitBtn = document.getElementById('btn-link-submit');
            submitBtn.disabled = totalActions === 0;
            submitBtn.className = 'ss-btn-primary';
            
            if (totalActions > 0) {
                if (addCount > 0 && removeCount === 0) {
                    submitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Voeg Toe aan Slideshow`;
                } else if (removeCount > 0 && addCount === 0) {
                    submitBtn.className = 'ss-btn-danger';
                    submitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Ontkoppel van Slideshow`;
                } else {
                    submitBtn.className = 'ss-btn-warning';
                    submitBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> Wijzig Selectie`;
                }
            } else {
                submitBtn.innerHTML = `Selecteer actie`;
            }
        }

        async submitSelection() {
            if (this.selectedFiles.size === 0 && this.selectedFoldersExact.size === 0 && this.selectedFoldersRecursive.size === 0 && this.selectedAlbums.size === 0 && this.filesToRemove.size === 0 && this.foldersToUnsync.size === 0 && this.albumsToUnsync.size === 0) return;
            
            const submitBtn = document.getElementById('btn-link-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<div style="width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 1s linear infinite;"></div>`;

            try {
                const editor = window.App.slideshowEditor;
                if (!editor || !editor.data) throw new Error("Achterliggende editor niet gevonden.");

                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                const promises = [];

                let currentMaxSort = -1;
                if (editor.data.items && editor.data.items.length > 0) {
                    currentMaxSort = Math.max(...editor.data.items.map(i => parseInt(i.sort_order) || 0));
                }

                const newItemsArray = [];
                let sortTracker = currentMaxSort + 1;
                this.selectedFiles.forEach((fileObj, fileId) => {
                    newItemsArray.push({ id: null, file_id: fileId, sort_order: sortTracker, duration: 5, fit_mode: 'contain', is_active: 1 });
                    sortTracker++;
                });

                let settingsUpdate = null;
                if (this.selectedFoldersExact.size > 0 || this.selectedFoldersRecursive.size > 0 || this.foldersToUnsync.size > 0 || this.selectedAlbums.size > 0 || this.albumsToUnsync.size > 0) {
                    const currentSettings = editor.data.slideshow.settings || {};
                    
                    let currSyncExact = Array.from(this.activeSyncFoldersExact);
                    let currSyncRecursive = Array.from(this.activeSyncFoldersRecursive);
                    let currSyncAlbums = Array.from(this.activeSyncAlbums);
                    
                    currSyncExact = currSyncExact.filter(id => !this.foldersToUnsync.has(id));
                    currSyncRecursive = currSyncRecursive.filter(id => !this.foldersToUnsync.has(id));
                    currSyncAlbums = currSyncAlbums.filter(id => !this.albumsToUnsync.has(id));
                    
                    this.selectedFoldersExact.forEach((_, folderId) => { if (!currSyncExact.includes(folderId)) currSyncExact.push(folderId); });
                    this.selectedFoldersRecursive.forEach((_, folderId) => { if (!currSyncRecursive.includes(folderId)) currSyncRecursive.push(folderId); });
                    this.selectedAlbums.forEach((_, albumId) => { if (!currSyncAlbums.includes(albumId)) currSyncAlbums.push(albumId); });
                    
                    currentSettings.sync_folders_exact = currSyncExact;
                    currentSettings.sync_folders_recursive = currSyncRecursive;
                    currentSettings.sync_albums = currSyncAlbums;
                    
                    settingsUpdate = currentSettings; 
                }

                if (newItemsArray.length > 0 || settingsUpdate) {
                    promises.push(fetch('/api/slideshow/editor/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            slideshow_id: this.slideshowId,
                            settings: settingsUpdate ? editor.data.slideshow : null, 
                            delta_items: newItemsArray.length > 0 ? newItemsArray : null,
                            csrf_token: csrfData.csrf_token,
                            log_message: "Slideshow media/mappen bijgewerkt."
                        })
                    }));
                }

                if (this.filesToRemove.size > 0) {
                    promises.push(fetch('/api/slideshow/editor/removeItems', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            slideshow_id: this.slideshowId,
                            item_ids: Array.from(this.filesToRemove),
                            csrf_token: csrfData.csrf_token
                        })
                    }));
                }

                const responses = await Promise.all(promises);
                
                for (let res of responses) {
                    if (!res.ok) {
                        const json = await res.json();
                        throw new Error(json.message || "Fout bij verwerken.");
                    }
                }

                if (window.EventBus) {
                    window.EventBus.emit('notify:success', 'Slideshow inhoud succesvol geüpdatet!');
                    window.EventBus.emit('slideshow:refresh_data'); 
                }
                this.close();

            } catch(e) {
                if (window.EventBus) window.EventBus.emit('notify:error', e.message);
                submitBtn.disabled = false;
                this.updateFooter();
            }
        }

        close() {
            const overlay = document.getElementById('ss-link-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(1.02)';
                setTimeout(() => overlay.remove(), 300);
            }
            this.slideshowId = null;
            this.selectedFiles.clear();
            this.selectedFoldersExact.clear();
            this.selectedFoldersRecursive.clear();
            this.selectedAlbums.clear();
            this.filesToRemove.clear();
            this.foldersToUnsync.clear();
            this.albumsToUnsync.clear();
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.slideshowLinkModal = new EditorLinkModal();
    });
})();