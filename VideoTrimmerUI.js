/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/VideoTrimmerUI.js */

(function() {
    class VideoTrimmerUI {
        constructor() {
            this.observer = null;
            this.videoDuration = 0;
            this.trimStart = 0;
            this.trimEnd = 0;
            this.loopInterval = null;
            this.isLooping = false;
            
            // DOM Elements
            this.track = null;
            this.fill = null;
            this.handleLeft = null;
            this.handleRight = null;
            this.labelStart = null;
            this.labelEnd = null;
            
            this.activeHandle = null; 
            this.trackWidth = 0;
            this.trackLeft = 0;

            this.injectStyles();
            this.init();
        }

        injectStyles() {
            if (document.getElementById('ss-trimmer-styles')) return;
            const style = document.createElement('style');
            style.id = 'ss-trimmer-styles';
            style.innerHTML = `
                .ss-trimmer-container { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(128,128,128,0.15); animation: ssFadeIn 0.3s ease; }
                .ss-trimmer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .ss-trimmer-title { font-size: 0.75rem; font-weight: 800; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.8px; display:flex; align-items:center; gap:6px; color: var(--text-main); }
                
                /* Tijd Liniaal (Ruler Ticks) */
                .ss-trimmer-ruler { display: flex; justify-content: space-between; height: 6px; padding: 0 8px; margin-bottom: 2px; }
                .ss-ruler-tick { width: 1px; height: 100%; background: rgba(128,128,128,0.3); }
                .ss-ruler-tick.major { height: 100%; background: rgba(128,128,128,0.6); }
                .ss-ruler-tick.minor { height: 50%; align-self: flex-end; }

                /* De Hoofdbalk met Filmstrip & Waveform */
                .ss-trimmer-track { position: relative; width: 100%; height: 44px; background: #000; border-radius: 8px; cursor: pointer; user-select: none; touch-action: none; border: 1px solid rgba(128,128,128,0.1); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); overflow: hidden; }
                
                .ss-trimmer-filmstrip { position: absolute; inset: 0; display: flex; opacity: 0.5; filter: grayscale(50%); z-index: 0; }
                .ss-filmstrip-frame { flex: 1; height: 100%; background-size: cover; background-position: center; border-right: 1px solid rgba(0,0,0,0.5); }
                
                .ss-trimmer-waveform { position: absolute; inset: 0; z-index: 1; opacity: 0.7; background-image: repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px); -webkit-mask-image: linear-gradient(to bottom, transparent 20%, black 50%, transparent 80%); mask-image: linear-gradient(to bottom, transparent 20%, black 50%, transparent 80%); }

                .ss-trimmer-fill { position: absolute; height: 100%; top: 0; background: rgba(255, 255, 255, 0.1); border-top: 3px solid var(--primary); border-bottom: 3px solid var(--primary); pointer-events: none; z-index: 2; backdrop-filter: brightness(1.5); transition: border-color 0.2s; }
                .ss-trimmer-fill.warning { border-color: var(--error); background: rgba(239, 68, 68, 0.2); }
                
                /* Handvatten & Tooltips */
                .ss-trimmer-handle { position: absolute; top: -2px; width: 18px; height: 48px; background: #fff; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.1); transform: translateX(-50%); z-index: 3; cursor: ew-resize; display: flex; align-items: center; justify-content: center; transition: background 0.2s, transform 0.1s; }
                .ss-trimmer-handle::after { content: ''; width: 2px; height: 18px; background: rgba(0,0,0,0.4); border-radius: 2px; }
                .ss-trimmer-handle:hover { background: #f8fafc; transform: translateX(-50%) scaleY(1.05); }
                .ss-trimmer-handle.active { background: var(--primary); border-color: var(--primary); transform: translateX(-50%) scaleY(1.1); box-shadow: 0 6px 15px rgba(37, 99, 235, 0.5); }
                .ss-trimmer-handle.active::after { background: rgba(255,255,255,0.8); }
                
                .ss-trimmer-tooltip { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
                .ss-trimmer-handle.active .ss-trimmer-tooltip { opacity: 1; }

                /* Nudge Controls & Labels */
                .ss-trimmer-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
                .ss-nudge-group { display: flex; align-items: center; gap: 4px; background: rgba(128,128,128,0.05); padding: 4px; border-radius: 8px; border: 1px solid rgba(128,128,128,0.1); }
                .ss-nudge-btn { background: transparent; border: none; color: var(--text-main); cursor: pointer; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; transition: 0.2s; opacity: 0.7; }
                .ss-nudge-btn:hover { background: rgba(128,128,128,0.1); opacity: 1; }
                .ss-nudge-label { font-size: 0.75rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); width: 45px; text-align: center; }

                /* Toolbar */
                .ss-trimmer-toolbar { display: flex; gap: 8px; margin-top: 16px; }
                .ss-trim-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(128,128,128,0.05); border: 1px solid rgba(128,128,128,0.15); padding: 8px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: var(--text-main); cursor: pointer; transition: 0.2s; }
                .ss-trim-btn:hover { background: rgba(128,128,128,0.1); border-color: var(--primary); color: var(--primary); }
                .ss-trim-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
                
                .ss-trimmer-disabled { opacity: 0.5; pointer-events: none; filter: grayscale(100%); }
            `;
            document.head.appendChild(style);
        }

        init() {
            const targetNode = document.body;
            const config = { childList: true, subtree: true };

            this.observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        const accContent = document.querySelector('.ss-accordion[data-acc="eff"] .ss-accordion-content');
                        if (accContent && !document.getElementById('ss-video-trimmer')) {
                            this.checkAndInjectTrimmer(accContent);
                        }
                    }
                }
            });
            this.observer.observe(targetNode, config);
        }

        checkAndInjectTrimmer(container) {
            const editor = window.App.slideshowEditor;
            if (!editor || !editor.data || !editor.selectedIndices || editor.selectedIndices.length !== 1) return; 

            const selectedItem = editor.data.items[editor.selectedIndices[0]];
            if (!selectedItem) return;
            
            const mime = selectedItem.mime_type || selectedItem.mime || '';
            if (!mime.startsWith('video')) return;

            let thumbUrl = `/api/files?action=thumb&id=${selectedItem.file_id}`;
            if (selectedItem.file_hash) thumbUrl = `/storage/thumbs/${selectedItem.file_hash}.webp`;

            const trimmerHtml = `
                <div id="ss-video-trimmer" class="ss-trimmer-container ${editor.isReadOnly ? 'ss-trimmer-disabled' : ''}">
                    <div class="ss-trimmer-header">
                        <span class="ss-trimmer-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            Video Inkorten
                        </span>
                        <span id="ss-trimmer-lbl-dur" style="font-size:0.7rem; font-weight:800; color:var(--text-muted);">0.0s</span>
                    </div>
                    
                    <div style="font-size:0.8rem; color:var(--primary); font-weight:600; padding: 10px; text-align:center; background:rgba(37,99,235,0.05); border-radius:8px;" id="ss-trimmer-status">
                        Video inladen...
                    </div>

                    <div id="ss-trimmer-workspace" style="display:none;">
                        <div class="ss-trimmer-ruler" id="ss-trimmer-ruler"></div>

                        <div class="ss-trimmer-track" id="ss-trimmer-track">
                            <div class="ss-trimmer-filmstrip">
                                <div class="ss-filmstrip-frame" style="background-image:url('${thumbUrl}');"></div>
                                <div class="ss-filmstrip-frame" style="background-image:url('${thumbUrl}');"></div>
                                <div class="ss-filmstrip-frame" style="background-image:url('${thumbUrl}');"></div>
                                <div class="ss-filmstrip-frame" style="background-image:url('${thumbUrl}');"></div>
                            </div>
                            <div class="ss-trimmer-waveform"></div>
                            
                            <div class="ss-trimmer-fill" id="ss-trimmer-fill"></div>
                            
                            <div class="ss-trimmer-handle" id="ss-trimmer-handle-left" data-handle="left">
                                <div class="ss-trimmer-tooltip" id="ss-tt-left">0.0s</div>
                            </div>
                            <div class="ss-trimmer-handle" id="ss-trimmer-handle-right" data-handle="right">
                                <div class="ss-trimmer-tooltip" id="ss-tt-right">0.0s</div>
                            </div>
                        </div>
                        
                        <div class="ss-trimmer-controls">
                            <div class="ss-nudge-group">
                                <button class="ss-nudge-btn" data-action="left-sub">-0.5</button>
                                <span class="ss-nudge-label" id="ss-trimmer-lbl-start">00:00</span>
                                <button class="ss-nudge-btn" data-action="left-add">+0.5</button>
                            </div>
                            <div class="ss-nudge-group">
                                <button class="ss-nudge-btn" data-action="right-sub">-0.5</button>
                                <span class="ss-nudge-label" id="ss-trimmer-lbl-end">00:00</span>
                                <button class="ss-nudge-btn" data-action="right-add">+0.5</button>
                            </div>
                        </div>

                        <div class="ss-trimmer-toolbar">
                            <button class="ss-trim-btn" id="btn-trim-magic" title="Snij intro & outro af">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                Auto
                            </button>
                            <button class="ss-trim-btn" id="btn-trim-loop" title="Test in Loop">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>
                                Test
                            </button>
                            <button class="ss-trim-btn" id="btn-trim-split" title="Kopieer en ga verder in deel 2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
                                Splits
                            </button>
                        </div>
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', trimmerHtml);

            this.track = document.getElementById('ss-trimmer-track');
            this.fill = document.getElementById('ss-trimmer-fill');
            this.handleLeft = document.getElementById('ss-trimmer-handle-left');
            this.handleRight = document.getElementById('ss-trimmer-handle-right');
            this.labelStart = document.getElementById('ss-trimmer-lbl-start');
            this.labelEnd = document.getElementById('ss-trimmer-lbl-end');
            
            this.waitForVideoMetadata(selectedItem);
        }

        waitForVideoMetadata(item) {
            const videoEl = document.querySelector('#ss-preview-box video');
            if (!videoEl) {
                setTimeout(() => this.waitForVideoMetadata(item), 500);
                return;
            }

            const setupTrimmer = () => {
                const duration = videoEl.duration;
                if (!duration || isNaN(duration) || duration === Infinity) {
                    document.getElementById('ss-trimmer-status').innerText = 'Kan video lengte niet bepalen.';
                    document.getElementById('ss-trimmer-status').style.color = 'var(--error)';
                    return;
                }

                document.getElementById('ss-trimmer-status').style.display = 'none';
                document.getElementById('ss-trimmer-workspace').style.display = 'block';

                this.videoDuration = duration;
                this.generateRuler(duration);
                
                this.trimStart = (item.trim_start !== null && item.trim_start !== undefined) ? parseFloat(item.trim_start) : 0;
                this.trimEnd = (item.trim_end !== null && item.trim_end !== undefined) ? parseFloat(item.trim_end) : duration;
                
                if (this.trimStart < 0) this.trimStart = 0;
                if (this.trimEnd > duration) this.trimEnd = duration;
                if (this.trimStart >= this.trimEnd) {
                    this.trimStart = 0;
                    this.trimEnd = duration;
                }

                this.updateUI();
                if (!window.App.slideshowEditor.isReadOnly) {
                    this.bindEvents(videoEl, item);
                }
            };

            if (videoEl.readyState >= 1) { 
                setupTrimmer();
            } else {
                videoEl.addEventListener('loadedmetadata', setupTrimmer, { once: true });
            }
        }

        generateRuler(duration) {
            const ruler = document.getElementById('ss-trimmer-ruler');
            if (!ruler) return;
            
            const steps = duration > 60 ? 10 : 5; // Elke 5 of 10 sec een dikke streep
            const totalMarks = Math.floor(duration / (steps / 2));
            
            let html = '';
            for (let i = 0; i <= totalMarks; i++) {
                const isMajor = i % 2 === 0;
                html += `<div class="ss-ruler-tick ${isMajor ? 'major' : 'minor'}"></div>`;
            }
            ruler.innerHTML = html;
        }

        formatTime(seconds) {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = Math.floor(seconds % 60).toString().padStart(2, '0');
            const ms = Math.floor((seconds % 1) * 10); 
            return `${m}:${s}.${ms}`;
        }

        updateUI() {
            if (this.videoDuration === 0) return;

            const leftPercent = (this.trimStart / this.videoDuration) * 100;
            const rightPercent = (this.trimEnd / this.videoDuration) * 100;
            const widthPercent = rightPercent - leftPercent;

            this.handleLeft.style.left = `${leftPercent}%`;
            this.handleRight.style.left = `${rightPercent}%`;
            
            this.fill.style.left = `${leftPercent}%`;
            this.fill.style.width = `${widthPercent}%`;

            this.labelStart.innerText = this.formatTime(this.trimStart);
            this.labelEnd.innerText = this.formatTime(this.trimEnd);
            
            document.getElementById('ss-tt-left').innerText = this.trimStart.toFixed(1) + 's';
            document.getElementById('ss-tt-right').innerText = this.trimEnd.toFixed(1) + 's';
            
            const selectedDur = this.trimEnd - this.trimStart;
            document.getElementById('ss-trimmer-lbl-dur').innerText = `${selectedDur.toFixed(1)}s`;

            // Waarschuwingskleur als < 2 sec
            if (selectedDur < 2.0) {
                this.fill.classList.add('warning');
            } else {
                this.fill.classList.remove('warning');
            }
        }

        bindEvents(videoEl, itemData) {
            const MIN_GAP = 1.0; 

            // --- DRAG LOGICA ---
            const onPointerDown = (e) => {
                if (e.target.closest('#ss-trimmer-handle-left')) this.activeHandle = 'left';
                else if (e.target.closest('#ss-trimmer-handle-right')) this.activeHandle = 'right';
                else return;

                e.preventDefault();
                if(this.activeHandle === 'left') this.handleLeft.classList.add('active');
                if(this.activeHandle === 'right') this.handleRight.classList.add('active');
                
                const rect = this.track.getBoundingClientRect();
                this.trackWidth = rect.width;
                this.trackLeft = rect.left;

                this.stopLoop(videoEl);
                videoEl.pause();

                if (navigator.vibrate) navigator.vibrate(20);

                document.addEventListener('pointermove', onPointerMove, { passive: false });
                document.addEventListener('pointerup', onPointerUp);
            };

            const onPointerMove = (e) => {
                e.preventDefault();
                if (!this.activeHandle) return;

                let x = e.clientX - this.trackLeft;
                if (x < 0) x = 0;
                if (x > this.trackWidth) x = this.trackWidth;

                const percent = x / this.trackWidth;
                let newTime = percent * this.videoDuration;

                // Magnetische Snap op hele seconden
                if (Math.abs(newTime - Math.round(newTime)) < 0.2) {
                    newTime = Math.round(newTime);
                }

                if (this.activeHandle === 'left') {
                    if (newTime >= this.trimEnd - MIN_GAP) newTime = this.trimEnd - MIN_GAP;
                    this.trimStart = newTime;
                    videoEl.currentTime = this.trimStart; 
                } else {
                    if (newTime <= this.trimStart + MIN_GAP) newTime = this.trimStart + MIN_GAP;
                    this.trimEnd = newTime;
                    videoEl.currentTime = this.trimEnd; 
                }

                this.updateUI();
            };

            const onPointerUp = () => {
                if (!this.activeHandle) return;
                
                this.handleLeft.classList.remove('active');
                this.handleRight.classList.remove('active');
                
                this.activeHandle = null;
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);

                videoEl.currentTime = this.trimStart;
                videoEl.play().catch(()=>{});

                this.saveToDatabase(itemData);
            };

            this.track.addEventListener('pointerdown', onPointerDown);

            // --- NUDGE CONTROLS ---
            document.querySelectorAll('.ss-nudge-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    this.stopLoop(videoEl);
                    const action = btn.dataset.action;
                    
                    if (action === 'left-sub') this.trimStart = Math.max(0, this.trimStart - 0.5);
                    if (action === 'left-add') this.trimStart = Math.min(this.trimEnd - MIN_GAP, this.trimStart + 0.5);
                    if (action === 'right-sub') this.trimEnd = Math.max(this.trimStart + MIN_GAP, this.trimEnd - 0.5);
                    if (action === 'right-add') this.trimEnd = Math.min(this.videoDuration, this.trimEnd + 0.5);
                    
                    videoEl.currentTime = action.includes('left') ? this.trimStart : this.trimEnd;
                    
                    this.updateUI();
                    this.saveToDatabase(itemData);
                };
            });

            // --- ENTERPRISE TOOLBAR ---
            
            // 1. Toverstaf (Auto Trim)
            document.getElementById('btn-trim-magic').onclick = (e) => {
                e.preventDefault();
                this.stopLoop(videoEl);
                
                // Snij 10% van begin en 10% van eind af
                const tienProcent = this.videoDuration * 0.1;
                this.trimStart = tienProcent;
                this.trimEnd = this.videoDuration - tienProcent;
                
                videoEl.currentTime = this.trimStart;
                this.updateUI();
                this.saveToDatabase(itemData);
                
                if (window.EventBus) window.EventBus.emit('notify:success', 'Auto-Trim toegepast (Intro/Outro verwijderd).');
            };

            // 2. Loop Test
            document.getElementById('btn-trim-loop').onclick = (e) => {
                e.preventDefault();
                const btn = document.getElementById('btn-trim-loop');
                
                if (this.isLooping) {
                    this.stopLoop(videoEl);
                    btn.classList.remove('active');
                } else {
                    this.isLooping = true;
                    btn.classList.add('active');
                    videoEl.currentTime = this.trimStart;
                    videoEl.play();
                    
                    this.loopInterval = setInterval(() => {
                        if (videoEl.currentTime >= this.trimEnd) {
                            videoEl.currentTime = this.trimStart;
                        }
                    }, 100);
                }
            };

            // 3. Splits (Dupliceer Hack)
            document.getElementById('btn-trim-split').onclick = async (e) => {
                e.preventDefault();
                const editor = window.App.slideshowEditor;
                if (!editor) return;

                if (window.ModalService) {
                    const conf = await window.ModalService.confirm('Video Splitsen', 'Dit dupliceert de video zodat je het tweede deel direct na deze dia kunt instellen. Doorgaan?', { yesText: 'Splitsen' });
                    if (conf) {
                        const clone = JSON.parse(JSON.stringify(itemData));
                        clone.id = null; // Nieuw in DB
                        clone.trim_start = this.trimEnd; // Deel 2 start waar deel 1 eindigde
                        clone.trim_end = this.videoDuration;
                        
                        editor.data.items.splice(editor.selectedIndices[0] + 1, 0, clone);
                        
                        // Herbereken sort
                        editor.data.items.forEach((itm, i) => {
                            itm.sort_order = i;
                            editor.pendingDeltaItems.set(itm.id || 'new_' + i, itm);
                        });
                        
                        editor.triggerAutoSave('Video gesplitst in 2 delen.');
                        editor.renderSidebar();
                    }
                }
            };
        }

        stopLoop(videoEl) {
            this.isLooping = false;
            clearInterval(this.loopInterval);
            const btn = document.getElementById('btn-trim-loop');
            if (btn) btn.classList.remove('active');
        }

        saveToDatabase(itemData) {
            const editor = window.App.slideshowEditor;
            
            const oldStart = parseFloat(itemData.trim_start) || 0;
            const oldEnd = parseFloat(itemData.trim_end) || this.videoDuration;
            
            if (Math.abs(oldStart - this.trimStart) > 0.1 || Math.abs(oldEnd - this.trimEnd) > 0.1) {
                itemData.trim_start = parseFloat(this.trimStart.toFixed(2));
                itemData.trim_end = parseFloat(this.trimEnd.toFixed(2));
                
                editor.pendingDeltaItems.set(itemData.id, itemData);
                editor.triggerAutoSave('Video lengte ingekort.');
            }
        }
    }

    // FIX: Zorg dat het script ALTIJD opstart
    window.App = window.App || {};
    const initTrimmer = () => {
        if (!window.App.videoTrimmer) {
            window.App.videoTrimmer = new VideoTrimmerUI();
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTrimmer);
    } else {
        initTrimmer();
    }
})();