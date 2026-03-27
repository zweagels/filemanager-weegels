// Pad: public/js/modules/slideshow/EditorCropperUI.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorCropperUI.js */

(function() {
    if (!window.EditorCore) return;

    Object.assign(window.EditorCore.prototype, {

        renderCropperDOM() {
            const overlay = document.createElement('div');
            overlay.id = 'ss-cropper-overlay';
            overlay.className = 'ss-cropper-overlay';
            
            const cropperHTML = `
                <style>
                    /* Overlay & Modal Wrapper */
                    .ss-cropper-overlay { position: fixed; inset: 0; z-index: 999999; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; padding: 2vh 2vw; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
                    .ss-cropper-overlay.active { display: flex; }
                    
                    /* THEME ADAPTIVE MODAL */
                    .ss-cropper-modal { display: flex; flex-direction: column; width: 95vw; max-width: 1400px; height: 90vh; background: var(--bg-main, #ffffff); border-radius: 12px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid var(--border-color, #e5e7eb); color: var(--text-main, #111827); }
                    
                    /* Header */
                    .ss-cropper-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: var(--bg-main, #ffffff); border-bottom: 1px solid var(--border-color, #e5e7eb); flex-shrink: 0; }
                    .ss-cropper-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; gap: 8px; color: var(--text-main, #111827); }
                    .ss-cropper-actions { display: flex; gap: 12px; }
                    
                    .ss-crop-btn { padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; }
                    .ss-crop-btn-cancel { background: var(--bg-surface, #f3f4f6); border-color: var(--border-color, #e5e7eb); color: var(--text-main, #374151); }
                    .ss-crop-btn-cancel:hover { background: var(--border-color, #e5e7eb); }
                    .ss-crop-btn-save { background: var(--primary, #2563eb); color: #fff; }
                    .ss-crop-btn-save:hover { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
                    .ss-crop-btn-reset { background: transparent; color: var(--danger, #ef4444); }
                    .ss-crop-btn-reset:hover { background: rgba(239, 68, 68, 0.1); }

                    /* Layout */
                    .ss-cropper-body { display: flex; flex-direction: row; flex: 1; overflow: hidden; }
                    
                    /* Sidebar (Tools) */
                    .ss-cropper-sidebar { width: 320px; background: var(--bg-main, #ffffff); border-right: 1px solid var(--border-color, #e5e7eb); overflow-y: auto; display: flex; flex-direction: column; flex-shrink: 0; box-sizing: border-box; }
                    .ss-crop-tool-section { padding: 20px; border-bottom: 1px solid var(--border-color, #e5e7eb); box-sizing: border-box; }
                    .ss-crop-tool-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted, #6b7280); font-weight: 800; margin-bottom: 16px; display: block; }
                    
                    /* Tool Grids */
                    .ss-crop-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .ss-crop-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
                    .ss-tool-card { background: var(--bg-surface, #f9fafb); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px 6px; text-align: center; cursor: pointer; transition: 0.2s; color: var(--text-main, #4b5563); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-size: 0.75rem; font-weight: 600; box-sizing: border-box; }
                    .ss-tool-card:hover { background: var(--border-color, #e5e7eb); }
                    .ss-tool-card.active { background: rgba(37, 99, 235, 0.1); border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); }
                    
                    /* Sliders */
                    .ss-crop-slider-wrap { margin-bottom: 16px; }
                    .ss-crop-slider-wrap:last-child { margin-bottom: 0; }
                    .ss-crop-slider-label { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 8px; color: var(--text-main, #111827); font-weight: 600; }
                    .ss-crop-slider { width: 100%; appearance: none; height: 6px; background: var(--border-color, #e5e7eb); border-radius: 3px; outline: none; }
                    .ss-crop-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--primary, #2563eb); cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

                    /* Workspace (Image Area) - Blijft donker voor contrast */
                    .ss-cropper-workspace { flex: 1; background: #111827; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 40px; box-sizing: border-box; }
                    
                    /* Image & Crop Elements */
                    .ss-crop-container { position: relative; max-width: 100%; max-height: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); user-select: none; }
                    .ss-crop-image { display: block; max-width: 100%; max-height: 80vh; width: auto; height: auto; transition: transform 0.1s, filter 0.1s; transform-origin: center center; }
                    
                    /* Dark Backdrop & Crop Box */
                    .ss-crop-box { position: absolute; border: 2px solid #fff; cursor: move; box-sizing: border-box; box-shadow: 0 0 0 9999px rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 5; }
                    
                    /* Focus Point Indicator */
                    .ss-crop-focus-point { width: 32px; height: 32px; border: 2px solid var(--warning, #f59e0b); border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); cursor: crosshair; background: rgba(245, 158, 11, 0.2); box-shadow: 0 0 0 1px rgba(0,0,0,0.3); z-index: 10; display: none; }
                    .ss-crop-focus-point::before, .ss-crop-focus-point::after { content:''; position: absolute; background: var(--warning, #f59e0b); }
                    .ss-crop-focus-point::before { top: 50%; left: -4px; right: -4px; height: 2px; transform: translateY(-50%); }
                    .ss-crop-focus-point::after { left: 50%; top: -4px; bottom: -4px; width: 2px; transform: translateX(-50%); }

                    /* Rule of Thirds Grid */
                    .ss-crop-grid-line { position: absolute; background: rgba(255,255,255,0.4); pointer-events: none; }
                    .ss-crop-grid-line.v1 { top: 0; bottom: 0; left: 33.33%; width: 1px; }
                    .ss-crop-grid-line.v2 { top: 0; bottom: 0; left: 66.66%; width: 1px; }
                    .ss-crop-grid-line.h1 { left: 0; right: 0; top: 33.33%; height: 1px; }
                    .ss-crop-grid-line.h2 { left: 0; right: 0; top: 66.66%; height: 1px; }

                    /* Handles */
                    .ss-crop-handle { position: absolute; width: 14px; height: 14px; background: #fff; border: 2px solid var(--primary, #2563eb); border-radius: 50%; z-index: 6; }
                    .ss-crop-handle.nw { top: -7px; left: -7px; cursor: nwse-resize; }
                    .ss-crop-handle.ne { top: -7px; right: -7px; cursor: nesw-resize; }
                    .ss-crop-handle.sw { bottom: -7px; left: -7px; cursor: nesw-resize; }
                    .ss-crop-handle.se { bottom: -7px; right: -7px; cursor: nwse-resize; }
                    .ss-crop-handle.n { top: -7px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
                    .ss-crop-handle.s { bottom: -7px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
                    .ss-crop-handle.e { top: 50%; right: -7px; transform: translateY(-50%); cursor: ew-resize; }
                    .ss-crop-handle.w { top: 50%; left: -7px; transform: translateY(-50%); cursor: ew-resize; }

                    /* Error state */
                    .ss-crop-error { color: #ef4444; font-weight: 600; text-align: center; padding: 20px; background: rgba(239,68,68,0.1); border-radius: 8px; display: none; }
                </style>
                <div class="ss-cropper-modal">
                    <div class="ss-cropper-header">
                        <h3><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Foto Editor & Focus</h3>
                        <div class="ss-cropper-actions">
                            <button class="ss-crop-btn ss-crop-btn-reset" id="ss-crop-btn-reset">Herstel Origineel</button>
                            <button class="ss-crop-btn ss-crop-btn-cancel" id="ss-crop-btn-cancel">Annuleren</button>
                            <button class="ss-crop-btn ss-crop-btn-save" id="ss-crop-btn-save">Toepassen</button>
                        </div>
                    </div>
                    <div class="ss-cropper-body">
                        <div class="ss-cropper-sidebar">
                            
                            <div class="ss-crop-tool-section" id="ss-crop-ratio-section">
                                <span class="ss-crop-tool-title">Verhouding (Crop)</span>
                                <div class="ss-crop-grid-3">
                                    <div class="ss-tool-card active" data-ratio="free">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                                        Vrij
                                    </div>
                                    <div class="ss-tool-card" data-ratio="1.7777">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect></svg>
                                        16:9
                                    </div>
                                    <div class="ss-tool-card" data-ratio="1">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect></svg>
                                        1:1
                                    </div>
                                </div>
                            </div>

                            <div class="ss-crop-tool-section" style="background: rgba(245, 158, 11, 0.05); border-bottom-color: rgba(245, 158, 11, 0.1);">
                                <span class="ss-crop-tool-title" style="color: var(--warning, #f59e0b);">Focus Mode</span>
                                <div class="ss-tool-card" id="btn-toggle-focus" style="flex-direction: row; gap: 12px; border-color: rgba(245, 158, 11, 0.3);">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--warning, #f59e0b);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                                    Focuspunt Bepalen
                                </div>
                                <div style="font-size:0.7rem; color:var(--text-muted, #6b7280); margin-top:8px; text-align:center;">Handig als de slide op 'Vullend' staat. Dit overschrijft het crop-kader.</div>
                            </div>

                            <div class="ss-crop-tool-section">
                                <span class="ss-crop-tool-title">Draaien & Spiegelen</span>
                                <div class="ss-crop-grid-2">
                                    <div class="ss-tool-card" data-action="rotate-left">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                                        Links
                                    </div>
                                    <div class="ss-tool-card" data-action="rotate-right">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>
                                        Rechts
                                    </div>
                                    <div class="ss-tool-card" data-action="flip-h">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 3 21 12 17 21"></polyline><polyline points="7 3 3 12 7 21"></polyline><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                                        Horizontaal
                                    </div>
                                    <div class="ss-tool-card" data-action="flip-v">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(90deg);"><polyline points="17 3 21 12 17 21"></polyline><polyline points="7 3 3 12 7 21"></polyline><line x1="12" y1="3" x2="12" y2="21"></line></svg>
                                        Verticaal
                                    </div>
                                </div>
                            </div>

                            <div class="ss-crop-tool-section" style="border-bottom: none;">
                                <span class="ss-crop-tool-title">Kleurcorrectie</span>
                                
                                <div class="ss-crop-slider-wrap">
                                    <div class="ss-crop-slider-label"><span>Helderheid</span> <span id="val-brightness">100%</span></div>
                                    <input type="range" class="ss-crop-slider" id="slider-brightness" min="0" max="200" value="100">
                                </div>
                                <div class="ss-crop-slider-wrap">
                                    <div class="ss-crop-slider-label"><span>Contrast</span> <span id="val-contrast">100%</span></div>
                                    <input type="range" class="ss-crop-slider" id="slider-contrast" min="0" max="200" value="100">
                                </div>
                                <div class="ss-crop-slider-wrap">
                                    <div class="ss-crop-slider-label"><span>Verzadiging</span> <span id="val-saturate">100%</span></div>
                                    <input type="range" class="ss-crop-slider" id="slider-saturate" min="0" max="200" value="100">
                                </div>
                            </div>

                        </div>
                        <div class="ss-cropper-workspace">
                            <div id="ss-crop-error" class="ss-crop-error">Afbeelding kon niet worden geladen.</div>
                            <div class="ss-crop-container" id="ss-crop-container" style="display:none;">
                                <img class="ss-crop-image" id="ss-crop-image" src="" alt="Bron" crossorigin="anonymous">
                                <div class="ss-crop-box" id="ss-crop-box">
                                    <div class="ss-crop-grid-line v1"></div>
                                    <div class="ss-crop-grid-line v2"></div>
                                    <div class="ss-crop-grid-line h1"></div>
                                    <div class="ss-crop-grid-line h2"></div>
                                    <div class="ss-crop-handle nw" data-handle="nw"></div>
                                    <div class="ss-crop-handle ne" data-handle="ne"></div>
                                    <div class="ss-crop-handle sw" data-handle="sw"></div>
                                    <div class="ss-crop-handle se" data-handle="se"></div>
                                    <div class="ss-crop-handle n" data-handle="n"></div>
                                    <div class="ss-crop-handle s" data-handle="s"></div>
                                    <div class="ss-crop-handle e" data-handle="e"></div>
                                    <div class="ss-crop-handle w" data-handle="w"></div>
                                </div>
                                <div class="ss-crop-focus-point" id="ss-crop-focus-point"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            overlay.innerHTML = cropperHTML;
            document.body.appendChild(overlay);
            this.cropperOverlay = overlay;
        },

        openCropperModal(item, options = {}) {
            if (item && typeof item.settings === 'string') {
                try { item.settings = JSON.parse(item.settings); } catch(e) { item.settings = {}; }
            }
            
            this.cropperOptions = options || {};

            const oldOverlay = document.getElementById('ss-cropper-overlay');
            if (oldOverlay) oldOverlay.remove();
            
            this.renderCropperDOM();
            this.currentCropperItem = item;
            
            this.cropContainer = this.cropperOverlay.querySelector('#ss-crop-container');
            this.cropImage = this.cropperOverlay.querySelector('#ss-crop-image');
            this.cropBox = this.cropperOverlay.querySelector('#ss-crop-box');
            this.focusPoint = this.cropperOverlay.querySelector('#ss-crop-focus-point');
            this.errorContainer = this.cropperOverlay.querySelector('#ss-crop-error');

            const headerTitle = this.cropperOverlay.querySelector('.ss-cropper-header h3');
            if (this.cropperOptions.isCover) {
                if (headerTitle) headerTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect></svg> Cover Uitsnijden (16:9)';
            } else {
                if (headerTitle) headerTitle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Foto Editor & Focus';
            }
            
            this.cropperState = {
                ratio: 'free', 
                focusMode: false, 
                rotate: 0, 
                flipX: 1, 
                flipY: 1,
                brightness: 100, 
                contrast: 100, 
                saturate: 100,
                box: { x: 0, y: 0, w: 100, h: 100 },
                focus: { x: 50, y: 50 }
            };

            const ratioSection = this.cropperOverlay.querySelector('#ss-crop-ratio-section');
            if (this.cropperOptions.forceRatio) {
                this.cropperState.ratio = String(this.cropperOptions.forceRatio);
                if (ratioSection) ratioSection.style.display = 'none';
            } else {
                if (ratioSection) ratioSection.style.display = 'block';
            }

            // FIX: Als we specifiek de Cover bewerken, haal dan NIET de cropdata van de reguliere dia op, maar van de cover.
            if (this.cropperOptions.isCover) {
                const editorCore = window.App.slideshowEditor || window._activeEditorCore;
                if (editorCore && editorCore.data && editorCore.data.slideshow && editorCore.data.slideshow.settings && editorCore.data.slideshow.settings.cover_crop_data) {
                    const cData = editorCore.data.slideshow.settings.cover_crop_data;
                    if (cData.box) this.cropperState.box = { ...cData.box };
                    if (cData.focus) this.cropperState.focus = { ...cData.focus };
                    this.cropperState.focusMode = cData.focusMode || false;
                    this.cropperState.rotate = cData.rotate || 0;
                    this.cropperState.flipX = cData.flipX || 1;
                    this.cropperState.flipY = cData.flipY || 1;
                    this.cropperState.brightness = cData.brightness !== undefined ? cData.brightness : 100;
                    this.cropperState.contrast = cData.contrast !== undefined ? cData.contrast : 100;
                    this.cropperState.saturate = cData.saturate !== undefined ? cData.saturate : 100;
                } else {
                     this.cropperState.box = { x: 0, y: 0, w: 100, h: 100 };
                }
                
                // Voorkom dat de dia data doorsijpelt!
                item.crop_w = null;
                item.focus_x = null;
                if (item.settings) item.settings.crop_data = null;
            } else {
                // Normale Dia Crop Inladen
                if (item.transform_rotate !== undefined && item.transform_rotate !== null) this.cropperState.rotate = parseInt(item.transform_rotate);
                if (item.transform_flip_x !== undefined && item.transform_flip_x !== null) this.cropperState.flipX = parseInt(item.transform_flip_x);
                if (item.transform_flip_y !== undefined && item.transform_flip_y !== null) this.cropperState.flipY = parseInt(item.transform_flip_y);
                if (item.filter_brightness !== undefined && item.filter_brightness !== null) this.cropperState.brightness = parseInt(item.filter_brightness);
                if (item.filter_contrast !== undefined && item.filter_contrast !== null) this.cropperState.contrast = parseInt(item.filter_contrast);
                if (item.filter_saturate !== undefined && item.filter_saturate !== null) this.cropperState.saturate = parseInt(item.filter_saturate);

                if (item.crop_w !== null && item.crop_w !== undefined) {
                    this.cropperState.box = {
                        x: parseFloat(item.crop_x),
                        y: parseFloat(item.crop_y),
                        w: parseFloat(item.crop_w),
                        h: parseFloat(item.crop_h)
                    };
                    if (!this.cropperOptions.forceRatio) {
                        const ratioVal = parseFloat((this.cropperState.box.w / this.cropperState.box.h).toFixed(4));
                        if (Math.abs(ratioVal - 1.7778) < 0.05) this.cropperState.ratio = "1.7777";
                        else if (Math.abs(ratioVal - 1) < 0.05) this.cropperState.ratio = "1";
                        else this.cropperState.ratio = "free";
                    }
                } 
                else if (item.settings && item.settings.crop_data) {
                    const saved = item.settings.crop_data;
                    if (!this.cropperOptions.forceRatio) this.cropperState.ratio = saved.ratio || 'free';
                    if (saved.box) this.cropperState.box = { ...saved.box };
                    
                    if (saved.brightness !== undefined && item.filter_brightness === undefined) this.cropperState.brightness = saved.brightness;
                    if (saved.contrast !== undefined && item.filter_contrast === undefined) this.cropperState.contrast = saved.contrast;
                    if (saved.saturate !== undefined && item.filter_saturate === undefined) this.cropperState.saturate = saved.saturate;
                    if (saved.rotate !== undefined && item.transform_rotate === undefined) this.cropperState.rotate = saved.rotate;
                }

                if (item.focus_x !== null && item.focus_x !== undefined) {
                     this.cropperState.focus = { x: parseFloat(item.focus_x), y: parseFloat(item.focus_y) };
                     this.cropperState.focusMode = true;
                } 
                else if (item.settings && item.settings.focal_point && !this.cropperState.focusMode) {
                    const fpMap = { 
                        'top left': {x:0, y:0}, 'top center': {x:50, y:0}, 'top right': {x:100, y:0}, 
                        'center left': {x:0, y:50}, 'center center': {x:50, y:50}, 'center right': {x:100, y:50}, 
                        'bottom left': {x:0, y:100}, 'bottom center': {x:50, y:100}, 'bottom right': {x:100, y:100} 
                    };
                    if (fpMap[item.settings.focal_point]) {
                        this.cropperState.focus = fpMap[item.settings.focal_point];
                        this.cropperState.focusMode = true;
                    }
                }
            }

            this.cropperOverlay.querySelector('#slider-brightness').value = this.cropperState.brightness;
            this.cropperOverlay.querySelector('#slider-contrast').value = this.cropperState.contrast;
            this.cropperOverlay.querySelector('#slider-saturate').value = this.cropperState.saturate;
            this.cropperOverlay.querySelector('#val-brightness').innerText = this.cropperState.brightness + '%';
            this.cropperOverlay.querySelector('#val-contrast').innerText = this.cropperState.contrast + '%';
            this.cropperOverlay.querySelector('#val-saturate').innerText = this.cropperState.saturate + '%';

            this.cropperOverlay.querySelectorAll('.ss-tool-card[data-ratio]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.ratio === String(this.cropperState.ratio));
            });

            const focusBtn = this.cropperOverlay.querySelector('#btn-toggle-focus');
            if (this.cropperState.focusMode) {
                focusBtn.classList.add('active');
                this.cropBox.style.display = 'none';
                this.focusPoint.style.display = 'block';
            } else {
                focusBtn.classList.remove('active');
                this.cropBox.style.display = 'flex';
                this.focusPoint.style.display = 'none';
            }

            let imgUrl = item.url_large || item.url || item.path;
            if (!imgUrl && item.file) {
                imgUrl = item.file.url_large || item.file.url || item.file.path;
                if (!imgUrl && item.file.storage_name) {
                    imgUrl = '/storage/uploads/' + item.file.storage_name;
                }
            }
            if (!imgUrl && item.storage_name) {
                imgUrl = '/storage/uploads/' + item.storage_name;
            }
            if (!imgUrl && item.file_id) {
                imgUrl = '/api/files?action=download&id=' + item.file_id;
            }

            let isLoaded = false;
            const handleLoad = () => {
                if (isLoaded) return;
                this.cropContainer.style.display = 'inline-block';
                this.errorContainer.style.display = 'none';
                
                const checkSize = () => {
                    if (this.cropImage.offsetWidth > 0) {
                        isLoaded = true;
                        this.applyVisualTransforms();
                        this.initCropBox();
                    } else {
                        requestAnimationFrame(checkSize);
                    }
                };
                requestAnimationFrame(checkSize);
            };

            this.cropImage.onload = handleLoad;

            this.cropImage.onerror = () => {
                this.cropContainer.style.display = 'none';
                this.errorContainer.style.display = 'block';
                this.errorContainer.innerText = "Afbeelding kon niet worden geladen. Pad: " + (imgUrl || 'onbekend');
            };

            if (imgUrl) {
                this.cropImage.src = imgUrl;
            } else {
                this.cropImage.onerror();
            }

            if (this.cropImage.complete && this.cropImage.naturalWidth > 0) {
                handleLoad();
            }

            this.cropperOverlay.classList.add('active');
            this.bindCropperEvents();
        },

        closeCropperModal() {
            if (this.cropperOverlay) {
                this.cropperOverlay.classList.remove('active');
                this.unbindCropperEvents();
                this.cropperOverlay.remove();
            }
        },

        applyVisualTransforms() {
            const transformStr = `rotate(${this.cropperState.rotate}deg) scaleX(${this.cropperState.flipX}) scaleY(${this.cropperState.flipY})`;
            const filterStr = `brightness(${this.cropperState.brightness}%) contrast(${this.cropperState.contrast}%) saturate(${this.cropperState.saturate}%)`;
            
            this.cropImage.style.transform = transformStr;
            this.cropImage.style.filter = filterStr;

            setTimeout(() => {
                if (this.cropperState.focusMode) {
                    this.updateFocusPointUI();
                } else {
                    this.updateCropBoxUI();
                }
            }, 50);
        },

        initCropBox() {
            if (!this.cropperState.box || this.cropperState.box.w <= 0 || isNaN(this.cropperState.box.w)) {
                this.cropperState.box = { x: 0, y: 0, w: 100, h: 100 };
            }

            if (this.cropperState.ratio !== 'free') {
                this.enforceAspectRatio();
            }

            this.updateCropBoxUI();
            this.updateFocusPointUI();
        },

        updateCropBoxUI() {
            const imgWidth = this.cropImage.offsetWidth;
            const imgHeight = this.cropImage.offsetHeight;
            if (imgWidth === 0) return; 

            const pxX = (this.cropperState.box.x / 100) * imgWidth;
            const pxY = (this.cropperState.box.y / 100) * imgHeight;
            const pxW = (this.cropperState.box.w / 100) * imgWidth;
            const pxH = (this.cropperState.box.h / 100) * imgHeight;

            this.cropBox.style.left = `${pxX}px`;
            this.cropBox.style.top = `${pxY}px`;
            this.cropBox.style.width = `${pxW}px`;
            this.cropBox.style.height = `${pxH}px`;
        },

        updateFocusPointUI() {
            const imgWidth = this.cropImage.offsetWidth;
            const imgHeight = this.cropImage.offsetHeight;
            const pxX = (this.cropperState.focus.x / 100) * imgWidth;
            const pxY = (this.cropperState.focus.y / 100) * imgHeight;
            
            this.focusPoint.style.left = `${pxX}px`;
            this.focusPoint.style.top = `${pxY}px`;
        },

        enforceAspectRatio() {
            if (this.cropperState.ratio === 'free') return;
            const ratioValue = parseFloat(this.cropperState.ratio);
            
            const imgWidth = this.cropImage.offsetWidth;
            const imgHeight = this.cropImage.offsetHeight;
            if (imgWidth === 0 || isNaN(imgWidth)) return;
            
            let pxW = (this.cropperState.box.w / 100) * imgWidth;
            let pxH = (this.cropperState.box.h / 100) * imgHeight;

            pxH = pxW / ratioValue;

            if (pxH > imgHeight) {
                pxH = imgHeight;
                pxW = pxH * ratioValue;
            }
            if (pxW > imgWidth) {
                pxW = imgWidth;
                pxH = pxW / ratioValue;
            }

            let pxX = (this.cropperState.box.x / 100) * imgWidth;
            let pxY = (this.cropperState.box.y / 100) * imgHeight;

            if (pxX + pxW > imgWidth) pxX = imgWidth - pxW;
            if (pxY + pxH > imgHeight) pxY = imgHeight - pxH;

            this.cropperState.box.w = (pxW / imgWidth) * 100;
            this.cropperState.box.h = (pxH / imgHeight) * 100;
            this.cropperState.box.x = (pxX / imgWidth) * 100;
            this.cropperState.box.y = (pxY / imgHeight) * 100;
        },

        bindCropperEvents() {
            this.isDragging = false;
            this.isResizing = false;
            this.resizeHandle = null;
            this.startX = 0;
            this.startY = 0;
            this.startBox = {};
            this.startFocus = {};

            const getPointerPos = (e) => {
                if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            };

            this.handleFocusDown = (e) => {
                if (!this.cropperState.focusMode) return;
                e.preventDefault();
                this.isDragging = true;
                const pos = getPointerPos(e);
                this.startX = pos.x;
                this.startY = pos.y;
                this.startFocus = { ...this.cropperState.focus };
            };

            this.handleBoxDown = (e) => {
                if (this.cropperState.focusMode) return;
                e.preventDefault();
                
                const pos = getPointerPos(e);
                this.startX = pos.x;
                this.startY = pos.y;
                this.startBox = { ...this.cropperState.box };

                if (e.target.classList.contains('ss-crop-handle')) {
                    this.isResizing = true;
                    this.resizeHandle = e.target.dataset.handle;
                } else if (e.target.classList.contains('ss-crop-box')) {
                    this.isDragging = true;
                }
            };

            this.handlePointerMove = (e) => {
                if (!this.isDragging && !this.isResizing) return;
                
                const pos = getPointerPos(e);
                const dx = pos.x - this.startX;
                const dy = pos.y - this.startY;

                const imgWidth = this.cropImage.offsetWidth;
                const imgHeight = this.cropImage.offsetHeight;
                if (imgWidth === 0) return;
                
                const dpX = (dx / imgWidth) * 100;
                const dpY = (dy / imgHeight) * 100;

                if (this.cropperState.focusMode && this.isDragging) {
                    let newX = this.startFocus.x + dpX;
                    let newY = this.startFocus.y + dpY;
                    if (newX < 0) newX = 0; if (newX > 100) newX = 100;
                    if (newY < 0) newY = 0; if (newY > 100) newY = 100;
                    
                    this.cropperState.focus.x = newX;
                    this.cropperState.focus.y = newY;
                    this.updateFocusPointUI();
                    return;
                }

                if (this.isDragging) {
                    let newX = this.startBox.x + dpX;
                    let newY = this.startBox.y + dpY;

                    if (newX < 0) newX = 0;
                    if (newY < 0) newY = 0;
                    if (newX + this.startBox.w > 100) newX = 100 - this.startBox.w;
                    if (newY + this.startBox.h > 100) newY = 100 - this.startBox.h;

                    this.cropperState.box.x = newX;
                    this.cropperState.box.y = newY;
                    this.updateCropBoxUI();
                } 
                else if (this.isResizing) {
                    let newX = this.startBox.x;
                    let newY = this.startBox.y;
                    let newW = this.startBox.w;
                    let newH = this.startBox.h;

                    if (this.resizeHandle.includes('w')) { newX += dpX; newW -= dpX; }
                    if (this.resizeHandle.includes('e')) { newW += dpX; }
                    if (this.resizeHandle.includes('n')) { newY += dpY; newH -= dpY; }
                    if (this.resizeHandle.includes('s')) { newH += dpY; }

                    if (this.cropperState.ratio !== 'free') {
                        const ratio = parseFloat(this.cropperState.ratio);
                        const pxW = (newW / 100) * imgWidth;
                        let targetH_pct = ((pxW / ratio) / imgHeight) * 100;

                        if (this.resizeHandle === 'nw' || this.resizeHandle === 'ne') {
                            newY += (newH - targetH_pct); 
                        }
                        newH = targetH_pct;
                    }

                    if (newW < 5) { newW = 5; if (this.resizeHandle.includes('w')) newX = this.startBox.x + this.startBox.w - 5; }
                    if (newH < 5) { newH = 5; if (this.resizeHandle.includes('n')) newY = this.startBox.y + this.startBox.h - 5; }
                    
                    if (newX < 0) { newW += newX; newX = 0; }
                    if (newY < 0) { newH += newY; newY = 0; }
                    if (newX + newW > 100) newW = 100 - newX;
                    if (newY + newH > 100) newH = 100 - newY;

                    this.cropperState.box = { x: newX, y: newY, w: newW, h: newH };
                    
                    if (this.cropperState.ratio !== 'free') this.enforceAspectRatio();

                    this.updateCropBoxUI();
                }
            };

            this.handlePointerUp = () => {
                this.isDragging = false;
                this.isResizing = false;
                this.resizeHandle = null;
            };

            this.cropBox.addEventListener('mousedown', this.handleBoxDown);
            this.cropBox.addEventListener('touchstart', this.handleBoxDown, {passive: false});
            
            this.focusPoint.addEventListener('mousedown', this.handleFocusDown);
            this.focusPoint.addEventListener('touchstart', this.handleFocusDown, {passive: false});

            document.addEventListener('mousemove', this.handlePointerMove);
            document.addEventListener('touchmove', this.handlePointerMove, {passive: false});
            document.addEventListener('mouseup', this.handlePointerUp);
            document.addEventListener('touchend', this.handlePointerUp);

            this._boundEvents = {
                move: this.handlePointerMove,
                up: this.handlePointerUp
            };

            this.cropperOverlay.querySelector('#ss-crop-btn-cancel').onclick = () => this.closeCropperModal();
            
            this.cropperOverlay.querySelector('#ss-crop-btn-save').onclick = () => this.saveCropperData();
            
            this.cropperOverlay.querySelector('#ss-crop-btn-reset').onclick = () => {
                const isForced = !!this.cropperOptions.forceRatio;
                this.cropperState = { 
                    ratio: isForced ? String(this.cropperOptions.forceRatio) : 'free', 
                    focusMode: false, rotate: 0, flipX: 1, flipY: 1, 
                    brightness: 100, contrast: 100, saturate: 100, 
                    box: { x: 0, y: 0, w: 100, h: 100 }, focus: {x:50, y:50} 
                };
                
                this.cropperOverlay.querySelector('#slider-brightness').value = 100; 
                this.cropperOverlay.querySelector('#val-brightness').innerText = '100%';
                
                this.cropperOverlay.querySelector('#slider-contrast').value = 100; 
                this.cropperOverlay.querySelector('#val-contrast').innerText = '100%';
                
                this.cropperOverlay.querySelector('#slider-saturate').value = 100; 
                this.cropperOverlay.querySelector('#val-saturate').innerText = '100%';
                
                this.cropperOverlay.querySelectorAll('.ss-tool-card[data-ratio]').forEach(btn => btn.classList.remove('active'));
                
                if (!isForced) {
                    this.cropperOverlay.querySelector('.ss-tool-card[data-ratio="free"]').classList.add('active');
                } else {
                    const forcedBtn = this.cropperOverlay.querySelector(`.ss-tool-card[data-ratio="${this.cropperOptions.forceRatio}"]`);
                    if (forcedBtn) forcedBtn.classList.add('active');
                }
                
                const focusBtn = this.cropperOverlay.querySelector('#btn-toggle-focus');
                focusBtn.classList.remove('active');
                
                this.cropBox.style.display = 'flex';
                this.focusPoint.style.display = 'none';

                this.applyVisualTransforms();
                this.initCropBox();
            };

            this.cropperOverlay.querySelector('#btn-toggle-focus').onclick = (e) => {
                this.cropperState.focusMode = !this.cropperState.focusMode;
                e.currentTarget.classList.toggle('active', this.cropperState.focusMode);
                
                if (this.cropperState.focusMode) {
                    this.cropBox.style.display = 'none';
                    this.focusPoint.style.display = 'block';
                    this.updateFocusPointUI();
                } else {
                    this.cropBox.style.display = 'flex';
                    this.focusPoint.style.display = 'none';
                }
            };

            this.cropperOverlay.querySelectorAll('.ss-tool-card[data-ratio]').forEach(btn => {
                btn.onclick = () => {
                    if (this.cropperOptions.forceRatio) return; 
                    this.cropperOverlay.querySelectorAll('.ss-tool-card[data-ratio]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.cropperState.ratio = btn.dataset.ratio;
                    this.enforceAspectRatio();
                    this.updateCropBoxUI();
                };
            });

            this.cropperOverlay.querySelectorAll('.ss-tool-card[data-action]').forEach(btn => {
                btn.onclick = () => {
                    const action = btn.dataset.action;
                    if (action === 'rotate-left') this.cropperState.rotate -= 90;
                    if (action === 'rotate-right') this.cropperState.rotate += 90;
                    if (action === 'flip-h') this.cropperState.flipX *= -1;
                    if (action === 'flip-v') this.cropperState.flipY *= -1;
                    
                    if (this.cropperState.rotate >= 360 || this.cropperState.rotate <= -360) this.cropperState.rotate = 0;
                    
                    this.applyVisualTransforms();
                };
            });

            ['brightness', 'contrast', 'saturate'].forEach(prop => {
                const slider = this.cropperOverlay.querySelector(`#slider-${prop}`);
                slider.oninput = (e) => {
                    this.cropperState[prop] = e.target.value;
                    this.cropperOverlay.querySelector(`#val-${prop}`).innerText = e.target.value + '%';
                    this.applyVisualTransforms();
                };
            });
        },

        unbindCropperEvents() {
            if (this._boundEvents) {
                document.removeEventListener('mousemove', this._boundEvents.move);
                document.removeEventListener('touchmove', this._boundEvents.move);
                document.removeEventListener('mouseup', this._boundEvents.up);
                document.removeEventListener('touchend', this._boundEvents.up);
            }
        },

        saveCropperData() {
            if (!this.currentCropperItem) return;

            const finalData = { ...this.cropperState };

            if (this.cropperOptions && typeof this.cropperOptions.onSave === 'function') {
                this.cropperOptions.onSave(finalData, this.currentCropperItem);
                this.closeCropperModal();
                return;
            }

            this.currentCropperItem.filter_brightness = finalData.brightness;
            this.currentCropperItem.filter_contrast = finalData.contrast;
            this.currentCropperItem.filter_saturate = finalData.saturate;
            this.currentCropperItem.transform_rotate = finalData.rotate;
            this.currentCropperItem.transform_flip_x = finalData.flipX;
            this.currentCropperItem.transform_flip_y = finalData.flipY;

            const isBoxFull = (
                Math.round(finalData.box.w) === 100 && 
                Math.round(finalData.box.h) === 100 && 
                Math.round(finalData.box.x) === 0 && 
                Math.round(finalData.box.y) === 0
            );

            if (finalData.focusMode) {
                this.currentCropperItem.focus_x = finalData.focus.x;
                this.currentCropperItem.focus_y = finalData.focus.y;
                
                this.currentCropperItem.crop_x = null;
                this.currentCropperItem.crop_y = null;
                this.currentCropperItem.crop_w = null;
                this.currentCropperItem.crop_h = null;
                
                if(this.currentCropperItem.settings) delete this.currentCropperItem.settings.focal_point; 
            } else {
                this.currentCropperItem.focus_x = null;
                this.currentCropperItem.focus_y = null;
                
                if (isBoxFull) {
                    this.currentCropperItem.crop_x = null;
                    this.currentCropperItem.crop_y = null;
                    this.currentCropperItem.crop_w = null;
                    this.currentCropperItem.crop_h = null;
                } else {
                    this.currentCropperItem.crop_x = finalData.box.x;
                    this.currentCropperItem.crop_y = finalData.box.y;
                    this.currentCropperItem.crop_w = finalData.box.w;
                    this.currentCropperItem.crop_h = finalData.box.h;
                }
                if(this.currentCropperItem.settings) delete this.currentCropperItem.settings.crop_data; 
            }

            this.pendingDeltaItems.set(this.currentCropperItem.id, this.currentCropperItem);
            
            if (this.triggerAutoSave) {
                this.triggerAutoSave('Foto bewerkt in Foto Editor');
            }
            
            if (this.renderProperties) this.renderProperties();
            if (this.renderPreview) this.renderPreview();

            this.closeCropperModal();
        }
    });

    window._activeEditorCore = window._activeEditorCore || null;
    const originalRenderProperties = window.EditorCore.prototype.renderProperties;
    
    window.EditorCore.prototype.renderProperties = function() {
        window._activeEditorCore = this; 
        if (originalRenderProperties) {
            return originalRenderProperties.apply(this, arguments);
        }
    };

    if (!window._cropperGlobalListenerBound && window.EventBus) {
        window.EventBus.on('cropper:open', (item, options = {}) => {
            if (window._activeEditorCore && window._activeEditorCore.openCropperModal) {
                window._activeEditorCore.openCropperModal(item, options);
            }
        });
        window._cropperGlobalListenerBound = true;
    }

    if (window.EditorCore && !window._autoSaveJSONPatched) {
        const originalTriggerAutoSave = window.EditorCore.prototype.triggerAutoSave;
        if (originalTriggerAutoSave) {
            window.EditorCore.prototype.triggerAutoSave = function(msg) {
                if (this.pendingDeltaItems && this.pendingDeltaItems.size > 0) {
                    this.pendingDeltaItems.forEach((item, key) => {
                        if (item && typeof item.settings === 'object') {
                            const copy = { ...item };
                            copy.settings = JSON.stringify(item.settings);
                            this.pendingDeltaItems.set(key, copy);
                        }
                    });
                }
                
                let originalSlideshowSettings = null;
                if (this.data && this.data.slideshow && typeof this.data.slideshow.settings === 'object') {
                    originalSlideshowSettings = this.data.slideshow.settings;
                    this.data.slideshow.settings = JSON.stringify(originalSlideshowSettings);
                }
                
                const result = originalTriggerAutoSave.call(this, msg);
                
                if (originalSlideshowSettings) {
                    this.data.slideshow.settings = originalSlideshowSettings;
                }
                
                return result;
            };
            window._autoSaveJSONPatched = true;
        }
    }

})();