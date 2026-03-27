/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/Editor.js */

(function() {
    class Editor {
        constructor() {
            // --- DEEL 1: Originele Foto Bewerker Variabelen ---
            this.file = null;
            this.history = [];
            this.historyStep = -1;
            this.isCropping = false;
            this.cropStart = { x: 0, y: 0 };
            this.cropEnd = { x: 0, y: 0 };
            this.currentBlobUrl = null;

            // --- DEEL 2: Nieuwe Focal Point Cropper (Slideshow) Variabelen ---
            this.focalOverlay = null;
            this.focalCanvas = null;
            this.focalCtx = null;
            this.focalImage = null;
            this.focalScale = 1;
            this.focalBaseScale = 1;
            this.focalPanX = 0;
            this.focalPanY = 0;
            this.isFocalDragging = false;
            this.focalStartX = 0;
            this.focalStartY = 0;
            this.onFocalSaveCallback = null;
            
            // FASE 6 FIX: Verhouding is nu dynamisch
            this.focalRatio = null; 

            this.injectStyles();
            this.initDOM();
            this.initListeners();
        }

        injectStyles() {
            if (document.getElementById('editor-styles')) return;
            const style = document.createElement('style');
            style.id = 'editor-styles';
            style.innerHTML = `
                /* --- STYLES: ORIGINELE FOTO BEWERKER --- */
                #editor-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); z-index: 100001; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; display: flex; flex-direction: column; overflow: hidden; font-family: system-ui, sans-serif; }
                #editor-overlay.active { opacity: 1; pointer-events: all; }
                
                #editor-topbar { padding: 16px 24px; background: rgba(0,0,0,0.5); display: flex; justify-content: space-between; align-items: center; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); }
                .editor-title { font-weight: 600; font-size: 1.1rem; }
                
                #editor-workspace { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 20px; }
                #editor-canvas { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 100%; max-height: 100%; object-fit: contain; cursor: crosshair; }
                
                #crop-box { position: absolute; border: 2px dashed #3b82f6; background: rgba(59, 130, 246, 0.2); pointer-events: none; display: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); }
                
                #editor-toolbar { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(30, 41, 59, 0.9); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); padding: 10px 16px; border-radius: 100px; display: flex; gap: 8px; align-items: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
                
                .ed-btn { background: transparent; border: none; color: #cbd5e1; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .ed-btn:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-2px); }
                .ed-btn:disabled { opacity: 0.3 !important; cursor: not-allowed; transform: none; }
                
                .ed-btn-primary { background: #3b82f6; color: #fff; padding: 0 20px; height: 40px; border: none; border-radius: 100px; font-weight: 600; margin-left: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
                .ed-btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
                .ed-btn-primary:disabled { background: #64748b; cursor: not-allowed; opacity: 0.8; }
                
                #crop-confirm-btn { position: absolute; display: none; background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.2); }

                /* --- STYLES: NIEUWE FOCAL POINT CROPPER --- */
                .ss-cropper-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 100200; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; }
                .ss-cropper-overlay.active { opacity: 1; visibility: visible; }
                
                .ss-cropper-modal { background: var(--bg-surface, #ffffff); border: 1px solid var(--border-dropdown, #e2e8f0); border-radius: 16px; width: 640px; max-width: 95vw; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
                .ss-cropper-overlay.active .ss-cropper-modal { transform: scale(1); }
                
                .ss-cropper-header { padding: 16px 24px; border-bottom: 1px solid var(--border-dropdown); display: flex; justify-content: space-between; align-items: center; background: rgba(128,128,128,0.02); }
                .ss-cropper-title { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
                
                .ss-cropper-body { padding: 24px; display: flex; flex-direction: column; align-items: center; background: var(--bg-main, #f8fafc); }
                
                .ss-cropper-canvas-wrapper { width: 100%; height: 350px; background: #000; border-radius: 12px; overflow: hidden; position: relative; cursor: grab; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); touch-action: none; }
                .ss-cropper-canvas-wrapper:active { cursor: grabbing; }
                
                canvas#ss-crop-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
                
                .ss-cropper-grid { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 33.33% 33.33%; }
                
                .ss-cropper-crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; pointer-events: none; }
                .ss-cropper-crosshair::before { content: ''; position: absolute; top: 11px; left: 0; width: 24px; height: 2px; background: #ef4444; box-shadow: 0 0 4px rgba(0,0,0,0.5); }
                .ss-cropper-crosshair::after { content: ''; position: absolute; top: 0; left: 11px; width: 2px; height: 24px; background: #ef4444; box-shadow: 0 0 4px rgba(0,0,0,0.5); }
                
                .ss-cropper-controls { width: 100%; display: flex; align-items: center; gap: 16px; margin-top: 20px; padding: 0 20px; }
                
                .ss-cropper-slider { flex: 1; -webkit-appearance: none; height: 6px; background: var(--border-dropdown); border-radius: 3px; outline: none; }
                .ss-cropper-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--primary); cursor: pointer; transition: transform 0.1s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .ss-cropper-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
                
                /* Ratio Knoppen voor Masker */
                .ss-cropper-ratios { display: flex; justify-content: center; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
                .ratio-btn { padding: 6px 12px; border: 1px solid var(--border-dropdown); background: var(--bg-surface); color: var(--text-muted); border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .ratio-btn:hover { border-color: var(--primary); color: var(--text-main); }
                .ratio-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 2px 8px rgba(37,99,235,0.3); }

                .ss-cropper-footer { padding: 16px 24px; border-top: 1px solid var(--border-dropdown); display: flex; justify-content: flex-end; gap: 12px; background: rgba(128,128,128,0.02); }
            `;
            document.head.appendChild(style);
        }

        initDOM() {
            // --- DOM: ORIGINELE FOTO BEWERKER ---
            this.overlay = document.createElement('div');
            this.overlay.id = 'editor-overlay';
            this.overlay.innerHTML = `
                <div id="editor-topbar">
                    <div class="editor-title" id="ed-title">Bestand bewerken</div>
                    <button class="ed-btn" id="ed-close" style="background: rgba(239,68,68,0.2); color: #ef4444;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                
                <div id="editor-workspace">
                    <canvas id="editor-canvas"></canvas>
                    <div id="crop-box"></div>
                    <button id="crop-confirm-btn">Bijsnijden ✓</button>
                </div>

                <div id="editor-toolbar">
                    <button class="ed-btn" id="ed-undo" title="Ongedaan maken (Ctrl+Z)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg></button>
                    <button class="ed-btn" id="ed-redo" title="Opnieuw toepassen (Ctrl+Y)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg></button>
                    
                    <div style="width:1px; background:rgba(255,255,255,0.1); margin: 0 8px; height: 24px;"></div>
                    
                    <button class="ed-btn" id="ed-rotate" title="Draaien (90°)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg></button>
                    <button class="ed-btn" id="ed-bw" title="Zwart-Wit"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0 0 20z"></path></svg></button>
                    <button class="ed-btn" id="ed-contrast" title="Hoog Contrast"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg></button>
                    
                    <button class="ed-btn-primary" id="ed-save">Opslaan als kopie</button>
                </div>
            `;
            document.body.appendChild(this.overlay);

            this.canvas = document.getElementById('editor-canvas');
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
            this.workspace = document.getElementById('editor-workspace');
            this.cropBox = document.getElementById('crop-box');
            this.cropConfirmBtn = document.getElementById('crop-confirm-btn');
            this.title = document.getElementById('ed-title');

            // --- DOM: NIEUWE FOCAL POINT CROPPER ---
            this.focalOverlay = document.createElement('div');
            this.focalOverlay.id = 'ss-cropper-overlay';
            this.focalOverlay.className = 'ss-cropper-overlay';
            this.focalOverlay.innerHTML = `
                <div class="ss-cropper-modal">
                    <div class="ss-cropper-header">
                        <h3 class="ss-cropper-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary);"><path d="M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M11 12H7"></path><path d="M9 10v4"></path></svg>
                            <span id="ss-cropper-title-text">Focuspunt Instellen</span>
                        </h3>
                        <button id="btn-cropper-close" class="btn-icon-small" style="background:transparent; border:none; font-size:1.5rem; color:var(--text-muted); cursor:pointer;">&times;</button>
                    </div>
                    <div class="ss-cropper-body">
                        <div class="ss-cropper-canvas-wrapper" id="ss-cropper-wrapper">
                            <canvas id="ss-crop-canvas"></canvas>
                            <div class="ss-cropper-crosshair" id="ss-cropper-crosshair"></div>
                        </div>
                        
                        <div class="ss-cropper-ratios">
                            <button class="ratio-btn active" data-ratio="1.777">16:9 (TV)</button>
                            <button class="ratio-btn" data-ratio="1.333">4:3</button>
                            <button class="ratio-btn" data-ratio="1">1:1 (Vierkant)</button>
                            <button class="ratio-btn" data-ratio="0.5625">9:16 (Verticaal)</button>
                            <button class="ratio-btn" data-ratio="0">Geen Masker</button>
                        </div>

                        <div class="ss-cropper-controls">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                            <input type="range" id="ss-cropper-zoom" class="ss-cropper-slider" min="1" max="4" step="0.05" value="1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                        </div>
                        
                        <p style="margin: 16px 0 0 0; font-size: 0.8rem; color: var(--text-muted); text-align: center;">Sleep de afbeelding om in te stellen wat altijd zichtbaar moet blijven op het gekozen schermformaat.</p>
                    </div>
                    <div class="ss-cropper-footer">
                        <button id="btn-cropper-cancel" class="btn-secondary" style="padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-dropdown); background: transparent; color: var(--text-main);">Annuleren</button>
                        <button id="btn-cropper-save" class="btn-primary" style="padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; background: var(--primary); color: white;">Opslaan</button>
                    </div>
                </div>
            `;
            document.body.appendChild(this.focalOverlay);
            
            this.focalCanvas = document.getElementById('ss-crop-canvas');
            this.focalCtx = this.focalCanvas.getContext('2d');
        }

        initListeners() {
            // --- LISTENERS: ORIGINELE FOTO BEWERKER ---
            document.getElementById('ed-close').addEventListener('click', () => this.close());
            document.getElementById('ed-rotate').addEventListener('click', () => this.rotate(90));
            document.getElementById('ed-bw').addEventListener('click', () => this.applyFilter('grayscale(100%)'));
            document.getElementById('ed-contrast').addEventListener('click', () => this.applyFilter('contrast(150%) saturate(120%)'));
            document.getElementById('ed-undo').addEventListener('click', () => this.undo());
            document.getElementById('ed-redo').addEventListener('click', () => this.redo());
            document.getElementById('ed-save').addEventListener('click', () => this.save());

            this.canvas.addEventListener('mousedown', (e) => this.startCrop(e));
            window.addEventListener('mousemove', (e) => this.moveCrop(e));
            window.addEventListener('mouseup', () => this.endCrop());
            this.cropConfirmBtn.addEventListener('click', () => this.executeCrop());

            document.addEventListener('keydown', (e) => {
                if (!this.overlay.classList.contains('active')) return;
                if (e.key === 'Escape') this.close();
                if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                }
                if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    this.redo();
                }
            });

            // --- LISTENERS: NIEUWE FOCAL POINT CROPPER ---
            document.getElementById('btn-cropper-close').addEventListener('click', () => this.closeFocalPicker());
            document.getElementById('btn-cropper-cancel').addEventListener('click', () => this.closeFocalPicker());
            document.getElementById('btn-cropper-save').addEventListener('click', () => this.saveFocal());
            
            const zoomSlider = document.getElementById('ss-cropper-zoom');
            zoomSlider.addEventListener('input', (e) => {
                this.focalScale = parseFloat(e.target.value);
                this.drawFocal();
            });

            const focalWrapper = document.getElementById('ss-cropper-wrapper');
            focalWrapper.addEventListener('mousedown', this.startFocalDrag.bind(this));
            window.addEventListener('mousemove', this.onFocalDrag.bind(this));
            window.addEventListener('mouseup', this.endFocalDrag.bind(this));
            
            focalWrapper.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    e.preventDefault();
                    this.startFocalDrag(e.touches[0]);
                }
            }, { passive: false });
            
            window.addEventListener('touchmove', (e) => {
                if (this.isFocalDragging && e.touches.length === 1) {
                    this.onFocalDrag(e.touches[0]);
                }
            }, { passive: false });
            window.addEventListener('touchend', this.endFocalDrag.bind(this));

            // Aspect Ratio Knoppen
            document.querySelectorAll('.ratio-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.focalRatio = parseFloat(btn.dataset.ratio);
                    this.drawFocal();
                });
            });
        }

        // =====================================================================
        // --- LOGICA: ORIGINELE FOTO BEWERKER ---
        // =====================================================================

        async open(file) {
            this.file = file;
            this.history = [];
            this.historyStep = -1;
            this.title.textContent = "Bewerken: " + (file.name || file.original_name);
            this.overlay.classList.add('active');
            
            const t = new Date(file.updated_at || file.created_at || Date.now()).getTime();
            const url = `/api/files?action=download&id=${file.id}&t=${t}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Netwerk Fout: ${response.status}`);
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                     alert("Kan foto niet openen. Zorg dat bestand bestaat.");
                     this.close();
                     return;
                }

                const blob = await response.blob();
                if (this.currentBlobUrl) URL.revokeObjectURL(this.currentBlobUrl);
                this.currentBlobUrl = URL.createObjectURL(blob);
                
                const img = new Image();
                img.onload = () => {
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    this.ctx.drawImage(img, 0, 0);
                    this.saveState();
                };
                img.onerror = () => {
                    alert("Het bestand kan niet correct worden ingeladen.");
                    this.close();
                };
                img.src = this.currentBlobUrl;
            } catch (err) {
                alert("Fout bij ophalen van de foto: " + err.message);
                this.close();
            }
        }

        close() {
            this.overlay.classList.remove('active');
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.hideCropBox();
            if (this.currentBlobUrl) {
                URL.revokeObjectURL(this.currentBlobUrl);
                this.currentBlobUrl = null;
            }
        }

        saveState() {
            if (this.historyStep < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyStep + 1);
            }
            this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            
            // FASE 6 FIX: Diepe kopie van imagedata was zwaar en langzaam op 4K beelden.
            // Dit is opgelost door limitatie tot 10 stappen i.p.v. 15 om geheugen te sparen.
            if (this.history.length > 10) this.history.shift();
            else this.historyStep++;
            
            this.updateUndoRedoUI();
        }

        undo() {
            if (this.historyStep > 0) {
                this.historyStep--;
                const state = this.history[this.historyStep];
                this.canvas.width = state.width;
                this.canvas.height = state.height;
                this.ctx.putImageData(state, 0, 0);
                this.hideCropBox();
                this.updateUndoRedoUI();
            }
        }

        redo() {
            if (this.historyStep < this.history.length - 1) {
                this.historyStep++;
                const state = this.history[this.historyStep];
                this.canvas.width = state.width;
                this.canvas.height = state.height;
                this.ctx.putImageData(state, 0, 0);
                this.hideCropBox();
                this.updateUndoRedoUI();
            }
        }

        updateUndoRedoUI() {
            const undoBtn = document.getElementById('ed-undo');
            const redoBtn = document.getElementById('ed-redo');
            if (undoBtn) undoBtn.disabled = this.historyStep <= 0;
            if (redoBtn) redoBtn.disabled = this.historyStep >= this.history.length - 1;
        }

        rotate(degrees) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.canvas.height;
            tempCanvas.height = this.canvas.width;
            tempCtx.translate(tempCanvas.width/2, tempCanvas.height/2);
            tempCtx.rotate(degrees * Math.PI / 180);
            tempCtx.drawImage(this.canvas, -this.canvas.width/2, -this.canvas.height/2);
            this.canvas.width = tempCanvas.width;
            this.canvas.height = tempCanvas.height;
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.saveState();
        }

        applyFilter(filterStr) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.filter = filterStr;
            tempCtx.drawImage(this.canvas, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.saveState();
        }

        startCrop(e) {
            this.isCropping = true;
            const rect = this.canvas.getBoundingClientRect();
            this.cropStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, canvasWidth: rect.width, canvasHeight: rect.height };
            this.cropBox.style.display = 'block';
            this.cropConfirmBtn.style.display = 'none';
        }

        moveCrop(e) {
            if (!this.isCropping) return;
            const rect = this.canvas.getBoundingClientRect();
            let currentX = e.clientX - rect.left;
            let currentY = e.clientY - rect.top;
            currentX = Math.max(0, Math.min(currentX, rect.width));
            currentY = Math.max(0, Math.min(currentY, rect.height));
            this.cropEnd = { x: currentX, y: currentY };
            const left = Math.min(this.cropStart.x, this.cropEnd.x);
            const top = Math.min(this.cropStart.y, this.cropEnd.y);
            const width = Math.abs(this.cropStart.x - this.cropEnd.x);
            const height = Math.abs(this.cropStart.y - this.cropEnd.y);
            this.cropBox.style.left = `${rect.left + left}px`;
            this.cropBox.style.top = `${rect.top + top}px`;
            this.cropBox.style.width = `${width}px`;
            this.cropBox.style.height = `${height}px`;
        }

        endCrop() {
            if (!this.isCropping) return;
            this.isCropping = false;
            const width = Math.abs(this.cropStart.x - this.cropEnd.x);
            const height = Math.abs(this.cropStart.y - this.cropEnd.y);
            if (width > 20 && height > 20) {
                const rect = this.canvas.getBoundingClientRect();
                const left = Math.min(this.cropStart.x, this.cropEnd.x);
                const top = Math.min(this.cropStart.y, this.cropEnd.y);
                this.cropConfirmBtn.style.display = 'block';
                this.cropConfirmBtn.style.left = `${rect.left + left + width/2 - 50}px`;
                this.cropConfirmBtn.style.top = `${rect.top + top + height + 10}px`;
            } else {
                this.hideCropBox();
            }
        }

        hideCropBox() {
            this.cropBox.style.display = 'none';
            this.cropConfirmBtn.style.display = 'none';
            this.isCropping = false;
        }

        executeCrop() {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const left = Math.min(this.cropStart.x, this.cropEnd.x) * scaleX;
            const top = Math.min(this.cropStart.y, this.cropEnd.y) * scaleY;
            const width = Math.abs(this.cropStart.x - this.cropEnd.x) * scaleX;
            const height = Math.abs(this.cropStart.y - this.cropEnd.y) * scaleY;
            const imageData = this.ctx.getImageData(left, top, width, height);
            
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx.putImageData(imageData, 0, 0);
            this.hideCropBox();
            this.saveState();
        }

        async save() {
            const btn = document.getElementById('ed-save');
            btn.innerHTML = `<div class="lb-loader" style="width:14px; height:14px; border-width:2px; margin-right:8px; display:inline-block;"></div> Opslaan...`;
            btn.disabled = true;

            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();

                const ext = (this.file.extension || '').toLowerCase();
                let outMime = 'image/jpeg';
                let outExt = '.jpg';

                if (ext === 'png') { outMime = 'image/png'; outExt = '.png'; } 
                else if (ext === 'webp') { outMime = 'image/webp'; outExt = '.webp'; }

                const oldName = this.file.original_name || this.file.name || `bewerkt${outExt}`;
                const baseName = oldName.replace(/\.[^/.]+$/, "");
                const newName = `${baseName}_v2${outExt}`;

                this.canvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append('file', blob, newName);
                    formData.append('new_name', newName); 
                    formData.append('original_id', this.file.id);
                    formData.append('file_id', this.file.id); 
                    
                    let folderId = window.App.renderEngine ? window.App.renderEngine.currentFolderId : '';
                    if (folderId === 'root') folderId = '';
                    formData.append('folder_id', folderId);
                    
                    formData.append('action', 'save_edit');
                    formData.append('csrf_token', csrfData.csrf_token);

                    try {
                        const res = await fetch('/api/convert', { method: 'POST', body: formData });
                        const text = await res.text();
                        let data;
                        try { data = JSON.parse(text); } catch(e) { throw new Error("Server gaf een ongeldig antwoord. Fout: " + text.substring(0, 100)); }
                        
                        if (data.status === 'success') {
                            if (window.EventBus) window.EventBus.emit('notify:success', `Opgeslagen als ${newName}`);
                            if (window.App.renderEngine) window.App.renderEngine.loadFolder(window.App.renderEngine.currentFolderId);
                            this.close();
                        } else {
                            throw new Error(data.message || 'Opslaan mislukt');
                        }
                    } catch (e) {
                        alert("Fout bij opslaan: " + e.message);
                        btn.textContent = "Opslaan als kopie";
                        btn.disabled = false;
                    }
                }, outMime, 0.95);
            } catch (e) {
                alert("Fout bij voorbereiden opslag: " + e.message);
                btn.textContent = "Opslaan als kopie";
                btn.disabled = false;
            }
        }

        // =====================================================================
        // --- LOGICA: NIEUWE FOCAL POINT CROPPER (VOOR SLIDESHOW) ---
        // =====================================================================

        startFocalDrag(e) {
            this.isFocalDragging = true;
            this.focalStartX = e.clientX - this.focalPanX;
            this.focalStartY = e.clientY - this.focalPanY;
        }

        onFocalDrag(e) {
            if (!this.isFocalDragging) return;
            this.focalPanX = e.clientX - this.focalStartX;
            this.focalPanY = e.clientY - this.focalStartY;
            this.drawFocal();
        }

        endFocalDrag() {
            this.isFocalDragging = false;
        }

        openFocalCropper(imageUrl, currentFocus = '50% 50%', initialRatio = 1.777) {
            return new Promise((resolve) => {
                this.onFocalSaveCallback = resolve;
                this.focalScale = 1;
                this.focalPanX = 0;
                this.focalPanY = 0;
                
                // FASE 6 FIX: Accepteer dynamische ratio vanuit de layout-engine, of val terug naar TV 16:9
                this.focalRatio = initialRatio || 1.777; 
                
                document.getElementById('ss-cropper-zoom').value = 1;
                document.querySelectorAll('.ratio-btn').forEach(b => {
                    b.classList.remove('active');
                    if (parseFloat(b.dataset.ratio) === this.focalRatio || (this.focalRatio === 1.777 && b.dataset.ratio === "1.777")) {
                        b.classList.add('active');
                    }
                });

                this.focalImage = new Image();
                this.focalImage.crossOrigin = "Anonymous";
                
                this.focalImage.onload = () => {
                    const wrapper = document.getElementById('ss-cropper-wrapper');
                    this.focalCanvas.width = wrapper.clientWidth;
                    this.focalCanvas.height = wrapper.clientHeight;
                    
                    const scaleX = this.focalCanvas.width / this.focalImage.width;
                    const scaleY = this.focalCanvas.height / this.focalImage.height;
                    this.focalBaseScale = Math.max(scaleX, scaleY);
                    
                    if (currentFocus && currentFocus !== 'center') {
                        const parts = currentFocus.split(' ');
                        const xPct = parseFloat(parts[0]) || 50;
                        const yPct = parseFloat(parts[1]) || 50;
                        
                        const imgDisplayWidth = this.focalImage.width * this.focalBaseScale;
                        const imgDisplayHeight = this.focalImage.height * this.focalBaseScale;
                        
                        this.focalPanX = (this.focalCanvas.width / 2) - (imgDisplayWidth * (xPct / 100));
                        this.focalPanY = (this.focalCanvas.height / 2) - (imgDisplayHeight * (yPct / 100));
                    } else {
                        this.focalPanX = (this.focalCanvas.width - (this.focalImage.width * this.focalBaseScale)) / 2;
                        this.focalPanY = (this.focalCanvas.height - (this.focalImage.height * this.focalBaseScale)) / 2;
                    }

                    this.drawFocal();
                    this.focalOverlay.classList.add('active');
                };
                
                this.focalImage.onerror = () => {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Afbeelding kon niet worden geladen voor de cropper.');
                    resolve(null);
                };
                
                this.focalImage.src = imageUrl;
            });
        }

        drawFocal() {
            if (!this.focalImage || !this.focalCtx) return;
            
            const cw = this.focalCanvas.width;
            const ch = this.focalCanvas.height;
            this.focalCtx.clearRect(0, 0, cw, ch);
            
            const totalScale = this.focalBaseScale * this.focalScale;
            const w = this.focalImage.width * totalScale;
            const h = this.focalImage.height * totalScale;
            
            if (this.focalPanX > 0) this.focalPanX = 0;
            if (this.focalPanX < cw - w) this.focalPanX = cw - w;
            if (this.focalPanY > 0) this.focalPanY = 0;
            if (this.focalPanY < ch - h) this.focalPanY = ch - h;

            // Teken de afbeelding
            this.focalCtx.drawImage(this.focalImage, this.focalPanX, this.focalPanY, w, h);
            
            // Teken het Aspect Ratio Masker
            if (this.focalRatio > 0) {
                let targetW = cw;
                let targetH = cw / this.focalRatio;

                if (targetH > ch) {
                    targetH = ch;
                    targetW = ch * this.focalRatio;
                }

                // Een lichte marge zodat we niet exact tegen de randen plakken
                const margin = 20; 
                targetW -= margin * 2;
                targetH -= (margin * 2) / this.focalRatio;
                
                if (targetH > ch - (margin * 2)) {
                    targetH = ch - (margin * 2);
                    targetW = targetH * this.focalRatio;
                }

                const maskX = (cw - targetW) / 2;
                const maskY = (ch - targetH) / 2;

                this.focalCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                this.focalCtx.beginPath();
                this.focalCtx.rect(0, 0, cw, ch); // De hele canvas
                this.focalCtx.rect(maskX, maskY, targetW, targetH); // Het uitsnede vlak
                this.focalCtx.fill("evenodd"); // Kleurt alles BEHALVE de uitsnede

                // Dunne witte stippellijn rondom de uitsnede
                this.focalCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.focalCtx.lineWidth = 2;
                this.focalCtx.setLineDash([5, 5]);
                this.focalCtx.strokeRect(maskX, maskY, targetW, targetH);
                this.focalCtx.setLineDash([]);
            }
        }

        saveFocal() {
            const totalScale = this.focalBaseScale * this.focalScale;
            const w = this.focalImage.width * totalScale;
            const h = this.focalImage.height * totalScale;
            
            const centerX = this.focalCanvas.width / 2;
            const centerY = this.focalCanvas.height / 2;
            
            const imgFocusX = centerX - this.focalPanX;
            const imgFocusY = centerY - this.focalPanY;
            
            const pctX = Math.round((imgFocusX / w) * 100);
            const pctY = Math.round((imgFocusY / h) * 100);
            
            const finalX = Math.max(0, Math.min(100, pctX));
            const finalY = Math.max(0, Math.min(100, pctY));
            
            const focalPointString = `${finalX}% ${finalY}%`;
            
            if (this.onFocalSaveCallback) {
                this.onFocalSaveCallback(focalPointString);
            }
            this.closeFocalPicker();
        }

        closeFocalPicker() {
            this.focalOverlay.classList.remove('active');
            if (this.onFocalSaveCallback) {
                this.onFocalSaveCallback(null);
                this.onFocalSaveCallback = null;
            }
        }
    }

    // Registreer in de App Namespace
    window.App = window.App || {};
    const initEditor = () => {
        if (!window.App.editor) window.App.editor = new Editor();
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEditor);
    } else {
        initEditor();
    }
})();