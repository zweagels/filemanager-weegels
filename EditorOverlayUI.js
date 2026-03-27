// Pad: public/js/modules/slideshow/EditorOverlayUI.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorOverlayUI.js */

(function() {
    if (!window.EditorCore) return;

    Object.assign(window.EditorCore.prototype, {
        
        initOverlayEditor() {
            if (document.getElementById('ss-overlay-modal')) return;

            const style = document.createElement('style');
            style.id = 'ss-overlay-styles';
            style.innerHTML = `
                #ss-overlay-modal { position:fixed; inset:0; background:rgba(15,23,42,0.95); backdrop-filter:blur(12px); z-index:2147483647; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; transition:0.3s ease; pointer-events:none; font-family:'Inter', sans-serif; }
                #ss-overlay-modal.visible { opacity:1; pointer-events:all; }
                .ss-overlay-header { width: 90vw; max-width: 1200px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; color:#fff; }
                
                .ss-overlay-tabs { display:flex; background:rgba(255,255,255,0.1); padding:4px; border-radius:8px; }
                .ss-overlay-tab { padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85rem; color:var(--text-muted); transition:0.2s; border:none; background:transparent; }
                .ss-overlay-tab.active { background:var(--primary); color:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.3); }

                .ss-overlay-workspace { width: 90vw; max-width: 1200px; aspect-ratio: 16/9; background: #000; border-radius: 8px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
                .ss-overlay-bg { position:absolute; inset:0; opacity:0.5; background-size:cover; background-position:center; filter: blur(20px) brightness(0.4); transition: opacity 0.4s ease; }
                
                .ss-overlay-safe-zone { position:absolute; inset: 5%; border: 1px solid transparent; pointer-events:none; z-index: 15; transition:0.3s; }
                .ss-overlay-safe-zone.active-zone::before, .ss-overlay-safe-zone.active-zone::after { content: ''; position: absolute; width: 30px; height: 30px; border-color: rgba(255,255,255,0.6); border-style: solid; }
                .ss-overlay-safe-zone.active-zone::before { top: 0; left: 0; border-width: 2px 0 0 2px; }
                .ss-overlay-safe-zone.active-zone::after { bottom: 0; right: 0; border-width: 0 2px 2px 0; }
                .sz-tr { position: absolute; top: 0; right: 0; width: 30px; height: 30px; border-top: 2px solid rgba(255,255,255,0.6); border-right: 2px solid rgba(255,255,255,0.6); display:none; }
                .sz-bl { position: absolute; bottom: 0; left: 0; width: 30px; height: 30px; border-bottom: 2px solid rgba(255,255,255,0.6); border-left: 2px solid rgba(255,255,255,0.6); display:none; }
                .ss-overlay-safe-zone.active-zone .sz-tr, .ss-overlay-safe-zone.active-zone .sz-bl { display: block; }
                
                .ss-overlay-safe-zone::after { content: "5% Safe Zone"; position:absolute; bottom:10px; right:35px; font-size:10px; color:rgba(255, 255, 255, 0.4); font-weight:bold; letter-spacing:1px; border:none; width:auto; height:auto; display:none; }
                .ss-overlay-safe-zone.active-zone::after { display:block; }

                .ss-draggable { position: absolute; cursor: grab; user-select: none; border: 2px solid transparent; transition: box-shadow 0.15s ease, border-color 0.15s ease; box-sizing:border-box; z-index: 100; transform: translate(-50%, -50%); display:flex; align-items:center; justify-content:center; padding:4px; border-radius:12px; }
                .ss-draggable:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }
                .ss-draggable.active-drag { cursor: grabbing; border-color: var(--primary); box-shadow: 0 15px 35px rgba(0,0,0,0.6); background: rgba(37,99,235,0.15); z-index: 101; transform: translate(-50%, -50%) scale(1.05); }
                
                .ss-drag-tooltip { position:absolute; top:-35px; left:50%; transform:translateX(-50%); background:#1e293b; color:#fff; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:800; pointer-events:none; opacity:0; transition: opacity 0.2s ease; white-space:nowrap; box-shadow:0 4px 12px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); letter-spacing:0.5px; }
                .ss-draggable.active-drag .ss-drag-tooltip { opacity:1; }
                
                .ss-snap-line { position: absolute; background: var(--primary); z-index: 90; opacity: 0; pointer-events: none; transition: opacity 0.15s; box-shadow: 0 0 8px var(--primary); }
                .ss-snap-line.v-line { width: 1px; top: 0; bottom: 0; }
                .ss-snap-line.h-line { height: 1px; left: 0; right: 0; }
                .ss-snap-line.visible { opacity: 1; }
                
                /* Extra styling voor Reset Knop en Overlap Waarschuwing */
                .ss-btn-icon-reset { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
                .ss-btn-icon-reset:hover { background: rgba(255,255,255,0.2); }
            `;
            document.head.appendChild(style);

            // FASE 2: Geïsoleerd Virtual Canvas (ss-overlay-virtual-canvas)
            const modal = document.createElement('div');
            modal.id = 'ss-overlay-modal';
            modal.innerHTML = `
                <div class="ss-overlay-header">
                    <div>
                        <h2 style="margin:0; font-size:1.5rem; font-weight:800;">Visuele Positie Bewerker</h2>
                        <div style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;">Sleep de elementen om ze te positioneren. (Shift + Pijltjestoetsen voor precisie).</div>
                    </div>
                    <div class="ss-overlay-tabs">
                        <button class="ss-overlay-tab active" data-tab="clock">1. Klok (TV Achtergrond)</button>
                        <button class="ss-overlay-tab" data-tab="watermark">2. Watermerk (Op de Foto)</button>
                    </div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <div id="ss-overlap-warning" style="display:none; color:#ef4444; font-size:0.85rem; font-weight:bold; align-items:center; gap:4px; padding: 4px 8px; background: rgba(239, 68, 68, 0.1); border-radius: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                            Overlap
                        </div>
                        <button id="btn-overlay-reset" class="ss-btn-icon-reset" style="padding:10px; border-radius:6px; cursor:pointer;" title="Herstel Positie naar standaard">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                        </button>
                        <button id="btn-overlay-cancel" class="ss-btn-secondary" style="padding:10px 20px; font-weight:600; font-size:0.9rem; border-radius:6px; cursor:pointer;">Annuleren</button>
                        <button id="btn-overlay-save" class="ss-btn-primary" style="padding:10px 20px; font-weight:600; font-size:0.9rem; border-radius:6px; background:#10b981; color:#fff; border:none; cursor:pointer;">Opslaan & Sluiten</button>
                    </div>
                </div>
                
                <div class="ss-overlay-workspace" id="ss-overlay-workspace">
                    <div id="ss-overlay-virtual-canvas" style="width:1920px; height:1080px; position:absolute; top:0; left:0; transform-origin: 0 0; background:#000; overflow:hidden; display:block;">
                        <div class="ss-overlay-bg" id="ss-overlay-bg"></div>
                        
                        <div id="ss-safe-tv" class="ss-overlay-safe-zone active-zone">
                            <div class="sz-tr"></div><div class="sz-bl"></div>
                        </div>
                        
                        <div class="ss-overlay-stage" id="ss-overlay-stage" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:10; transition: transform 0.3s ease;">
                            <div class="ss-overlay-stage-inner" id="ss-overlay-stage-inner" style="pointer-events:all; display:flex; align-items:center; justify-content:center; width:100%; height:100%;"></div>
                        </div>

                        <div id="ss-snap-v-center" class="ss-snap-line v-line" style="left:50%;"></div>
                        <div id="ss-snap-h-center" class="ss-snap-line h-line" style="top:50%;"></div>

                        <div id="ss-drag-clock" class="ss-draggable" title="Sleep de klok over het tv-scherm" style="z-index:30;">
                            <div class="ss-drag-tooltip" id="tooltip-clk">X: 10% Y: 10%</div>
                            <div id="ss-drag-content-clock" style="pointer-events:none; display:flex; align-items:center; justify-content:center;"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('btn-overlay-cancel').onclick = () => this.closeOverlayEditor();
            document.getElementById('btn-overlay-save').onclick = () => this.saveOverlayPositions();
            
            // Feature A2: Reset Positie Logica
            document.getElementById('btn-overlay-reset').onclick = () => {
                if (this.currentOverlayTab === 'clock') {
                    const clk = document.getElementById('ss-drag-clock');
                    if (clk) { clk.style.left = '5%'; clk.style.top = '5%'; }
                } else {
                    const wm = document.getElementById('ss-drag-watermark');
                    if (wm) { wm.style.left = '80%'; wm.style.top = '85%'; }
                }
                this.checkOverlap();
                const tooltipId = this.currentOverlayTab === 'clock' ? 'tooltip-clk' : 'tooltip-wm';
                const el = this.currentOverlayTab === 'clock' ? document.getElementById('ss-drag-clock') : document.getElementById('ss-drag-watermark');
                const tooltip = document.getElementById(tooltipId);
                if (tooltip && el) tooltip.innerText = `X: ${parseFloat(el.style.left).toFixed(1)}% Y: ${parseFloat(el.style.top).toFixed(1)}%`;
            };

            modal.querySelectorAll('.ss-overlay-tab').forEach(tab => {
                tab.onclick = () => {
                    modal.querySelectorAll('.ss-overlay-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.switchOverlayTab(tab.dataset.tab);
                };
            });

            this.setupKeyboardControls();
        },

        // Feature A5: Overlap Check Functie
        checkOverlap() {
            const wm = document.getElementById('ss-drag-watermark');
            const clk = document.getElementById('ss-drag-clock');
            const warn = document.getElementById('ss-overlap-warning');
            
            if (!wm || !clk || !warn) return;
            
            const wx = parseFloat(wm.style.left) || 0;
            const wy = parseFloat(wm.style.top) || 0;
            const cx = parseFloat(clk.style.left) || 0;
            const cy = parseFloat(clk.style.top) || 0;
            
            // Als ze binnen 5% van elkaar staan (ongeveer zelfde positie)
            if (Math.abs(wx - cx) < 5 && Math.abs(wy - cy) < 5) {
                warn.style.display = 'flex';
                if (this.currentOverlayTab === 'clock') clk.style.borderColor = '#ef4444';
                else wm.style.borderColor = '#ef4444';
            } else {
                warn.style.display = 'none';
                clk.style.borderColor = 'transparent';
                wm.style.borderColor = 'transparent';
            }
        },

        switchOverlayTab(tabMode) {
            const clock = document.getElementById('ss-drag-clock');
            const watermark = document.getElementById('ss-drag-watermark');
            const safeTv = document.getElementById('ss-safe-tv');
            const safeMedia = document.getElementById('ss-safe-media');
            const bg = document.getElementById('ss-overlay-bg');
            const stage = document.getElementById('ss-overlay-stage-inner');
            const cropbox = document.getElementById('ss-overlay-cropbox');

            this.currentOverlayTab = tabMode;

            if (tabMode === 'clock') {
                if (clock) clock.style.display = 'flex';
                if (watermark) watermark.style.display = 'none';
                if (safeTv) safeTv.classList.add('active-zone');
                if (safeMedia) {
                    safeMedia.classList.remove('active-zone');
                    safeMedia.style.display = 'none';
                }
                
                if (bg) bg.style.opacity = '0.5';
                if (stage) stage.style.boxShadow = '0 20px 50px rgba(0,0,0,0.8)';
                if (stage) stage.style.opacity = '0.4'; 
                if (cropbox) cropbox.style.filter = 'grayscale(30%)';
                
                this.activeDragElement = clock;
            } else {
                if (clock) clock.style.display = 'none';
                if (watermark) watermark.style.display = 'flex';
                if (safeTv) safeTv.classList.remove('active-zone');
                if (safeMedia) {
                    safeMedia.style.display = 'block';
                    setTimeout(() => safeMedia.classList.add('active-zone'), 50);
                }
                
                if (bg) bg.style.opacity = '0.1'; 
                if (stage) stage.style.boxShadow = '0 0 0 4px var(--primary), 0 20px 50px rgba(0,0,0,1)';
                if (stage) stage.style.opacity = '1';
                if (cropbox) cropbox.style.filter = 'none';
                
                this.activeDragElement = watermark;
            }
            
            document.querySelectorAll('.ss-draggable').forEach(d => d.classList.remove('active-drag'));
            this.checkOverlap(); // Check overlap bij wisselen van tab
        },

        closeOverlayEditor() {
            const modal = document.getElementById('ss-overlay-modal');
            if (modal) modal.classList.remove('visible');
            this.activeDragElement = null;
            document.querySelectorAll('.ss-draggable').forEach(el => el.classList.remove('active-drag'));
            
            if (this.overlayResizeObserver) {
                this.overlayResizeObserver.disconnect();
                this.overlayResizeObserver = null;
            }
        },

        openOverlayEditor() {
            this.initOverlayEditor();
            const modal = document.getElementById('ss-overlay-modal');
            const bg = document.getElementById('ss-overlay-bg');
            const stageOverlay = document.getElementById('ss-overlay-stage');
            const stageInner = document.getElementById('ss-overlay-stage-inner');
            const workspace = document.getElementById('ss-overlay-workspace');
            
            const s = this.data.slideshow;
            if (typeof s.settings === 'string') {
                try { s.settings = JSON.parse(s.settings); } catch(e) { s.settings = {}; }
            }
            if (!s.settings) s.settings = {};

            let bgUrl = '';
            let selectedItem = null;
            if (this.data.items && this.selectedIndices && this.selectedIndices.length > 0) {
                selectedItem = this.data.items[this.selectedIndices[0]];
                if (selectedItem && (!selectedItem.mime_type || !selectedItem.mime_type.startsWith('video'))) {
                    bgUrl = this.getItemUrl(selectedItem);
                }
            }
            if (!bgUrl && this.data.items && this.data.items.length > 0) {
                selectedItem = this.data.items.find(i => !i.mime_type || !i.mime_type.startsWith('video'));
                if (selectedItem) bgUrl = this.getItemUrl(selectedItem);
            }
            
            bg.style.backgroundImage = bgUrl ? `url('${bgUrl}')` : 'none';
            
            if (bgUrl && selectedItem) {
                const globalScale = s.settings.media_scale !== undefined ? s.settings.media_scale : 0.85;
                const rawScale = (selectedItem.media_scale !== null && selectedItem.media_scale !== undefined) ? selectedItem.media_scale : globalScale;
                const renderScale = rawScale * 0.75; 
                
                stageOverlay.style.transform = `scale(${renderScale})`;
                
                // FASE 2: Absolute Pariteit met EditorUI.js (Wiskundige Extractie)
                let crop_x = selectedItem.crop_x !== null && selectedItem.crop_x !== undefined ? parseFloat(selectedItem.crop_x) : 0;
                let crop_y = selectedItem.crop_y !== null && selectedItem.crop_y !== undefined ? parseFloat(selectedItem.crop_y) : 0;
                let crop_w = selectedItem.crop_w !== null && selectedItem.crop_w !== undefined ? parseFloat(selectedItem.crop_w) : 100;
                let crop_h = selectedItem.crop_h !== null && selectedItem.crop_h !== undefined ? parseFloat(selectedItem.crop_h) : 100;
                
                let imgW = (100 / crop_w) * 100;
                let imgH = (100 / crop_h) * 100;
                let imgL = -(crop_x / crop_w) * 100;
                let imgT = -(crop_y / crop_h) * 100;

                let filterStr = '';
                const filter_b = selectedItem.filter_brightness ?? 100;
                const filter_c = selectedItem.filter_contrast ?? 100;
                const filter_sat = selectedItem.filter_saturate ?? 100;
                filterStr = `brightness(${filter_b}%) contrast(${filter_c}%) saturate(${filter_sat}%) `;
                
                if (selectedItem.image_filter && selectedItem.image_filter !== 'none') {
                    const f = selectedItem.image_filter;
                    if (f === 'grayscale') filterStr += 'grayscale(100%) ';
                    else if (f === 'sepia') filterStr += 'sepia(100%) ';
                    else if (f === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
                    else filterStr += `${f} `;
                }
                
                let imgCss = `position:absolute; left:${imgL}%; top:${imgT}%; width:${imgW}%; height:${imgH}%; max-width:none; max-height:none; filter: ${filterStr.trim()};`;

                let frameStyle = 'none';
                if (selectedItem.settings && selectedItem.settings.frame_style !== undefined && selectedItem.settings.frame_style !== '') {
                    frameStyle = selectedItem.settings.frame_style;
                } else if (s.settings && s.settings.frame_style) {
                    frameStyle = s.settings.frame_style;
                }
                
                let frameCss = '';
                let cropboxInset = 'inset: 0;';
                let cropRadius = '0';
                
                if (frameStyle === 'none') {
                    frameCss = 'border: none; background: transparent; padding: 0; box-shadow: none;';
                } else if (frameStyle === 'classic') {
                    frameCss = 'background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 8px; padding: 16px;';
                    cropboxInset = 'top: 16px; left: 16px; right: 16px; bottom: 16px;';
                } else if (frameStyle === 'polaroid') {
                    frameCss = 'background: #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 4px; padding: 24px 24px 100px 24px;';
                    cropboxInset = 'top: 24px; left: 24px; right: 24px; bottom: 100px;';
                } else if (frameStyle === 'rounded') {
                    frameCss = 'box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius: 24px; border: 2px solid rgba(255,255,255,0.1);';
                    cropRadius = '24px';
                }

                // FASE 2: Injecteer de Dummy SVG Structuur tbv Resize Nabehandeling
                stageInner.innerHTML = `
                    <div id="ss-overlay-frame" class="ss-layer-frame" style="position:relative; display:inline-flex; min-width:0; min-height:0; max-width:100%; max-height:100%; box-sizing:border-box; ${frameCss} align-items:center; justify-content:center; pointer-events:all;">
                        
                        <svg class="ss-dummy-svg" width="1920" height="1080" viewBox="0 0 1920 1080" style="opacity:0; display:block; max-width:100%; max-height:100%; pointer-events:none;"></svg>
                        
                        <div id="ss-overlay-cropbox" style="position:absolute; ${cropboxInset} overflow:hidden; border-radius:${cropRadius}; pointer-events:none;">
                             <img src="${bgUrl}" class="ss-phantom-measure" data-cropw="${crop_w}" data-croph="${crop_h}" style="${imgCss}" draggable="false">
                        </div>
                        
                        <div id="ss-safe-media" class="ss-overlay-safe-zone" style="display:none; z-index: 10;">
                            <div class="sz-tr"></div><div class="sz-bl"></div>
                        </div>
                        
                        <div id="ss-drag-watermark" class="ss-draggable" style="display:none; z-index: 20;" title="Sleep het logo over de foto">
                            <div class="ss-drag-tooltip" id="tooltip-wm">X: 80% Y: 80%</div>
                            <div id="ss-drag-content-watermark" style="pointer-events:none; display:flex; align-items:center; justify-content:center;"></div>
                        </div>
                        
                    </div>
                `;

                // FASE 2: Activeer de Veilige Nabehandeling
                const measureImgs = stageInner.querySelectorAll('.ss-phantom-measure');
                measureImgs.forEach(img => {
                    const applyFix = () => {
                        const frame = document.getElementById('ss-overlay-frame');
                        if (!frame) return;
                        const svg = frame.querySelector('svg.ss-dummy-svg');
                        if (!svg) return;
                        
                        const w = img.naturalWidth || img.videoWidth || 1920;
                        const h = img.naturalHeight || img.videoHeight || 1080;
                        
                        const cW = parseFloat(img.dataset.cropw) || 100;
                        const cH = parseFloat(img.dataset.croph) || 100;
                        
                        const actueleW = Math.max(1, w * (cW / 100));
                        const actueleH = Math.max(1, h * (cH / 100));
                        
                        svg.setAttribute('viewBox', `0 0 ${actueleW} ${actueleH}`);
                        
                        const canvasRatio = 1920 / 1080;
                        const cropRatio = actueleW / actueleH;
                        
                        let finalW, finalH;
                        if (cropRatio >= canvasRatio) {
                            finalW = 1920;
                            finalH = 1920 / cropRatio;
                        } else {
                            finalH = 1080;
                            finalW = 1080 * cropRatio;
                        }
                        
                        svg.setAttribute('width', finalW);
                        svg.setAttribute('height', finalH);
                    };

                    if (img.tagName === 'IMG') {
                        if (img.complete && img.naturalWidth > 0) applyFix();
                        else img.addEventListener('load', applyFix);
                    } else {
                        if (img.readyState >= 1) applyFix();
                        else img.addEventListener('loadedmetadata', applyFix);
                    }
                });
            }
            
            // FASE 2: Watermerk vullen (+ Bug 11 Fix)
            const wmEl = document.getElementById('ss-drag-watermark');
            const wmContent = document.getElementById('ss-drag-content-watermark');
            
            let rawWm = this.buildWatermarkHTML(s);
            rawWm = String(rawWm || '').replace(/position:\s*absolute;?/g, '').replace(/left:[^;]+;?/g, '').replace(/top:[^;]+;?/g, '').replace(/transform:[^;]+;?/g, '').replace(/z-index:[^;]+;?/g, ''); 
            if (wmContent) wmContent.innerHTML = rawWm || '<div style="color:white; padding:10px; background:rgba(255,255,255,0.1); border-radius:4px; font-size:0.85rem;">Geen Watermerk</div>';

            let wmX = s.settings.watermark_x !== undefined ? s.settings.watermark_x : 80; 
            let wmY = s.settings.watermark_y !== undefined ? s.settings.watermark_y : 85;
            if (wmEl) {
                wmEl.style.left = wmX + '%';
                wmEl.style.top = wmY + '%';
            }
            const tooltipWm = document.getElementById('tooltip-wm');
            if (tooltipWm) tooltipWm.innerText = `X: ${wmX}% Y: ${wmY}%`;

            // FASE 2: Klok vullen (+ Bug 11 Fix)
            const clkEl = document.getElementById('ss-drag-clock');
            const clkContent = document.getElementById('ss-drag-content-clock');
            
            let rawClk = this.buildClockHTML(s);
            rawClk = String(rawClk || '').replace(/position:\s*absolute;?/g, '').replace(/left:[^;]+;?/g, '').replace(/top:[^;]+;?/g, '').replace(/transform:[^;]+;?/g, '').replace(/z-index:[^;]+;?/g, ''); 
            
            const clockScale = s.settings.clock_scale !== undefined ? s.settings.clock_scale : 1.0;
            if (clkContent) clkContent.innerHTML = rawClk ? `<div style="transform:scale(${clockScale}); transform-origin:center; display:flex;">${rawClk}</div>` : '<div style="color:white; padding:10px; background:rgba(255,255,255,0.1); border-radius:4px; font-size:0.85rem;">Geen Klok</div>';

            let clkX = s.settings.clock_x !== undefined ? s.settings.clock_x : 5; 
            let clkY = s.settings.clock_y !== undefined ? s.settings.clock_y : 5;
            if (clkEl) {
                clkEl.style.left = clkX + '%';
                clkEl.style.top = clkY + '%';
            }
            const tooltipClk = document.getElementById('tooltip-clk');
            if (tooltipClk) tooltipClk.innerText = `X: ${clkX}% Y: ${clkY}%`;

            // Activeer Draggables aan hun specifieke containers (ID-Isolatie Fix)
            this.setupDraggable('ss-drag-watermark', 'tooltip-wm', 'ss-overlay-frame');
            this.setupDraggable('ss-drag-clock', 'tooltip-clk', 'ss-overlay-virtual-canvas');

            // Virtual Canvas Resize Observer voor Modal Modus
            if (!this.overlayResizeObserver) {
                this.overlayResizeObserver = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        const w = entry.contentRect.width;
                        const vCanvas = document.getElementById('ss-overlay-virtual-canvas');
                        if (vCanvas) {
                            const scale = w / 1920;
                            vCanvas.style.transform = `scale(${scale})`;
                        }
                    }
                });
            }
            if (workspace) this.overlayResizeObserver.observe(workspace);

            const initialW = workspace ? workspace.clientWidth : 800;
            const vCanvas = document.getElementById('ss-overlay-virtual-canvas');
            if (vCanvas) vCanvas.style.transform = `scale(${initialW / 1920})`;

            this.switchOverlayTab('clock');
            modal.classList.add('visible');
            
            // Controleer direct bij openen of er een overlap is
            this.checkOverlap();
        },

        setupDraggable(elementId, tooltipId, containerId) {
            const el = document.getElementById(elementId);
            const tooltip = document.getElementById(tooltipId);
            const container = document.getElementById(containerId);
            if (!el || !container) return;

            let isDragging = false;
            let startX, startY, initialLeftPct, initialTopPct;

            const snapLines = {
                vCenter: document.getElementById('ss-snap-v-center'),
                hCenter: document.getElementById('ss-snap-h-center')
            };

            const hideSnaps = () => {
                Object.values(snapLines).forEach(line => {
                    if (line) line.classList.remove('visible');
                });
            };

            const onMouseMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();

                const currentX = e.clientX || (e.touches && e.touches[0].clientX);
                const currentY = e.clientY || (e.touches && e.touches[0].clientY);

                const dx = currentX - startX;
                const dy = currentY - startY;

                // Virtual Canvas CSS-schaal zorgt ervoor dat getBoundingClientRect() wiskundig perfect is
                const parentRect = container.getBoundingClientRect();
                
                let newLeft = initialLeftPct + (dx / parentRect.width) * 100;
                let newTop = initialTopPct + (dy / parentRect.height) * 100;

                // FASE 2: Clamping restricties
                const minClamp = el.id === 'ss-drag-watermark' ? 0 : 5;
                const maxClamp = el.id === 'ss-drag-watermark' ? 100 : 95;

                if (newLeft < minClamp) newLeft = minClamp;
                if (newLeft > maxClamp) newLeft = maxClamp;
                if (newTop < minClamp) newTop = minClamp;
                if (newTop > maxClamp) newTop = maxClamp;

                hideSnaps();

                const snapThreshold = 1.5; 
                if (Math.abs(newLeft - 50) < snapThreshold) { 
                    newLeft = 50; 
                    if (snapLines.vCenter) snapLines.vCenter.classList.add('visible'); 
                }
                if (Math.abs(newTop - 50) < snapThreshold) { 
                    newTop = 50; 
                    if (snapLines.hCenter) snapLines.hCenter.classList.add('visible'); 
                }

                el.style.left = newLeft + '%';
                el.style.top = newTop + '%';
                if (tooltip) tooltip.innerText = `X: ${newLeft.toFixed(1)}% Y: ${newTop.toFixed(1)}%`;
                
                // Feature A5: Controleer overlap tijdens slepen
                this.checkOverlap();
            };

            const onMouseUp = () => {
                isDragging = false;
                hideSnaps();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('touchmove', onMouseMove);
                document.removeEventListener('touchend', onMouseUp);
            };

            const handleStart = (e) => {
                if (e.target.closest('.ss-btn-primary') || e.target.closest('.ss-btn-secondary') || e.target.closest('.ss-btn-icon-reset')) return;
                
                isDragging = true;
                document.querySelectorAll('.ss-draggable').forEach(d => d.classList.remove('active-drag'));
                el.classList.add('active-drag');
                this.activeDragElement = el;

                startX = e.clientX || (e.touches && e.touches[0].clientX);
                startY = e.clientY || (e.touches && e.touches[0].clientY);
                
                initialLeftPct = parseFloat(el.style.left) || 0;
                initialTopPct = parseFloat(el.style.top) || 0;
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('touchmove', onMouseMove, { passive: false });
                document.addEventListener('touchend', onMouseUp);
            };

            // Ondersteuning voor Muis én Touch
            el.addEventListener('mousedown', handleStart);
            el.addEventListener('touchstart', handleStart, { passive: false });
        },

        setupKeyboardControls() {
            if (this.keyboardControlsBound) return;
            this.keyboardControlsBound = true;

            document.addEventListener('keydown', (e) => {
                const modal = document.getElementById('ss-overlay-modal');
                if (!modal || !modal.classList.contains('visible') || !this.activeDragElement) return;

                const step = e.shiftKey ? 2 : 0.2; 
                const el = this.activeDragElement;
                let currentLeft = parseFloat(el.style.left) || 0;
                let currentTop = parseFloat(el.style.top) || 0;

                let moved = false;
                if (e.key === 'ArrowLeft') { currentLeft -= step; moved = true; }
                if (e.key === 'ArrowRight') { currentLeft += step; moved = true; }
                if (e.key === 'ArrowUp') { currentTop -= step; moved = true; }
                if (e.key === 'ArrowDown') { currentTop += step; moved = true; }

                if (moved) {
                    e.preventDefault();
                    
                    const minClamp = el.id === 'ss-drag-watermark' ? 0 : 5;
                    const maxClamp = el.id === 'ss-drag-watermark' ? 100 : 95;

                    if (currentLeft < minClamp) currentLeft = minClamp;
                    if (currentLeft > maxClamp) currentLeft = maxClamp;
                    if (currentTop < minClamp) currentTop = minClamp;
                    if (currentTop > maxClamp) currentTop = maxClamp;

                    el.style.left = currentLeft + '%';
                    el.style.top = currentTop + '%';
                    
                    const tooltipId = el.id === 'ss-drag-watermark' ? 'tooltip-wm' : 'tooltip-clk';
                    const tooltip = document.getElementById(tooltipId);
                    if (tooltip) tooltip.innerText = `X: ${currentLeft.toFixed(1)}% Y: ${currentTop.toFixed(1)}%`;
                    
                    // Feature A5: Controleer overlap tijdens gebruik pijltjestoetsen
                    this.checkOverlap();
                }
            });
        },

        saveOverlayPositions() {
            const wmEl = document.getElementById('ss-drag-watermark');
            const clkEl = document.getElementById('ss-drag-clock');
            
            if (typeof this.data.slideshow.settings === 'string') {
                try { this.data.slideshow.settings = JSON.parse(this.data.slideshow.settings); } catch(e) { this.data.slideshow.settings = {}; }
            }
            if (!this.data.slideshow.settings) this.data.slideshow.settings = {};
            
            if (wmEl) {
                this.data.slideshow.settings.watermark_x = parseFloat(wmEl.style.left).toFixed(2);
                this.data.slideshow.settings.watermark_y = parseFloat(wmEl.style.top).toFixed(2);
            }
            if (clkEl) {
                this.data.slideshow.settings.clock_x = parseFloat(clkEl.style.left).toFixed(2);
                this.data.slideshow.settings.clock_y = parseFloat(clkEl.style.top).toFixed(2);
            }

            this.closeOverlayEditor();
            
            if (this.triggerAutoSave) this.triggerAutoSave("Overlay posities opgeslagen.");
            if (this.renderPreview) this.renderPreview();
        }
    });
})();