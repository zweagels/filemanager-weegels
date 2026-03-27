/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Dashboard | FILE: public/js/modules/dashboard/Widgets.js */

(function() {
    
    // Globale stylings en drag-handles die voor alle widgets en modals gelden
    const getWidgetControlsHtml = () => `
        <style>
            .hide-scrollbars::-webkit-scrollbar { display: none; }
            .hide-scrollbars { -ms-overflow-style: none; scrollbar-width: none; }
            .widget-actions-right { display: flex; align-items: center; gap: 4px; }
            
            /* Custom Drag Handle styling */
            .widget-drag-handle { cursor: grab; display: flex; align-items: center; justify-content: center; padding: 4px; color: var(--text-muted); transition: color 0.2s; }
            .widget-drag-handle:hover { color: var(--primary); }
            .widget-drag-handle:active { cursor: grabbing; }

            /* APPLE STYLE TOGGLE (Checkboxes) */
            .apple-toggle {
                appearance: none; -webkit-appearance: none;
                width: 44px; height: 24px;
                background: var(--border-dropdown);
                border-radius: 12px; position: relative; cursor: pointer; outline: none;
                transition: background 0.3s;
                flex-shrink: 0; margin: 0;
            }
            .apple-toggle::after {
                content: ''; position: absolute; top: 2px; left: 2px;
                width: 20px; height: 20px; background: white;
                border-radius: 50%; transition: transform 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .apple-toggle:checked { background: var(--primary); }
            .apple-toggle:checked::after { transform: translateX(20px); }

            /* APPLE STYLE RADIO BUTTONS */
            .apple-radio {
                appearance: none; -webkit-appearance: none;
                width: 20px; height: 20px; border-radius: 50%;
                border: 2px solid var(--border-dropdown);
                background: var(--bg-main);
                outline: none; cursor: pointer; margin: 0; position: relative;
                display: inline-block; vertical-align: middle;
                transition: all 0.2s ease;
            }
            .apple-radio:checked { border-color: var(--primary); }
            .apple-radio:checked::after {
                content: ''; position: absolute; top: 4px; left: 4px;
                width: 8px; height: 8px; border-radius: 50%;
                background: var(--primary);
            }
        </style>
        <div class="widget-controls" style="z-index: 100;">
            <div class="size-controls" title="Kies widget formaat">
                <button class="size-btn" data-size="widget-1x1">1x1</button>
                <button class="size-btn" data-size="widget-2x1">2x1</button>
                <button class="size-btn" data-size="widget-1x2">1x2</button>
                <button class="size-btn" data-size="widget-2x2">2x2</button>
                <button class="size-btn" data-size="widget-full">Max</button>
            </div>
            <div class="widget-actions-right">
                <div class="widget-drag-handle" title="Versleep widget">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                </div>
                <button class="widget-control-btn delete" title="Widget verbergen">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
    `;

    window.DashboardWidgets = {
        
        // --- 1. GLOBALE FUNCTIE: BANNER EDITOR MODAL ---
        openBannerEditor: function(dashData) {
            const origSettings = JSON.parse(JSON.stringify(dashData.settings || {}));
            if (!dashData.settings) dashData.settings = {};

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay visible';
            
            overlay.addEventListener('mousedown', (e) => {
                if (e.target === overlay) {
                    overlay.querySelector('#be-close').click();
                }
            });
            
            const html = `
                <div class="modal-box" style="width: 600px; max-width: 90vw; max-height: 85vh; margin: auto;">
                    <div class="modal-header">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; background:rgba(249,115,22,0.1); color:#f97316; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </div>
                            <h3 style="margin:0; font-size:1.1rem;">Banner Editor</h3>
                        </div>
                        <button class="btn-icon-small" id="be-close" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                    
                    <div class="modal-body hide-scrollbars" style="display:flex; flex-direction:column; gap:20px;">
                        
                        <div>
                            <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:6px;">1. Indeling</label>
                            <select id="be-layout" style="width:100%; padding:10px 12px; border-radius:8px;">
                                <option value="left" ${origSettings.banner_layout === 'left' ? 'selected' : ''}>Klassiek (Tekst links, Klok rechts)</option>
                                <option value="center" ${origSettings.banner_layout === 'center' ? 'selected' : ''}>Gecentreerd (Boven elkaar)</option>
                                <option value="right" ${origSettings.banner_layout === 'right' ? 'selected' : ''}>Omgedraaid (Klok links, Tekst rechts)</option>
                            </select>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                            <div>
                                <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:6px;">2. Lettertype</label>
                                <select id="be-font" style="width:100%; padding:10px 12px; border-radius:8px;">
                                    <option value="sans" ${origSettings.banner_font === 'sans' ? 'selected' : ''}>Modern (Sans-Serif)</option>
                                    <option value="serif" ${origSettings.banner_font === 'serif' ? 'selected' : ''}>Klassiek (Serif)</option>
                                    <option value="rounded" ${origSettings.banner_font === 'rounded' ? 'selected' : ''}>Speels (Rounded)</option>
                                    <option value="mono" ${origSettings.banner_font === 'mono' ? 'selected' : ''}>Tech (Monospace)</option>
                                </select>
                            </div>
                            <div>
                                <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:6px;">3. Tekst Effect</label>
                                <select id="be-effect" style="width:100%; padding:10px 12px; border-radius:8px;">
                                    <option value="none" ${origSettings.banner_effect === 'none' ? 'selected' : ''}>Geen (Strak)</option>
                                    <option value="shadow" ${(!origSettings.banner_effect || origSettings.banner_effect === 'shadow') ? 'selected' : ''}>Subtiele Schaduw</option>
                                    <option value="glow" ${origSettings.banner_effect === 'glow' ? 'selected' : ''}>Neon Glow</option>
                                </select>
                            </div>
                        </div>

                        <div style="border:1px solid var(--border-dropdown); border-radius:12px; padding:16px;">
                            <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:12px;">4. Achtergrond Type</label>
                            <div style="display:flex; gap:16px; margin-bottom:16px;">
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:var(--text-main); font-size:0.85rem; font-weight:500;">
                                    <input type="radio" name="be-bg-type" class="apple-radio" value="solid" ${origSettings.banner_type === 'solid' ? 'checked' : ''}> Effen Kleur
                                </label>
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:var(--text-main); font-size:0.85rem; font-weight:500;">
                                    <input type="radio" name="be-bg-type" class="apple-radio" value="gradient" ${(!origSettings.banner_type || origSettings.banner_type === 'gradient') ? 'checked' : ''}> Kleur Verloop
                                </label>
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:var(--text-main); font-size:0.85rem; font-weight:500;">
                                    <input type="radio" name="be-bg-type" class="apple-radio" value="image" ${origSettings.banner_type === 'image' ? 'checked' : ''}> Afbeelding
                                </label>
                            </div>
                            
                            <div id="be-color-group">
                                <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:8px;">Kies Kleur</label>
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <input type="color" id="be-color" value="${origSettings.banner_color || '#f97316'}" style="width:40px; height:40px; border:1px solid var(--border-dropdown); border-radius:8px; cursor:pointer; padding:0; background:none;">
                                    <span style="font-size:0.85rem; color:var(--text-muted); margin-left:10px;">Snelle Thema's:</span>
                                    <div style="display:flex; gap:8px;">
                                        ${['#f97316', '#14b8a6', '#3b82f6', '#8b5cf6', '#ef4444', '#1e293b'].map(c => `<div class="be-color-preset" data-color="${c}" style="width:24px; height:24px; border-radius:50%; background:${c}; cursor:pointer; border:2px solid transparent; box-shadow:0 2px 4px rgba(0,0,0,0.1);"></div>`).join('')}
                                    </div>
                                </div>
                            </div>

                            <div id="be-image-group" style="display:none; margin-top:16px;">
                                <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:8px;">Achtergrond Afbeelding</label>
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <input type="hidden" id="be-image-val" value="${origSettings.banner_image || ''}">
                                    <button id="be-btn-pick-image" class="btn-secondary" style="padding:8px 16px; border-radius:8px; font-weight:600;"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Kies uit bestanden</button>
                                    <div id="be-image-preview-text" style="font-size:0.85rem; color:var(--text-muted);">${origSettings.banner_image ? 'Afbeelding geselecteerd' : 'Geen afbeelding gekozen'}</div>
                                </div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                            <div>
                                <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:6px;">7. Dim / Contrast Laag</label>
                                <input type="range" id="be-overlay" min="0" max="90" value="${origSettings.banner_overlay !== undefined ? origSettings.banner_overlay : 20}" style="width:100%; margin-bottom:4px;">
                                <div style="font-size:0.75rem; color:var(--text-muted); text-align:right;" id="be-overlay-val">${origSettings.banner_overlay !== undefined ? origSettings.banner_overlay : 20}% Donkerder</div>
                            </div>
                            <div style="display:flex; flex-direction:column; justify-content:center; padding-top:10px;">
                                <label style="display:flex; align-items:center; gap:12px; cursor:pointer; color:var(--text-main); font-size:0.85rem; font-weight:600;">
                                    <input type="checkbox" id="be-glass" class="apple-toggle" ${origSettings.banner_glass !== false ? 'checked' : ''}> 
                                    Toon wazige lichtcirkels
                                </label>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                            <div>
                                <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:6px;">9. Klok Weergave</label>
                                <select id="be-clock" style="width:100%; padding:10px 12px; border-radius:8px;">
                                    <option value="full" ${(!origSettings.banner_clock || origSettings.banner_clock === 'full') ? 'selected' : ''}>Tijd & Datum</option>
                                    <option value="time" ${origSettings.banner_clock === 'time' ? 'selected' : ''}>Alleen Tijd</option>
                                    <option value="date" ${origSettings.banner_clock === 'date' ? 'selected' : ''}>Alleen Datum</option>
                                    <option value="none" ${origSettings.banner_clock === 'none' ? 'selected' : ''}>Verbergen</option>
                                </select>
                            </div>
                            <div>
                                <label class="edit-label" style="display:block; font-size:0.85rem; margin-bottom:6px;">10. Subtitel</label>
                                <input type="text" id="be-subtitle" value="${origSettings.banner_subtitle !== undefined ? origSettings.banner_subtitle : 'Welkom op je persoonlijke Filemanager dashboard.'}" style="width:100%; padding:10px 12px; border-radius:8px; box-sizing:border-box;" placeholder="Laat leeg voor geen tekst">
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button id="be-cancel" class="btn-secondary" style="padding:10px 20px; border-radius:8px; font-weight:600; cursor:pointer; border:1px solid var(--border-dropdown); background:transparent; color:var(--text-muted);">Annuleren</button>
                        <button id="be-save" class="btn-primary" style="padding:10px 20px; border-radius:8px; background:var(--primary); color:white; border:none; font-weight:600; cursor:pointer;">Opslaan</button>
                    </div>
                </div>
            `;
            
            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            const inpLayout = overlay.querySelector('#be-layout');
            const inpFont = overlay.querySelector('#be-font');
            const inpEffect = overlay.querySelector('#be-effect');
            const radTypes = overlay.querySelectorAll('input[name="be-bg-type"]');
            const grpColor = overlay.querySelector('#be-color-group');
            const grpImage = overlay.querySelector('#be-image-group');
            const inpColor = overlay.querySelector('#be-color');
            const presets = overlay.querySelectorAll('.be-color-preset');
            const inpImage = overlay.querySelector('#be-image-val');
            const btnImage = overlay.querySelector('#be-btn-pick-image');
            const txtImage = overlay.querySelector('#be-image-preview-text');
            const inpOverlay = overlay.querySelector('#be-overlay');
            const txtOverlay = overlay.querySelector('#be-overlay-val');
            const inpGlass = overlay.querySelector('#be-glass');
            const inpClock = overlay.querySelector('#be-clock');
            const inpSubtitle = overlay.querySelector('#be-subtitle');

            const updateVisibility = () => {
                const t = overlay.querySelector('input[name="be-bg-type"]:checked').value;
                grpColor.style.display = (t === 'solid' || t === 'gradient') ? 'block' : 'none';
                grpImage.style.display = (t === 'image') ? 'block' : 'none';
            };
            updateVisibility();

            const triggerPreview = () => {
                dashData.settings.banner_layout = inpLayout.value;
                dashData.settings.banner_font = inpFont.value;
                dashData.settings.banner_effect = inpEffect.value;
                dashData.settings.banner_type = overlay.querySelector('input[name="be-bg-type"]:checked').value;
                dashData.settings.banner_color = inpColor.value;
                dashData.settings.banner_image = inpImage.value;
                dashData.settings.banner_overlay = parseInt(inpOverlay.value, 10);
                dashData.settings.banner_glass = inpGlass.checked;
                dashData.settings.banner_clock = inpClock.value;
                dashData.settings.banner_subtitle = inpSubtitle.value;
                
                if (window.App && window.App.dashboard) window.App.dashboard.updateWidgetSilently('welcome');
            };

            inpLayout.onchange = triggerPreview;
            inpFont.onchange = triggerPreview;
            inpEffect.onchange = triggerPreview;
            radTypes.forEach(r => r.onchange = () => { updateVisibility(); triggerPreview(); });
            inpColor.oninput = triggerPreview;
            presets.forEach(p => p.onclick = () => { inpColor.value = p.dataset.color; triggerPreview(); });
            inpOverlay.oninput = () => { txtOverlay.textContent = inpOverlay.value + '% Donkerder'; triggerPreview(); };
            inpGlass.onchange = triggerPreview;
            inpClock.onchange = triggerPreview;
            inpSubtitle.oninput = triggerPreview;

            // Image Picker Modal
            btnImage.onclick = () => {
                const pickerOverlay = document.createElement('div');
                pickerOverlay.className = 'modal-overlay visible';
                pickerOverlay.style.zIndex = '100001';
                
                pickerOverlay.addEventListener('mousedown', (e) => {
                    if (e.target === pickerOverlay) pickerOverlay.remove();
                });
                
                pickerOverlay.innerHTML = `
                    <div class="modal-box" style="width: 700px; max-width: 95vw; height: 75vh; margin: auto;">
                        <div class="modal-header">
                            <h3 style="margin:0; font-size:1.1rem;">Kies een afbeelding</h3>
                            <button class="btn-icon-small" id="pick-close" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                        </div>
                        <div id="pick-breadcrumbs" style="padding:10px 24px; background:var(--bg-surface); border-bottom:1px solid var(--border-dropdown); font-size:0.85rem; font-weight:600; color:var(--text-main); display:flex; align-items:center; gap:6px; overflow-x:auto; scrollbar-width:none; flex-shrink:0;"></div>
                        <div class="modal-body hide-scrollbars" id="pick-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:12px; align-content:start;">
                            <div style="grid-column:1/-1; text-align:center; padding: 40px; color:var(--text-muted);"><div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div></div>
                        </div>
                    </div>
                `;
                document.body.appendChild(pickerOverlay);
                pickerOverlay.querySelector('#pick-close').onclick = () => pickerOverlay.remove();

                const loadFolder = async (folderId) => {
                    const list = pickerOverlay.querySelector('#pick-list');
                    const crumbs = pickerOverlay.querySelector('#pick-breadcrumbs');
                    list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; color:var(--text-muted);"><div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px;"></div></div>`;

                    try {
                        const res = await fetch(`/api/files${folderId ? '?folder='+folderId : ''}`);
                        const apiData = await res.json();
                        list.innerHTML = '';
                        
                        let crumbsHtml = `<span class="pick-crumb" data-id="root" style="cursor:pointer; display:flex; align-items:center; gap:4px; transition:color 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> Mijn Bestanden</span>`;
                        if (apiData.data.breadcrumbs && apiData.data.breadcrumbs.length > 0) {
                            apiData.data.breadcrumbs.forEach((crumb, idx) => {
                                crumbsHtml += `<span style="opacity:0.5;">/</span>`;
                                if (idx === apiData.data.breadcrumbs.length - 1) crumbsHtml += `<span style="color:var(--primary); cursor:default;">${crumb.name}</span>`;
                                else crumbsHtml += `<span class="pick-crumb" data-id="${crumb.id}" style="cursor:pointer;">${crumb.name}</span>`;
                            });
                        }
                        crumbs.innerHTML = crumbsHtml;
                        crumbs.querySelectorAll('.pick-crumb').forEach(c => {
                            c.onmouseover = () => c.style.color = 'var(--primary)';
                            c.onmouseout = () => c.style.color = 'var(--text-main)';
                            c.onclick = () => loadFolder(c.dataset.id === 'root' ? null : c.dataset.id);
                        });

                        apiData.data.folders.forEach(f => {
                            const fEl = document.createElement('div');
                            fEl.style.cssText = `background:var(--bg-surface); border:1px solid var(--border-dropdown); border-radius:10px; padding:12px; text-align:center; cursor:pointer; transition:all 0.2s;`;
                            fEl.onmouseover = () => { fEl.style.borderColor = 'var(--primary)'; fEl.style.transform = 'translateY(-2px)'; };
                            fEl.onmouseout = () => { fEl.style.borderColor = 'var(--border-dropdown)'; fEl.style.transform = 'none'; };
                            const folderColor = f.color && f.color !== 'none' ? f.color : '#f59e0b';
                            fEl.innerHTML = `
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="${folderColor}20" stroke="${folderColor}" stroke-width="1.5" style="margin-bottom:6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                <div style="font-size:0.75rem; font-weight:600; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</div>
                            `;
                            fEl.onclick = () => loadFolder(f.id);
                            list.appendChild(fEl);
                        });

                        let imageCount = 0;
                        apiData.data.files.forEach(f => {
                            const ext = f.extension?.toLowerCase();
                            if (['jpg','jpeg','png','webp','gif','heic'].includes(ext)) {
                                imageCount++;
                                const fEl = document.createElement('div');
                                fEl.style.cssText = `background:var(--bg-surface); border:2px solid transparent; border-radius:10px; overflow:hidden; cursor:pointer; transition:all 0.2s; position:relative; aspect-ratio:1/1;`;
                                fEl.onmouseover = () => { fEl.style.borderColor = 'var(--primary)'; fEl.style.transform = 'scale(1.05)'; };
                                fEl.onmouseout = () => { fEl.style.borderColor = 'transparent'; fEl.style.transform = 'none'; };
                                
                                const t = new Date(f.updated_at || f.created_at || Date.now()).getTime();
                                fEl.innerHTML = `<img src="/api/files?action=thumb&id=${f.id}&t=${t}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
                                
                                fEl.onclick = () => {
                                    inpImage.value = f.id;
                                    txtImage.textContent = `Geselecteerd: ${f.original_name}`;
                                    triggerPreview();
                                    pickerOverlay.remove();
                                };
                                list.appendChild(fEl);
                            }
                        });

                        if (apiData.data.folders.length === 0 && imageCount === 0) {
                            list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted); font-size:0.85rem;">Geen mappen of afbeeldingen in deze locatie.</div>`;
                        }

                    } catch (e) {
                        list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--error);">Fout bij laden.</div>`;
                    }
                };
                loadFolder(null);
            };

            const closeModal = () => overlay.remove();
            
            overlay.querySelector('#be-close').onclick = () => {
                dashData.settings = origSettings; 
                if (window.App && window.App.dashboard) window.App.dashboard.updateWidgetSilently('welcome');
                closeModal();
            };
            overlay.querySelector('#be-cancel').onclick = overlay.querySelector('#be-close').onclick;

            overlay.querySelector('#be-save').onclick = async () => {
                const btn = overlay.querySelector('#be-save');
                btn.disabled = true;
                btn.textContent = 'Opslaan...';
                
                if (window.App && window.App.dashboard) {
                    const fields = ['banner_type', 'banner_color', 'banner_image', 'banner_overlay', 'banner_glass', 'banner_layout', 'banner_font', 'banner_effect', 'banner_clock', 'banner_subtitle'];
                    for (const f of fields) {
                        if (dashData.settings[f] !== origSettings[f]) {
                            await window.App.dashboard.saveSettings(f, dashData.settings[f]);
                        }
                    }
                    window.App.dashboard.updateWidgetSilently('welcome');
                }
                closeModal();
            };
        },

        welcome: function(data) {
            const hour = new Date().getHours();
            let greeting = 'Goedenacht';
            if (hour >= 6 && hour < 12) greeting = 'Goedemorgen';
            else if (hour >= 12 && hour < 18) greeting = 'Goedemiddag';
            else if (hour >= 18 && hour < 24) greeting = 'Goedenavond';
            
            const name = window.currentUser ? window.currentUser.first_name || window.currentUser.username : '';
            
            const st = data.settings || {};
            const bgType = st.banner_type || 'gradient';
            const bgColor = st.banner_color || '#f97316';
            const bgImage = st.banner_image || null;
            const overlayOpacity = st.banner_overlay !== undefined ? st.banner_overlay : 20;
            const glass = st.banner_glass !== undefined ? st.banner_glass : true;
            const layout = st.banner_layout || 'left';
            const font = st.banner_font || 'sans';
            const effect = st.banner_effect || 'shadow';
            const clockMode = st.banner_clock || 'full';
            const subtitle = st.banner_subtitle !== undefined ? st.banner_subtitle : 'Welkom op je persoonlijke Filemanager dashboard.';

            let bgCss = '';
            if (bgType === 'solid') {
                bgCss = `background-color: ${bgColor};`;
            } else if (bgType === 'image' && bgImage) {
                const t = new Date().getTime();
                bgCss = `background: url('/api/files?action=thumb&id=${bgImage}&t=${t}') center/cover no-repeat;`;
            } else {
                bgCss = `background: linear-gradient(135deg, ${bgColor}, rgba(0,0,0,0.6));`;
            }

            let fontCss = 'font-family: inherit;';
            if (font === 'serif') fontCss = 'font-family: Georgia, serif;';
            if (font === 'rounded') fontCss = 'font-family: "Nunito", "Quicksand", sans-serif;';
            if (font === 'mono') fontCss = 'font-family: monospace;';

            let effectCss = 'none';
            if (effect === 'shadow') effectCss = '0 2px 4px rgba(0,0,0,0.4)';
            if (effect === 'glow') effectCss = `0 0 15px ${bgColor}`;

            let flexDir = 'row';
            let textAlign = 'left';
            let clockAlign = 'right';
            if (layout === 'center') { flexDir = 'column'; textAlign = 'center'; clockAlign = 'center'; }
            if (layout === 'right') { flexDir = 'row-reverse'; textAlign = 'right'; clockAlign = 'left'; }

            let timeHtml = `<div id="dash-clock" style="font-size:3rem; font-weight:800; letter-spacing:-2px; line-height:1; text-shadow: ${effectCss};">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
            let dateHtml = `<div style="font-size:1rem; opacity:0.8; margin-top:4px; text-shadow: ${effectCss}; font-weight:500;">${new Date().toLocaleDateString('nl-NL', {weekday: 'long', day: 'numeric', month: 'long'})}</div>`;
            
            let clockHtml = '';
            if (clockMode === 'full') clockHtml = timeHtml + dateHtml;
            else if (clockMode === 'time') clockHtml = timeHtml;
            else if (clockMode === 'date') clockHtml = dateHtml;

            return `
                ${getWidgetControlsHtml()}
                <div style="position:absolute; inset:0; border-radius:16px; overflow:hidden; z-index:0; ${bgCss}">
                    ${glass ? `
                        <div style="position:absolute; top:-50px; right:-50px; width:200px; height:200px; background:rgba(255,255,255,0.1); border-radius:50%; filter:blur(20px);"></div>
                        <div style="position:absolute; bottom:-80px; left:20%; width:250px; height:250px; background:rgba(0,0,0,0.1); border-radius:50%; filter:blur(30px);"></div>
                    ` : ''}
                    <div style="position:absolute; inset:0; background:rgba(0,0,0,${overlayOpacity/100}); z-index:1;"></div>
                </div>
                
                <div style="position:relative; z-index:2; display:flex; flex-direction:${flexDir}; justify-content:${layout === 'center' ? 'center' : 'space-between'}; align-items:center; height:100%; color:white; padding: 20px 30px; text-align:${textAlign}; ${fontCss}">
                    <div style="${layout === 'center' ? 'margin-bottom:16px;' : ''}">
                        <h1 style="font-size:2.5rem; margin:0 0 8px 0; font-weight:800; letter-spacing:-1px; text-shadow: ${effectCss};">${greeting}, ${name}!</h1>
                        ${subtitle ? `<p style="font-size:1rem; opacity:0.9; margin:0; text-shadow: ${effectCss};">${subtitle}</p>` : ''}
                    </div>
                    <div style="text-align:${clockAlign}; display:flex; flex-direction:column; justify-content:center;">
                        ${clockHtml}
                    </div>
                </div>
            `;
        },
        init_welcome: function(el, data) {
            const clockInterval = setInterval(() => {
                const c = el.querySelector('#dash-clock');
                if (c) c.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                else clearInterval(clockInterval);
            }, 1000);
        },

        shortcuts: function(data) {
            let html = `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        Snelle Toegang
                    </div>
                </div>
                <div class="shortcuts-grid hide-scrollbars" style="display:grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); gap:8px; padding:12px 16px; flex:1; overflow:hidden; min-height:0; transition: background 0.2s;">
            `;
            
            const shortcuts = data.shortcuts || [];
            if (shortcuts.length === 0) {
                html += `<div style="grid-column: 1 / -1; grid-row: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.8rem; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; pointer-events:none;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.5; margin-bottom:6px;" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>Pin mappen of bestanden.</div>`;
            } else {
                shortcuts.slice(0, 4).forEach(sc => {
                    let isImage = sc.extension && ['jpg','jpeg','png','webp','gif','heic'].includes(sc.extension.toLowerCase());
                    let isVideo = sc.extension && ['mp4','mov','avi','mkv','webm'].includes(sc.extension.toLowerCase());
                    let isMedia = isImage || isVideo;

                    let bgHtml = '';
                    if (sc.type === 'folder') {
                        const color = sc.color || '#f59e0b';
                        bgHtml = `<div style="position:absolute; inset:0; background:${color}15; color:${color}; display:flex; align-items:center; justify-content:center;"><svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>`;
                    } else if (isMedia) {
                        const t = new Date(sc.created_at || Date.now()).getTime();
                        let overlay = isVideo ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3);"><svg width="20" height="20" fill="white" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>` : '';
                        bgHtml = `
                            <img src="/api/files?action=thumb&id=${sc.id}&t=${t}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none';">
                            ${overlay}
                        `;
                    } else {
                        bgHtml = `<div style="position:absolute; inset:0; background:rgba(128,128,128,0.08); color:var(--text-muted); display:flex; align-items:center; justify-content:center;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></div>`;
                    }

                    html += `
                        <div class="dash-shortcut-card" data-id="${sc.id}" data-type="${sc.type}" style="position:relative; background:var(--bg-main); border:1px solid var(--border-dropdown); border-radius:8px; overflow:hidden; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.08)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                            ${bgHtml}
                            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.6); padding:4px 6px; text-align:center;">
                                <div style="font-weight:600; font-size:0.7rem; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${sc.name}">${sc.name}</div>
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            return html;
        },
        init_shortcuts: function(el, data) {
            el.querySelectorAll('.dash-shortcut-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.id;
                    const type = card.dataset.type;
                    if (type === 'folder') {
                        if(window.EventBus) window.EventBus.emit('navigation:navigate', String(id));
                    } else {
                        const fileObj = data.shortcuts.find(s => String(s.id) === String(id));
                        if (fileObj && window.App && window.App.lightbox) {
                            window.App.lightbox.open([fileObj], 0);
                        }
                    }
                });
            });
        },

        storage: function(data) {
            const s = data.storage || { used_formatted: '0 B', total_formatted: '5 GB', percentage: 0 };
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                        Opslag
                    </div>
                </div>
                <div class="chart-container" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 10px; min-height:0;">
                    <div style="position:relative; width:100px; height:100px; flex-shrink:0;">
                        <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform: rotate(-90deg);">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(128,128,128,0.15)" stroke-width="3"/>
                            <path id="storage-ring" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" stroke-width="3" style="transition: stroke-dasharray 1s ease-out; stroke-linecap: round;"/>
                        </svg>
                        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center;">
                            <div style="font-size:1.3rem; font-weight:800; color:var(--text-main); line-height:1;" id="storage-perc">0%</div>
                        </div>
                    </div>
                    <div id="storage-warning" style="margin-top:10px; font-size:0.75rem; font-weight:600; text-align:center; flex-shrink:0; color:var(--text-muted);">Ruimte genoeg!</div>
                </div>
            `;
        },
        init_storage: function(el, data) {
            const ring = el.querySelector('#storage-ring');
            const percLabel = el.querySelector('#storage-perc');
            const warnLabel = el.querySelector('#storage-warning');
            if (!ring || !data.storage) return;

            const perc = data.storage.percentage || 0;
            percLabel.textContent = Math.round(perc) + '%';
            
            setTimeout(() => {
                ring.setAttribute('stroke-dasharray', `${perc}, 100`);
            }, 100);
            
            if (perc > 90) {
                ring.setAttribute('stroke', '#ef4444');
                warnLabel.textContent = '⚠️ Bijna vol!';
                warnLabel.style.color = '#ef4444';
            } else if (perc > 75) {
                ring.setAttribute('stroke', '#f59e0b');
                warnLabel.textContent = 'Raakt vol.';
                warnLabel.style.color = '#f59e0b';
            }
        },

        types: function(data) {
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                        Bestandstypen
                    </div>
                </div>
                <div class="chart-container hide-scrollbars" style="flex:1; display:flex; align-items:center; justify-content:center; gap: 16px; padding: 10px 16px; overflow-y:auto; min-height:0; flex-wrap:wrap;">
                    <div style="position:relative; width:90px; height:90px; flex-shrink:0;">
                        <svg id="svg-types-donut" viewBox="0 0 42 42" style="width:100%; height:100%; transform: rotate(-90deg); overflow:visible;"></svg>
                    </div>
                    <div id="types-legend" style="display:flex; flex-direction:column; gap:4px; font-size:0.75rem; font-weight:600; color:var(--text-main); min-width:90px;"></div>
                </div>
            `;
        },
        init_types: function(el, data) {
            const svg = el.querySelector('#svg-types-donut');
            const legend = el.querySelector('#types-legend');
            if (!svg || !data.fileTypes) return;

            const types = data.fileTypes;
            const config = [
                { key: 'image', color: '#3b82f6', label: 'Afbeeldingen' },
                { key: 'video', color: '#8b5cf6', label: "Video's" },
                { key: 'doc', color: '#10b981', label: 'Documenten' },
                { key: 'audio', color: '#f59e0b', label: 'Audio' },
                { key: 'archive', color: '#ef4444', label: 'Archieven' },
                { key: 'other', color: '#64748b', label: 'Overig' }
            ];

            const total = Object.values(types).reduce((a, b) => a + parseInt(b), 0);

            if (total === 0) {
                svg.innerHTML = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="rgba(128,128,128,0.1)" stroke-width="5"></circle>`;
                legend.innerHTML = `<span style="color:var(--text-muted); font-weight:normal;">Geen bestanden</span>`;
                return;
            }

            let currentOffset = 0;
            let svgHtml = '';
            let legendHtml = '';

            config.forEach((item, index) => {
                const count = parseInt(types[item.key] || 0);
                if (count > 0) {
                    const percentage = (count / total) * 100;
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const strokeDashoffset = -currentOffset;
                    
                    svgHtml += `
                        <circle class="donut-segment" 
                            cx="21" cy="21" r="15.915" 
                            fill="none" 
                            stroke="${item.color}" 
                            stroke-width="5" 
                            stroke-dasharray="${strokeDasharray}" 
                            stroke-dashoffset="${strokeDashoffset}"
                            style="transition: all 0.3s; cursor:pointer;"
                            data-index="${index}"
                            onmouseover="this.style.strokeWidth='7'; this.style.opacity='0.8';"
                            onmouseout="this.style.strokeWidth='5'; this.style.opacity='1';">
                        </circle>
                    `;
                    
                    legendHtml += `
                        <div class="legend-item" data-index="${index}" style="display:flex; align-items:center; gap:6px; cursor:pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.7';" onmouseout="this.style.opacity='1';">
                            <div style="width:8px; height:8px; border-radius:2px; background:${item.color}; flex-shrink:0;"></div>
                            <span style="white-space: nowrap; overflow:hidden; text-overflow:ellipsis;">${item.label} <span style="opacity:0.5; margin-left:2px;">(${count})</span></span>
                        </div>
                    `;
                    
                    currentOffset += percentage;
                }
            });
            
            svg.innerHTML = svgHtml;
            legend.innerHTML = legendHtml;

            el.querySelectorAll('.legend-item').forEach(lItem => {
                lItem.addEventListener('mouseenter', () => {
                    const idx = lItem.dataset.index;
                    const slice = svg.querySelector(`.donut-segment[data-index="${idx}"]`);
                    if(slice) { slice.style.strokeWidth = '7'; slice.style.opacity = '0.8'; }
                });
                lItem.addEventListener('mouseleave', () => {
                    const idx = lItem.dataset.index;
                    const slice = svg.querySelector(`.donut-segment[data-index="${idx}"]`);
                    if(slice) { slice.style.strokeWidth = '5'; slice.style.opacity = '1'; }
                });
            });
        },

        activity: function(data) {
            let html = `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        Recente Activiteit
                    </div>
                </div>
                <div class="activity-list hide-scrollbars" style="flex:1; overflow-y:auto; display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:6px; padding: 12px 16px; align-content:start;">
            `;
            
            const logs = data.activity || [];
            if (logs.length === 0) {
                html += `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); font-size:0.8rem; padding:20px;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4; margin-bottom:8px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><br>Geen recente activiteit.</div>`;
            } else {
                logs.forEach(log => {
                    let icon = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
                    let color = 'var(--text-muted)';
                    let type = (log.category === 'folder' || log.extension === null) ? 'folder' : 'file';
                    
                    if (log.action === 'uploaded' || log.action === 'created') { 
                        icon = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>'; 
                        color = '#10b981'; 
                    } else if (log.action === 'deleted') { 
                        icon = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'; 
                        color = '#ef4444'; 
                    } else if (log.action === 'renamed') { 
                        icon = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>'; 
                        color = '#f59e0b'; 
                    } else if (log.action === 'moved') { 
                        icon = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline></svg>'; 
                        color = '#3b82f6'; 
                    }
                    
                    const name = log.file_name || log.folder_name || log.name || 'Onbekend item';
                    const actionLabels = {
                        'uploaded': 'Geüpload', 'created': 'Aangemaakt', 'deleted': 'Verwijderd', 'renamed': 'Hernoemd', 'moved': 'Verplaatst'
                    };
                    const label = actionLabels[log.action] || log.action || 'Bewerkt';
                    
                    const dateObj = new Date(log.created_at);
                    const isToday = dateObj.toDateString() === new Date().toDateString();
                    const timeStr = dateObj.toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'});
                    const dateStr = isToday ? `Vandaag ${timeStr}` : `${dateObj.getDate()} ${dateObj.toLocaleString('nl-NL', {month:'short'})}`;
                    
                    const isDeleted = log.action === 'deleted';
                    const id = log.target_id || log.id;
                    
                    html += `
                        <div class="dash-activity-row" data-id="${id}" data-type="${type}" data-deleted="${isDeleted}" style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:rgba(128,128,128,0.03); border-radius:8px; border:1px solid var(--border-dropdown); transition:all 0.2s; cursor:${isDeleted ? 'not-allowed' : 'pointer'}; opacity:${isDeleted ? '0.6' : '1'}; height:46px;" onmouseover="if(!${isDeleted}) { this.style.background='var(--bg-main)'; this.style.borderColor='var(--primary)'; }" onmouseout="if(!${isDeleted}) { this.style.background='rgba(128,128,128,0.03)'; this.style.borderColor='var(--border-dropdown)'; }">
                            <div style="width:24px; height:24px; border-radius:6px; background:${color}15; color:${color}; display:flex; align-items:center; justify-content:center; flex-shrink:0; pointer-events:none;">${icon}</div>
                            <div style="flex:1; min-width:0; pointer-events:none;">
                                <div style="font-weight:600; font-size:0.8rem; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${name}">${name}</div>
                                <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">${label} &bull; ${dateStr}</div>
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            return html;
        },
        init_activity: function(el, data) {
            el.querySelectorAll('.dash-activity-row').forEach(row => {
                row.addEventListener('click', () => {
                    if (row.dataset.deleted === 'true') return;
                    
                    const id = row.dataset.id;
                    const type = row.dataset.type;
                    
                    if (!id || id === 'undefined') return;

                    if (type === 'folder') {
                        if(window.EventBus) window.EventBus.emit('navigation:navigate', String(id));
                    } else {
                        const logObj = data.activity.find(a => String(a.target_id || a.id) === String(id));
                        if (logObj && window.App && window.App.lightbox) {
                            const mappedFile = {
                                id: id,
                                original_name: logObj.file_name || logObj.name || 'Bestand',
                                extension: logObj.extension || '',
                                mime_type: logObj.mime_type || ''
                            };
                            window.App.lightbox.open([mappedFile], 0);
                        }
                    }
                });
            });
        },

        // --- 6. TODO NOTES WIDGET ---
        notes: function(data) {
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px; display:flex; justify-content:space-between; align-items:center;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Mijn Taken
                    </div>
                    <span id="todo-counter" style="font-size:0.7rem; background:rgba(245,158,11,0.1); color:#f59e0b; padding:2px 6px; border-radius:8px; font-weight:bold; display:none;">0</span>
                </div>
                <div class="todo-list-container hide-scrollbars" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding: 12px 16px; min-height:0;">
                </div>
                <div style="padding: 0 16px 16px 16px; display:flex; gap:8px;">
                    <input type="text" id="dash-new-todo" placeholder="Nieuwe taak..." style="flex:1; padding:6px 10px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-main); color:var(--text-main); font-size:0.8rem; transition:border 0.2s; outline:none; min-width:0;">
                    <button id="dash-btn-add-todo" class="btn-primary" style="padding:6px 12px; border-radius:8px; border:none; font-weight:bold; cursor:pointer;">+</button>
                </div>
            `;
        },
        init_notes: function(el, data) {
            const listContainer = el.querySelector('.todo-list-container');
            const counter = el.querySelector('#todo-counter');
            const todoInput = el.querySelector('#dash-new-todo');
            const todoBtn = el.querySelector('#dash-btn-add-todo');
            
            const renderList = () => {
                const rawTodos = data.settings?.todos || [];
                const todos = rawTodos.map(t => typeof t === 'string' ? { text: t, done: false } : t);
                data.settings.todos = todos; 
                
                if (todos.length > 0) {
                    counter.style.display = 'inline-block';
                    counter.textContent = todos.length;
                } else {
                    counter.style.display = 'none';
                    listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4; margin-bottom:8px;" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>Alles weggewerkt!</div>`;
                    return;
                }

                let html = '';
                todos.forEach((t, idx) => {
                    const isDone = t.done === true;
                    const opacity = isDone ? '0.5' : '1';
                    const lineThrough = isDone ? 'line-through' : 'none';
                    const checkBg = isDone ? 'var(--primary)' : 'transparent';
                    const checkBorder = isDone ? 'var(--primary)' : 'var(--border-dropdown)';
                    const checkIcon = isDone ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : '';
                    
                    html += `
                        <div class="todo-item" style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:rgba(128,128,128,0.03); border-radius:8px; transition:all 0.2s; border:1px solid var(--border-dropdown); opacity:${opacity};" onmouseover="this.style.background='var(--bg-main)'" onmouseout="this.style.background='rgba(128,128,128,0.03)'">
                            <div class="todo-checkbox" data-idx="${idx}" style="width:14px; height:14px; border-radius:4px; border:2px solid ${checkBorder}; background:${checkBg}; display:flex; align-items:center; justify-content:center; transition:all 0.2s; flex-shrink:0; cursor:pointer;">${checkIcon}</div>
                            <div class="todo-text" style="font-size:0.8rem; color:var(--text-main); font-weight:500; flex:1; transition:all 0.2s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-decoration:${lineThrough};" title="${t.text}">${t.text}</div>
                            <button class="btn-icon-small delete-todo" data-idx="${idx}" style="opacity:0; transform:scale(0.8); transition:all 0.2s; flex-shrink:0; color:var(--error); cursor:pointer; background:transparent; border:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </div>
                    `;
                });
                listContainer.innerHTML = html;
                attachListEvents();
            };

            const attachListEvents = () => {
                listContainer.querySelectorAll('.todo-item').forEach(item => {
                    item.onmouseenter = () => { const d = item.querySelector('.delete-todo'); if(d) d.style.opacity = '1'; };
                    item.onmouseleave = () => { const d = item.querySelector('.delete-todo'); if(d) d.style.opacity = '0'; };
                });

                listContainer.querySelectorAll('.todo-checkbox').forEach(box => {
                    box.onclick = (e) => {
                        const idx = parseInt(box.dataset.idx, 10);
                        data.settings.todos[idx].done = !data.settings.todos[idx].done;
                        renderList(); 
                        if(window.App && window.App.dashboard) {
                            window.App.dashboard.saveSettings('todos', data.settings.todos, true);
                        }
                    };
                });

                listContainer.querySelectorAll('.delete-todo').forEach(btn => {
                    btn.onclick = () => {
                        const idx = parseInt(btn.dataset.idx, 10);
                        data.settings.todos.splice(idx, 1); 
                        renderList(); 
                        if(window.App && window.App.dashboard) {
                            window.App.dashboard.saveSettings('todos', data.settings.todos, true);
                        }
                    };
                });
            };

            const saveTodo = () => {
                if(!todoInput || !todoInput.value.trim()) return;
                const val = todoInput.value.trim();
                todoInput.value = ''; 
                
                if(!data.settings) data.settings = {};
                if(!data.settings.todos) data.settings.todos = [];
                data.settings.todos.push({ text: val, done: false });
                
                renderList(); 
                if(window.App && window.App.dashboard) {
                    window.App.dashboard.saveSettings('todos', data.settings.todos, true);
                }
            };

            if (todoBtn) todoBtn.onclick = saveTodo;
            if (todoInput) {
                todoInput.onkeypress = (e) => { if(e.key === 'Enter') saveTodo(); };
                todoInput.onfocus = () => todoInput.style.borderColor = 'var(--primary)';
                todoInput.onblur = () => todoInput.style.borderColor = 'var(--border-dropdown)';
                todoInput.addEventListener('mousedown', e => e.stopPropagation());
            }

            renderList(); 
        },

        upload: function(data) {
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Snel Uploaden
                    </div>
                </div>
                <div style="padding: 12px 16px 16px 16px; flex:1; display:flex; min-height:0;">
                    <div class="dash-dropzone" style="flex:1; border:2px dashed var(--border-dropdown); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); cursor:pointer; background:rgba(128,128,128,0.02); transition:all 0.2s;">
                        <div style="width:36px; height:36px; border-radius:50%; background:var(--bg-surface); box-shadow:0 4px 10px rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center; margin-bottom:8px;">
                            <svg width="18" height="18" fill="none" stroke="var(--primary)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <div style="font-weight:600; color:var(--text-main); font-size:0.85rem; text-align:center;">Klik of sleep bestanden</div>
                    </div>
                </div>
            `;
        },
        init_upload: function(el, data) {
            const dropzone = el.querySelector('.dash-dropzone');
            if (!dropzone) return;

            dropzone.addEventListener('mousedown', e => e.stopPropagation());

            dropzone.addEventListener('click', () => {
                const mockInput = document.getElementById('mock-upload-input');
                if (mockInput) mockInput.click();
            });

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.background = 'rgba(37,99,235,0.05)';
                dropzone.style.borderColor = 'var(--primary)';
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.style.background = 'rgba(128,128,128,0.02)';
                dropzone.style.borderColor = 'var(--border-dropdown)';
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.background = 'rgba(128,128,128,0.02)';
                dropzone.style.borderColor = 'var(--border-dropdown)';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    if (window.App && window.App.uploader) {
                        window.App.uploader.handleFiles(files);
                    } else {
                        const mockInput = document.getElementById('mock-upload-input');
                        if (mockInput) {
                            mockInput.files = files;
                            mockInput.dispatchEvent(new Event('change'));
                        }
                    }
                }
            });
        },

        shared_with_me: function(data) {
            const items = data.shared_with_me || [];
            let html = `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="#14b8a6" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Gedeeld met mij
                    </div>
                </div>
                <div class="hide-scrollbars" style="flex:1; display:flex; flex-direction:column; gap:6px; overflow-y:auto; min-height:0; padding: 12px 16px;">
            `;
            if (items.length === 0) {
                html += `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4; margin-bottom:8px;" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>Er is nog niets gedeeld.</div>`;
            } else {
                items.forEach(item => {
                    const isFolder = item.target_type === 'folder';
                    const name = item.file_name || item.folder_name || 'Item';
                    const iconHtml = isFolder 
                        ? `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
                        : `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
                    
                    html += `
                        <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:rgba(20,184,166,0.05); border-radius:8px; border:1px solid rgba(20,184,166,0.1); cursor:pointer; transition:background 0.2s;" onclick="window.EventBus && window.EventBus.emit('navigation:action', 'shared_with_me')" onmouseover="this.style.background='rgba(20,184,166,0.1)'" onmouseout="this.style.background='rgba(20,184,166,0.05)'">
                            <div style="width:24px; height:24px; border-radius:6px; background:rgba(20,184,166,0.1); color:#14b8a6; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconHtml}</div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:600; font-size:0.8rem; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
                                <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">Via ${item.username || 'collega'}</div>
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            return html;
        },
        init_shared_with_me: function(el, data) {},

        trash: function(data) {
            const count = data.trash_count || 0;
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Prullenbak
                    </div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 16px; min-height:0;">
                    <div style="font-size:2.5rem; font-weight:800; color:var(--text-main); line-height:1;">${count}</div>
                    <div style="color:var(--text-muted); font-size:0.8rem; font-weight:500; margin-top:4px;">items</div>
                    <button class="btn-secondary" style="margin-top:12px; width:100%; border-color:rgba(239,68,68,0.3); color:#ef4444; border-radius:8px; font-weight:bold; padding:6px; background:transparent;" onclick="window.EventBus && window.EventBus.emit('navigation:navigate', 'trash')">Bekijken</button>
                </div>
            `;
        },
        init_trash: function(el, data) {},

        // --- 10. BOOKMARKS ---
        bookmarks: function(data) {
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        Bladwijzers
                    </div>
                </div>
                <div class="bookmark-list hide-scrollbars" style="flex:1; display:flex; flex-direction:column; gap:6px; overflow-y:auto; min-height:0; padding: 12px 16px 10px 16px;">
                </div>
                <div style="padding: 0 16px 16px 16px;"><button id="btn-add-bookmark" class="btn-secondary" style="width:100%; border-style:dashed; border-radius:8px; padding:6px; font-size:0.8rem; font-weight:600; color:var(--text-main); background:transparent;">+ Toevoegen</button></div>
            `;
        },
        init_bookmarks: function(el, data) {
            const btnAdd = el.querySelector('#btn-add-bookmark');
            const listContainer = el.querySelector('.bookmark-list');

            const renderList = () => {
                const marks = data.settings?.bookmarks || [];
                if (marks.length === 0) {
                    listContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4; margin-bottom:8px;" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>Geen links.</div>`;
                    return;
                }
                
                let html = '';
                marks.forEach((m, idx) => {
                    html += `
                        <div class="bookmark-item" style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:var(--bg-main); border-radius:8px; border:1px solid var(--border-dropdown); position:relative; transition:background 0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-dropdown)'">
                            <div style="width:16px; height:16px; border-radius:4px; background:rgba(59,130,246,0.1); color:#3b82f6; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
                            <a href="${m.url}" target="_blank" style="flex:1; text-decoration:none; color:var(--text-main); font-weight:600; font-size:0.8rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${m.title}">${m.title}</a>
                            <button class="btn-icon-small delete-bookmark" data-idx="${idx}" style="position:absolute; right:4px; opacity:0; transform:scale(0.8); background:var(--bg-surface); flex-shrink:0; padding:2px; cursor:pointer; border:none;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </div>
                    `;
                });
                listContainer.innerHTML = html;
                attachListEvents();
            };

            const attachListEvents = () => {
                listContainer.querySelectorAll('.bookmark-item').forEach(item => {
                    item.onmouseenter = () => { const d = item.querySelector('.delete-bookmark'); if(d) d.style.opacity = '1'; };
                    item.onmouseleave = () => { const d = item.querySelector('.delete-bookmark'); if(d) d.style.opacity = '0'; };
                });

                listContainer.querySelectorAll('.delete-bookmark').forEach(btn => {
                    btn.addEventListener('mousedown', e => e.stopPropagation());
                    btn.onclick = (e) => {
                        e.preventDefault();
                        const idx = parseInt(btn.dataset.idx, 10);
                        data.settings.bookmarks.splice(idx, 1);
                        renderList(); 
                        if(window.App && window.App.dashboard) {
                            window.App.dashboard.saveSettings('bookmarks', data.settings.bookmarks, true);
                        }
                    };
                });
            };

            if (btnAdd) {
                btnAdd.addEventListener('mousedown', e => e.stopPropagation());
                btnAdd.onclick = () => {
                    const overlay = document.createElement('div');
                    overlay.className = 'modal-overlay visible';
                    
                    overlay.addEventListener('mousedown', (e) => {
                        if (e.target === overlay) {
                            overlay.querySelector('#bm-cancel').click();
                        }
                    });

                    overlay.innerHTML = `
                        <div class="modal-box" style="width: 400px; max-width:90vw; margin: auto;">
                            <div class="modal-header">
                                <h3 style="margin:0; font-size:1.1rem;">Nieuwe Bladwijzer</h3>
                                <button class="btn-icon-small" id="bm-cancel-icon" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                            </div>
                            <div class="modal-body">
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:6px;">Naam:</label>
                                <input type="text" id="bm-title" placeholder="Bijv. Webmail" style="width:100%; padding:10px 12px; margin-bottom:16px; border-radius:8px; box-sizing:border-box;">
                                
                                <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-bottom:6px;">URL:</label>
                                <input type="text" id="bm-url" value="https://" style="width:100%; padding:10px 12px; border-radius:8px; box-sizing:border-box;">
                            </div>
                            <div class="modal-footer">
                                <button id="bm-cancel" class="btn-secondary" style="padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; border:1px solid var(--border-dropdown); background:transparent; color:var(--text-muted);">Annuleren</button>
                                <button id="bm-save" class="btn-primary" style="padding:8px 16px; border-radius:8px; border:none; font-weight:600; background:var(--primary); color:white; cursor:pointer;">Toevoegen</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(overlay);

                    const iTitle = overlay.querySelector('#bm-title');
                    const iUrl = overlay.querySelector('#bm-url');
                    
                    iTitle.focus();

                    const closeFunc = () => overlay.remove();
                    overlay.querySelector('#bm-cancel').onclick = closeFunc;
                    overlay.querySelector('#bm-cancel-icon').onclick = closeFunc;
                    
                    overlay.querySelector('#bm-save').onclick = () => {
                        const title = iTitle.value.trim();
                        let url = iUrl.value.trim();
                        
                        if (!title || !url || url === 'https://') {
                            iTitle.style.borderColor = 'var(--error)';
                            return;
                        }
                        
                        if (!url.startsWith('http')) url = 'https://' + url;
                        
                        if(!data.settings) data.settings = {};
                        if(!data.settings.bookmarks) data.settings.bookmarks = [];
                        data.settings.bookmarks.push({title, url});
                        
                        renderList(); 
                        if(window.App && window.App.dashboard) {
                            window.App.dashboard.saveSettings('bookmarks', data.settings.bookmarks, true);
                        }
                        overlay.remove();
                    };
                };
            }

            renderList();
        },

        active_links: function(data) {
            const count = data.active_shares || 0;
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="#8b5cf6" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        Externe Links
                    </div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 16px; min-height:0;">
                    <div style="width:48px; height:48px; border-radius:50%; background:rgba(139,92,246,0.1); display:flex; align-items:center; justify-content:center; margin-bottom:8px; flex-shrink:0;">
                        <span style="font-size:1.5rem; font-weight:800; color:#8b5cf6;">${count}</span>
                    </div>
                    <div style="color:var(--text-muted); font-size:0.8rem; font-weight:600;">actieve links</div>
                    <button class="btn-secondary" style="margin-top:12px; width:100%; border-color:rgba(139,92,246,0.3); color:#8b5cf6; border-radius:8px; font-weight:bold; padding:6px; background:transparent;" onclick="window.EventBus && window.EventBus.emit('navigation:navigate', 'shares')">Beheren</button>
                </div>
            `;
        },
        init_active_links: function(el, data) {},

        activity_chart: function(data, instanceId) {
            return `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="var(--primary)" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        Activiteit (7 Dagen)
                    </div>
                </div>
                <div class="chart-container hide-scrollbars" style="flex:1; display:flex; align-items:flex-end; justify-content:center; padding: 10px 16px 16px 16px; min-height:0; overflow:hidden;">
                    <svg id="svg-activity-line-${instanceId}" style="width:100%; height:100%; overflow:visible;"></svg>
                </div>
            `;
        },
        init_activity_chart: function(el, data, instanceId) {
            const svg = el.querySelector(`#svg-activity-line-${instanceId}`);
            if (!svg || !data.activity_chart) return;
            const chartData = data.activity_chart;
            
            const maxVal = Math.max(...(chartData.values || [0]), 5);
            const width = 100;
            const height = 100;
            
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            
            let html = '';
            let points = [];
            const labels = chartData.labels || ['Maa','Din','Woe','Don','Vri','Zat','Zon'];
            const values = chartData.values || [0,0,0,0,0,0,0];
            const xStep = width / Math.max((values.length - 1), 1);
            
            values.forEach((val, i) => {
                const x = i * xStep;
                const y = height - ((val / maxVal) * height);
                points.push(`${x},${y}`);
            });
            
            html += `<line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="var(--border-dropdown)" stroke-width="0.5" stroke-dasharray="2 2" />`;
            html += `<line x1="0" y1="0" x2="${width}" y2="0" stroke="var(--border-dropdown)" stroke-width="0.5" stroke-dasharray="2 2" />`;
            html += `<line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="var(--border-dropdown)" stroke-width="0.5" />`;
            
            const areaPoints = `0,${height} ${points.join(' ')} ${width},${height}`;
            html += `<polygon points="${areaPoints}" fill="var(--primary)" style="opacity:0.1;" />`;
            
            html += `<polyline points="${points.join(' ')}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
            
            values.forEach((val, i) => {
                const x = i * xStep;
                const y = height - ((val / maxVal) * height);
                html += `
                    <circle cx="${x}" cy="${y}" r="3" fill="var(--bg-surface)" stroke="var(--primary)" stroke-width="1.5">
                        <title>${labels[i]}: ${val} acties</title>
                    </circle>
                `;
                if(i % 2 === 0 || values.length <= 7) {
                    html += `<text x="${x}" y="${height + 15}" font-size="6" fill="var(--text-muted)" text-anchor="middle">${labels[i]}</text>`;
                }
            });
            
            svg.innerHTML = html;
            svg.style.paddingBottom = '15px'; 
        },

        top_folders: function(data, instanceId) {
            let html = `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        Ruimtevretende Mappen
                    </div>
                </div>
                <div class="hide-scrollbars" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding: 12px 16px;">
            `;
            const folders = data.top_folders || [];
            if(folders.length === 0) {
                html += `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:20px;">Je mappen zijn leeg!</div>`;
            } else {
                const maxVal = Math.max(...folders.map(f => parseFloat(f.total_size) || 0), 1);
                folders.forEach(f => {
                    const size = parseFloat(f.total_size) || 0;
                    const pct = Math.min(100, (size / maxVal) * 100);
                    const color = f.color && f.color !== 'none' ? f.color : '#3b82f6';
                    html += `
                        <div style="display:flex; flex-direction:column; gap:6px; cursor:pointer; padding:6px; border-radius:6px; transition:background 0.2s;" onmouseover="this.style.background='rgba(128,128,128,0.05)'" onmouseout="this.style.background='transparent'" onclick="window.EventBus && window.EventBus.emit('navigation:navigate', '${f.id}')">
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; color:var(--text-main);">
                                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;">${f.name}</span>
                                <span style="color:var(--text-muted);">${f.formatted_size}</span>
                            </div>
                            <div style="width:100%; height:6px; background:var(--border-dropdown); border-radius:3px; overflow:hidden;">
                                <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px;"></div>
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            return html;
        },
        init_top_folders: function(el, data, instanceId) {},

        file_requests: function(data, instanceId) {
            let html = `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Inkomende Verzoeken
                    </div>
                </div>
                <div class="hide-scrollbars" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding: 12px 16px;">
            `;
            const reqs = data.file_requests || [];
            if(reqs.length === 0) {
                html += `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:20px;">Geen actieve verzoeken.</div>`;
            } else {
                reqs.forEach(r => {
                    html += `
                        <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(16,185,129,0.05); border-radius:8px; border:1px solid rgba(16,185,129,0.1); cursor:pointer;" onclick="window.EventBus && window.EventBus.emit('navigation:navigate', 'shares')">
                            <div style="width:24px; height:24px; border-radius:6px; background:rgba(16,185,129,0.1); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            </div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:600; font-size:0.8rem; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.name}</div>
                                <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">Geldig tot ${r.expires_at ? new Date(r.expires_at).toLocaleDateString('nl-NL') : 'onbeperkt'}</div>
                            </div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            return html;
        },
        init_file_requests: function(el, data, instanceId) {},

        sys_notices: function(data, instanceId) {
            let html = `
                ${getWidgetControlsHtml()}
                <div class="widget-header" style="padding: 12px 16px 0 16px;">
                    <div class="widget-title" style="font-size:0.95rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                        <svg class="widget-icon" width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        Systeem Mededelingen
                    </div>
                </div>
                <div class="hide-scrollbars" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding: 12px 16px;">
            `;
            const notes = data.sys_notices || [];
            if(notes.length === 0) {
                html += `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:20px;">Geen mededelingen.</div>`;
            } else {
                notes.forEach(n => {
                    let color = '#3b82f6';
                    if(n.type === 'warning') color = '#f59e0b';
                    if(n.type === 'error') color = '#ef4444';
                    if(n.type === 'success') color = '#10b981';
                    
                    html += `
                        <div style="padding:10px 12px; background:${color}10; border-left:4px solid ${color}; border-radius:4px 8px 8px 4px;">
                            <div style="font-weight:700; font-size:0.85rem; color:var(--text-main); margin-bottom:4px;">${n.title}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.4;">${n.message}</div>
                            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:6px; opacity:0.7;">${new Date(n.created_at).toLocaleString('nl-NL')}</div>
                        </div>
                    `;
                });
            }
            html += `</div>`;
            return html;
        },
        init_sys_notices: function(el, data, instanceId) {}
    };

})();