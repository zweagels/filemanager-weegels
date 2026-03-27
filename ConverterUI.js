/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/ConverterUI.js */

(function() {
    class ConverterUI {
        constructor() {
            this.file = null;
            this.injectStyles();
            this.initDOM();
            this.initListeners();
        }

        injectStyles() {
            if (document.getElementById('converter-styles')) return;
            const style = document.createElement('style');
            style.id = 'converter-styles';
            style.innerHTML = `
                #conv-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(5px); z-index: 100000; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif; }
                #conv-overlay.active { opacity: 1; pointer-events: all; }
                
                #conv-modal { width: 420px; max-width: 90vw; background: var(--bg-main, #ffffff); border: 1px solid var(--border-dropdown, #e2e8f0); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden; transform: translateY(20px); transition: transform 0.3s ease; }
                #conv-overlay.active #conv-modal { transform: translateY(0); }
                
                html.dark-mode #conv-modal { background: #1e293b; border-color: #334155; color: #f8fafc; }
                
                .conv-header { padding: 20px 24px; border-bottom: 1px solid var(--border-dropdown, #e2e8f0); display: flex; align-items: center; gap: 12px; background: rgba(128,128,128,0.02); }
                .conv-header-icon { width: 36px; height: 36px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; }
                .conv-title { margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--text-main, #0f172a); }
                html.dark-mode .conv-title { color: #f8fafc; }
                
                .conv-body { padding: 24px; }
                .conv-file-info { font-size: 0.9rem; color: var(--text-muted, #64748b); margin-bottom: 20px; padding: 12px; background: rgba(128,128,128,0.05); border-radius: 8px; word-break: break-all; }
                
                .conv-form-group { margin-bottom: 20px; }
                .conv-label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main, #0f172a); }
                html.dark-mode .conv-label { color: #cbd5e1; }
                
                .conv-select { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-dropdown, #cbd5e1); background: var(--bg-surface, #f8fafc); color: var(--text-main, #0f172a); font-size: 0.95rem; outline: none; appearance: none; cursor: pointer; }
                html.dark-mode .conv-select { background: #0f172a; border-color: #334155; color: #f8fafc; }
                .conv-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
                
                .conv-slider-container { display: flex; align-items: center; gap: 12px; }
                .conv-slider { flex: 1; accent-color: #3b82f6; cursor: pointer; }
                .conv-val { font-size: 0.9rem; font-weight: 600; min-width: 40px; text-align: right; }
                
                .conv-footer { padding: 16px 24px; background: rgba(128,128,128,0.02); border-top: 1px solid var(--border-dropdown, #e2e8f0); display: flex; justify-content: flex-end; gap: 12px; }
                
                .conv-btn { padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border: none; }
                .conv-btn-cancel { background: transparent; color: var(--text-muted, #64748b); }
                .conv-btn-cancel:hover { background: rgba(128,128,128,0.1); color: var(--text-main, #0f172a); }
                html.dark-mode .conv-btn-cancel:hover { color: #f8fafc; }
                .conv-btn-primary { background: #3b82f6; color: #fff; display: flex; align-items: center; gap: 8px; }
                .conv-btn-primary:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
                .conv-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
                
                .conv-loader { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: conv-spin 1s linear infinite; display: none; }
                @keyframes conv-spin { to { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }

        initDOM() {
            this.overlay = document.createElement('div');
            this.overlay.id = 'conv-overlay';
            
            this.overlay.innerHTML = `
                <div id="conv-modal">
                    <div class="conv-header">
                        <div class="conv-header-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                        </div>
                        <h3 class="conv-title">Bestand Converteren</h3>
                    </div>
                    <div class="conv-body">
                        <div class="conv-file-info" id="conv-filename">Selecteer een bestand...</div>
                        
                        <div class="conv-form-group">
                            <label class="conv-label">Doelformaat</label>
                            <select class="conv-select" id="conv-format">
                            </select>
                        </div>
                        
                        <div class="conv-form-group" id="conv-quality-group">
                            <label class="conv-label">Kwaliteit (Compressie)</label>
                            <div class="conv-slider-container">
                                <input type="range" class="conv-slider" id="conv-quality" min="10" max="100" value="85">
                                <span class="conv-val" id="conv-quality-val">85%</span>
                            </div>
                        </div>
                    </div>
                    <div class="conv-footer">
                        <button class="conv-btn conv-btn-cancel" id="conv-cancel">Annuleren</button>
                        <button class="conv-btn conv-btn-primary" id="conv-submit">
                            <div class="conv-loader" id="conv-spinner"></div>
                            <span>Start Conversie</span>
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(this.overlay);

            this.titleElem = document.getElementById('conv-filename');
            this.formatSelect = document.getElementById('conv-format');
            this.qualityGroup = document.getElementById('conv-quality-group');
            this.qualitySlider = document.getElementById('conv-quality');
            this.qualityVal = document.getElementById('conv-quality-val');
            this.submitBtn = document.getElementById('conv-submit');
            this.spinner = document.getElementById('conv-spinner');
            this.btnText = this.submitBtn.querySelector('span');
        }

        initListeners() {
            document.getElementById('conv-cancel').addEventListener('click', () => this.close());
            
            this.qualitySlider.addEventListener('input', (e) => {
                this.qualityVal.textContent = e.target.value + '%';
            });

            this.formatSelect.addEventListener('change', (e) => {
                if (e.target.value === 'png') {
                    this.qualityGroup.style.display = 'none';
                } else {
                    this.qualityGroup.style.display = 'block';
                }
            });

            this.submitBtn.addEventListener('click', () => this.executeConversion());

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                    this.close();
                }
            });
        }

        open(file) {
            if (!file) return;
            this.file = file;
            this.titleElem.textContent = file.name || file.original_name;
            
            const ext = (file.extension || '').toLowerCase();
            this.populateFormats(ext);
            
            this.overlay.classList.add('active');
        }

        close() {
            this.overlay.classList.remove('active');
            this.resetUI();
        }

        resetUI() {
            this.submitBtn.disabled = false;
            this.spinner.style.display = 'none';
            this.btnText.textContent = 'Start Conversie';
            this.qualitySlider.value = 85;
            this.qualityVal.textContent = '85%';
        }

        populateFormats(currentExt) {
            this.formatSelect.innerHTML = '';
            let options = [];

            if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'bmp', 'tiff'].includes(currentExt)) {
                options = [
                    { val: 'jpg', label: 'JPG (Standaard foto)' },
                    { val: 'webp', label: 'WEBP (Geoptimaliseerd voor web)' },
                    { val: 'png', label: 'PNG (Transparant, geen compressie)' }
                ];
            } 
            else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(currentExt)) {
                options = [
                    { val: 'mp4', label: 'MP4 (Standaard video)' },
                    { val: 'webm', label: 'WEBM (Web video)' },
                    { val: 'mp3', label: 'MP3 (Alleen Audio extraheren)' }
                ];
                this.qualityGroup.style.display = 'block';
            }
            else if (['wav', 'ogg', 'flac', 'm4a', 'aac'].includes(currentExt)) {
                options = [
                    { val: 'mp3', label: 'MP3 (Standaard audio)' }
                ];
                this.qualityGroup.style.display = 'none';
            }

            options = options.filter(opt => opt.val !== currentExt && (opt.val !== 'jpg' || currentExt !== 'jpeg'));

            if (options.length === 0) {
                options.push({ val: '', label: 'Geen conversies beschikbaar voor dit type' });
                this.submitBtn.disabled = true;
                this.qualityGroup.style.display = 'none';
            } else {
                this.submitBtn.disabled = false;
                if (options[0].val !== 'png') this.qualityGroup.style.display = 'block';
            }

            options.forEach(opt => {
                const el = document.createElement('option');
                el.value = opt.val;
                el.textContent = opt.label;
                this.formatSelect.appendChild(el);
            });
        }

        async executeConversion() {
            if (!this.file || !this.formatSelect.value) return;

            this.submitBtn.disabled = true;
            this.spinner.style.display = 'block';
            this.btnText.textContent = 'Bezig met omzetten...';

            try {
                // DE FIX: Haal CSRF Token op voordat we een POST maken naar de server!
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();

                const formData = new FormData();
                formData.append('action', 'convert');
                formData.append('file_id', this.file.id);
                formData.append('target_format', this.formatSelect.value);
                formData.append('quality', this.qualitySlider.value);
                
                let folderId = window.App.renderEngine ? window.App.renderEngine.currentFolderId : '';
                if (folderId === 'root') folderId = '';
                formData.append('folder_id', folderId);
                
                // Voeg de token toe aan het formulier
                formData.append('csrf_token', csrfData.csrf_token);

                const res = await fetch('/api/convert', { method: 'POST', body: formData });
                
                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch(e) {
                    throw new Error("Ongeldig antwoord van server: " + text.substring(0, 100));
                }

                if (data.status === 'success') {
                    if (window.EventBus) window.EventBus.emit('notify:success', 'Bestand succesvol geconverteerd!');
                    if (window.App.renderEngine) window.App.renderEngine.loadFolder(window.App.renderEngine.currentFolderId);
                    this.close();
                } else {
                    throw new Error(data.message || 'Conversie mislukt');
                }
            } catch (err) {
                alert("Fout bij conversie: " + err.message);
                this.resetUI();
            }
        }
    }

    window.App = window.App || {};
    const initConverter = () => {
        if (!window.App.converter) window.App.converter = new ConverterUI();
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConverter);
    } else {
        initConverter();
    }
})();