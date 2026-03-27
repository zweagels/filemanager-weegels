/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Share | FILE: public/js/modules/share/PublicView.js */

(function() {
    class PublicView {
        constructor() {
            this.token = window.shareToken || '';
            this.container = document.getElementById('public-app-root');
            
            if (!this.container) {
                console.error("Kritieke fout: public-app-root mist in public.html");
                return;
            }
            
            this.shareData = null;
            this.viewMode = 'grid';
            this.mediaFiles = []; 
            this.currentMediaIndex = 0; 
            
            this.currentSort = 'name_asc';
            this.selectedFiles = new Set();
            this.currentFiles = [];
            this.currentFolders = [];
            this.lastSelectedIndex = -1;

            // FASE 11 FIX: Sessie Geheugen (LocalStorage)
            const savedDir = localStorage.getItem(`fm_guest_dir_${this.token}`);
            this.currentDirId = (savedDir && savedDir !== 'root') ? savedDir : null; 
            
            this.uploadQueue = []; // Voor de vernieuwde Bestandsaanvraag
            
            window.AppPublicView = this; 
            this.init();
            this.initShortcuts();
        }

        async init() {
            if (!this.token) {
                this.renderError("Geen deellink opgegeven of ongeldige URL.");
                return;
            }
            this.renderLoading();
            await this.loadInfo();
        }

        initShortcuts() {
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                    if (this.currentFiles && this.currentFiles.length > 0) {
                        e.preventDefault();
                        this.selectAll();
                    }
                }
            });
        }

        async loadInfo() {
            try {
                const res = await fetch(`/api/public/info?token=${this.token}&_t=${Date.now()}`);
                const data = await res.json();

                if (data.status === 'locked') {
                    this.applyTheme('dark');
                    this.renderAuthForm(data.message);
                } else if (data.status === 'success') {
                    this.shareData = data.share;
                    document.title = `${this.shareData.name} - Gedeeld via FileManager`;
                    
                    // Reset opgeslagen map als submappen niet zijn toegestaan
                    if (!this.shareData.include_subfolders) {
                        this.currentDirId = null;
                        localStorage.removeItem(`fm_guest_dir_${this.token}`);
                    }

                    this.applyTheme(this.shareData.theme || 'dark');
                    this.routeView();
                } else {
                    this.applyTheme('dark');
                    this.renderError(data.message);
                }
            } catch (err) {
                this.applyTheme('dark');
                this.renderError("Netwerkfout bij ophalen van de link-gegevens.");
            }
        }

        applyTheme(theme) {
            let vars = '';
            if (theme === 'dark') {
                vars = `--bg-main: #0f172a; --bg-card: #1e293b; --text-main: #ffffff; --text-muted: #94a3b8; --border-color: #334155; --primary: #3b82f6; --primary-hover: #2563eb; --card-shadow: 0 10px 25px rgba(0,0,0,0.3); --glass: none;`;
            } else if (theme === 'light') {
                vars = `--bg-main: #f8fafc; --bg-card: #ffffff; --text-main: #0f172a; --text-muted: #64748b; --border-color: #e2e8f0; --primary: #2563eb; --primary-hover: #1d4ed8; --card-shadow: 0 10px 25px rgba(0,0,0,0.05); --glass: none;`;
            } else if (theme === 'creative') {
                vars = `--bg-main: linear-gradient(135deg, #f6d365 0%, #fda085 100%); --bg-card: rgba(255, 255, 255, 0.85); --text-main: #1e293b; --text-muted: #475569; --border-color: rgba(255,255,255,0.4); --primary: #f97316; --primary-hover: #ea580c; --card-shadow: 0 10px 30px rgba(0,0,0,0.1); --glass: blur(10px);`;
            }

            let styleEl = document.getElementById('dynamic-theme-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'dynamic-theme-styles';
                document.head.appendChild(styleEl);
            }

            styleEl.innerHTML = `
                .theme-wrapper { ${vars} background: var(--bg-main); color: var(--text-main); min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; transition: all 0.3s ease; }
                .theme-card { background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--card-shadow); backdrop-filter: var(--glass); -webkit-backdrop-filter: var(--glass); }
                .theme-text { color: var(--text-main); }
                .theme-text-muted { color: var(--text-muted); }
                .theme-btn { background: var(--primary); color: white; transition: transform 0.2s, background 0.2s, box-shadow 0.2s; }
                .theme-btn:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .theme-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
                .theme-border { border-color: var(--border-color); }
                .theme-hover:hover { background: rgba(128,128,128,0.1); }
                
                .pub-checkbox { width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer; box-shadow: 0 0 5px rgba(0,0,0,0.2); }
                .theme-card.selected, .theme-hover.selected { background: rgba(59, 130, 246, 0.15) !important; border-color: var(--primary) !important; }
                
                /* FASE 11 FIX: Animaties & Mobiele FAB */
                .slide-in-right { animation: slideIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
                @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                
                .mobile-fab { display: none; position: fixed; bottom: 20px; right: 20px; z-index: 9000; background: var(--primary); color: white; border: none; border-radius: 50px; padding: 15px 25px; font-weight: bold; box-shadow: 0 10px 25px rgba(0,0,0,0.3); align-items: center; gap: 8px; cursor: pointer; transition: transform 0.2s; }
                .mobile-fab:active { transform: scale(0.95); }
                @media(max-width: 768px) { .mobile-fab { display: flex; } .desktop-download-btn { display: none !important; } }
            `;
        }

        getBrandingHtml() {
            let ownerHtml = this.shareData.owner ? `<div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px; display:flex; align-items:center; gap:6px; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Gedeeld door: <strong>${this.shareData.owner}</strong></div>` : '';
            
            let expiryHtml = '';
            if (this.shareData.expires_at) {
                const daysLeft = Math.ceil((new Date(this.shareData.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft > 0) {
                    expiryHtml = `<div style="font-size:0.75rem; background:rgba(245,158,11,0.1); color:#f59e0b; padding:4px 10px; border-radius:20px; border:1px solid rgba(245,158,11,0.2); display:inline-flex; align-items:center; gap:4px; margin-top:10px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Verloopt over ${daysLeft} dag(en)</div>`;
                } else {
                    expiryHtml = `<div style="font-size:0.75rem; background:rgba(239,68,68,0.1); color:#ef4444; padding:4px 10px; border-radius:20px; border:1px solid rgba(239,68,68,0.2); display:inline-flex; align-items:center; gap:4px; margin-top:10px;">Verloopt vandaag!</div>`;
                }
            }
            return { ownerHtml, expiryHtml };
        }

        routeView() {
            const type = this.shareData.type;
            if (type === 'file') this.renderFileView();
            else if (type === 'folder') this.renderFolderView(this.currentDirId);
            else if (type === 'request') this.renderRequestView();
            else this.renderError("Ongeldig type deellink of onbekend bestand.");
        }

        renderAuthForm(message) {
            this.container.innerHTML = `
                <div class="theme-wrapper" style="display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div class="theme-card" style="padding: 40px; border-radius: 16px; width: 100%; max-width: 400px; text-align: center;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <h2 class="theme-text" style="margin: 0 0 10px 0;">Beveiligde Link</h2>
                        <p class="theme-text-muted" style="font-size: 0.9rem; margin-bottom: 25px;">${message}</p>
                        
                        <input type="password" id="public-password" placeholder="Voer wachtwoord in..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.05); color: var(--text-main); margin-bottom: 15px; outline: none; text-align:center;">
                        <button id="public-auth-btn" class="theme-btn" style="width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer;">Toegang Verkrijgen</button>
                        <p id="public-auth-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 15px; display: none;"></p>
                    </div>
                </div>
            `;

            const btn = document.getElementById('public-auth-btn');
            const input = document.getElementById('public-password');
            const err = document.getElementById('public-auth-error');

            const submit = async () => {
                btn.disabled = true;
                btn.textContent = 'Controleren...';
                err.style.display = 'none';

                const fd = new FormData();
                fd.append('token', this.token);
                fd.append('password', input.value);

                try {
                    const res = await fetch('/api/public/auth', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (data.status === 'success') {
                        this.init(); 
                    } else {
                        err.textContent = data.message;
                        err.style.display = 'block';
                        btn.disabled = false;
                        btn.textContent = 'Toegang Verkrijgen';
                    }
                } catch (e) {
                    err.textContent = 'Verbindingsfout tijdens het inloggen.';
                    err.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Toegang Verkrijgen';
                }
            };

            btn.onclick = submit;
            input.onkeypress = (e) => { if (e.key === 'Enter') submit(); };
        }

        renderFileView() {
            const f = this.shareData.file;
            const previewUrl = `/api/public/download?token=${this.token}&preview=1`;
            const downloadUrl = `/api/public/download?token=${this.token}`;
            
            const isImage = ['jpg','jpeg','png','gif','webp'].includes(f.extension.toLowerCase());
            const isVideo = ['mp4','webm','ogg'].includes(f.extension.toLowerCase());
            const isAudio = ['mp3','wav'].includes(f.extension.toLowerCase());

            let previewHtml = `<div style="font-size: 5rem; margin-bottom: 20px;">${f.icon || '📄'}</div>`;
            
            if (isImage) previewHtml = `<img src="${previewUrl}" style="max-width: 100%; max-height: 350px; border-radius: 8px; object-fit: contain; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">`;
            if (isVideo) previewHtml = `<video src="${previewUrl}" controls style="width: 100%; max-height: 350px; border-radius: 8px; outline:none; background:black; margin-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1);"></video>`;
            if (isAudio) previewHtml = `<audio src="${previewUrl}" controls style="width: 100%; margin-bottom: 20px;"></audio>`;

            let actionBtn = `<button onclick="window.open('${downloadUrl}', '_self')" class="theme-btn" style="width:100%; padding: 14px; border-radius: 8px; border: none; font-weight: bold; font-size:1.1rem; cursor:pointer;">↓ Download Bestand</button>`;
            if (this.shareData.is_preview_only) {
                actionBtn = `<div style="padding:12px; background:rgba(239, 68, 68, 0.1); color:#ef4444; border-radius:8px; font-size:0.9rem; font-weight:600;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg> Downloaden is uitgeschakeld</div>`;
            }

            const branding = this.getBrandingHtml();

            this.container.innerHTML = `
                <div class="theme-wrapper" style="display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div class="theme-card" style="padding: 40px; border-radius: 16px; width: 100%; max-width: 500px; text-align: center;">
                        ${previewHtml}
                        <h2 class="theme-text" style="margin: 0 0 5px 0; font-size: 1.3rem; word-break: break-all;">${this.shareData.name}</h2>
                        <p class="theme-text-muted" style="margin: 0; font-size: 0.95rem;">${f.formatted_size} • ${f.extension.toUpperCase()}</p>
                        
                        ${branding.ownerHtml}
                        ${branding.expiryHtml}

                        <div style="margin-top: 25px;">
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        }

        // FASE 11 FIX: Geavanceerde Request View (Hernoemen voor upload & XHR Progress)
        renderRequestView() {
            const branding = this.getBrandingHtml();

            this.container.innerHTML = `
                <div class="theme-wrapper" style="display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div class="theme-card" style="padding: 40px; border-radius: 16px; width: 100%; max-width: 550px; text-align: center;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); color: #22c55e; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto;">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <h2 class="theme-text" style="margin: 0 0 5px 0;">Bestandsaanvraag</h2>
                        <p class="theme-text-muted" style="font-size: 0.95rem; margin-bottom: 5px;">Upload hier veilig bestanden voor de map <b>${this.shareData.name}</b>.</p>
                        
                        ${branding.ownerHtml}
                        ${branding.expiryHtml}
                        
                        <div id="dropzone" style="margin-top:25px; border: 2px dashed var(--border-color); border-radius: 12px; padding: 40px 20px; background: rgba(128,128,128,0.03); cursor: pointer; transition: all 0.2s; position: relative;">
                            <input type="file" id="request-file-input" style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;" multiple>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" style="margin-bottom: 10px; opacity:0.8;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            <h4 class="theme-text" style="margin:0 0 5px 0; font-size:1.1rem;">Sleep bestanden hierheen</h4>
                            <p class="theme-text-muted" style="margin:0; font-size: 0.85rem;">of klik om te bladeren</p>
                        </div>

                        <div id="upload-queue" style="margin-top: 20px; text-align: left;"></div>
                    </div>
                </div>
            `;

            const input = document.getElementById('request-file-input');
            const dropzone = document.getElementById('dropzone');

            dropzone.ondragover = () => { dropzone.style.borderColor = 'var(--primary)'; dropzone.style.background = 'rgba(59,130,246,0.05)'; };
            dropzone.ondragleave = () => { dropzone.style.borderColor = 'var(--border-color)'; dropzone.style.background = 'rgba(128,128,128,0.03)'; };
            dropzone.ondrop = () => { dropzone.style.borderColor = 'var(--border-color)'; dropzone.style.background = 'rgba(128,128,128,0.03)'; };

            input.addEventListener('change', (e) => {
                const files = e.target.files;
                if (!files.length) return;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    this.uploadQueue.push({
                        id: 'up_' + Date.now() + Math.random().toString(36).substr(2, 5),
                        file: file,
                        customName: file.name,
                        status: 'pending', // pending, uploading, success, error
                        progress: 0
                    });
                }
                input.value = ''; 
                this.renderUploadQueueUI();
            });
        }

        renderUploadQueueUI() {
            const queueDiv = document.getElementById('upload-queue');
            if (!queueDiv) return;

            if (this.uploadQueue.length === 0) {
                queueDiv.innerHTML = '';
                return;
            }

            let html = `<div style="max-height: 250px; overflow-y: auto; padding-right:5px;">`;
            
            let allDone = true;
            let hasPending = false;

            this.uploadQueue.forEach(item => {
                if (item.status !== 'success') allDone = false;
                if (item.status === 'pending') hasPending = true;

                let rightSide = '';
                if (item.status === 'pending') {
                    rightSide = `<button onclick="window.AppPublicView.removeFromQueue('${item.id}')" style="background:transparent; border:none; color:#ef4444; font-size:1.2rem; cursor:pointer;" title="Verwijderen">×</button>`;
                } else if (item.status === 'uploading') {
                    rightSide = `<span style="color:var(--primary); font-size:0.8rem; font-weight:bold;">${item.progress}%</span>`;
                } else if (item.status === 'success') {
                    rightSide = `<span style="color:#22c55e; font-size:0.8rem; font-weight:bold;">Klaar ✓</span>`;
                } else {
                    rightSide = `<span style="color:#ef4444; font-size:0.8rem; font-weight:bold;">Fout ✕</span>`;
                }

                let barHtml = '';
                if (item.status !== 'pending') {
                    const barColor = item.status === 'error' ? '#ef4444' : (item.status === 'success' ? '#22c55e' : 'var(--primary)');
                    barHtml = `
                        <div style="width:100%; height:4px; background:rgba(128,128,128,0.2); border-radius:2px; overflow:hidden; margin-top:8px;">
                            <div style="width:${item.progress}%; height:100%; background:${barColor}; transition:width 0.2s ease;"></div>
                        </div>
                    `;
                }

                const inputDisabled = item.status !== 'pending' ? 'disabled' : '';

                html += `
                    <div style="padding:12px; border-radius:8px; margin-bottom:10px; border:1px solid var(--border-color); background:var(--bg-card); box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                            <div style="flex:1;">
                                <input type="text" value="${item.customName}" ${inputDisabled} onchange="window.AppPublicView.updateCustomName('${item.id}', this.value)" style="width:100%; padding:6px 8px; border-radius:4px; border:1px solid ${item.status === 'pending' ? 'var(--border-color)' : 'transparent'}; background:transparent; color:var(--text-main); font-size:0.85rem; outline:none;">
                            </div>
                            <div>${rightSide}</div>
                        </div>
                        ${barHtml}
                    </div>
                `;
            });
            html += `</div>`;

            if (hasPending) {
                html += `<button onclick="window.AppPublicView.startUploadQueue()" class="theme-btn" style="width:100%; padding:12px; border-radius:8px; border:none; font-weight:bold; font-size:1rem; cursor:pointer; margin-top:15px;">Start Upload (${this.uploadQueue.filter(q=>q.status==='pending').length} bestanden)</button>`;
            } else if (allDone && this.uploadQueue.length > 0) {
                html += `<div style="text-align:center; padding:15px; color:#22c55e; font-weight:bold;">Alle bestanden zijn succesvol afgeleverd!</div>`;
                html += `<button onclick="window.AppPublicView.clearQueue()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:transparent; color:var(--text-main); font-weight:bold; cursor:pointer; margin-top:5px;">Nieuwe bestanden selecteren</button>`;
            }

            queueDiv.innerHTML = html;
        }

        updateCustomName(id, newName) {
            const item = this.uploadQueue.find(q => q.id === id);
            if (item && item.status === 'pending') {
                // Zorg dat de extensie behouden blijft
                const extMatch = item.file.name.match(/\.[^/.]+$/);
                const ext = extMatch ? extMatch[0] : '';
                if (!newName.endsWith(ext)) newName += ext;
                item.customName = newName;
            }
        }

        removeFromQueue(id) {
            this.uploadQueue = this.uploadQueue.filter(q => q.id !== id);
            this.renderUploadQueueUI();
        }
        
        clearQueue() {
            this.uploadQueue = [];
            this.renderUploadQueueUI();
        }

        async startUploadQueue() {
            const pendingItems = this.uploadQueue.filter(q => q.status === 'pending');
            if (pendingItems.length === 0) return;

            for (const item of pendingItems) {
                item.status = 'uploading';
                this.renderUploadQueueUI();

                await new Promise((resolve) => {
                    const fd = new FormData();
                    fd.append('token', this.token);
                    
                    // Rename truc: Gebruik een custom File object of stuur de naam los mee. 
                    // Makkelijkste is naam meegeven aan FormData blob.
                    fd.append('file', item.file, item.customName);

                    if (this.shareData.include_subfolders && this.currentDirId) {
                        fd.append('dir', this.currentDirId);
                    }

                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/public/upload', true);
                    
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            item.progress = Math.round((e.loaded / e.total) * 100);
                            this.renderUploadQueueUI();
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                if (data.status === 'success') {
                                    item.status = 'success';
                                    item.progress = 100;
                                } else {
                                    item.status = 'error';
                                }
                            } catch(err) { item.status = 'error'; }
                        } else {
                            item.status = 'error';
                        }
                        this.renderUploadQueueUI();
                        resolve();
                    };

                    xhr.onerror = () => {
                        item.status = 'error';
                        this.renderUploadQueueUI();
                        resolve();
                    };

                    xhr.send(fd);
                });
            }
        }

        async renderFolderView(targetDirId = null) {
            this.currentDirId = targetDirId;
            
            // FASE 11 FIX: Sla op in sessie geheugen
            if (this.shareData.include_subfolders) {
                localStorage.setItem(`fm_guest_dir_${this.token}`, this.currentDirId || 'root');
            }

            this.renderLoading();
            
            try {
                const query = targetDirId ? `&dir=${targetDirId}` : '';
                const res = await fetch(`/api/public/folder?token=${this.token}${query}&_t=${Date.now()}`);
                const data = await res.json();

                if (data.status === 'success') {
                    this.currentFiles = data.files || [];
                    this.currentFolders = data.folders || [];
                    this.mediaFiles = this.currentFiles.filter(f => ['jpg','jpeg','png','gif','webp','mp4','webm','ogg'].includes(f.extension.toLowerCase()));
                    this.breadcrumbs = data.breadcrumbs || [];
                    
                    this.selectedFiles.clear();
                    this.lastSelectedIndex = -1;
                    
                    this.buildFolderUI();
                } else {
                    this.renderError(data.message);
                }
            } catch (err) {
                this.renderError("Kan mapinhoud niet laden.");
            }
        }

        sortItems(items, isFolder) {
            return [...items].sort((a, b) => {
                if (this.currentSort === 'name_asc') return a.name.localeCompare(b.name);
                if (this.currentSort === 'name_desc') return b.name.localeCompare(a.name);
                if (this.currentSort === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
                if (this.currentSort === 'size_desc' && !isFolder) return b.size - a.size;
                return 0;
            });
        }

        handleItemClick(e, type, id, index) {
            if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                this.toggleSelection(id, index, false);
                return;
            }
            
            if (type === 'folder') {
                this.renderFolderView(id);
                return;
            }
            
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.toggleSelection(id, index, true);
            } else if (e.shiftKey) {
                e.preventDefault();
                this.selectRange(index);
            } else {
                const mediaIndex = this.mediaFiles.findIndex(m => m.id === id);
                if (mediaIndex > -1) {
                    this.openLightbox(mediaIndex);
                } else {
                    const downloadUrl = `/api/public/download?token=${this.token}&id=${id}`;
                    const previewUrl = `/api/public/download?token=${this.token}&id=${id}&preview=1`;
                    window.open(this.shareData.is_preview_only ? previewUrl : downloadUrl, '_self');
                }
            }
        }

        toggleSelection(id, index, rebuildUI = true) {
            if (this.selectedFiles.has(id)) {
                this.selectedFiles.delete(id);
            } else {
                this.selectedFiles.add(id);
                this.lastSelectedIndex = index;
            }
            if (rebuildUI) this.buildFolderUI();
        }
        
        selectRange(currentIndex) {
            if (this.lastSelectedIndex === -1) {
                this.toggleSelection(this.currentFiles[currentIndex].id, currentIndex, true);
                return;
            }
            
            const start = Math.min(this.lastSelectedIndex, currentIndex);
            const end = Math.max(this.lastSelectedIndex, currentIndex);
            const sortedFiles = this.sortItems(this.currentFiles, false);
            
            for (let i = start; i <= end; i++) {
                this.selectedFiles.add(sortedFiles[i].id);
            }
            this.buildFolderUI();
        }
        
        selectAll() {
            if (this.selectedFiles.size === this.currentFiles.length) {
                this.selectedFiles.clear();
            } else {
                this.currentFiles.forEach(f => this.selectedFiles.add(f.id));
            }
            this.buildFolderUI();
        }

        downloadZip(type) {
            const btnId = type === 'all' ? 'btn-download-all' : 'btn-download-selected';
            const btn = document.getElementById(btnId);
            const fab = document.getElementById('fab-download');
            
            const renderSpinner = `<div class="btn-loader" style="width:14px;height:14px;border-width:2px;border-top-color:white;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Inpakken...`;

            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = renderSpinner;
                btn.disabled = true;
                setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; this.selectedFiles.clear(); this.buildFolderUI(); }, 3500); 
            }
            
            if (fab) {
                const originalFab = fab.innerHTML;
                fab.innerHTML = renderSpinner;
                setTimeout(() => { fab.innerHTML = originalFab; this.selectedFiles.clear(); this.buildFolderUI(); }, 3500); 
            }
            
            let url = `/api/public/download?token=${this.token}&zip=1`;
            if (this.currentDirId) url += `&dir=${this.currentDirId}`;
            if (type === 'selected') {
                const ids = Array.from(this.selectedFiles).join(',');
                url += `&files=${ids}`;
            }
            window.location.href = url; 
        }

        buildFolderUI() {
            let itemsHtml = '';
            const sortedFolders = this.sortItems(this.currentFolders, true);
            const sortedFiles = this.sortItems(this.currentFiles, false);

            if (sortedFolders.length === 0 && sortedFiles.length === 0) {
                itemsHtml = `
                    <div style="text-align:center; padding:80px 20px; grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center;">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity:0.3; margin-bottom:20px; color:var(--primary);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                        <h3 class="theme-text" style="margin:0 0 8px 0;">Deze map is leeg</h3>
                        <p class="theme-text-muted" style="margin:0; font-size:0.9rem;">Er bevinden zich hier geen bestanden of onderliggende mappen.</p>
                    </div>
                `;
            } else {
                
                // Folders
                sortedFolders.forEach(f => {
                    const iconHtml = `
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--primary); opacity:0.8; margin-bottom:10px;">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    `;
                    const clickCode = `window.AppPublicView.handleItemClick(event, 'folder', ${f.id}, -1)`;

                    if (this.viewMode === 'grid') {
                        itemsHtml += `
                            <div class="theme-card theme-hover" style="border-radius:12px; padding:20px 15px; text-align:center; cursor:pointer;" onclick="${clickCode}">
                                ${iconHtml}
                                <div class="theme-text" style="font-size:0.9rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${f.name}">${f.name}</div>
                                <div class="theme-text-muted" style="font-size:0.75rem; margin-top:2px;">Submap</div>
                            </div>
                        `;
                    } else {
                        itemsHtml += `
                            <div class="theme-hover" style="display:flex; align-items:center; padding:12px 20px; border-bottom:1px solid var(--border-color); cursor:pointer; gap:15px;" onclick="${clickCode}">
                                <div style="width:20px;"></div>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--primary); opacity:0.8; flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                <span class="theme-text" style="flex:1; font-size:0.95rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>
                                <span class="theme-text-muted" style="font-size:0.85rem; width:100px; text-align:right;">Map</span>
                            </div>
                        `;
                    }
                });

                // Files
                sortedFiles.forEach((f, index) => {
                    const ext = f.extension.toLowerCase();
                    const previewUrl = `/api/public/download?token=${this.token}&id=${f.id}&preview=1`;
                    
                    const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext);
                    const isVideo = ['mp4','webm','ogg'].includes(ext);

                    let iconGrid = `<div style="font-size:3rem; margin-bottom:10px; opacity:0.8;">${f.icon || '📄'}</div>`;
                    if (isImage) iconGrid = `<div style="width:100%; height:140px; background-image:url('${previewUrl}'); background-size:cover; background-position:center; border-radius:6px; margin-bottom:10px; border:1px solid rgba(128,128,128,0.1);"></div>`;
                    else if (isVideo) iconGrid = `<video src="${previewUrl}#t=0.1" preload="metadata" style="width:100%; height:140px; object-fit:cover; border-radius:6px; margin-bottom:10px; background:#000; border:1px solid rgba(128,128,128,0.1); pointer-events:none;"></video><div style="position:absolute; top:25px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.6); color:white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">▶</div>`;

                    let iconList = `<span style="font-size:1.5rem; opacity:0.8;">${f.icon || '📄'}</span>`;
                    if (isImage) iconList = `<div style="width:32px; height:32px; border-radius:6px; background-image:url('${previewUrl}'); background-size:cover; background-position:center; border:1px solid rgba(128,128,128,0.2);"></div>`;
                    else if (isVideo) iconList = `<video src="${previewUrl}#t=0.1" style="width:32px; height:32px; object-fit:cover; border-radius:6px; background:#000;"></video>`;

                    const clickCode = `window.AppPublicView.handleItemClick(event, 'file', ${f.id}, ${index})`;
                    const isSelected = this.selectedFiles.has(f.id);
                    const selectedClass = isSelected ? 'selected' : '';
                    
                    let checkboxHtml = '';
                    if (!this.shareData.is_preview_only) {
                        checkboxHtml = `<input type="checkbox" class="pub-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); window.AppPublicView.toggleSelection(${f.id}, ${index})">`;
                    }

                    if (this.viewMode === 'grid') {
                        const boxStyle = checkboxHtml ? `position:absolute; top:12px; left:12px; z-index:10;` : `display:none;`;
                        itemsHtml += `
                            <div class="theme-card theme-hover ${selectedClass}" style="border-radius:12px; padding:15px; text-align:center; cursor:pointer; position:relative;" onclick="${clickCode}">
                                <div style="${boxStyle}">${checkboxHtml}</div>
                                ${iconGrid}
                                <div class="theme-text" style="font-size:0.9rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;" title="${f.name}">${f.name}</div>
                                <div class="theme-text-muted" style="font-size:0.75rem;">${f.formatted_size} • ${f.extension.toUpperCase()}</div>
                            </div>
                        `;
                    } else {
                        itemsHtml += `
                            <div class="theme-hover ${selectedClass}" style="display:flex; align-items:center; padding:10px 20px; border-bottom:1px solid var(--border-color); cursor:pointer; gap:15px;" onclick="${clickCode}">
                                <div style="display:flex; align-items:center; justify-content:center; width:20px;">${checkboxHtml}</div>
                                <div style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; flex-shrink:0;">${iconList}</div>
                                <div class="theme-text" style="flex:1; font-size:0.95rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</div>
                                <div class="theme-text-muted" style="font-size:0.85rem; flex-shrink:0; width:100px; text-align:right;">${f.formatted_size}</div>
                            </div>
                        `;
                    }
                });
            }

            const gridStyle = this.viewMode === 'grid' 
                ? 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;' 
                : 'display: flex; flex-direction: column; border-radius:12px; overflow:hidden; border:1px solid var(--border-color); background: var(--bg-card);';

            const branding = this.getBrandingHtml();

            let actionButtonsHtml = '';
            let fabHtml = '';
            if (!this.shareData.is_preview_only && sortedFiles.length > 0) {
                if (this.selectedFiles.size > 0) {
                    actionButtonsHtml = `<button id="btn-download-selected" onclick="window.AppPublicView.downloadZip('selected')" class="theme-btn desktop-download-btn" style="padding:8px 16px; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; gap:6px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            Download Selectie (${this.selectedFiles.size})
                                          </button>`;
                    fabHtml = `<button id="fab-download" class="mobile-fab" onclick="window.AppPublicView.downloadZip('selected')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download (${this.selectedFiles.size})</button>`;
                } else {
                    actionButtonsHtml = `<button id="btn-download-all" onclick="window.AppPublicView.downloadZip('all')" class="theme-btn desktop-download-btn" style="padding:8px 16px; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; gap:6px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            Download Map (.zip)
                                          </button>`;
                    fabHtml = `<button id="fab-download" class="mobile-fab" onclick="window.AppPublicView.downloadZip('all')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Map (.zip)</button>`;
                }
            }

            let breadcrumbsHtml = '';
            if (this.shareData.include_subfolders && this.breadcrumbs && this.breadcrumbs.length > 0) {
                breadcrumbsHtml = this.breadcrumbs.map((b, i) => {
                    if (i === this.breadcrumbs.length - 1) return `<span class="theme-text" style="font-weight:bold; display:flex; align-items:center; gap:4px;">${b.name}</span>`;
                    return `<span class="theme-text-muted theme-hover" style="cursor:pointer; transition:color 0.2s; padding:2px 6px; border-radius:4px;" onclick="window.AppPublicView.renderFolderView(${b.id === this.shareData.target_id ? 'null' : b.id})">${b.name}</span> <span style="opacity:0.4; margin:0 2px;">/</span>`;
                }).join('');
            } else if (!this.shareData.include_subfolders) {
                breadcrumbsHtml = `<span style="display:inline-flex; align-items:center; gap:6px; background:rgba(128,128,128,0.1); padding:4px 10px; border-radius:20px; font-size:0.75rem; color:var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg> Submappen verborgen</span>`;
            }

            this.container.innerHTML = `
                <div class="theme-wrapper">
                    <div class="theme-card theme-border" style="border-radius:0; border-top:none; border-left:none; border-right:none; padding: 15px 30px; position:sticky; top:0; z-index:100;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:15px;">
                            <div>
                                <h2 class="theme-text" style="margin: 0 0 4px 0; font-size:1.3rem; font-weight:800; display:flex; align-items:center; gap:10px;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    ${this.shareData.name}
                                </h2>
                                <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                                    ${branding.ownerHtml}
                                    ${branding.expiryHtml}
                                </div>
                            </div>
                            
                            <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                                
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                    <select id="public-sort" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); font-size:0.85rem; outline:none; cursor:pointer;">
                                        <option value="name_asc" ${this.currentSort === 'name_asc' ? 'selected' : ''}>Naam (A-Z)</option>
                                        <option value="name_desc" ${this.currentSort === 'name_desc' ? 'selected' : ''}>Naam (Z-A)</option>
                                        <option value="date_desc" ${this.currentSort === 'date_desc' ? 'selected' : ''}>Nieuwste eerst</option>
                                        <option value="size_desc" ${this.currentSort === 'size_desc' ? 'selected' : ''}>Grootte (Aflopend)</option>
                                    </select>
                                </div>

                                <div style="display:flex; border-radius:8px; border:1px solid var(--border-color); overflow:hidden; background:rgba(128,128,128,0.05);">
                                    <button id="btn-grid" style="padding:8px 12px; background:${this.viewMode==='grid'?'var(--primary)':'transparent'}; color:${this.viewMode==='grid'?'white':'var(--text-muted)'}; border:none; cursor:pointer;" title="Grid weergave"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
                                    <button id="btn-list" style="padding:8px 12px; background:${this.viewMode==='list'?'var(--primary)':'transparent'}; color:${this.viewMode==='list'?'white':'var(--text-muted)'}; border:none; cursor:pointer;" title="Lijst weergave"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>
                                </div>

                                ${actionButtonsHtml}
                                ${this.shareData.is_preview_only ? '<span style="color:#ef4444; font-size:0.8rem; font-weight:bold; background:rgba(239,68,68,0.1); padding:8px 12px; border-radius:8px;">👁️ Alleen Kijken</span>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div style="max-width: 1400px; margin: 0 auto; padding: 20px 30px 0 30px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div style="font-size:0.95rem; display:flex; align-items:center;">
                            ${breadcrumbsHtml}
                        </div>
                        ${!this.shareData.is_preview_only && sortedFiles.length > 0 ? `<button onclick="window.AppPublicView.selectAll()" style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:6px; color:var(--primary); padding:6px 12px; font-size:0.85rem; font-weight:bold; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(59,130,246,0.1)'">Selecteer Alles</button>` : ''}
                    </div>

                    <div style="padding: 20px 30px 60px 30px; max-width: 1400px; margin: 0 auto; overflow:hidden;">
                        <div class="slide-in-right" style="${gridStyle}">${itemsHtml}</div>
                    </div>
                    
                    ${fabHtml}
                </div>
            `;

            document.getElementById('btn-grid').onclick = () => { this.viewMode = 'grid'; this.buildFolderUI(); };
            document.getElementById('btn-list').onclick = () => { this.viewMode = 'list'; this.buildFolderUI(); };
            
            const sortDropdown = document.getElementById('public-sort');
            if (sortDropdown) {
                sortDropdown.addEventListener('change', (e) => {
                    this.currentSort = e.target.value;
                    this.buildFolderUI();
                });
            }
        }

        openLightbox(index) {
            if (index < 0 || index >= this.mediaFiles.length) return;
            this.currentMediaIndex = index;
            this.renderLightbox();
        }

        renderLightbox() {
            let lb = document.getElementById('public-lightbox');
            if (!lb) {
                lb = document.createElement('div');
                lb.id = 'public-lightbox';
                lb.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:99999; display:flex; align-items:center; justify-content:center; flex-direction:column; backdrop-filter:blur(10px); animation:fadeIn 0.2s;';
                document.body.appendChild(lb);

                this.lbKeyListener = (e) => {
                    if(e.key === 'Escape') this.closeLightbox();
                    if(e.key === 'ArrowRight') this.nextLightbox();
                    if(e.key === 'ArrowLeft') this.prevLightbox();
                };
                document.addEventListener('keydown', this.lbKeyListener);
            }

            const item = this.mediaFiles[this.currentMediaIndex];
            const previewUrl = `/api/public/download?token=${this.token}&id=${item.id}&preview=1`;
            const downloadUrl = `/api/public/download?token=${this.token}&id=${item.id}`;
            const isVideo = ['mp4','webm','ogg'].includes(item.extension.toLowerCase());

            let contentHtml = isVideo 
                ? `<video src="${previewUrl}" controls autoplay style="max-width:90vw; max-height:75vh; outline:none; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.5); background:black;"></video>` 
                : `<img src="${previewUrl}" style="max-width:90vw; max-height:75vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.5);">`;

            let prevBtn = this.currentMediaIndex > 0 
                ? `<button onclick="window.AppPublicView.prevLightbox()" style="position:absolute; left:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:none; color:white; font-size:2rem; cursor:pointer; width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">❮</button>` 
                : '';
                
            let nextBtn = this.currentMediaIndex < this.mediaFiles.length - 1 
                ? `<button onclick="window.AppPublicView.nextLightbox()" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); border:none; color:white; font-size:2rem; cursor:pointer; width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">❯</button>` 
                : '';

            let dlBtnHtml = this.shareData.is_preview_only 
                ? `<div style="color:#ef4444; font-size:0.85rem; margin-top:20px; background:rgba(239,68,68,0.2); padding:6px 12px; border-radius:6px;">Alleen Kijken</div>` 
                : `<button onclick="window.open('${downloadUrl}', '_self')" style="margin-top:20px; padding:12px 30px; border-radius:50px; background:var(--primary); color:white; border:none; font-weight:bold; cursor:pointer; box-shadow:0 4px 15px rgba(37,99,235,0.4); font-size:1rem; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">↓ Bestand Downloaden</button>`;

            lb.innerHTML = `
                <button onclick="window.AppPublicView.closeLightbox()" style="position:absolute; top:20px; right:30px; background:transparent; border:none; color:white; font-size:3rem; cursor:pointer; z-index:10; line-height:1; transition:transform 0.2s;" onmouseover="this.style.transform='rotate(90deg)'" onmouseout="this.style.transform='rotate(0deg)'">×</button>
                ${prevBtn}
                ${contentHtml}
                ${nextBtn}
                <div style="color:white; margin-top:15px; font-size:1.2rem; font-weight:600; text-shadow:0 2px 4px rgba(0,0,0,0.5);">${item.name}</div>
                <div style="color:#cbd5e1; font-size:0.85rem; margin-top:4px;">${this.currentMediaIndex + 1} van de ${this.mediaFiles.length}</div>
                ${dlBtnHtml}
            `;
        }

        closeLightbox() {
            const lb = document.getElementById('public-lightbox');
            if (lb) lb.remove();
            if (this.lbKeyListener) document.removeEventListener('keydown', this.lbKeyListener);
        }
        
        prevLightbox() { if (this.currentMediaIndex > 0) this.openLightbox(this.currentMediaIndex - 1); }
        nextLightbox() { if (this.currentMediaIndex < this.mediaFiles.length - 1) this.openLightbox(this.currentMediaIndex + 1); }

        renderLoading() {
            this.container.innerHTML = `
                <div class="theme-wrapper" style="display: flex; align-items: center; justify-content: center; flex-direction:column; gap:20px;">
                    <div style="width: 50px; height: 50px; border: 4px solid rgba(59, 130, 246, 0.2); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div class="theme-text-muted" style="font-weight:600;">Beveiligde verbinding opzetten...</div>
                </div>
            `;
        }

        renderError(message) {
            this.container.innerHTML = `
                <div class="theme-wrapper" style="display: flex; align-items: center; justify-content: center; padding:20px;">
                    <div style="text-align: center; max-width: 400px; background: rgba(0,0,0,0.3); padding: 50px 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter:blur(10px);">
                        <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" style="margin-bottom: 20px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <h2 class="theme-text" style="margin: 0 0 10px 0;">Toegang Geweigerd</h2>
                        <p class="theme-text-muted" style="line-height: 1.5;">${message}</p>
                    </div>
                </div>
            `;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new PublicView());
    } else {
        new PublicView();
    }
})();