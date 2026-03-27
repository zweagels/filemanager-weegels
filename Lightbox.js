/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/Lightbox.js */

(function() {
    class Lightbox {
        constructor() {
            this.files = [];
            this.currentIndex = 0;
            this.zoomLevel = 1;
            
            // Touch & Gesture states
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.currentX = 0;
            this.currentY = 0;
            this.isDragging = false;
            this.currentBlobUrl = null;
            
            // UI States
            this.uiTimer = null;
            this.showMetadata = false;
            this.isAnnotating = false;

            this.injectStyles();
            this.initDOM();
            this.initListeners();
        }

        injectStyles() {
            if (document.getElementById('lightbox-styles')) return;
            const style = document.createElement('style');
            style.id = 'lightbox-styles';
            style.innerHTML = `
                #lb-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 100000; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; display: flex; flex-direction: column; overflow: hidden; font-family: system-ui, sans-serif; }
                #lb-overlay.active { opacity: 1; pointer-events: all; }
                
                /* Cinematic Ambient Glow */
                #lb-ambient { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 120vw; height: 120vh; object-fit: cover; filter: blur(100px) opacity(0.4); z-index: 1; pointer-events: none; transition: all 0.5s ease; }
                
                /* Main Content Area */
                #lb-content-wrapper { flex: 1; position: relative; z-index: 10; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .lb-media { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); cursor: grab; user-select: none; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                .lb-media:active { cursor: grabbing; }
                
                /* Loader */
                .lb-loader { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: lb-spin 1s linear infinite; }
                @keyframes lb-spin { to { transform: rotate(360deg); } }

                /* Toolbar & UI (Cinematic Fade) */
                .lb-ui { transition: opacity 0.4s ease, transform 0.4s ease; z-index: 20; }
                #lb-overlay.cinematic .lb-ui { opacity: 0 !important; pointer-events: none !important; }
                
                #lb-topbar { position: absolute; top: 0; left: 0; right: 0; padding: 20px 24px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: center; color: #fff; }
                .lb-filename { font-size: 1.1rem; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw; }
                
                .lb-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 8px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(10px); transition: all 0.2s; margin-left: 8px; }
                .lb-btn:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }
                .lb-btn.active { background: rgba(59, 130, 246, 0.5); border-color: #3b82f6; }
                
                /* Navigation Arrows */
                .lb-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 50px; height: 80px; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(5px); transition: all 0.2s; z-index: 20; }
                .lb-nav:hover { background: rgba(0,0,0,0.6); }
                #lb-prev { left: 10px; border-radius: 8px; }
                #lb-next { right: 10px; border-radius: 8px; }
                
                /* Bottom Filmstrip */
                #lb-bottom { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); padding: 20px 0; display: flex; flex-direction: column; align-items: center; }
                #lb-filmstrip { display: flex; gap: 8px; overflow-x: auto; max-width: 90vw; padding: 10px; scrollbar-width: none; scroll-behavior: smooth; position: relative; }
                #lb-filmstrip::-webkit-scrollbar { display: none; }
                .lb-thumb { width: 60px; height: 60px; border-radius: 6px; object-fit: cover; cursor: pointer; opacity: 0.5; transition: all 0.2s; border: 2px solid transparent; flex-shrink: 0; }
                .lb-thumb:hover { opacity: 0.8; transform: translateY(-2px); }
                .lb-thumb.active { opacity: 1; border-color: #3b82f6; transform: scale(1.1); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
                
                /* Metadata Overlay */
                #lb-metadata { position: absolute; top: 80px; right: 24px; width: 300px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; color: #fff; z-index: 30; opacity: 0; pointer-events: none; transition: all 0.3s; transform: translateX(20px); }
                #lb-metadata.active { opacity: 1; pointer-events: all; transform: translateX(0); }
                .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; }
                .meta-row:last-child { border-bottom: none; }
                .meta-label { color: #94a3b8; }
                .lb-remove-tag:hover { color: #ef4444 !important; opacity: 1 !important; transform: scale(1.2); }

                /* Audio Player Custom UI */
                #lb-audio-wrapper { width: 400px; background: rgba(30,41,59,0.8); backdrop-filter: blur(15px); border-radius: 16px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); text-align: center; }
                .audio-waveform { display: flex; align-items: center; justify-content: center; gap: 4px; height: 60px; margin: 20px 0; }
                .wave-bar { width: 4px; background: #3b82f6; border-radius: 2px; transition: height 0.1s ease; }
                
                /* PDF Canvas Overlay */
                #lb-pdf-container { position: relative; width: 90vw; height: 90vh; background: #fff; border-radius: 8px; overflow: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); padding: 20px 0; }
                .pdf-page-wrapper { position: relative; margin: 0 auto 16px auto; width: max-content; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .pdf-page-canvas { display: block; }
                .pdf-highlight-canvas { position: absolute; top: 0; left: 0; z-index: 10; pointer-events: none; }
                .pdf-highlight-canvas.active { pointer-events: auto; cursor: crosshair; }

                /* FASE A FIX: Z-Index bescherming zodat dropdowns / modals altijd boven de lightbox uitsteken */
                .modal-overlay { z-index: 100005 !important; }
                .context-menu-root { z-index: 100005 !important; }
                .dropdown-menu { z-index: 100005 !important; }
                .tag-manager-modal { z-index: 100005 !important; }
            `;
            document.head.appendChild(style);
        }

        initDOM() {
            this.overlay = document.createElement('div');
            this.overlay.id = 'lb-overlay';
            
            this.overlay.innerHTML = `
                <img id="lb-ambient" src="" alt="ambient">
                
                <div id="lb-topbar" class="lb-ui">
                    <div class="lb-filename" id="lb-title">Bestandsnaam.jpg</div>
                    <div style="display:flex;">
                        <button class="lb-btn" id="lb-btn-fav" title="Favoriet"></button>
                        <button class="lb-btn" id="lb-btn-tag" title="Labels toewijzen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></button>
                        <button class="lb-btn" id="lb-btn-album" title="Aan album toevoegen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
                        
                        <div style="width:1px; background:rgba(255,255,255,0.2); margin:0 8px; height:30px; align-self:center;"></div>
                        
                        <button class="lb-btn" id="lb-btn-annotate" title="Markeren (PDF)" style="display:none;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg></button>
                        <button class="lb-btn" id="lb-btn-meta" title="Metadata (i)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>
                        <button class="lb-btn" id="lb-btn-download" title="Downloaden"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
                        <button class="lb-btn" id="lb-btn-close" style="background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                    </div>
                </div>

                <div id="lb-metadata">
                    <div style="font-weight:bold; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">Bestandsinformatie</div>
                    <div id="lb-meta-content"></div>
                </div>

                <div id="lb-prev" class="lb-nav lb-ui"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg></div>
                <div id="lb-next" class="lb-nav lb-ui"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></div>

                <div id="lb-content-wrapper"></div>

                <div id="lb-bottom" class="lb-ui">
                    <div id="lb-filmstrip"></div>
                </div>
            `;
            
            document.body.appendChild(this.overlay);

            this.ambient = document.getElementById('lb-ambient');
            this.wrapper = document.getElementById('lb-content-wrapper');
            this.title = document.getElementById('lb-title');
            this.filmstrip = document.getElementById('lb-filmstrip');
            this.metadataPanel = document.getElementById('lb-metadata');
        }

        initListeners() {
            document.getElementById('lb-btn-close').addEventListener('click', () => this.close());
            
            document.getElementById('lb-prev').addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
            document.getElementById('lb-next').addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
            
            document.getElementById('lb-btn-download').addEventListener('click', () => {
                const file = this.files[this.currentIndex];
                if (file) window.location.href = `/api/files?action=download&id=${file.id}&download=1`;
            });

            document.getElementById('lb-btn-meta').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMetadata = !this.showMetadata;
                this.metadataPanel.classList.toggle('active', this.showMetadata);
            });

            document.getElementById('lb-btn-annotate').addEventListener('click', (e) => {
                e.stopPropagation();
                this.isAnnotating = !this.isAnnotating;
                e.currentTarget.classList.toggle('active', this.isAnnotating);
                const canvases = document.querySelectorAll('.pdf-highlight-canvas');
                canases.forEach(c => c.classList.toggle('active', this.isAnnotating));
            });

            document.getElementById('lb-btn-fav').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite();
            });

            document.getElementById('lb-btn-tag').addEventListener('click', (e) => {
                e.stopPropagation();
                const file = this.files[this.currentIndex];
                if (file && window.App && window.App.tagManager) {
                    window.App.tagManager.show([String(file.id)]);
                }
            });

            document.getElementById('lb-btn-album').addEventListener('click', (e) => {
                e.stopPropagation();
                const file = this.files[this.currentIndex];
                if (file && window.EventBus) {
                    window.EventBus.emit('album:assign', [String(file.id)]);
                }
            });

            // FASE A FIX: Pijltjestoetsen voor bestandsnavigatie + 'i' voor metadata
            document.addEventListener('keydown', (e) => {
                if (!this.overlay.classList.contains('active')) return;
                
                // Voorkom dubbele navigatie als er een modal/input open is bóven de lightbox
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                if (e.key === 'Escape') {
                    if (this.showMetadata) {
                        this.showMetadata = false;
                        this.metadataPanel.classList.remove('active');
                    } else {
                        this.close();
                    }
                }
                if (e.key === 'ArrowRight') this.next();
                if (e.key === 'ArrowLeft') this.prev();
                if (e.key === 'i' || e.key === 'I') document.getElementById('lb-btn-meta').click();
            });

            this.overlay.addEventListener('mousemove', () => this.resetUITimer());
            this.overlay.addEventListener('touchstart', () => this.resetUITimer(), { passive: true });

            this.wrapper.addEventListener('wheel', (e) => {
                if (!this.overlay.classList.contains('active')) return;
                if(this.wrapper.querySelector('#lb-pdf-container')) return;

                e.preventDefault();
                const media = this.wrapper.querySelector('.lb-media');
                if (!media || media.tagName !== 'IMG') return;
                
                this.zoomLevel += e.deltaY * -0.005;
                this.zoomLevel = Math.min(Math.max(1, this.zoomLevel), 5);
                
                media.style.transform = `scale(${this.zoomLevel}) translate(${this.currentX}px, ${this.currentY}px)`;
            }, { passive: false });

            this.wrapper.addEventListener('mousedown', (e) => this.dragStart(e.clientX, e.clientY));
            this.wrapper.addEventListener('mousemove', (e) => this.dragMove(e.clientX, e.clientY));
            window.addEventListener('mouseup', () => this.dragEnd());

            this.wrapper.addEventListener('touchstart', (e) => {
                if(e.touches.length === 1) this.dragStart(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: true });
            this.wrapper.addEventListener('touchmove', (e) => {
                if(e.touches.length === 1) this.dragMove(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: true });
            window.addEventListener('touchend', () => this.dragEnd());
        }

        resetUITimer() {
            this.overlay.classList.remove('cinematic');
            clearTimeout(this.uiTimer);
            this.uiTimer = setTimeout(() => {
                if (!this.showMetadata && !this.isDragging && !this.isAnnotating) {
                    this.overlay.classList.add('cinematic');
                }
            }, 3000);
        }

        dragStart(x, y) {
            if(this.isAnnotating && this.wrapper.querySelector('#lb-pdf-container')) return;

            this.isDragging = true;
            this.touchStartX = x;
            this.touchStartY = y;
            this.resetUITimer();
        }

        dragMove(x, y) {
            if (!this.isDragging) return;
            const dx = x - this.touchStartX;
            const dy = y - this.touchStartY;
            
            const media = this.wrapper.querySelector('.lb-media');
            if (media && media.tagName === 'IMG' && this.zoomLevel > 1) {
                this.currentX += dx / this.zoomLevel;
                this.currentY += dy / this.zoomLevel;
                media.style.transform = `scale(${this.zoomLevel}) translate(${this.currentX}px, ${this.currentY}px)`;
                this.touchStartX = x;
                this.touchStartY = y;
            } else if (this.zoomLevel === 1 && !this.wrapper.querySelector('#lb-pdf-container')) {
                this.wrapper.style.transform = `translateX(${dx}px)`;
            }
        }

        dragEnd() {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            if (this.zoomLevel === 1 && !this.wrapper.querySelector('#lb-pdf-container')) {
                const transformMatrix = window.getComputedStyle(this.wrapper).getPropertyValue('transform');
                if (transformMatrix !== 'none') {
                    const dx = parseInt(transformMatrix.split(',')[4]);
                    
                    if (dx > 100) this.prev();
                    else if (dx < -100) this.next();
                    else {
                        this.wrapper.style.transform = 'translateX(0)';
                        this.wrapper.style.transition = 'transform 0.3s';
                        setTimeout(() => this.wrapper.style.transition = '', 300);
                    }
                }
            }
        }

        async toggleFavorite() {
            const file = this.files[this.currentIndex];
            if (!file) return;
            
            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();
                
                const isFav = file.is_favorite ? 1 : 0;
                const newFavStatus = !isFav;
                
                const res = await fetch('/api/favorite/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'file', id: file.id, is_favorite: newFavStatus, csrf_token: csrfData.csrf_token })
                });
                
                if (res.ok) {
                    file.is_favorite = newFavStatus;
                    this.updateFavoriteUI();
                    if (window.EventBus) window.EventBus.emit('view:refresh');
                    if (window.EventBus) window.EventBus.emit('notify:success', newFavStatus ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten');
                }
            } catch (e) {
                console.error('Kon favoriet niet aanpassen:', e);
            }
        }

        updateFavoriteUI() {
            const file = this.files[this.currentIndex];
            const btn = document.getElementById('lb-btn-fav');
            
            if (file && file.is_favorite) {
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
            } else {
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
            }
        }

        open(filesArray, startIndex = 0) {
            if (!filesArray || filesArray.length === 0) return;
            this.files = filesArray;
            this.currentIndex = startIndex;
            
            this.isAnnotating = false;
            document.getElementById('lb-btn-annotate').classList.remove('active');
            
            this.overlay.classList.add('active');
            this.resetUITimer();
            this.renderFilmstrip();
            this.renderCurrent();
        }

        close() {
            this.overlay.classList.remove('active');
            this.wrapper.innerHTML = '';
            this.ambient.src = '';
            
            if (this.currentBlobUrl) {
                URL.revokeObjectURL(this.currentBlobUrl);
                this.currentBlobUrl = null;
            }
        }

        prev() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.renderCurrent();
            }
        }

        next() {
            if (this.currentIndex < this.files.length - 1) {
                this.currentIndex++;
                this.renderCurrent();
            }
        }

        renderCurrent() {
            this.zoomLevel = 1;
            this.currentX = 0;
            this.currentY = 0;
            
            this.wrapper.style.transition = 'none';
            this.wrapper.style.transform = 'translateX(0)';
            
            this.wrapper.innerHTML = '<div class="lb-loader"></div>';
            
            const file = this.files[this.currentIndex];
            this.title.textContent = file.name || file.original_name;
            
            this.updateMetadata(file);
            this.updateFavoriteUI();
            this.updateFilmstripActive();
            this.preloadNeighbors();

            const ext = (file.extension || '').toLowerCase();
            const t = new Date(file.updated_at || file.created_at || Date.now()).getTime();
            
            const url = `/api/files?action=download&id=${file.id}&t=${t}`;

            document.getElementById('lb-btn-annotate').style.display = (ext === 'pdf') ? 'inline-flex' : 'none';

            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp'].includes(ext)) {
                this.renderImage(url);
            } else if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) {
                this.renderVideo(url);
            } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
                this.renderAudio(url, file);
            } else if (ext === 'pdf') {
                this.renderPDF(url);
            } else {
                this.wrapper.innerHTML = `<div style="color:#fff; text-align:center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" style="margin-bottom:16px;"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                    <p>Geen voorbeeld beschikbaar voor .${ext} bestanden.</p>
                    <a href="${url}&download=1" class="btn-modal btn-primary" style="display:inline-block; margin-top:16px; text-decoration:none;">Downloaden</a>
                </div>`;
                this.ambient.src = '';
            }

            document.getElementById('lb-prev').style.opacity = this.currentIndex > 0 ? '1' : '0.3';
            document.getElementById('lb-next').style.opacity = this.currentIndex < this.files.length - 1 ? '1' : '0.3';
        }

        async renderImage(url) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Netwerk Fout');
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    this.wrapper.innerHTML = '<div style="color:#ef4444; background:rgba(0,0,0,0.8); padding:20px; border-radius:8px; text-align:center;"><strong>Server Fout</strong><br>De foto kan niet geladen worden. Controleer of het bestand daadwerkelijk bestaat op de server.</div>';
                    return;
                }
                
                if (contentType && contentType.includes('application/json')) {
                    this.wrapper.innerHTML = '<div style="color:#ef4444; background:rgba(0,0,0,0.8); padding:20px; border-radius:8px; text-align:center;"><strong>Configuratie Fout</strong><br>De API stuurt tekst (JSON) in plaats van foto-data.</div>';
                    return;
                }

                const blob = await response.blob();
                if (this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
                this.currentBlobUrl = URL.createObjectURL(blob);
                
                const img = new Image();
                img.className = 'lb-media';
                img.onload = () => {
                    this.wrapper.innerHTML = '';
                    this.wrapper.appendChild(img);
                    this.ambient.src = this.currentBlobUrl; 
                };
                img.onerror = () => {
                    this.wrapper.innerHTML = '<div style="color:#ef4444; background:rgba(0,0,0,0.8); padding:20px; border-radius:8px;">Bestand is corrupt of onleesbaar.</div>';
                };
                img.src = this.currentBlobUrl;
            } catch (err) {
                this.wrapper.innerHTML = '<div style="color:#ef4444; background:rgba(0,0,0,0.8); padding:20px; border-radius:8px;">Fout bij inladen van de afbeelding. Controleer je connectie.</div>';
            }
        }

        renderVideo(url) {
            this.wrapper.innerHTML = `
                <video class="lb-media" controls autoplay style="border-radius:8px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                    <source src="${url}">
                    Uw browser ondersteunt deze video niet.
                </video>
            `;
            this.ambient.src = ''; 
        }

        renderAudio(url, file) {
            const savedVol = localStorage.getItem('fm_audio_vol') || 1;
            
            this.wrapper.innerHTML = `
                <div id="lb-audio-wrapper">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="margin-bottom:10px;"><circle cx="5.5" cy="17.5" r="2.5"></circle><circle cx="17.5" cy="15.5" r="2.5"></circle><path d="M8 17V5l12-2v12"></path></svg>
                    <h3 style="color:#fff; margin:0 0 5px 0; font-size:1.1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name || file.original_name}</h3>
                    <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:20px;">Audio Bestand</div>
                    
                    <div class="audio-waveform" id="audio-bars">
                        ${Array(30).fill(0).map(() => `<div class="wave-bar" style="height:4px;"></div>`).join('')}
                    </div>

                    <audio id="lb-audio-elem" controls autoplay style="width:100%; border-radius:8px; outline:none;">
                        <source src="${url}">
                    </audio>
                </div>
            `;
            this.ambient.src = '';

            const audioElem = document.getElementById('lb-audio-elem');
            audioElem.volume = savedVol;
            
            audioElem.addEventListener('volumechange', () => {
                localStorage.setItem('fm_audio_vol', audioElem.volume);
            });

            const bars = document.querySelectorAll('.wave-bar');
            let animInterval;
            
            audioElem.addEventListener('play', () => {
                animInterval = setInterval(() => {
                    bars.forEach(bar => {
                        const h = Math.floor(Math.random() * 50) + 10;
                        bar.style.height = `${h}px`;
                    });
                }, 100);
            });

            audioElem.addEventListener('pause', () => {
                clearInterval(animInterval);
                bars.forEach(bar => bar.style.height = `4px`);
            });
            
            audioElem.addEventListener('ended', () => {
                if (this.currentIndex < this.files.length - 1) this.next();
            });
        }

        renderPDF(url) {
            this.wrapper.innerHTML = '<div class="lb-loader"></div>';
            this.ambient.src = '';

            const loadPdfJs = () => {
                return new Promise((resolve) => {
                    if (window['pdfjs-dist/build/pdf']) return resolve();
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
                    script.onload = () => {
                        window.pdfjsLib = window['pdfjs-dist/build/pdf'];
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                        resolve();
                    };
                    document.head.appendChild(script);
                });
            };

            loadPdfJs().then(() => {
                this.wrapper.innerHTML = '<div id="lb-pdf-container"></div>';
                const container = document.getElementById('lb-pdf-container');

                const loadingTask = pdfjsLib.getDocument(url);
                loadingTask.promise.then(pdf => {
                    const scale = 1.5;
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        pdf.getPage(pageNum).then(page => {
                            const viewport = page.getViewport({ scale: scale });
                            
                            const pageWrapper = document.createElement('div');
                            pageWrapper.className = 'pdf-page-wrapper';
                            pageWrapper.style.width = `${viewport.width}px`;
                            pageWrapper.style.height = `${viewport.height}px`;

                            const canvas = document.createElement('canvas');
                            canvas.className = 'pdf-page-canvas';
                            const ctx = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            const highlightCanvas = document.createElement('canvas');
                            highlightCanvas.className = `pdf-highlight-canvas ${this.isAnnotating ? 'active' : ''}`;
                            highlightCanvas.height = viewport.height;
                            highlightCanvas.width = viewport.width;
                            this.setupHighlightCanvas(highlightCanvas);

                            const renderContext = { canvasContext: ctx, viewport: viewport };
                            
                            pageWrapper.appendChild(canvas);
                            pageWrapper.appendChild(highlightCanvas);
                            container.appendChild(pageWrapper);
                            
                            page.render(renderContext);
                        });
                    }
                }).catch(err => {
                    this.wrapper.innerHTML = `<iframe src="${url}" style="width:90vw; height:90vh; border:none; border-radius:8px; background:#fff; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);"></iframe>`;
                });
            });
        }

        setupHighlightCanvas(canvas) {
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 15;
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
            ctx.globalCompositeOperation = 'multiply';

            let isDrawing = false;

            const getPos = (e) => {
                const rect = canvas.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                return { x: clientX - rect.left, y: clientY - rect.top };
            };

            const start = (e) => {
                if (!this.isAnnotating) return;
                e.preventDefault();
                isDrawing = true;
                const pos = getPos(e);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            };

            const move = (e) => {
                if (!isDrawing || !this.isAnnotating) return;
                e.preventDefault();
                const pos = getPos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            };

            const stop = () => {
                if (isDrawing) {
                    ctx.closePath();
                    isDrawing = false;
                }
            };

            canvas.addEventListener('mousedown', start);
            canvas.addEventListener('mousemove', move);
            window.addEventListener('mouseup', stop);

            canvas.addEventListener('touchstart', start, { passive: false });
            canvas.addEventListener('touchmove', move, { passive: false });
            window.addEventListener('touchend', stop);
        }

        preloadNeighbors() {
            const loadHidden = (index) => {
                if (index >= 0 && index < this.files.length) {
                    const file = this.files[index];
                    const ext = (file.extension || '').toLowerCase();
                    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                        const t = new Date(file.updated_at || file.created_at || Date.now()).getTime();
                        const img = new Image();
                        img.src = `/api/files?action=download&id=${file.id}&t=${t}`;
                    }
                }
            };
            loadHidden(this.currentIndex + 1);
            loadHidden(this.currentIndex - 1);
        }

        renderFilmstrip() {
            this.filmstrip.innerHTML = '';
            this.files.forEach((file, idx) => {
                const t = new Date(file.updated_at || file.created_at || Date.now()).getTime();
                const thumbUrl = `/api/files?action=thumb&id=${file.id}&t=${t}`;
                
                const img = document.createElement('img');
                img.className = 'lb-thumb';
                img.src = thumbUrl;
                img.title = file.name || file.original_name;
                
                img.onerror = () => { img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="%231e293b"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg>'; };

                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.currentIndex = idx;
                    this.renderCurrent();
                });
                
                this.filmstrip.appendChild(img);
            });
        }

        updateFilmstripActive() {
            const thumbs = this.filmstrip.querySelectorAll('.lb-thumb');
            thumbs.forEach((th, idx) => {
                if (idx === this.currentIndex) {
                    th.classList.add('active');
                    
                    const thRect = th.getBoundingClientRect();
                    const fsRect = this.filmstrip.getBoundingClientRect();
                    const scrollLeft = th.offsetLeft - (fsRect.width / 2) + (thRect.width / 2);
                    this.filmstrip.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                } else {
                    th.classList.remove('active');
                }
            });
        }

        formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        updateMetadata(file) {
            const content = document.getElementById('lb-meta-content');
            const d = new Date(file.created_at);
            const dateStr = d.toLocaleDateString('nl-NL') + ' ' + d.toLocaleTimeString('nl-NL');
            
            content.innerHTML = `
                <div class="meta-row"><span class="meta-label">Type</span><span>${(file.extension || 'Onbekend').toUpperCase()}</span></div>
                <div class="meta-row"><span class="meta-label">Grootte</span><span>${this.formatBytes(file.size)}</span></div>
                <div class="meta-row"><span class="meta-label">Toegevoegd</span><span>${dateStr}</span></div>
            `;
            
            if (file.tags && file.tags.length > 0) {
                const tagsHtml = file.tags.map(t => `
                    <span style="background:${t.color}20; color:${t.color}; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-right:4px; display:inline-flex; align-items:center; gap:4px; margin-bottom:4px;">
                        ${t.name}
                        <span class="lb-remove-tag" data-id="${file.id}" data-tag="${t.name}" style="cursor:pointer; opacity:0.6; padding:0 2px; font-size: 1rem; line-height: 0.5;">&times;</span>
                    </span>
                `).join('');
                content.innerHTML += `<div class="meta-row" style="flex-direction:column; align-items:flex-start; margin-top:8px;"><span class="meta-label" style="margin-bottom:6px;">Labels</span><div style="display:flex; flex-wrap:wrap;">${tagsHtml}</div></div>`;
                
                content.querySelectorAll('.lb-remove-tag').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const tagToRemove = btn.dataset.tag;
                        const fileId = btn.dataset.id;
                        try {
                            const csrfRes = await fetch('/api/csrf');
                            const csrfData = await csrfRes.json();
                            const res = await fetch('/api/tags/remove', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ file_id: parseInt(fileId), tag_name: tagToRemove, csrf_token: csrfData.csrf_token })
                            });
                            if(res.ok) {
                                file.tags = file.tags.filter(t => t.name !== tagToRemove);
                                this.updateMetadata(file);
                                if (window.EventBus) {
                                    window.EventBus.emit('view:refresh');
                                    window.EventBus.emit('notify:success', 'Label succesvol verwijderd!');
                                }
                            }
                        } catch(err) {
                            console.error(err);
                        }
                    });
                });
            }
        }
    }

    window.App = window.App || {};
    const initLightbox = () => {
        if (!window.App.lightbox) window.App.lightbox = new Lightbox();
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLightbox);
    } else {
        initLightbox();
    }
})();