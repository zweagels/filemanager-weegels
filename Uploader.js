/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Upload | FILE: public/js/modules/upload/Uploader.js */

(function() {
    class Uploader {
        constructor() {
            this.queue = [];
            this.isUploading = false;
            this.csrfToken = null;
            this.totalUploadedBytes = 0;
            this.startTime = 0;
            
            this.currentTab = 'queue'; 
            this.duplicateStrategy = null;

            this.allowedExtensions = [
                'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'svg', 'bmp', 'ico', 'tiff',
                'mp4', 'm4v', 'mov', 'avi', 'wmv', 'mkv', 'webm', 'flv',
                'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac',
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'md', 'csv',
                'zip', 'rar', '7z', 'tar', 'gz', 'iso', 'dmg'
            ];

            this.initCSRF();
            this.initListeners();
            
            this.processQueue = this.processQueue.bind(this);
        }

        async initCSRF() {
            try {
                const res = await fetch('/api/csrf');
                const data = await res.json();
                this.csrfToken = data.csrf_token;
            } catch(e) { 
                console.error("CSRF laden mislukt in uploader"); 
            }
        }

        // FASE 4 FIX: In-Memory Inputs. Dit faalt NOOIT en weigert de browser nooit!
        openFileDialog() {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.addFilesToQueue(Array.from(e.target.files));
                }
            };
            input.click();
        }

        openFolderDialog() {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.webkitdirectory = true;
            input.directory = true;
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.addFilesToQueue(Array.from(e.target.files));
                }
            };
            input.click();
        }

        initListeners() {
            // Luister ALLEEN naar veilige EventBus signalen (geen klik-conflicten meer!)
            if (window.EventBus) {
                window.EventBus.on('upload:file', () => this.openFileDialog());
                window.EventBus.on('upload:folder', () => this.openFolderDialog());
                window.EventBus.on('action:upload_file', () => this.openFileDialog());
                window.EventBus.on('action:upload_folder', () => this.openFolderDialog());
            }

            document.addEventListener('paste', (e) => {
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                const files = [];
                for (let index in items) {
                    const item = items[index];
                    if (item.kind === 'file') {
                        const blob = item.getAsFile();
                        const file = new File([blob], `Geplakt_Bestand_${Date.now()}.${blob.type.split('/')[1] || 'png'}`, { type: blob.type });
                        files.push(file);
                    }
                }
                if (files.length > 0) this.addFilesToQueue(files);
            });

            ['dragenter', 'dragover', 'dragleave'].forEach(eventName => {
                document.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (eventName === 'dragover') {
                        e.dataTransfer.dropEffect = 'copy';
                    }
                }, false);
            });

            document.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    this.addFilesToQueue(Array.from(e.dataTransfer.files));
                }
            }, false);
        }

        async compressImage(file) {
            return new Promise((resolve) => {
                const compressCheckbox = document.getElementById('chk-compress');
                if ((compressCheckbox && !compressCheckbox.checked) || !file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
                    return resolve(file);
                }
                
                const img = new Image();
                const url = URL.createObjectURL(file);
                
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let width = img.width;
                    let height = img.height;
                    const max = 1920; 
                    
                    if (width > height && width > max) {
                        height *= max / width;
                        width = max;
                    } else if (height > max) {
                        width *= max / height;
                        height = max;
                    }
                    
                    canvas.width = width; canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                        if (file.webkitRelativePath) {
                            Object.defineProperty(newFile, 'webkitRelativePath', {
                                value: file.webkitRelativePath,
                                writable: false
                            });
                        }
                        resolve(newFile);
                    }, 'image/jpeg', 0.85);
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(file);
                };
                
                img.src = url;
            });
        }

        async addFilesToQueue(files) {
            let rejectedCount = 0;
            for (const originalFile of files) {
                const ext = originalFile.name.split('.').pop().toLowerCase();
                
                if (!this.allowedExtensions.includes(ext)) {
                    rejectedCount++;
                    continue;
                }

                const file = await this.compressImage(originalFile);
                const id = 'q_' + Math.random().toString(36).substr(2, 9);
                this.queue.push({
                    id: id,
                    file: file,
                    status: 'pending',
                    progress: 0,
                    handler: null,
                    error: null
                });
            }
            
            if (rejectedCount > 0 && window.EventBus) {
                window.EventBus.emit('notify:error', `${rejectedCount} bestand(en) geweigerd (ongeldig of gevaarlijk bestandsformaat).`);
            }

            this.currentTab = 'queue'; 
            this.renderUI();
            
            const panel = document.getElementById('upload-panel');
            if (panel) {
                panel.classList.add('visible');
                panel.classList.remove('minimized');
            }

            if (!this.isUploading && this.queue.some(q => q.status === 'pending')) {
                this.startUploading();
            }
        }

        async startUploading() {
            this.isUploading = true;
            this.startTime = Date.now();
            this.totalUploadedBytes = 0;
            this.duplicateStrategy = null; 
            await this.processQueue();
        }

        async processQueue() {
            const pending = this.queue.filter(q => q.status === 'pending');
            
            if (pending.length === 0) {
                this.isUploading = false;
                this.duplicateStrategy = null; 
                this.triggerConfetti();
                if (window.App.renderEngine) window.App.renderEngine.loadFolder(window.App.renderEngine.currentFolderId);
                
                setTimeout(() => {
                    const panel = document.getElementById('upload-panel');
                    if (panel && this.queue.every(q => q.status === 'success' || q.status === 'skipped')) {
                        panel.classList.remove('visible');
                        setTimeout(() => {
                            this.queue = [];
                            this.renderUI();
                        }, 500);
                    }
                }, 4000);
                return;
            }

            const current = pending[0];
            const folderId = window.App.renderEngine ? window.App.renderEngine.currentFolderId : null;
            
            if (!window.App.ChunkHandler) {
                current.status = 'error';
                current.error = "ChunkHandler niet geladen";
                this.renderUI();
                return;
            }

            current.handler = new window.App.ChunkHandler(current.file, folderId, this.csrfToken);
            
            try {
                await current.handler.process({
                    onStateChange: (state) => {
                        current.status = state;
                        this.renderUI();
                    },
                    onProgress: (percent, bytesLoaded) => {
                        current.progress = percent;
                        this.totalUploadedBytes += bytesLoaded;
                        this.renderUI();
                    },
                    onDuplicate: async (file, dbFile) => {
                        if (this.duplicateStrategy) return this.duplicateStrategy;

                        return new Promise((resolve) => {
                            const pendingCount = this.queue.filter(q => q.status === 'pending').length;
                            
                            const overlay = document.createElement('div');
                            overlay.className = 'modal-overlay visible';
                            overlay.style.zIndex = '99999';

                            const chkHtml = pendingCount > 1 ? `
                                <label style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main); margin-bottom:24px; cursor:pointer; background:rgba(37,99,235,0.05); padding:12px 16px; border-radius:8px; border: 1px solid rgba(37,99,235,0.2);">
                                    <input type="checkbox" id="dup-apply-all" style="width:18px; height:18px; cursor:pointer;">
                                    Onthoud mijn keuze voor de resterende <strong>${pendingCount - 1}</strong> wachtende bestanden
                                </label>
                            ` : '';

                            overlay.innerHTML = `
                                <div class="modal-box" style="width: 480px; max-width: 95vw; background: var(--bg-main); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; overflow:hidden;">
                                    <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; align-items:center; gap:12px;">
                                        <div style="width:36px; height:36px; border-radius:50%; background:rgba(245, 158, 11, 0.1); color:#f59e0b; display:flex; align-items:center; justify-content:center;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        </div>
                                        <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">Bestand bestaat al</h3>
                                    </div>
                                    <div style="padding:24px;">
                                        <p style="color:var(--text-muted); font-size:0.95rem; margin-top:0; margin-bottom: ${pendingCount > 1 ? '16px' : '24px'}; line-height:1.5;">
                                            Het bestand <strong style="color:var(--text-main); word-break:break-all;">"${file.name}"</strong> lijkt al te bestaan op deze locatie. Wat wil je doen?
                                        </p>
                                        ${chkHtml}
                                        <div style="display:flex; justify-content:flex-end; gap:12px;">
                                            <button class="btn-modal btn-secondary" id="dup-skip">Overslaan</button>
                                            <button class="btn-modal btn-primary" id="dup-overwrite">Overschrijven</button>
                                        </div>
                                    </div>
                                </div>
                            `;

                            document.body.appendChild(overlay);

                            const chkAll = overlay.querySelector('#dup-apply-all');

                            overlay.querySelector('#dup-skip').onclick = () => {
                                if (chkAll && chkAll.checked) this.duplicateStrategy = 'skip';
                                overlay.remove();
                                resolve('skip');
                            };

                            overlay.querySelector('#dup-overwrite').onclick = () => {
                                if (chkAll && chkAll.checked) this.duplicateStrategy = 'overwrite';
                                overlay.remove();
                                resolve('overwrite');
                            };
                        });
                    },
                    onSuccess: (res) => {
                        current.status = res.status === 'skipped' ? 'skipped' : 'success';
                        this.renderUI();
                    },
                    onError: (err) => {
                        current.status = 'error';
                        current.error = err.message;
                        this.renderUI();
                    }
                });
            } catch (e) {
                current.status = 'error';
                current.error = e.message;
                this.renderUI();
            }

            this.processQueue();
        }

        reorderQueue(draggedId, targetId) {
            const draggedIndex = this.queue.findIndex(q => q.id === draggedId);
            const targetIndex = this.queue.findIndex(q => q.id === targetId);
            if (draggedIndex > -1 && targetIndex > -1) {
                const item = this.queue.splice(draggedIndex, 1)[0];
                this.queue.splice(targetIndex, 0, item);
                this.renderUI();
            }
        }

        formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024, dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        renderUI() {
            const panel = document.getElementById('upload-panel');
            if (!panel) return;

            const headerTitle = panel.querySelector('.upload-title');
            const listEl = panel.querySelector('.upload-list');
            const speedEl = panel.querySelector('.upload-speed');
            const etaEl = panel.querySelector('.upload-eta');
            const totalProg = panel.querySelector('.upload-total-progress .progress-fill');

            const total = this.queue.length;
            const done = this.queue.filter(q => ['success', 'skipped', 'error'].includes(q.status)).length;
            const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

            if (headerTitle) {
                headerTitle.textContent = this.isUploading ? `Uploaden... (${done}/${total})` : `Uploads voltooid (${done}/${total})`;
            }
            if (totalProg) totalProg.style.width = `${percentage}%`;

            this.updateFavicon(percentage);

            if (this.isUploading && speedEl && etaEl) {
                const elapsedSec = (Date.now() - this.startTime) / 1000;
                const speedBps = elapsedSec > 0 ? this.totalUploadedBytes / elapsedSec : 0;
                if(speedEl) speedEl.textContent = `${this.formatBytes(speedBps)}/s`;

                let bytesTotal = 0;
                this.queue.forEach(q => { bytesTotal += q.file.size; });
                const bytesLeft = Math.max(0, bytesTotal - this.totalUploadedBytes);
                const etaSec = speedBps > 0 ? bytesLeft / speedBps : 0;
                
                if(etaEl) etaEl.textContent = etaSec > 60 ? `~${Math.ceil(etaSec / 60)} min resterend` : `~${Math.ceil(etaSec)} sec resterend`;
            } else {
                if(speedEl) speedEl.textContent = '';
                if(etaEl) etaEl.textContent = '';
            }

            if (listEl) {
                const tabsHtml = `
                    <div class="upload-tabs" style="display:flex; border-bottom:1px solid var(--border-dropdown); margin-bottom:10px;">
                        <button class="tab-btn ${this.currentTab === 'queue' ? 'active' : ''}" data-tab="queue" style="flex:1; padding:8px; background:none; border:none; border-bottom:2px solid ${this.currentTab === 'queue' ? 'var(--primary)' : 'transparent'}; color:${this.currentTab === 'queue' ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:bold; cursor:pointer; transition:all 0.2s;">Wachtrij</button>
                        <button class="tab-btn ${this.currentTab === 'done' ? 'active' : ''}" data-tab="done" style="flex:1; padding:8px; background:none; border:none; border-bottom:2px solid ${this.currentTab === 'done' ? 'var(--primary)' : 'transparent'}; color:${this.currentTab === 'done' ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:bold; cursor:pointer; transition:all 0.2s;">Voltooid</button>
                        <button class="tab-btn ${this.currentTab === 'errors' ? 'active' : ''}" data-tab="errors" style="flex:1; padding:8px; background:none; border:none; border-bottom:2px solid ${this.currentTab === 'errors' ? 'var(--error)' : 'transparent'}; color:${this.currentTab === 'errors' ? 'var(--error)' : 'var(--text-muted)'}; font-weight:bold; cursor:pointer; transition:all 0.2s;">Fouten</button>
                    </div>
                    <div id="upload-items-container" style="display:flex; flex-direction:column; gap:8px; flex:1; overflow-y:auto; padding-right:4px;"></div>
                `;
                listEl.innerHTML = tabsHtml;

                listEl.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.currentTab = e.target.dataset.tab;
                        this.renderUI();
                    });
                });

                const itemsContainer = listEl.querySelector('#upload-items-container');

                let filteredQueue = [];
                if (this.currentTab === 'queue') {
                    filteredQueue = this.queue.filter(q => ['pending', 'hashing', 'checking', 'uploading', 'merging'].includes(q.status));
                } else if (this.currentTab === 'done') {
                    filteredQueue = this.queue.filter(q => ['success', 'skipped'].includes(q.status));
                } else if (this.currentTab === 'errors') {
                    filteredQueue = this.queue.filter(q => ['error'].includes(q.status));
                }

                if (filteredQueue.length === 0) {
                    itemsContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.9rem;">Geen items in deze lijst.</div>`;
                }

                filteredQueue.forEach(q => {
                    const item = document.createElement('div');
                    item.className = 'upload-item';
                    item.dataset.id = q.id;
                    
                    let statusIcon = '';
                    let statusText = '';
                    let progressHtml = '';

                    switch(q.status) {
                        case 'pending': 
                            statusText = '<span style="cursor:grab;" title="Sleep om prioriteit te wijzigen">Wachtrij ☰</span>'; 
                            break;
                        case 'hashing': statusText = 'Analyseren...'; break;
                        case 'checking': statusText = 'Controleren...'; break;
                        case 'uploading': 
                            statusText = `${q.progress}%`; 
                            progressHtml = `<div class="item-progress" style="margin-top:6px; height:4px; background:rgba(128,128,128,0.2); border-radius:2px; overflow:hidden;"><div class="item-progress-fill" style="width:${q.progress}%; height:100%; background:var(--primary); transition:width 0.2s;"></div></div>`;
                            break;
                        case 'merging': statusText = 'Samenvoegen...'; break;
                        case 'success': statusIcon = '<span style="color:var(--success)">✔</span>'; statusText = 'Voltooid'; break;
                        case 'skipped': statusIcon = '<span style="color:var(--warning)">⏭</span>'; statusText = 'Overgeslagen'; break;
                        case 'error': 
                            statusIcon = '<span style="color:var(--error)">✖</span>'; 
                            statusText = `<span class="upload-error-text" title="${q.error}" style="color:var(--error); cursor:help;">Mislukt</span>
                                          <button class="btn-text-small btn-retry" data-id="${q.id}" style="margin-left:8px; padding:2px 6px; background:var(--bg-surface); border:1px solid var(--border-dropdown); border-radius:4px; cursor:pointer;">Probeer</button>`; 
                            break;
                    }

                    item.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <div class="item-info" style="display:flex; flex-direction:column; min-width:0; flex:1; margin-right:12px;">
                                <span class="item-name" title="${q.file.name}" style="font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${q.file.name}</span>
                                <span class="item-size" style="font-size:0.7rem; color:var(--text-muted);">${this.formatBytes(q.file.size)}</span>
                            </div>
                            <div class="item-status" style="font-size:0.8rem; font-weight:600; white-space:nowrap;">${statusIcon} <span class="status-label">${statusText}</span></div>
                        </div>
                        ${progressHtml}
                    `;
                    
                    item.style.padding = '10px';
                    item.style.background = 'var(--bg-surface)';
                    item.style.border = '1px solid var(--border-dropdown)';
                    item.style.borderRadius = '8px';

                    if (q.status === 'pending' && this.currentTab === 'queue') {
                        item.setAttribute('draggable', 'true');
                        item.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('text/plain', q.id);
                            item.style.opacity = '0.4';
                        });
                        item.addEventListener('dragend', () => {
                            item.style.opacity = '1';
                            itemsContainer.querySelectorAll('.upload-item').forEach(el => el.style.borderTop = '1px solid var(--border-dropdown)');
                        });
                        item.addEventListener('dragover', (e) => {
                            e.preventDefault();
                            item.style.borderTop = '2px dashed var(--primary)';
                        });
                        item.addEventListener('dragleave', () => {
                            item.style.borderTop = '1px solid var(--border-dropdown)';
                        });
                        item.addEventListener('drop', (e) => {
                            e.preventDefault();
                            item.style.borderTop = '1px solid var(--border-dropdown)';
                            const draggedId = e.dataTransfer.getData('text/plain');
                            if (draggedId !== q.id) {
                                this.reorderQueue(draggedId, q.id);
                            }
                        });
                    }

                    itemsContainer.appendChild(item);
                });

                itemsContainer.querySelectorAll('.btn-retry').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const qItem = this.queue.find(x => x.id === e.target.dataset.id);
                        if (qItem) {
                            qItem.status = 'pending'; qItem.error = null;
                            if (!this.isUploading) this.startUploading(); else this.renderUI();
                        }
                    });
                });
            }
        }

        updateFavicon(percentage) {
            const canvas = document.createElement('canvas');
            canvas.width = 32; canvas.height = 32;
            const ctx = canvas.getContext('2d');
            
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, 2 * Math.PI);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            
            if (percentage > 0 && percentage < 100) {
                ctx.beginPath();
                ctx.moveTo(16, 16);
                ctx.arc(16, 16, 16, -0.5 * Math.PI, (-0.5 + (percentage / 50)) * Math.PI);
                ctx.fillStyle = '#2563EB';
                ctx.fill();
            } else if (percentage >= 100) {
                ctx.beginPath(); ctx.arc(16, 16, 16, 0, 2 * Math.PI);
                ctx.fillStyle = '#10b981'; ctx.fill();
            }

            let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon'; link.rel = 'shortcut icon';
            link.href = canvas.toDataURL('image/png');
            document.getElementsByTagName('head')[0].appendChild(link);
        }

        triggerConfetti() {
            if (this.queue.filter(q => q.status === 'success').length === 0) return;
            for(let i=0; i<40; i++) {
                const conf = document.createElement('div');
                conf.className = 'confetti-piece';
                conf.style.left = Math.random() * 100 + 'vw';
                conf.style.animationDuration = (Math.random() * 3 + 2) + 's';
                conf.style.backgroundColor = ['#2563EB', '#10b981', '#f59e0b', '#ef4444', '#a855f7'][Math.floor(Math.random()*5)];
                document.body.appendChild(conf);
                setTimeout(() => conf.remove(), 5000);
            }
        }
    }

    window.App = window.App || {};
    window.App.uploader = new Uploader();
})();