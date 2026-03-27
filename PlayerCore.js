/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/PlayerCore.js */

(function() {
    class PlayerCore {
        constructor() {
            console.log("=== V3.0: PlayerCore (Web Audio API & Lock Fixes) geladen! ===");
            
            this.token = window.slideshowToken;
            this.data = null;
            this.currentIndex = -1;
            this.isPlaying = false;
            
            this.timerId = null;
            this.startTime = 0;
            this.pauseTime = 0;
            this.durationMs = 0;
            
            this.wakeLock = null;
            this.wakeLockInterval = null;

            this.audioEl = document.getElementById('ss-tv-audio');
            this.isDucked = false;
            
            // FASE 6 FIX: Web Audio API context voor soepele ducking
            this.audioContext = null;
            this.mediaElementSource = null;
            this.gainNode = null;

            this.lastUpdatedAt = null;
            this.syncInterval = null;
            this.clockInterval = null;

            // Preloader integratie met veilige fallback
            this.preloader = window.App ? window.App.workerPreload : null; 
            this.mediaTimeout = null; 

            this.init();
        }

        async init() {
            if (!this.token) {
                this.showError("Geen Token", "De toegangscode voor deze presentatie ontbreekt.");
                return;
            }

            try {
                this.injectTransitionStyles();

                await this.loadSlideshowData();
                this.setupVirtualCanvas(); 
                this.setupWakeLock();
                this.startClock();
                this.bindGlobalEvents();
                this.startSyncChecker();

                const loader = document.getElementById('ss-tv-loader');
                const container = document.getElementById('ss-tv-container');
                
                if (loader) loader.style.opacity = '0';
                
                if (container) {
                    container.style.display = 'block';
                    void container.offsetWidth;
                    container.style.opacity = '1';
                }

                setTimeout(() => {
                    if (loader) loader.style.display = 'none';
                    this.start();
                }, 500);

            } catch (e) {
                if (e.message !== "Pincode vereist") {
                    console.error("Fatale fout in speler:", e);
                    this.showError("Fout bij laden", e.message);
                }
            }
        }

        // FASE 6 FIX: Initiëren van Web Audio API voor boterzacht volume verloop
        initWebAudio() {
            if (!this.audioEl) return;
            if (this.audioContext) return; // Al geïnitialiseerd

            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return; // Fallback als browser dit weigert

                this.audioContext = new AudioContext();
                this.mediaElementSource = this.audioContext.createMediaElementSource(this.audioEl);
                this.gainNode = this.audioContext.createGain();
                
                // Koppel de audio aan de GainNode (volume controle) en dan aan de luidsprekers
                this.mediaElementSource.connect(this.gainNode);
                this.gainNode.connect(this.audioContext.destination);
                
                // Stel standaardvolume in (50%)
                this.gainNode.gain.value = 0.5;
            } catch (e) {
                console.warn("Web Audio API kon niet starten (waarschijnlijk browser beveiliging):", e);
            }
        }

        setupVirtualCanvas() {
            let vCanvas = document.getElementById('ss-tv-virtual-canvas');
            const container = document.getElementById('ss-tv-container') || document.body;
            
            if (!vCanvas) {
                vCanvas = document.createElement('div');
                vCanvas.id = 'ss-tv-virtual-canvas';
                vCanvas.style.cssText = 'position:absolute; top:0; left:0; width:1920px; height:1080px; transform-origin: 0 0; overflow:hidden; background:#000; z-index:1;';
                container.appendChild(vCanvas);

                let bgLayer = document.createElement('div');
                bgLayer.id = 'ss-tv-global-bg';
                bgLayer.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; z-index:0; overflow:hidden;';
                vCanvas.appendChild(bgLayer);

                let mediaLayer = document.createElement('div');
                mediaLayer.id = 'ss-tv-media-layer';
                mediaLayer.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; overflow:hidden; z-index:1;';
                vCanvas.appendChild(mediaLayer);

                const resizeObserver = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        const w = entry.contentRect.width;
                        vCanvas.style.transform = `scale(${w / 1920})`;
                    }
                });
                resizeObserver.observe(container);
            }
        }

        injectTransitionStyles() {
            if (document.getElementById('ss-transitions-styles-core')) return;
            const style = document.createElement('style');
            style.id = 'ss-transitions-styles-core';
            style.innerHTML = `
                @keyframes transFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes outFadeOut { from { opacity: 1; } to { opacity: 0; } }
                
                @keyframes transSlideLeftIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes transSlideLeftOut { from { transform: translateX(0); } to { transform: translateX(-100%); opacity:0; } }
                
                @keyframes transSlideRightIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                @keyframes transSlideRightOut { from { transform: translateX(0); } to { transform: translateX(100%); opacity:0; } }
                
                @keyframes transZoomIn { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes transZoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }
                
                @keyframes transFlipIn { from { transform: perspective(1000px) rotateY(90deg); opacity: 0; } to { transform: perspective(1000px) rotateY(0deg); opacity: 1; } }
                @keyframes transFlipOut { from { transform: perspective(1000px) rotateY(0deg); opacity: 1; } to { transform: perspective(1000px) rotateY(-90deg); opacity: 0; } }
                
                @keyframes transGlitch { 0% { transform: translate(0) skew(0); opacity: 0; filter: hue-rotate(0deg); } 20% { transform: translate(-10px, 10px) skew(10deg); opacity: 1; filter: hue-rotate(90deg); } 40% { transform: translate(10px, -10px) skew(-10deg); filter: hue-rotate(-90deg); } 60% { transform: translate(-5px, 5px) skew(5deg); } 80% { transform: translate(5px, -5px) skew(-5deg); } 100% { transform: translate(0) skew(0); filter: hue-rotate(0); opacity: 1; } }
                
                @keyframes transIrisIn { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(150% at 50% 50%); } }
                @keyframes transIrisOut { from { opacity: 1; } to { opacity: 0; } }

                @keyframes transCarouselIn { from { transform: perspective(1200px) translateZ(-500px) rotateY(-90deg); opacity:0; } to { transform: perspective(1200px) translateZ(0) rotateY(0); opacity:1; } }
                @keyframes transCarouselOut { from { transform: perspective(1200px) translateZ(0) rotateY(0); opacity:1; } to { transform: perspective(1200px) translateZ(-500px) rotateY(90deg); opacity:0; } }

                .trans-fade-in { animation: transFadeIn 1s ease-in-out both; }
                .trans-fade-out { animation: outFadeOut 1s ease-in-out both; }
                
                .trans-dissolve-in { animation: transFadeIn 1.5s ease-in-out both; }
                .trans-dissolve-out { animation: outFadeOut 1.5s ease-in-out both; }

                .trans-slide-left-in { animation: transSlideLeftIn 1s cubic-bezier(0.25, 1, 0.5, 1) both; }
                .trans-slide-left-out { animation: transSlideLeftOut 1s cubic-bezier(0.25, 1, 0.5, 1) both; }

                .trans-slide-right-in { animation: transSlideRightIn 1s cubic-bezier(0.25, 1, 0.5, 1) both; }
                .trans-slide-right-out { animation: transSlideRightOut 1s cubic-bezier(0.25, 1, 0.5, 1) both; }

                .trans-zoom-in-in { animation: transZoomIn 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
                .trans-zoom-in-out { animation: transZoomOut 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both; }

                .trans-flip-in { animation: transFlipIn 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
                .trans-flip-out { animation: transFlipOut 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both; }

                .trans-glitch-in { animation: transGlitch 0.8s ease both; }
                .trans-glitch-out { animation: outFadeOut 0.8s ease both; }
                
                .trans-iris-in { animation: transIrisIn 1.5s cubic-bezier(0.25, 1, 0.5, 1) both; }
                .trans-iris-out { animation: transIrisOut 1.5s ease both; }
                
                .trans-carousel-in { animation: transCarouselIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
                .trans-carousel-out { animation: transCarouselOut 1s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
                
                .trans-cut-in { opacity: 1; animation: none; }
                .trans-cut-out { opacity: 0; animation: none; }
            `;
            document.head.appendChild(style);
        }

        async loadSlideshowData() {
            const res = await fetch(`/api/slideshow/play?token=${this.token}`);
            const textResponse = await res.text(); 
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (error) {
                throw new Error("Server response is ongeldig. Bekijk de console.");
            }

            if (json.status === 'requires_pin' || json.requires_pin === true) {
                this.showPinPrompt();
                throw new Error("Pincode vereist"); 
            }

            if (json.status !== 'success') {
                throw new Error(json.message || "Kan presentatie niet laden");
            }

            this.data = json.data || {};
            let sObj = this.data.slideshow || this.data || {};
            let gSettings = sObj.settings || this.data.settings || {};
            
            if (typeof gSettings === 'string') {
                try { gSettings = JSON.parse(gSettings); } catch(e) { gSettings = {}; }
            }
            sObj.settings = gSettings;
            this.data.slideshow = sObj;
            this.data.settings = gSettings;
            
            if (gSettings.tv_loader_logo_id) {
                const spinner = document.querySelector('.ss-tv-spinner');
                if (spinner) spinner.style.display = 'none';
                
                const loader = document.getElementById('ss-tv-loader');
                let customLogo = document.getElementById('ss-tv-custom-logo');
                if (!customLogo && loader) {
                    customLogo = document.createElement('img');
                    customLogo.id = 'ss-tv-custom-logo';
                    customLogo.style.cssText = 'max-width: 250px; max-height: 120px; animation: tvPulse 2s infinite; margin-bottom: 20px; border-radius: 8px; object-fit: contain;';
                    loader.insertBefore(customLogo, document.getElementById('ss-tv-status'));
                }
                if (customLogo) {
                    customLogo.src = `/api/files?action=download&id=${gSettings.tv_loader_logo_id}${this.token ? '&token='+this.token : ''}`;
                }
            }
            
            if (this.data.items) {
                this.data.items.forEach(item => {
                    if (typeof item.settings === 'string') {
                        try { item.settings = JSON.parse(item.settings); } catch(e) { item.settings = {}; }
                    } else if (!item.settings) {
                        item.settings = {};
                    }
                });
            }

            this.lastUpdatedAt = gSettings.updated_at || sObj.updated_at || Date.now();

            if (gSettings.random_playback) {
                this.shuffleItemsForTV();
            }

            this.initRadio();
        }

        shuffleItemsForTV() {
            if (!this.data || !this.data.items) return;
            let array = [...this.data.items];
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            this.data.items = array;
        }

        initRadio() {
            if (this.data.radio && this.data.radio.stream_url && this.audioEl) {
                // Pas Web Audio toe als dat kan, anders standaard JS property manipulatie
                this.audioEl.crossOrigin = "Anonymous"; // Vereist voor Web Audio API
                this.audioEl.src = this.data.radio.stream_url;
                
                if (this.audioContext) {
                    this.gainNode.gain.value = 0.5;
                } else {
                    this.audioEl.volume = 0.5; 
                }
            }
        }

        showPinPrompt() {
            document.body.style.setProperty('display', 'block', 'important');
            document.body.style.setProperty('opacity', '1', 'important');
            document.body.style.setProperty('visibility', 'visible', 'important');
            document.body.style.setProperty('background-color', '#000000', 'important');

            const loader = document.getElementById('ss-tv-loader');
            if (loader) loader.remove();
            
            let shield = document.getElementById('tv-pin-master-shield');
            if (!shield) {
                shield = document.createElement('div');
                shield.id = 'tv-pin-master-shield';
                shield.setAttribute('style', 'position:fixed !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; z-index:2147483647 !important; display:flex !important; align-items:center !important; justify-content:center !important; background-color:#0f172a !important; margin:0 !important; padding:0 !important;');
                document.body.appendChild(shield);
            }
            
            shield.innerHTML = `
                <div style="background-color:#1e293b !important; padding:40px !important; border-radius:20px !important; text-align:center !important; border:2px solid #3b82f6 !important; box-shadow:0 30px 60px rgba(0,0,0,0.8) !important; min-width: 320px !important;">
                    <h2 style="margin:0 0 20px 0 !important; color:#ffffff !important; font-family:sans-serif !important; font-size: 24px !important;">Pincode Vereist</h2>
                    <form id="tv-pin-form" onsubmit="return false;" style="margin:0 !important; padding:0 !important;">
                        <input type="text" autocomplete="username" style="display:none !important;" value="tv_viewer">
                        <input type="password" id="tv-pin-input" autocomplete="current-password" style="font-size:32px !important; padding:15px !important; width:220px !important; text-align:center !important; letter-spacing:10px !important; border-radius:10px !important; border:1px solid #475569 !important; outline:none !important; background-color:#0f172a !important; color:#ffffff !important;" autofocus placeholder="****">
                        <br><br>
                        <button type="submit" id="btn-submit-pin" style="padding:15px 30px !important; font-size:18px !important; background-color:#3b82f6 !important; color:#ffffff !important; border:none !important; border-radius:10px !important; cursor:pointer !important; font-weight:bold !important; width: 100% !important; transition: background 0.2s;">Ontgrendelen</button>
                    </form>
                    <div id="tv-pin-error" style="color:#ef4444 !important; margin-top:15px !important; font-weight:bold !important; display:none !important; font-family:sans-serif !important; font-size: 16px !important;"></div>
                </div>
            `;

            const form = document.getElementById('tv-pin-form');
            const input = document.getElementById('tv-pin-input');
            const submitBtn = document.getElementById('btn-submit-pin');
            const errorDiv = document.getElementById('tv-pin-error');

            const submitPin = async () => {
                const pin = input.value;
                if (!pin) return;
                
                submitBtn.disabled = true;
                submitBtn.innerText = 'Controleren...';
                
                try {
                    const res = await fetch(`/api/slideshow/play?token=${this.token}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pincode: pin })
                    });
                    
                    const textResponse = await res.text();
                    let json;
                    try {
                        json = JSON.parse(textResponse);
                    } catch (e) {
                        throw new Error("Ongeldig antwoord bij controle");
                    }
                    
                    if (json.status === 'success') {
                        shield.remove(); 
                        
                        this.data = json.data || {};
                        let sObj = this.data.slideshow || this.data || {};
                        let gSettings = sObj.settings || this.data.settings || {};
                        if (typeof gSettings === 'string') {
                            try { gSettings = JSON.parse(gSettings); } catch(e) { gSettings = {}; }
                        }
                        sObj.settings = gSettings;
                        this.data.slideshow = sObj;
                        this.data.settings = gSettings;

                        if (this.data.items) {
                            this.data.items.forEach(item => {
                                if (typeof item.settings === 'string') {
                                    try { item.settings = JSON.parse(item.settings); } catch(e) { item.settings = {}; }
                                } else if (!item.settings) {
                                    item.settings = {};
                                }
                            });
                        }
                        
                        this.lastUpdatedAt = gSettings.updated_at || sObj.updated_at || Date.now();

                        if (gSettings.random_playback) {
                            this.shuffleItemsForTV();
                        }
                        this.initRadio();
                        this.setupVirtualCanvas();
                        this.startClock(); 
                        
                        const container = document.getElementById('ss-tv-container');
                        if (container) {
                            container.style.display = 'block';
                            void container.offsetWidth;
                            container.style.opacity = '1';
                        }
                        
                        this.start();
                    } else {
                        errorDiv.innerText = json.message || "Onjuiste pincode";
                        errorDiv.style.setProperty('display', 'block', 'important');
                        input.value = '';
                        submitBtn.disabled = false;
                        submitBtn.innerText = 'Ontgrendelen';
                        input.focus();
                    }
                } catch (e) {
                    errorDiv.innerText = "Systeemfout bij verifiëren";
                    errorDiv.style.setProperty('display', 'block', 'important');
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Ontgrendelen';
                }
            };

            form.onsubmit = submitPin;
        }

        // FASE 6 FIX: WakeLock robuuster maken tegen tabblad wissel
        async setupWakeLock() {
            try {
                if ('wakeLock' in navigator) {
                    // Eerste poging kan falen als pagina in achtergrond start
                    if (document.visibilityState === 'visible') {
                        this.wakeLock = await navigator.wakeLock.request('screen');
                    }
                    
                    document.addEventListener('visibilitychange', async () => {
                        if (this.wakeLock !== null && document.visibilityState === 'visible') {
                            try {
                                this.wakeLock = await navigator.wakeLock.request('screen');
                            } catch (err) {
                                console.warn("WakeLock herstel mislukt:", err);
                            }
                        }
                    });
                    
                    if (this.wakeLockInterval) clearInterval(this.wakeLockInterval);
                    this.wakeLockInterval = setInterval(async () => {
                        if (document.visibilityState === 'visible' && (!this.wakeLock || this.wakeLock.released)) {
                            try { this.wakeLock = await navigator.wakeLock.request('screen'); } 
                            catch (e) { /* Negeer stille fouten op background tabbladen */ }
                        }
                    }, 60000);
                }
            } catch (err) {
                console.warn("Browser ondersteunt WakeLock niet (of weigert).", err);
            }
        }

        startClock() {
            if(this.clockInterval) clearInterval(this.clockInterval);
            this.clockInterval = setInterval(() => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                document.querySelectorAll('.ss-clock-time-text').forEach(el => {
                    el.innerText = timeStr;
                });
            }, 1000);
        }

        bindGlobalEvents() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'MediaPlayPause' || e.key === ' ' || e.key === 'Enter') {
                    if (e.target.tagName === 'INPUT') return;
                    e.preventDefault();
                    this.togglePlayPause();
                }
                if (e.key === 'MediaNextTrack' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.next();
                }
                if (e.key === 'MediaPreviousTrack' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.prev();
                }
            });

            document.body.addEventListener('click', (e) => {
                if (e.target.closest('#ss-tv-audio-start') || e.target.closest('input') || e.target.closest('button')) return;
                this.togglePlayPause();
            });

            const audioStartOverlay = document.getElementById('ss-tv-audio-start');
            const btnStartAudio = document.getElementById('btn-start-audio');
            if (btnStartAudio) {
                btnStartAudio.onclick = () => {
                    if (audioStartOverlay) audioStartOverlay.classList.remove('visible');
                    
                    // FASE 6 FIX: Ontgrendel de AudioContext bij de eerste gebruikersinteractie
                    this.initWebAudio();
                    if (this.audioContext && this.audioContext.state === 'suspended') {
                        this.audioContext.resume();
                    }
                    
                    if (this.audioEl) this.audioEl.play().catch(e => { console.warn('Audio kon niet starten:', e) });
                };
            }

            document.addEventListener('visibilitychange', () => {
                if (!this.audioEl) return;
                if (document.hidden) {
                    this.audioEl.pause();
                } else if (this.isPlaying) {
                    this.audioEl.play().catch(e => {});
                }
            });
        }

        togglePlayPause() {
            let indicator = document.getElementById('tv-pause-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'tv-pause-indicator';
                indicator.style.cssText = 'position:fixed; top:40px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); backdrop-filter:blur(10px); color:white; padding:10px 24px; border-radius:30px; font-weight:bold; font-size:1.2rem; z-index:999999; display:flex; align-items:center; gap:10px; opacity:0; transition:opacity 0.3s; border:1px solid rgba(255,255,255,0.2); pointer-events:none;';
                document.body.appendChild(indicator);
            }

            // Bij allereerste interactie in de browser, zet Audio aan
            if (!this.audioContext) this.initWebAudio();
            if (this.audioContext && this.audioContext.state === 'suspended') this.audioContext.resume();

            if (this.isPlaying) {
                this.isPlaying = false;
                if (this.timerId) cancelAnimationFrame(this.timerId); 
                this.pauseTime = performance.now(); 

                const video = document.querySelector('.ss-tv-slide.active video');
                if (video) video.pause();
                if (this.audioEl) this.audioEl.pause(); 
                
                indicator.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Gepauzeerd';
                indicator.style.opacity = '1';
                
            } else {
                this.isPlaying = true;
                
                this.startTime += (performance.now() - this.pauseTime);
                this.runTimerLoop();
                
                const video = document.querySelector('.ss-tv-slide.active video');
                if (video) video.play();
                if (this.audioEl && !this.isDucked) this.audioEl.play().catch(e => {});

                indicator.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Afspelen hervat';
                indicator.style.opacity = '1';
                setTimeout(() => indicator.style.opacity = '0', 2000); 
            }
        }

        startSyncChecker() {
            if (this.syncInterval) clearInterval(this.syncInterval);
            this.syncInterval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/slideshow/play?token=${this.token}&check_only=1`);
                    const json = await res.json();
                    if (json.status === 'success') {
                        let sObj = json.data.slideshow || json.data || {};
                        let sSets = sObj.settings || json.data.settings || {};
                        if (typeof sSets === 'string') try { sSets = JSON.parse(sSets); } catch(e) { sSets = {}; }
                        
                        let newUpdate = sSets.updated_at || sObj.updated_at;
                        if (newUpdate && newUpdate !== this.lastUpdatedAt) {
                            await this.loadSlideshowData();
                            this.renderSlide(this.currentIndex, true);
                        }
                    }
                } catch (e) {}
            }, 10000); 
        }

        start() {
            if (!this.data || !this.data.items || this.data.items.length === 0) {
                this.showError("Geen dia's", "Deze presentatie bevat geen actieve dia's.");
                return;
            }

            if (this.audioEl) {
                const playPromise = this.audioEl.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        const audioStartOverlay = document.getElementById('ss-tv-audio-start');
                        if (audioStartOverlay) audioStartOverlay.classList.add('visible');
                    });
                }
            }

            this.isPlaying = true;
            this.next();
        }

        prev() {
            if (!this.data || !this.data.items || this.data.items.length === 0) return;
            if (this.timerId) cancelAnimationFrame(this.timerId);
            
            this.currentIndex--;
            if (this.currentIndex < 0) {
                this.currentIndex = this.data.items.length - 1;
            }
            this.renderSlide(this.currentIndex);
        }

        next() {
            if (!this.data || !this.data.items || this.data.items.length === 0) return;
            if (this.timerId) cancelAnimationFrame(this.timerId);
            
            this.currentIndex++;
            if (this.currentIndex >= this.data.items.length) {
                this.currentIndex = 0;
            }
            this.renderSlide(this.currentIndex);
        }

        getItemUrl(targetItem) {
            if (!targetItem) return '';
            
            const tvToken = window.slideshowToken ? '&token=' + window.slideshowToken : '';
                
            if (targetItem.file_id && targetItem.file_id !== 'undefined' && targetItem.file_id !== 'null') {
                return '/api/files?action=download&id=' + targetItem.file_id + tvToken;
            }
            
            if (targetItem.file_url && targetItem.file_url !== 'undefined' && targetItem.file_url !== 'null') {
                return targetItem.file_url + tvToken;
            }
            
            return targetItem.url_large || targetItem.url || targetItem.path || '';
        }

        renderSlide(index, isUpdate = false) {
            const item = this.data.items[index];
            if (!item) return;

            let mediaLayer = document.getElementById('ss-tv-media-layer');
            let globalBgLayer = document.getElementById('ss-tv-global-bg');
            if (!mediaLayer || !globalBgLayer) return;

            if (!window.App) window.App = {};
            window.App.playerCore = this;

            const gSettings = this.data.settings || {};
            const rootFitMode = item.fit_mode || 'contain';
            let bgHtml = '';
            
            if (rootFitMode === 'contain' || rootFitMode === 'cover' || rootFitMode === 'fill' || rootFitMode === 'tile' || rootFitMode === 'blur') {
                const url = this.getItemUrl(item);
                let filterStr = '';
                const b = item.filter_brightness ?? 100;
                const c = item.filter_contrast ?? 100;
                const sat = item.filter_saturate ?? 100;
                filterStr = `brightness(${b}%) contrast(${c}%) saturate(${sat}%) `;
                if (item.image_filter && item.image_filter !== 'none') {
                    const f = item.image_filter;
                    if (f === 'grayscale') filterStr += 'grayscale(100%) ';
                    else if (f === 'sepia') filterStr += 'sepia(100%) ';
                    else if (f === 'contrast') filterStr += 'contrast(150%) saturate(120%) ';
                    else filterStr += `${f} `;
                }

                if (item.mime_type && item.mime_type.indexOf('video') === 0) {
                    bgHtml = `<video src="${url}" style="width:100%; height:100%; object-fit:cover; transform:scale(1.2); filter: blur(40px) saturate(2) brightness(0.6) ${filterStr.trim()};" autoplay muted loop playsinline></video>`;
                } else {
                    bgHtml = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; transform:scale(1.2); filter: blur(40px) saturate(2) brightness(0.6) ${filterStr.trim()};">`;
                }

            } else if (rootFitMode === 'contain_color') {
                let itemBg = item.background_color || '#000000';
                let styleBg = itemBg.includes('gradient') ? `background: ${itemBg};` : `background-color: ${itemBg};`;
                bgHtml = `<div class="ss-tv-bg-layer ss-layer-2" style="${styleBg} width:100%; height:100%; z-index:1;"></div>`;
            } else if (rootFitMode === 'contain_anim') {
                const bgId = (item.override_background_id !== null && item.override_background_id !== undefined) ? item.override_background_id : gSettings.background_id;
                if (bgId && bgId != 0 && this.data.dictionaries && this.data.dictionaries.backgrounds) {
                    const bgObj = this.data.dictionaries.backgrounds.find(b => b.id == bgId);
                    if (bgObj) {
                        if (bgObj.css_animation === 'bg-cinematic') {
                            const url = this.getItemUrl(item);
                            bgHtml = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; filter: blur(40px) saturate(2) brightness(0.6); animation: ssBgCinematicPulse 10s infinite alternate ease-in-out;">`;
                        } else {
                            bgHtml = `<div style="width:100%; height:100%; background: ${bgObj.fallback_color};"><div style="position:absolute; inset:-10%; background: ${bgObj.css_gradient}; animation: ${bgObj.css_animation_keyframes && bgObj.css_animation_keyframes !== 'none' ? bgObj.css_animation + ' 15s infinite alternate ease-in-out' : 'none'};"></div></div>`;
                        }
                    }
                }
            } else {
                bgHtml = `<div class="ss-tv-bg-layer ss-layer-2" style="background-color:#000000; z-index:1;"></div>`;
            }

            if (globalBgLayer.innerHTML !== bgHtml) {
                const newBg = document.createElement('div');
                newBg.style.cssText = 'position:absolute; inset:0; opacity:0; transition: opacity 0.8s ease-in-out; z-index:1;';
                newBg.innerHTML = bgHtml;
                globalBgLayer.appendChild(newBg);
                
                void newBg.offsetWidth;
                newBg.style.opacity = '1';
                
                setTimeout(() => {
                    while(globalBgLayer.childNodes.length > 1) {
                        globalBgLayer.removeChild(globalBgLayer.firstChild);
                    }
                }, 850);
            }

            let slideHtml = '';
            if (window.App && window.App.playerLayouts) {
                slideHtml = window.App.playerLayouts.generateSlideHTML(item, this.data, this.preloader, '');
            }

            let transIn = 'trans-fade-in';
            let transOut = 'trans-fade-out';
            
            if (gSettings.layout === 'carousel') {
                transIn = 'trans-carousel-in';
                transOut = 'trans-carousel-out';
            } else if (item.transition_id && this.data.dictionaries && this.data.dictionaries.transitions) {
                const tObj = this.data.dictionaries.transitions.find(t => String(t.id) === String(item.transition_id));
                if (tObj && tObj.css_class) {
                    const rawClass = tObj.css_class.trim().toLowerCase();
                    if (rawClass.includes('fade')) { transIn = 'trans-fade-in'; transOut = 'trans-fade-out'; }
                    else if (rawClass.includes('dissolve')) { transIn = 'trans-dissolve-in'; transOut = 'trans-dissolve-out'; }
                    else if (rawClass.includes('slide-left')) { transIn = 'trans-slide-left-in'; transOut = 'trans-slide-left-out'; }
                    else if (rawClass.includes('slide-right')) { transIn = 'trans-slide-right-in'; transOut = 'trans-slide-right-out'; }
                    else if (rawClass.includes('zoom')) { transIn = 'trans-zoom-in-in'; transOut = 'trans-zoom-in-out'; }
                    else if (rawClass.includes('flip')) { transIn = 'trans-flip-in'; transOut = 'trans-flip-out'; }
                    else if (rawClass.includes('glitch')) { transIn = 'trans-glitch-in'; transOut = 'trans-glitch-out'; }
                    else if (rawClass.includes('iris')) { transIn = 'trans-iris-in'; transOut = 'trans-iris-out'; }
                    else if (rawClass.includes('cut')) { transIn = 'trans-cut-in'; transOut = 'trans-cut-out'; }
                }
            }

            const oldActive = mediaLayer.querySelector('.ss-tv-slide.active');
            if (oldActive && !isUpdate) {
                oldActive.classList.remove('active');
                oldActive.classList.add('outgoing');
                oldActive.style.zIndex = '4'; 
                oldActive.classList.add(transOut); 
                
                setTimeout(() => {
                    if (oldActive.parentNode) {
                        const videos = oldActive.querySelectorAll('video');
                        videos.forEach(v => {
                            v.pause();
                            v.removeAttribute('src');
                            v.load(); 
                        });
                        oldActive.parentNode.removeChild(oldActive);
                    }
                }, 1500); 
            }

            const newSlide = document.createElement('div');
            newSlide.className = 'ss-tv-slide active';
            newSlide.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; opacity:1; z-index:10; overflow:hidden;';

            // FASE 6 FIX: Orphaned Slide Fallback
            // Als de gegenereerde HTML toevallig leeg is, bouwen we een kleine fallback
            if (!slideHtml || slideHtml.trim() === '') {
                slideHtml = `<div style="display:flex; height:100%; width:100%; align-items:center; justify-content:center; color:white; font-size:2rem; background:rgba(0,0,0,0.8); font-family:sans-serif;">Afbeelding of video niet gevonden op server.</div>`;
            }

            if (!isUpdate) {
                newSlide.classList.add(transIn); 
                newSlide.style.animationFillMode = 'forwards';
            }

            newSlide.innerHTML = slideHtml;
            mediaLayer.appendChild(newSlide);

            const measureImgs = newSlide.querySelectorAll('.ss-phantom-measure');
            measureImgs.forEach(img => {
                const applyFix = () => {
                    const frame = img.closest('.ss-layer-frame');
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

                if (img.tagName === 'VIDEO') {
                    if (img.readyState >= 1) { applyFix(); }
                    else { img.addEventListener('loadedmetadata', () => { applyFix(); }); }
                } else if (img.tagName === 'IMG') {
                    if (img.complete && img.naturalWidth > 0) { applyFix(); }
                    else { img.addEventListener('load', () => { applyFix(); }); }
                }
            });

            this.duration = item.duration && item.duration !== 'auto' ? parseInt(item.duration) : 10;
            if (isNaN(this.duration) || this.duration <= 0) this.duration = 10;
            
            const videoEl = newSlide.querySelector('video.ss-phantom-measure');
            if (videoEl) {
                videoEl.volume = 1.0; 
                
                let playPromise = videoEl.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.warn("Video auto-play geblokkeerd:", e);
                    });
                }
                
                let muteSetting = false;
                if (item.settings && item.settings.mute) muteSetting = true;
                this.handleAudioDucking(muteSetting, videoEl);

                if (item.duration === 'auto') {
                    videoEl.loop = false; 
                    videoEl.addEventListener('loadedmetadata', () => {
                        this.duration = videoEl.duration || 10;
                        this.startSlideTimer(); 
                    }, { once: true });
                    
                    videoEl.addEventListener('ended', () => {
                        if (this.isPlaying) this.next();
                    }, { once: true });
                    
                } else {
                    this.startSlideTimer();
                }
            } else {
                this.handleAudioDucking(true, null); 
                this.startSlideTimer();
            }
        }

        startSlideTimer() {
            if (this.timerId) cancelAnimationFrame(this.timerId);
            
            this.startTime = performance.now();
            this.durationMs = this.duration * 1000;
            
            const bar = document.getElementById('ss-tv-progress-bar');
            const container = document.getElementById('ss-tv-progress-container');
            
            if (!bar || !container) return;

            let pbStyle = 'none';
            if (this.data && this.data.settings && this.data.settings.progress_bar) {
                pbStyle = this.data.settings.progress_bar;
            }

            let hideLocal = false;
            if (this.currentIndex >= 0 && this.data.items[this.currentIndex]) {
                const itemSets = this.data.items[this.currentIndex].settings;
                if (itemSets && itemSets.hide_progress) hideLocal = true;
            }

            if (pbStyle === 'none' || hideLocal) {
                container.style.display = 'none';
                this.runTimerLoop(true); 
                return;
            } else {
                container.style.display = 'block';
                bar.className = `ss-tv-progress-bar style-${pbStyle}`;
                bar.style.transition = 'none'; 
                bar.style.width = '0%';
            }

            this.runTimerLoop(false);
        }

        runTimerLoop(isHidden = false) {
            const bar = document.getElementById('ss-tv-progress-bar');
            
            const loop = (now) => {
                if (!this.isPlaying) return;
                
                const elapsed = now - this.startTime;
                let progress = elapsed / this.durationMs;
                if (progress > 1) progress = 1;
                
                if (!isHidden && bar && bar.parentElement.style.display !== 'none') {
                    bar.style.width = (progress * 100) + '%';
                }
                
                if (progress >= 1) {
                    const item = this.data.items[this.currentIndex];
                    const isAutoVideo = item && item.mime_type && item.mime_type.startsWith('video') && item.duration === 'auto';
                    
                    if (!isAutoVideo) {
                        this.next();
                    }
                } else {
                    this.timerId = requestAnimationFrame(loop);
                }
            };
            this.timerId = requestAnimationFrame(loop);
        }

        // FASE 6 FIX: De vernieuwde Web Audio API Ducking methode!
        handleAudioDucking(isMuted, videoEl) {
            if (!this.audioEl || !this.data.radio || !this.data.radio.stream_url) return;

            if (!isMuted && videoEl) {
                videoEl.muted = false;
                this.fadeAudio(0.05, 1); // 1 seconde fade naar 5% volume
                this.isDucked = true;
            } else {
                if (videoEl) videoEl.muted = true;
                if (this.isDucked) {
                    this.fadeAudio(0.5, 1); // 1 seconde fade terug naar 50% volume
                    this.isDucked = false;
                }
            }
        }

        fadeAudio(targetVolume, durationInSeconds) {
            // Als Web Audio is geactiveerd (super vloeiend!)
            if (this.audioContext && this.gainNode) {
                if (this.audioContext.state === 'suspended') this.audioContext.resume();
                
                // Voorkom plops en stotters door te starten vanaf huidige volume
                const currentVol = this.gainNode.gain.value;
                this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
                this.gainNode.gain.setValueAtTime(currentVol, this.audioContext.currentTime);
                
                // Zachte exponentiële overgang naar het doelvolume
                this.gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + durationInSeconds);
            } 
            // Fallback (Oude methode met interval voor oude browsers/iOS)
            else {
                const step = 0.05; 
                const msStep = (durationInSeconds * 1000) / (Math.abs(this.audioEl.volume - targetVolume) / step);
                
                if (this.fadeInterval) clearInterval(this.fadeInterval);
                
                this.fadeInterval = setInterval(() => {
                    if (this.audioEl.volume > targetVolume + step) {
                        this.audioEl.volume -= step;
                    } else if (this.audioEl.volume < targetVolume - step) {
                        this.audioEl.volume += step;
                    } else {
                        this.audioEl.volume = targetVolume;
                        clearInterval(this.fadeInterval);
                    }
                }, Math.max(20, msStep)); // Maximaal 50fps
            }
        }

        showError(title, desc) {
            const loader = document.getElementById('ss-tv-loader');
            if (loader) loader.style.display = 'none';
            const err = document.getElementById('ss-tv-error');
            if (err) {
                err.style.setProperty('display', 'flex', 'important');
                const errTitle = document.getElementById('ss-tv-error-title');
                const errDesc = document.getElementById('ss-tv-error-desc');
                if (errTitle) errTitle.innerText = title;
                if (errDesc) errDesc.innerText = desc;
            }
        }
    }

    // FASE 2 FIX: Maak de speler toegankelijk voor HTML
    window.PlayerCore = PlayerCore;

    window.App = window.App || {};
    window.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('ss-tv-container')) {
            window.App.playerCore = new PlayerCore();
        }
    });
})();