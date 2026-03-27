// Pad: public/js/modules/slideshow/EditorProperties.js

/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Slideshow | FILE: public/js/modules/slideshow/EditorProperties.js */

(function() {
    if (!window.EditorCore) return;

    Object.assign(window.EditorCore.prototype, {
        
        getAccordionState(accId, def) {
            let s = this.data?.slideshow?.settings;
            if (typeof s === 'string') { try { s = JSON.parse(s); } catch(e) { s = {}; } }
            if (s && s.ui_state && s.ui_state[accId] !== undefined) {
                return s.ui_state[accId] ? 'open' : '';
            }
            return def;
        },
        
        setAccordionState(accId, isOpen) {
            if (!this.data || !this.data.slideshow) return;
            let s = this.data.slideshow.settings || {};
            if (typeof s === 'string') { try { s = JSON.parse(s); } catch(e) { s = {}; } }
            if (!s.ui_state) s.ui_state = {};
            s.ui_state[accId] = isOpen;
            this.data.slideshow.settings = s;
        },

        applyToAllItems(propPath, value, successMsg) {
            if (!this.data || !this.data.items || this.isReadOnly) return;
            let changed = 0;
            
            this.data.items.forEach(item => {
                if (propPath.startsWith('settings.')) {
                    if (typeof item.settings === 'string') {
                        try { item.settings = JSON.parse(item.settings); } catch(e) { item.settings = {}; }
                    }
                    if (!item.settings) item.settings = {};
                    
                    const subProp = propPath.split('.')[1];
                    item.settings[subProp] = value;
                } else {
                    item[propPath] = value;
                }
                this.pendingDeltaItems.set(item.id, item);
                changed++;
            });
            
            if (changed > 0) {
                if (this.triggerAutoSave) this.triggerAutoSave(successMsg || `Aangepast voor alle dia's`, true);
                this.renderUI();
                if (window.EventBus) window.EventBus.emit('notify:success', `Toegepast op alle ${changed} dia's!`);
            }
        },

        showLogoPicker(onSelect) {
            const pngItems = this.data.items.filter(i => {
                return (i.extension && i.extension.toLowerCase() === 'png') || 
                       (i.mime_type && i.mime_type.toLowerCase().includes('png'));
            });

            if (pngItems.length === 0) {
                if (window.EventBus) window.EventBus.emit('notify:warning', 'Voeg eerst een PNG-afbeelding toe aan de slideshow via "Media Toevoegen".');
                return;
            }

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px); font-family: "Inter", sans-serif;';
            
            let html = `
            <div style="background:var(--bg-main, #ffffff); padding:24px; border-radius:12px; width:90%; max-width:600px; box-shadow:0 25px 50px rgba(0,0,0,0.5);">
                <h3 style="margin:0 0 16px 0; color:var(--text-main, #000); font-size:1.2rem; font-weight:800;">Kies een PNG Logo</h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Kies een logo uit de bestanden die al in deze slideshow zitten.</p>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:12px; max-height:50vh; overflow-y:auto; padding-bottom:12px;">
            `;
            
            pngItems.forEach(item => {
                const url = this.getItemUrl ? this.getItemUrl(item) : `/api/files?action=download&id=${item.file_id}`;
                html += `
                <div class="logo-picker-item" data-id="${item.file_id}" style="cursor:pointer; border:2px solid rgba(128,128,128,0.2); border-radius:8px; overflow:hidden; background:var(--bg-surface, #f8fafc); padding:8px; text-align:center; transition:0.2s;">
                    <img src="${url}" style="width:100%; height:80px; object-fit:contain; margin-bottom:8px;">
                    <div style="font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600;">${item.original_name}</div>
                </div>`;
            });
            
            html += `
                </div>
                <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                    <button class="ss-btn-secondary btn-close-logo-picker" style="padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Annuleren</button>
                </div>
            </div>`;
            
            overlay.innerHTML = html;
            document.body.appendChild(overlay);
            
            overlay.querySelector('.btn-close-logo-picker').onclick = () => overlay.remove();
            
            overlay.querySelectorAll('.logo-picker-item').forEach(item => {
                item.onclick = () => {
                    onSelect(item.dataset.id);
                    overlay.remove();
                };
                item.onmouseenter = () => item.style.borderColor = 'var(--primary, #3b82f6)';
                item.onmouseleave = () => item.style.borderColor = 'rgba(128,128,128,0.2)';
            });
        },

        renderProperties() {
            const container = document.getElementById('ss-prop-content');
            if (!container) return;

            const customStyles = `
                <style>
                    .clean-card { border-color: transparent !important; background: transparent !important; box-shadow: none !important; padding: 2px !important; margin: 0 !important; min-height: 0; }
                    .clean-card.active .ss-card-preview { border-color: var(--primary) !important; box-shadow: 0 0 0 2px var(--primary) !important; }
                    .clean-card .ss-card-preview { border: 2px solid transparent; transition: 0.2s; border-radius: 6px; overflow: hidden; padding: 0 !important; background: transparent; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; }
                    .clean-card .ss-card-label { font-size: 0.7rem; margin-top: 6px; font-weight: 600; text-align: center; }
                    .ss-compact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 8px; margin-top: 12px; }
                    
                    .btn-apply-all { font-size: 10px; color: var(--primary); background: rgba(37,99,235,0.1); border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; transition: 0.2s; font-weight: 600; white-space: nowrap; }
                    .btn-apply-all:hover { background: rgba(37,99,235,0.2); }
                </style>
            `;

            const ensureSettingsObject = (item) => {
                if (typeof item.settings === 'string') {
                    try { item.settings = JSON.parse(item.settings); } catch(e) { item.settings = {}; }
                }
                if (!item.settings) item.settings = {};
            };

            const ensureGlobalSettingsObject = () => {
                if (typeof this.data.slideshow.settings === 'string') {
                    try { this.data.slideshow.settings = JSON.parse(this.data.slideshow.settings); } catch(e) { this.data.slideshow.settings = {}; }
                }
                if (!this.data.slideshow.settings) this.data.slideshow.settings = {};
            };

            const buildMsGallery = (items, propPath, currentVal, isGlobal = false) => {
                let html = `<div class="ms-gallery">`;
                items.forEach(i => {
                    if (i.val === 'auto' && i.hideInGallery) return; 
                    const isActive = currentVal === i.val ? 'active' : '';
                    const propAttr = isGlobal ? `data-global-prop="${propPath}"` : `data-prop="${propPath}"`;
                    html += `
                        <div class="ms-gallery-item ss-visual-card ${isActive}" ${propAttr} data-value="${i.val}">
                            <div class="preview">${i.html || ''}</div>
                            <div class="lbl">${i.shortName || i.name}</div>
                        </div>
                    `;
                });
                html += `</div>`;
                return html;
            };

            if (this.activeTab === 'properties') {
                if (this.selectedIndices.length === 0) {
                    container.innerHTML = `<div style="opacity:0.5; text-align:center; padding-top:40px;">Kies eerst dias om effecten in te stellen.</div>`;
                    return;
                }

                const referenceItem = this.data.items[this.selectedIndices[0]];
                if (!referenceItem) return;
                
                ensureSettingsObject(referenceItem);
                
                const isVideo = referenceItem.mime_type && referenceItem.mime_type.startsWith('video');
                const isMulti = this.selectedIndices.length > 1;

                const durations = [
                    {val:'auto', name:'Auto', shortName:'Auto', hideInGallery: !isVideo, html: '<span style="font-weight:bold; color:#fff; font-size:12px;">Auto</span>'}, 
                    {val:3, name:'3 sec', shortName:'3s', html: '<span style="font-weight:bold; color:#fff; font-size:12px;">3s</span>'}, 
                    {val:5, name:'5 sec', shortName:'5s', html: '<span style="font-weight:bold; color:#fff; font-size:12px;">5s</span>'}, 
                    {val:10, name:'10 sec', shortName:'10s', html: '<span style="font-weight:bold; color:#fff; font-size:12px;">10s</span>'}, 
                    {val:15, name:'15 sec', shortName:'15s', html: '<span style="font-weight:bold; color:#fff; font-size:12px;">15s</span>'}, 
                    {val:30, name:'30 sec', shortName:'30s', html: '<span style="font-weight:bold; color:#fff; font-size:12px;">30s</span>'}
                ];
                let durHtml = '';
                durations.forEach(d => {
                    if (d.val === 'auto' && !isVideo) return;
                    const currentDur = referenceItem.duration === 'auto' || !referenceItem.duration ? 'auto' : referenceItem.duration;
                    const isActive = currentDur == d.val ? 'active' : '';
                    durHtml += `<div class="ss-visual-card clean-card ${isActive}" data-prop="duration" data-value="${d.val}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                        <div class="ss-card-preview" style="font-size:1rem; font-weight:700;">${d.name}</div>
                    </div>`;
                });

                const fits = [
                    {val:'contain', name:'Vervaagd', shortName:'Vervaagd', html:'<div style="width:100%; height:100%; position:relative; overflow:hidden; background:#1e293b;"><div style="position:absolute; inset:-5px; background:linear-gradient(45deg, #3b82f6, #10b981); filter:blur(4px); opacity:0.6;"></div><div style="position:absolute; inset:20%; background:#1e293b; border-radius:2px; box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div></div>'}, 
                    {val:'contain_color', name:'Kleur', shortName:'Kleur', html:'<div style="width:100%; height:100%; position:relative; background:#1e293b; display:flex; align-items:center; justify-content:center;"><div style="width:40%; height:40%; background:#facc15; border-radius:2px;"></div></div>'}, 
                    {val:'contain_anim', name:'Animatie', shortName:'Animatie', html:'<div style="width:100%; height:100%; position:relative; background:linear-gradient(135deg, #8b5cf6, #d946ef); display:flex; align-items:center; justify-content:center; overflow:hidden;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,255,255,0.8)"></polygon></svg></div>'},
                    {val:'cover', name:'Vullend', shortName:'Vullend', html:'<div style="width:100%; height:100%; background:linear-gradient(45deg, #3b82f6, #10b981);"></div>'},
                    {val:'tile', name:'Tegels', shortName:'Tegels', html:'<div style="width:100%; height:100%; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:2px; background:#000;"><div style="background:#3b82f6;"></div><div style="background:#10b981;"></div><div style="background:#facc15;"></div><div style="background:#ef4444;"></div></div>'}
                ];
                let fitHtml = '';
                fits.forEach(f => {
                    const isActive = (referenceItem.fit_mode || 'contain') === f.val ? 'active' : '';
                    fitHtml += `<div class="ss-visual-card clean-card ${isActive}" data-prop="fit_mode" data-value="${f.val}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                        <div class="ss-card-preview">${f.html}</div>
                        <div class="ss-card-label">${f.name}</div>
                    </div>`;
                });

                const frames = [
                    {val: 'none', name: 'Naadloos', shortName:'Geen', html: '<div style="width:60%; height:60%; background:var(--primary);"></div>'},
                    {val: 'classic', name: 'Klassiek', shortName:'Klassiek', html: '<div style="width:60%; height:60%; background:var(--primary); border:4px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.5);"></div>'},
                    {val: 'rounded', name: 'Afgerond', shortName:'Rond', html: '<div style="width:60%; height:60%; background:var(--primary); border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.5);"></div>'},
                    {val: 'polaroid', name: 'Polaroid', shortName:'Polaroid', html: '<div style="width:60%; height:60%; background:var(--primary); border:4px solid #fff; border-bottom-width:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5);"></div>'}
                ];
                let frameDiaHtml = '';
                frames.forEach(f => {
                    const isActive = referenceItem.settings.frame_style === f.val ? 'active' : '';
                    frameDiaHtml += `<div class="ss-visual-card clean-card ${isActive}" data-prop="settings.frame_style" data-value="${f.val}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                        <div class="ss-card-preview" style="background:#1e293b;">${f.html}</div>
                        <div class="ss-card-label">${f.name}</div>
                    </div>`;
                });

                let colorInputHtml = ''; let animSelectHtml = ''; let tileSelectHtml = ''; let msContextHtml = '';
                let colorHtml = ''; let animHtml = ''; let tileHtml = '';
                const currentFitMode = referenceItem.fit_mode || 'contain';

                if (currentFitMode === 'contain_color') {
                    let currentColor = referenceItem.background_color || '#000000';
                    let isGradient = currentColor.includes('gradient');
                    
                    colorInputHtml = `
                        <div style="display:flex; gap:8px; margin-top:4px;">
                            ${isGradient 
                                ? `<input type="text" class="ss-input select-no-render" data-prop="background_color" value="${currentColor}" placeholder="bijv. linear-gradient(45deg, red, blue)" style="flex:1; padding:4px 8px; font-size:0.8rem; height:36px;" ${this.isReadOnly ? 'disabled' : ''}>`
                                : `<input type="color" class="ss-input select-no-render" data-prop="background_color" value="${currentColor}" style="padding:4px; height:36px; cursor:pointer; flex:1;" ${this.isReadOnly ? 'disabled' : ''}>`
                            }
                            <button id="btn-toggle-gradient" class="ss-btn-secondary" style="padding:0 12px; font-size:0.8rem;" ${this.isReadOnly ? 'disabled' : ''} title="Wissel tussen effen kleur en gradient">${isGradient ? 'Wissel naar Kleur' : 'Kies Gradient'}</button>
                        </div>
                    `;
                    colorHtml = `<div style="margin-top:16px;"><label class="ss-label" style="display:flex; justify-content:space-between; margin-bottom:4px;">Kies Achtergrondkleur <button id="btn-apply-all-bg" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button></label>${colorInputHtml}</div>`;
                    
                    msContextHtml = `<div class="ms-row"><label>Kleur</label><input type="text" class="ms-input select-no-render" data-prop="background_color" value="${currentColor}" ${this.isReadOnly ? 'disabled' : ''} style="width:100px; padding:4px;"></div>`;
                } else if (currentFitMode === 'contain_anim') {
                    let bgOptions = '<option value="">-- Globale achtergrond --</option>';
                    this.data.dictionaries.backgrounds.forEach(b => {
                        const currentBg = referenceItem.override_background_id || null;
                        bgOptions += `<option value="${b.id}" ${currentBg == b.id ? 'selected' : ''}>${b.name}</option>`;
                    });
                    animSelectHtml = `<select class="ss-select select-no-render" data-prop="override_background_id" ${this.isReadOnly ? 'disabled' : ''} style="padding:6px; font-size:0.8rem;">${bgOptions}</select>`;
                    animHtml = `<div class="ss-form-group" style="margin-top:16px;"><label class="ss-label" style="display:flex; justify-content:space-between;">Geanimeerde Achtergrond <button id="btn-apply-all-anim" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button></label>${animSelectHtml}</div>`;
                    msContextHtml = `<div class="ms-row"><label>Animatie</label><select class="ms-select select-no-render" data-prop="override_background_id" ${this.isReadOnly ? 'disabled' : ''} style="width:100px;">${bgOptions}</select></div>`;
                } else if (currentFitMode === 'tile') {
                    const currentSize = referenceItem.settings.tile_size || 'md';
                    const opts = `<option value="sm" ${currentSize === 'sm' ? 'selected' : ''}>Klein</option><option value="md" ${currentSize === 'md' ? 'selected' : ''}>Normaal</option><option value="lg" ${currentSize === 'lg' ? 'selected' : ''}>Groot</option>`;
                    tileSelectHtml = `<select class="ss-select select-no-render" data-prop="settings.tile_size" ${this.isReadOnly ? 'disabled' : ''} style="padding:6px; font-size:0.8rem;">${opts}</select>`;
                    tileHtml = `<div class="ss-form-group" style="margin-top:16px;"><label class="ss-label">Tegel Grootte</label>${tileSelectHtml}</div>`;
                    msContextHtml = `<div class="ms-row"><label>Grootte</label><select class="ms-select select-no-render" data-prop="settings.tile_size" ${this.isReadOnly ? 'disabled' : ''} style="width:100px;">${opts}</select></div>`;
                }

                let hasCrop = false;
                if (referenceItem.crop_w !== null && referenceItem.crop_w !== undefined) hasCrop = true;
                if (referenceItem.focus_x !== null && referenceItem.focus_x !== undefined) hasCrop = true;
                if (referenceItem.filter_brightness !== undefined && referenceItem.filter_brightness != 100) hasCrop = true;
                if (referenceItem.filter_contrast !== undefined && referenceItem.filter_contrast != 100) hasCrop = true;
                if (referenceItem.filter_saturate !== undefined && referenceItem.filter_saturate != 100) hasCrop = true;
                if (referenceItem.transform_rotate !== undefined && referenceItem.transform_rotate != 0) hasCrop = true;
                if (referenceItem.transform_flip_x !== undefined && referenceItem.transform_flip_x != 1) hasCrop = true;

                let cropHtml = '';
                if (!isVideo) {
                    cropHtml = `
                        <div class="ss-form-group" style="margin-top:16px;">
                            <label class="ss-label">Foto Editor</label>
                            <div style="display:flex; gap:8px;">
                                <button class="ss-btn-outline" id="btn-open-cropper" style="flex:1; padding:6px; font-size:0.8rem; border-color:var(--primary); color:var(--primary);" ${this.isReadOnly ? 'disabled' : ''}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Bewerken & Focus
                                </button>
                                ${hasCrop ? `<button class="ss-btn-outline" id="btn-reset-crop" style="padding:6px 10px; font-size:0.8rem; border-color:var(--danger); color:var(--danger);" title="Bewerkingen Resetten" ${this.isReadOnly ? 'disabled' : ''}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
                            </div>
                        </div>
                    `;
                }

                const filters = [
                    {val:'none', name:'Normaal', shortName:'Geen', css:''},
                    {val:'grayscale', name:'Zwart/Wit', shortName:'B/W', css:'filter:grayscale(100%);'},
                    {val:'sepia', name:'Sepia', shortName:'Sepia', css:'filter:sepia(100%);'},
                    {val:'contrast', name:'Contrast+', shortName:'Contr.', css:'filter:contrast(150%) saturate(120%);'}
                ];
                let filterHtml = '';
                filters.forEach(f => {
                    const currentFilt = referenceItem.image_filter || 'none';
                    const isActive = currentFilt === f.val ? 'active' : '';
                    const fIcon = `<div style="width:100%; height:100%; background:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzNiODJmNiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Q5NDZlZiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48Y2lyY2xlIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjIwJSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iMC44Ii8+PC9zdmc+') center/cover; ${f.css}"></div>`;
                    f.html = fIcon; 
                    
                    filterHtml += `<div class="ss-visual-card clean-card ${isActive}" data-prop="image_filter" data-value="${f.val}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                        <div class="ss-card-preview">${fIcon}</div>
                        <div class="ss-card-label">${f.name}</div>
                    </div>`;
                });

                let transOptions = '<option value="">-- Geen / Gebruik globaal --</option>';
                this.data.dictionaries.transitions.forEach(t => {
                    transOptions += `<option value="${t.id}" data-css="${t.css_class}" ${referenceItem.transition_id == t.id ? 'selected' : ''}>${t.name}</option>`;
                });
                
                let headerHtml = isMulti 
                    ? `<h4 style="margin:0 0 4px 0; font-size:1rem; color:var(--text-main); font-weight:800;">${this.selectedIndices.length} Dias Geselecteerd</h4><div style="font-size:0.75rem; color:var(--text-muted);">Massa wijziging actief</div>`
                    : `<h4 style="margin:0 0 4px 0; font-size:1rem; color:var(--text-main); font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${referenceItem.original_name}</h4><div style="font-size:0.75rem; font-weight:600; color:var(--primary); background:rgba(37,99,235,0.1); display:inline-block; padding:2px 6px; border-radius:4px;">Dia ${this.selectedIndices[0] + 1} van ${this.data.items.length}</div>`;

                const stOverr = this.getAccordionState('overr', 'open');
                const stZicht = this.getAccordionState('zicht', 'open');
                const stEff   = this.getAccordionState('eff', 'open');

                let clockOverrideOpts = '<option value="">-- Gebruik TV Standaard --</option><option value="0">Verberg Klok</option>';
                this.data.dictionaries.clocks.forEach(c => {
                    clockOverrideOpts += `<option value="${c.id}" ${referenceItem.override_clock_id == c.id ? 'selected' : ''}>${c.name}</option>`;
                });

                const linkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--warning); margin-left:4px;" title="Afwijkend van globale TV instelling"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

                const sidebarLayout = `
                    ${customStyles}
                    <div style="margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid rgba(128,128,128,0.15);">
                        ${headerHtml}
                    </div>

                    <div class="ss-accordion ${stOverr}" data-acc="overr">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> Uitzonderingen (Lokaal)</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            <div style="font-size:0.8rem; color:var(--text-muted); margin:12px 0;">Overschrijf de globale TV instellingen, specifiek voor deze selectie.</div>
                            
                            <div class="ss-form-group">
                                <label class="ss-label" style="display:flex; justify-content:space-between;">
                                    <span style="display:flex; align-items:center;">Media Schaal ${referenceItem.media_scale !== null && referenceItem.media_scale !== undefined ? linkIcon : ''}</span>
                                    <span id="dia-scale-val-display" style="color:var(--primary); font-size:0.9rem;">${referenceItem.media_scale !== null && referenceItem.media_scale !== undefined ? Math.round(referenceItem.media_scale * 100) + '%' : 'Standaard'}</span>
                                </label>
                                <input type="range" class="ss-input" data-dia-scale-slider="true" min="0.5" max="1.0" step="0.05" value="${referenceItem.media_scale !== null && referenceItem.media_scale !== undefined ? referenceItem.media_scale : (this.data.slideshow.settings.media_scale || 0.85)}" ${this.isReadOnly ? 'disabled' : ''} style="padding:0; height:4px; appearance:none; outline:none; border-radius:2px; width:100%; background:rgba(128,128,128,0.2);">
                                <div style="text-align:right; margin-top:4px;">
                                    <button class="ss-btn-outline" id="btn-reset-dia-scale" style="padding:2px 8px; font-size:0.7rem;">Reset</button>
                                </div>
                            </div>
                            
                            <label class="ss-label" style="display:flex; align-items:center; justify-content:space-between;">
                                <span>Frame Stijl (Randen) ${referenceItem.settings.frame_style ? linkIcon : ''}</span>
                                <button id="btn-apply-all-frame" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button>
                            </label>
                            
                            <div class="ss-visual-grid cols-2" style="margin-bottom:16px;">
                                <div class="ss-visual-card clean-card ${!referenceItem.settings.frame_style ? 'active' : ''}" data-prop="settings.frame_style" data-value="" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                                    <div class="ss-card-preview" style="background:transparent; border: 2px dashed rgba(128,128,128,0.5); color:var(--text-muted); font-size:0.7rem;">TV Standaard</div>
                                </div>
                                ${frameDiaHtml}
                            </div>

                            <div class="ss-form-group">
                                <label class="ss-label" style="display:flex; align-items:center;">Klok Verbergen of Wijzigen ${referenceItem.override_clock_id !== null && referenceItem.override_clock_id !== undefined ? linkIcon : ''}</label>
                                <select class="ss-select select-no-render" data-prop="override_clock_id" ${this.isReadOnly ? 'disabled' : ''}>
                                    ${clockOverrideOpts}
                                </select>
                            </div>
                            
                            <div class="ss-toggle-row">
                                <span class="ss-toggle-label" style="display:flex; align-items:center;">Watermerk Verbergen ${referenceItem.override_watermark === 0 ? linkIcon : ''}</span>
                                <label class="apple-toggle">
                                    <input type="checkbox" data-prop="override_watermark_hide" ${referenceItem.override_watermark === 0 ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                    <span class="apple-toggle-slider"></span>
                                </label>
                            </div>

                            <div class="ss-toggle-row">
                                <span class="ss-toggle-label">Koppel aan Volgende Dia (Split)</span>
                                <label class="apple-toggle">
                                    <input type="checkbox" data-prop="settings.dual_link" ${referenceItem.settings.dual_link ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                    <span class="apple-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="ss-accordion ${stZicht}" data-acc="zicht">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Weergave & Tijd</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            <label class="ss-label" style="margin-top:8px; display:flex; justify-content:space-between;">
                                <span>Toonduur</span>
                                <button id="btn-apply-all-dur" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button>
                            </label>
                            <div class="ss-visual-grid cols-3" style="margin-bottom:16px;">${durHtml}</div>

                            <label class="ss-label" style="display:flex; justify-content:space-between;">
                                <span>Achtergrond & Inpassen</span>
                                <button id="btn-apply-all-fit" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button>
                            </label>
                            <div class="ss-visual-grid cols-2" style="margin-bottom:16px;">${fitHtml}</div>
                            ${colorHtml}
                            ${animHtml}
                            ${tileHtml}
                            ${cropHtml}
                            
                            <div class="ss-toggle-row" style="margin-top:16px;">
                                <span class="ss-toggle-label">Tijdsbalk Verbergen (Alleen deze dia)</span>
                                <label class="apple-toggle">
                                    <input type="checkbox" data-prop="settings.hide_progress" ${referenceItem.settings.hide_progress ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                    <span class="apple-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="ss-accordion ${stEff}" data-acc="eff">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Visuele Effecten</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            <div class="ss-form-group" style="margin-top:8px;">
                                <label class="ss-label" style="display:flex; justify-content:space-between;">
                                    <span>Specifieke Overgang</span>
                                    <button id="btn-apply-all-trans" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button>
                                </label>
                                <select class="ss-select select-no-render" data-prop="transition_id" ${this.isReadOnly ? 'disabled' : ''}>
                                    ${transOptions}
                                </select>
                            </div>
                            
                            ${!isVideo ? `
                            <label class="ss-label" style="display:flex; justify-content:space-between;">
                                <span>Beeld Filters</span>
                                <button id="btn-apply-all-filter" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button>
                            </label>
                            <div class="ss-visual-grid cols-2" style="margin-bottom:16px;">${filterHtml}</div>
                            
                            <div class="ss-form-group" style="margin-top:16px;">
                                <label class="ss-label" style="display:flex; justify-content:space-between;">
                                    <span>Ken-Burns (Camera Zoom)</span>
                                    <button id="btn-apply-all-kenburns" class="btn-apply-all" ${this.isReadOnly ? 'disabled' : ''}>Kopieer naar Alles</button>
                                </label>
                                <select class="ss-select select-no-render" data-prop="settings.kenburns" ${this.isReadOnly ? 'disabled' : ''} style="padding:6px; font-size:0.8rem;">
                                    <option value="none" ${!referenceItem.settings.kenburns || referenceItem.settings.kenburns === 'none' ? 'selected' : ''}>Uitgeschakeld</option>
                                    <option value="slow" ${referenceItem.settings.kenburns === 'slow' ? 'selected' : ''}>Subtiel / Traag</option>
                                    <option value="normal" ${referenceItem.settings.kenburns === 'normal' || referenceItem.settings.kenburns === true ? 'selected' : ''}>Normaal</option>
                                    <option value="fast" ${referenceItem.settings.kenburns === 'fast' ? 'selected' : ''}>Dynamisch / Snel</option>
                                </select>
                            </div>
                            ` : `
                            <div class="ss-toggle-row">
                                <span class="ss-toggle-label">Mute Video (Speel Radio door)</span>
                                <label class="apple-toggle">
                                    <input type="checkbox" data-prop="settings.mute" ${referenceItem.settings.mute ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                    <span class="apple-toggle-slider"></span>
                                </label>
                            </div>
                            `}
                        </div>
                    </div>
                `;

                const currentDurRibbon = referenceItem.duration === 'auto' || !referenceItem.duration ? 'auto' : referenceItem.duration;
                const currentFitRibbon = referenceItem.fit_mode || 'contain';
                const currentFrameRibbon = referenceItem.settings.frame_style || '';
                const currentFiltRibbon = referenceItem.image_filter || 'none';

                const ribbonLayout = `
                    <div class="ms-ribbon-bar">
                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content" style="align-items:center; padding:0 8px;">
                                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                                    ${isMulti ? `
                                        <div style="font-size:24px; font-weight:800; color:var(--ms-primary); line-height:1;">${this.selectedIndices.length}</div>
                                        <div style="font-size:10px; color:var(--ms-text-muted); margin-top:4px;">Geselecteerd</div>
                                    ` : `
                                        <div style="font-size:16px; font-weight:700; color:var(--ms-primary);">Dia ${this.selectedIndices[0] + 1}</div>
                                        <div style="font-size:10px; color:var(--ms-text-muted); max-width:80px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${referenceItem.original_name}">${referenceItem.original_name}</div>
                                    `}
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Selectie</div>
                        </div>

                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                ${buildMsGallery(durations, 'duration', currentDurRibbon)}
                                <div class="ms-stack" style="padding-left:4px;">
                                    <label class="ms-check-row" title="Verberg de balk op deze specifieke dia">
                                        <input type="checkbox" data-prop="settings.hide_progress" ${referenceItem.settings.hide_progress ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                        <span>Geen Tijdsbalk</span>
                                    </label>
                                    <label class="ms-check-row" title="Koppel aan de volgende dia (Split Screen)">
                                        <input type="checkbox" data-prop="settings.dual_link" ${referenceItem.settings.dual_link ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                        <span>Koppel (Split)</span>
                                    </label>
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Tijd & Opties</div>
                        </div>

                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                ${buildMsGallery(fits, 'fit_mode', currentFitRibbon)}
                                ${msContextHtml ? `<div class="ms-stack" style="padding-left:4px; justify-content:center;">${msContextHtml}</div>` : ''}
                            </div>
                            <div class="ms-ribbon-label">Inpassen</div>
                        </div>
                        
                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                <div class="ms-gallery">
                                    <div class="ms-gallery-item ss-visual-card ${!referenceItem.settings.frame_style ? 'active' : ''}" data-prop="settings.frame_style" data-value="" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                                        <div class="preview" style="border:1px dashed #666; background:transparent;"></div>
                                        <div class="lbl">Standaard</div>
                                    </div>
                                </div>
                                ${buildMsGallery(frames, 'settings.frame_style', currentFrameRibbon)}
                            </div>
                            <div class="ms-ribbon-label">Randen & Frames</div>
                        </div>

                        ${!isVideo ? `
                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                <button id="btn-open-cropper-ribbon" class="ms-btn-large" ${this.isReadOnly ? 'disabled' : ''}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    <span>Bijsnijden</span>
                                </button>
                                ${hasCrop ? `
                                <div class="ms-stack" style="justify-content:center; padding-left:4px;">
                                    <button id="btn-reset-crop-ribbon" class="ms-btn-small" style="color:var(--danger); border-color:var(--danger);" title="Herstel uitsnede">Herstellen</button>
                                </div>` : ''}
                            </div>
                            <div class="ms-ribbon-label">Foto Editor</div>
                        </div>
                        ` : ''}

                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                ${!isVideo ? buildMsGallery(filters, 'image_filter', currentFiltRibbon) : ''}
                                <div class="ms-stack" style="min-width:140px; padding-left:4px;">
                                    <div class="ms-row">
                                        <label>Overgang</label>
                                        <select class="ms-select select-no-render" data-prop="transition_id" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">${transOptions}</select>
                                    </div>
                                    ${!isVideo ? `
                                    <div class="ms-row" style="margin-top:4px;">
                                        <label>Ken-Burns</label>
                                        <select class="ms-select select-no-render" data-prop="settings.kenburns" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">
                                            <option value="none" ${!referenceItem.settings.kenburns || referenceItem.settings.kenburns === 'none' ? 'selected' : ''}>Uit</option>
                                            <option value="slow" ${referenceItem.settings.kenburns === 'slow' ? 'selected' : ''}>Traag</option>
                                            <option value="normal" ${referenceItem.settings.kenburns === 'normal' || referenceItem.settings.kenburns === true ? 'selected' : ''}>Normaal</option>
                                            <option value="fast" ${referenceItem.settings.kenburns === 'fast' ? 'selected' : ''}>Snel</option>
                                        </select>
                                    </div>` : `
                                    <label class="ms-check-row" style="margin-top:4px;">
                                        <input type="checkbox" data-prop="settings.mute" ${referenceItem.settings.mute ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                        <span>Mute Video</span>
                                    </label>`}
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Effecten</div>
                        </div>
                        
                        <div class="ms-ribbon-group" style="border:none;">
                            <div class="ms-ribbon-content">
                                <div class="ms-stack" style="min-width:160px; justify-content:center;">
                                    <div class="ms-row">
                                        <label>Klok</label>
                                        <select class="ms-select select-no-render" data-prop="override_clock_id" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">${clockOverrideOpts}</select>
                                    </div>
                                    <label class="ms-check-row" style="margin-top:4px;">
                                        <input type="checkbox" data-prop="override_watermark_hide" ${referenceItem.override_watermark === 0 ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                        <span>Verberg Watermerk / Logo</span>
                                    </label>
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Overlay Uitzonderingen</div>
                        </div>
                    </div>
                `;

                container.innerHTML = this.isRibbon ? ribbonLayout : sidebarLayout;

                if (!this.isRibbon) {
                    container.querySelectorAll('.ss-accordion-header').forEach(header => {
                        header.onclick = () => {
                            const acc = header.parentElement;
                            acc.classList.toggle('open');
                            this.setAccordionState(acc.dataset.acc, acc.classList.contains('open'));
                        };
                    });
                }

                const applyToSelected = (propPath, val) => {
                    let changed = 0;
                    setTimeout(() => {
                        this.selectedIndices.forEach(idx => {
                            const item = this.data.items[idx];
                            if (!item) return;
                            
                            if (propPath === 'override_watermark_hide') {
                                item.override_watermark = val === 1 ? 0 : null; 
                            } else if (propPath === 'override_clock_id') {
                                // FASE 1 FIX: Zorg dat de klok override opslaat als "Verbergen" of Specifiek ID
                                item.override_clock_id = val === '' ? null : (val == 0 ? 0 : parseInt(val));
                            } else if (propPath.startsWith('settings.')) {
                                ensureSettingsObject(item);
                                const subProp = propPath.split('.')[1];
                                item.settings[subProp] = val;
                            } else {
                                item[propPath] = val;
                            }
                            this.pendingDeltaItems.set(item.id, item);
                            changed++;
                        });
                        
                        const actionName = propPath.replace('settings.', '');
                        if (this.triggerAutoSave) {
                            this.triggerAutoSave(`Heeft ${actionName} gewijzigd voor ${changed} dias.`, true); 
                        }
                    }, 10);
                };

                container.querySelectorAll('.ss-select, .ms-select, .ms-input:not([type="range"]), .ss-input:not([type="range"]), input[type="checkbox"]').forEach(el => {
                    if(el.dataset.prop) {
                        el.onchange = () => {
                            const propPath = el.dataset.prop;
                            let val = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value; 
                            
                            if (val === '') {
                                val = null;
                            } else if (val !== null && typeof val === 'string' && !isNaN(val) && propPath !== 'background_color' && propPath !== 'settings.focal_point' && propPath !== 'image_filter' && propPath !== 'settings.frame_style' && propPath !== 'settings.kenburns' && propPath !== 'override_clock_id') {
                                val = Number(val);
                            }
                            
                            applyToSelected(propPath, val);
                            
                            if (propPath === 'transition_id' && val !== null) {
                                const selectedOption = el.options[el.selectedIndex];
                                if (this.triggerPreviewAnimation) this.triggerPreviewAnimation(selectedOption.dataset.css);
                            }
                            
                            if (!el.classList.contains('select-no-render')) {
                                if (this.renderSidebar) this.renderSidebar(); 
                            }
                            if (this.renderPreview) this.renderPreview();
                        };
                    }
                });

                const diaScaleSlider = container.querySelector('input[data-dia-scale-slider]');
                if (diaScaleSlider) {
                    diaScaleSlider.oninput = (e) => {
                        const val = parseFloat(e.target.value);
                        const display = document.getElementById('dia-scale-val-display');
                        if (display) display.innerText = Math.round(val * 100) + '%';
                        this.selectedIndices.forEach(idx => {
                            const item = this.data.items[idx];
                            if (item) item.media_scale = val;
                        });
                        if (this.renderPreview) this.renderPreview();
                    };
                    diaScaleSlider.onchange = (e) => {
                        applyToSelected('media_scale', parseFloat(e.target.value));
                    };
                }
                
                const btnResetScale = container.querySelector('#btn-reset-dia-scale');
                if (btnResetScale) {
                    btnResetScale.onclick = () => {
                        applyToSelected('media_scale', null);
                        this.renderProperties();
                        if (this.renderPreview) this.renderPreview();
                    };
                }

                if (!this.isReadOnly) {
                    container.querySelectorAll('.ss-visual-card').forEach(card => {
                        if(card.dataset.prop) {
                            card.onclick = () => {
                                card.parentElement.querySelectorAll('.ss-visual-card').forEach(c => c.classList.remove('active'));
                                card.classList.add('active');

                                const propPath = card.dataset.prop;
                                let val = card.dataset.value;
                                
                                if (val === 'null') {
                                    val = null;
                                } else if (val !== null && typeof val === 'string' && !isNaN(val) && propPath !== 'image_filter' && propPath !== 'settings.frame_style') {
                                    val = Number(val);
                                }

                                applyToSelected(propPath, val);
                                
                                if (propPath === 'fit_mode' || propPath === 'settings.frame_style') {
                                    this.renderProperties(); 
                                    if (this.renderSidebar) this.renderSidebar();
                                    if (this.renderPreview) this.renderPreview();
                                } else {
                                    if (this.renderSidebar) this.renderSidebar();
                                    if (this.renderPreview) this.renderPreview(); 
                                }
                            };
                        }
                    });

                    const bindAction = (btnId, handler) => {
                        const btn = container.querySelector(btnId);
                        if (btn) btn.onclick = handler;
                    };
                    
                    bindAction('#btn-apply-all-frame', () => this.applyToAllItems('settings.frame_style', referenceItem.settings.frame_style || null, "Randen toegepast op alle dia's"));
                    bindAction('#btn-apply-all-dur', () => this.applyToAllItems('duration', referenceItem.duration || 'auto', "Speelduur toegepast op alle dia's"));
                    bindAction('#btn-apply-all-fit', () => this.applyToAllItems('fit_mode', referenceItem.fit_mode || 'contain', "Inpassen toegepast op alle dia's"));
                    bindAction('#btn-apply-all-trans', () => this.applyToAllItems('transition_id', referenceItem.transition_id || null, "Overgang toegepast op alle dia's"));
                    bindAction('#btn-apply-all-filter', () => this.applyToAllItems('image_filter', referenceItem.image_filter || 'none', "Filter toegepast op alle dia's"));
                    bindAction('#btn-apply-all-kenburns', () => this.applyToAllItems('settings.kenburns', referenceItem.settings.kenburns || 'none', "Ken-Burns toegepast op alle dia's"));
                    bindAction('#btn-apply-all-bg', () => this.applyToAllItems('background_color', referenceItem.background_color || '#000000', "Achtergrondkleur toegepast op alle dia's"));
                    bindAction('#btn-apply-all-anim', () => this.applyToAllItems('override_background_id', referenceItem.override_background_id || null, "Animatie toegepast op alle dia's"));
                    
                    bindAction('#btn-toggle-gradient', () => {
                        const input = container.querySelector('input[data-prop="background_color"]');
                        if (!input) return;
                        
                        let currentVal = input.value;
                        let newVal = '';
                        
                        if (currentVal.includes('gradient')) {
                            newVal = '#1e293b'; 
                        } else {
                            newVal = `linear-gradient(45deg, ${currentVal}, #000000)`;
                        }
                        
                        applyToSelected('background_color', newVal);
                        this.renderProperties();
                        if (this.renderPreview) this.renderPreview();
                    });
                    
                    bindAction('#btn-open-cropper', () => {
                        if (window.EventBus) window.EventBus.emit('cropper:open', referenceItem);
                    });
                    bindAction('#btn-open-cropper-ribbon', () => {
                        if (window.EventBus) window.EventBus.emit('cropper:open', referenceItem);
                    });
                    
                    const resetCropHandler = () => {
                        let changed = 0;
                        this.selectedIndices.forEach(idx => {
                            const item = this.data.items[idx];
                            if (!item) return;
                            
                            item.crop_x = null;
                            item.crop_y = null;
                            item.crop_w = null;
                            item.crop_h = null;
                            item.focus_x = null;
                            item.focus_y = null;
                            item.filter_brightness = 100;
                            item.filter_contrast = 100;
                            item.filter_saturate = 100;
                            item.image_filter = 'none'; 
                            item.transform_rotate = 0;
                            item.transform_flip_x = 1;
                            item.transform_flip_y = 1;
                            
                            if (item.settings) {
                                item.settings.crop_data = null;
                                item.settings.focal_point = null;
                            }
                            
                            this.pendingDeltaItems.set(item.id, item);
                            changed++;
                        });
                        
                        if (this.triggerAutoSave) this.triggerAutoSave(`Foto bewerkingen hersteld voor ${changed} dia's.`, true);
                        if (this.renderPreview) this.renderPreview();
                        if (this.renderProperties) this.renderProperties();
                    };
                    bindAction('#btn-reset-crop', resetCropHandler);
                    bindAction('#btn-reset-crop-ribbon', resetCropHandler);
                }
            }

            // =================================================================================
            // TAB 2: SCHERM INSTELLINGEN (TV)
            // =================================================================================
            else if (this.activeTab === 'settings') {
                ensureGlobalSettingsObject();
                const s = this.data.slideshow;
                
                if (s.privacy === undefined) {
                    s.privacy = (s.password_hash || s.password_new || s.is_protected) ? 'password' : 'public';
                }
                
                let hasVideoActive = false;
                let videoItemsCount = 0;
                let inactiveVideosCount = 0;
                let activeCount = 0;
                let totalTime = 0;

                if (this.data.items) {
                    const videoItems = this.data.items.filter(i => i.mime_type && i.mime_type.startsWith('video'));
                    videoItemsCount = videoItems.length;
                    inactiveVideosCount = videoItems.filter(i => i.is_active == 0).length;
                    hasVideoActive = inactiveVideosCount < videoItemsCount;
                    
                    this.data.items.forEach(it => {
                        if(it.is_active == 1) {
                            activeCount++;
                            totalTime += (it.duration !== 'auto' && it.duration ? parseInt(it.duration) : 10);
                        }
                    });
                }
                
                const timeStr = totalTime > 60 ? Math.floor(totalTime/60) + ' min ' + (totalTime%60) + ' sec' : totalTime + ' sec';
                const totalViews = s.views || 0;
                
                let statsHtml = `
                    <div style="background: linear-gradient(145deg, var(--bg-surface, #ffffff), var(--bg-body, #f8fafc)); padding:20px; border-radius: 12px; border:1px solid var(--border-color); margin-top:32px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);">
                        <h4 style="margin:0 0 16px 0; font-size:1.15rem; color:var(--text-main); font-weight:800; display:flex; align-items:center; gap:8px;">
                            <div style="padding:6px; background:var(--primary); color:#fff; border-radius:8px; display:flex;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>
                            </div>
                            Presentatie Dashboard
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                            <div style="background:var(--bg-surface, #fff); padding:16px; border-radius:10px; text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border:1px solid rgba(128,128,128,0.1);">
                                <div style="font-size:26px; font-weight:900; color:var(--primary); line-height:1; font-family:monospace;">${totalViews}</div>
                                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-top:8px;">Kijkers</div>
                            </div>
                            <div style="background:var(--bg-surface, #fff); padding:16px; border-radius:10px; text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border:1px solid rgba(128,128,128,0.1);">
                                <div style="font-size:26px; font-weight:900; color:var(--primary); line-height:1; font-family:monospace;">${activeCount}</div>
                                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-top:8px;">Dia's Live</div>
                            </div>
                            <div style="background:var(--bg-surface, #fff); padding:16px; border-radius:10px; text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border:1px solid rgba(128,128,128,0.1);">
                                <div style="font-size:26px; font-weight:900; color:var(--primary); line-height:1; font-family:monospace;">${timeStr}</div>
                                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin-top:8px;">Speelduur</div>
                            </div>
                        </div>
                        <div style="margin-top:16px; font-size:11px; color:var(--text-muted); text-align:center; display:flex; align-items:center; justify-content:center; gap:6px;">
                            <span style="display:inline-block; width:8px; height:8px; background:var(--success); border-radius:50%; box-shadow: 0 0 8px var(--success);"></span>
                            Gegevens worden real-time verwerkt via de TV Speler
                        </div>
                    </div>
                `;

                const layouts = [
                    { id: 'full', name: 'Volledig', shortName: 'Vol', html: '<div style="width:100%; height:100%; background:var(--primary);"></div>' },
                    { id: 'split', name: 'Gesplitst', shortName: 'Split', html: '<div style="width:100%; height:100%; display:flex; gap:2px;"><div style="flex:1; background:var(--primary);"></div><div style="flex:1; background:var(--primary);"></div></div>' },
                    { id: 'pip', name: 'PiP', shortName: 'PiP', html: '<div style="width:100%; height:100%; background:var(--primary); position:relative;"><div style="position:absolute; bottom:10%; right:10%; width:30%; height:30%; background:#fff;"></div></div>' },
                    { id: 'grid', name: '4-Tegels', shortName: 'Grid', html: '<div style="width:100%; height:100%; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:2px;"><div style="background:var(--primary);"></div><div style="background:var(--primary);"></div><div style="background:var(--primary);"></div><div style="background:var(--primary);"></div></div>' },
                    { id: 'carousel', name: 'Carrousel', shortName: '3D', html: '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; gap:2px;"><div style="width:20%; height:60%; background:var(--primary); opacity:0.5;"></div><div style="width:40%; height:80%; background:var(--primary);"></div><div style="width:20%; height:60%; background:var(--primary); opacity:0.5;"></div></div>' }
                ];
                let layoutHtml = '';
                layouts.forEach(l => {
                    const isActive = (s.settings.layout || 'full') === l.id ? 'active' : '';
                    layoutHtml += `
                        <div class="ss-visual-card clean-card ${isActive}" data-global-prop="settings.layout" data-value="${l.id}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                            <div class="ss-card-preview" style="background:#1e293b; color:#fff; border:1px solid #333;">${l.html}</div>
                            <div class="ss-card-label">${l.name}</div>
                        </div>
                    `;
                });

                let scaleHtml = `
                    <div class="ss-form-group">
                        <label class="ss-label" style="display:flex; justify-content:space-between; align-items:center; margin-top:0;">
                            <span>Media Schaal (Globale instelling)</span>
                            <span id="scale-val-display" style="color:var(--primary); font-size:0.9rem;">${Math.round((s.settings.media_scale !== undefined ? s.settings.media_scale : 0.85) * 100)}%</span>
                        </label>
                        <input type="range" class="ss-input" data-scale-slider="true" min="0.5" max="1.0" step="0.05" value="${s.settings.media_scale !== undefined ? s.settings.media_scale : 0.85}" ${this.isReadOnly ? 'disabled' : ''} style="padding:0; height:4px; background:rgba(128,128,128,0.2); appearance:none; outline:none; border-radius:2px; width:100%;">
                    </div>
                `;
                
                const frames = [
                    {val: 'none', name: 'Naadloos', shortName:'Geen', html: '<div style="width:60%; height:60%; background:var(--primary);"></div>'},
                    {val: 'classic', name: 'Klassiek', shortName:'Klassiek', html: '<div style="width:60%; height:60%; background:var(--primary); border:4px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.5);"></div>'},
                    {val: 'rounded', name: 'Afgerond', shortName:'Rond', html: '<div style="width:60%; height:60%; background:var(--primary); border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.5);"></div>'},
                    {val: 'polaroid', name: 'Polaroid', shortName:'Polaroid', html: '<div style="width:60%; height:60%; background:var(--primary); border:4px solid #fff; border-bottom-width:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5);"></div>'}
                ];
                let frameHtml = '';
                frames.forEach(f => {
                    const isActive = (s.settings.frame_style || 'none') === f.val ? 'active' : '';
                    frameHtml += `
                        <div class="ss-visual-card clean-card ${isActive}" data-global-prop="settings.frame_style" data-value="${f.val}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                            <div class="ss-card-preview" style="background:#1e293b;">${f.html}</div>
                            <div class="ss-card-label">${f.name}</div>
                        </div>
                    `;
                });

                const currentLayout = s.settings.layout || 'full';
                let multiAnimSelectHtml = '';
                if (currentLayout === 'split' || currentLayout === 'pip' || currentLayout === 'grid') {
                    const currentMultiAnim = s.settings.multi_anim || 'sync';
                    multiAnimSelectHtml = `
                        <div class="ss-form-group" style="margin-top:12px;">
                            <label class="ss-label">Opbouw Effect</label>
                            <select class="ss-select" data-global="settings.multi_anim" ${this.isReadOnly ? 'disabled' : ''} style="padding:6px; font-size:0.8rem;">
                                <option value="sync" ${currentMultiAnim === 'sync' ? 'selected' : ''}>Tegelijkertijd</option>
                                <option value="sequence" ${currentMultiAnim === 'sequence' ? 'selected' : ''}>Na Elkaar</option>
                                <option value="cascade" ${currentMultiAnim === 'cascade' ? 'selected' : ''}>Waterval</option>
                                <option value="spotlight" ${currentMultiAnim === 'spotlight' ? 'selected' : ''}>Spotlight Fade</option>
                                <option value="spotlight_3d" ${currentMultiAnim === 'spotlight_3d' ? 'selected' : ''}>Spotlight 3D</option>
                            </select>
                        </div>
                    `;
                } else if (currentLayout === 'carousel') {
                     multiAnimSelectHtml = `<div style="font-size:0.75rem; color:var(--text-muted); padding:6px; background:rgba(128,128,128,0.05); border-radius:6px;">Vast 3D Effect</div>`;
                }

                let radioHtml = `
                    <div class="ss-visual-card clean-card ${!s.radio_station_id ? 'active' : ''}" data-global-prop="radio_station_id" data-value="null" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                        <div class="ss-card-preview" style="background:#f8fafc; color:#94a3b8;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M9 9v11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9"></path></svg></div>
                        <div class="ss-card-label">Geen</div>
                    </div>
                `;
                const radioObjects = [{val:null, name:'Geen Audio', shortName:'Geen', html:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M9 9v11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9"></path></svg>'}];
                
                this.data.dictionaries.radios.forEach(r => {
                    const isActive = s.radio_station_id == r.id ? 'active' : '';
                    const preview = r.logo_url 
                        ? `<img src="${r.logo_url}" style="max-width:70%; max-height:70%; object-fit:contain;">` 
                        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="color:#334155;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
                    radioHtml += `
                        <div class="ss-visual-card clean-card ${isActive}" data-global-prop="radio_station_id" data-value="${r.id}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                            <div class="ss-card-preview" style="background:#f8fafc;">${preview}</div>
                            <div class="ss-card-label">${r.name}</div>
                        </div>
                    `;
                    radioObjects.push({val: r.id, name: r.name, shortName: r.name.substring(0,6), html: preview});
                });

                let clockHtml = `
                    <div class="ss-visual-card clean-card ${!s.clock_id ? 'active' : ''}" data-global-prop="clock_id" data-value="null" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                        <div class="ss-card-preview" style="background:#1e293b; color:rgba(255,255,255,0.5);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="2" x2="22" y2="22"></line><circle cx="12" cy="12" r="10"></circle></svg></div>
                        <div class="ss-card-label">Geen</div>
                    </div>
                `;
                const clockObjects = [{val:null, name:'Geen Klok', shortName:'Geen', html:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#fff;"><line x1="2" y1="2" x2="22" y2="22"></line><circle cx="12" cy="12" r="10"></circle></svg>'}];
                
                this.data.dictionaries.clocks.forEach(c => {
                    const isActive = s.clock_id == c.id ? 'active' : '';
                    const clockStyle = c.css_code ? c.css_code.replace(/"/g, "'") : '';
                    const preview = `<div style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;"><div style="transform: scale(0.35); transform-origin: center center; display:flex; align-items:center; justify-content:center; ${clockStyle}">${c.svg_code || '12:00'}</div></div>`;
                    
                    clockHtml += `
                        <div class="ss-visual-card clean-card ${isActive}" data-global-prop="clock_id" data-value="${c.id}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                            <div class="ss-card-preview" style="background:#1e293b;">${preview}</div>
                            <div class="ss-card-label" title="${c.name}">${c.name}</div>
                        </div>
                    `;
                    clockObjects.push({val: c.id, name: c.name, shortName: c.name.substring(0,6), html: preview});
                });

                let bgHtml = `
                    <div class="ss-visual-card clean-card ${!s.background_id ? 'active' : ''}" data-global-prop="background_id" data-value="null" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                        <div class="ss-card-preview" style="background:#000;"></div>
                        <div class="ss-card-label">Zwart</div>
                    </div>
                `;
                const bgObjects = [{val:null, name:'Zwart', shortName:'Zwart', html:''}];
                
                this.data.dictionaries.backgrounds.forEach(b => {
                    const isActive = s.background_id == b.id ? 'active' : '';
                    const bgStyle = b.css_gradient ? `background: ${b.css_gradient};` : `background: ${b.fallback_color};`;

                    bgHtml += `
                        <div class="ss-visual-card clean-card ${isActive}" data-global-prop="background_id" data-value="${b.id}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                            <div class="ss-card-preview" style="${bgStyle}"></div>
                            <div class="ss-card-label" title="${b.name}">${b.name}</div>
                        </div>
                    `;
                    bgObjects.push({val: b.id, name: b.name, shortName: b.name.substring(0,6), html: `<div style="width:100%; height:100%; ${bgStyle}"></div>`});
                });

                // ================= WATERMERK SJABLONEN & FINETUNING =================
                const currentWmText = s.settings.watermark_text || '';
                const currentWmId = s.settings.watermark_image_id;
                let activeWmTemplate = 'none';
                if (currentWmId) activeWmTemplate = 'logo';
                else if (currentWmText.includes('{datum}')) activeWmTemplate = 'datetime';
                else if (currentWmText === 'CONCEPT') activeWmTemplate = 'stamp';
                else if (currentWmText !== '') activeWmTemplate = 'title';

                const wmTemplates = [
                    { id: 'none', name: 'Geen Logo', shortName: 'Geen', html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:#ef4444;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>' },
                    { id: 'datetime', name: 'Datum/Tijd (Subtiel)', shortName: 'Klokje', html: '<div style="position:absolute; bottom:4px; right:4px; font-size:8px; color:#fff; background:rgba(0,0,0,0.5); padding:2px 4px; border-radius:2px;">12/10 - 14:00</div>' },
                    { id: 'title', name: 'Titelbalk', shortName: 'Titel', html: '<div style="position:absolute; bottom:4px; left:4px; font-size:8px; color:#fff; background:var(--primary); padding:2px 4px; border-radius:2px;">Mijn Presentatie</div>' },
                    { id: 'stamp', name: 'Concept (Diagonaal)', shortName: 'Stamp', html: '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:12px; color:rgba(255,255,255,0.4); font-weight:800; letter-spacing:2px; border:2px solid rgba(255,255,255,0.4); padding:2px 4px;">CONCEPT</div>' },
                    { id: 'logo', name: 'Eigen Logo (Bestand)', shortName: 'Logo', html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>' }
                ];
                let wmSjablonenHtml = '';
                wmTemplates.forEach(t => {
                    const isActive = activeWmTemplate === t.id ? 'active' : '';
                    wmSjablonenHtml += `
                        <div class="ss-visual-card clean-card wm-template-btn ${isActive}" data-template="${t.id}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                            <div class="ss-card-preview" style="background:#1e293b; position:relative;">${t.html}</div>
                            <div class="ss-card-label">${t.name}</div>
                        </div>
                    `;
                });
                
                const wmDisabledState = activeWmTemplate === 'none' ? 'opacity: 0.4; pointer-events: none; filter: grayscale(100%);' : '';
                const wmCustomHtml = `
                    <div style="margin-top:16px; padding-top:16px; border-top:1px dashed var(--border-color); transition: 0.3s ease; ${wmDisabledState}">
                        <div style="font-size:0.85rem; font-weight:700; color:var(--text-main); margin-bottom:12px;">Finetuning & Stijl</div>
                        
                        <div class="ss-form-group">
                            <label class="ss-label">Weergave Tekst (Overschrijft sjabloon)</label>
                            <input type="text" class="ss-input select-no-render" data-global="settings.watermark_text" value="${currentWmText}" placeholder="{titel}, {datum} of typ zelf..." ${this.isReadOnly ? 'disabled' : ''}>
                        </div>
                        
                        <div class="ss-compact-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:12px;">
                            <div class="ss-form-group" style="margin:0;">
                                <label class="ss-label" style="font-size:0.75rem;">Grootte</label>
                                <select class="ss-select select-no-render" data-global="settings.watermark_size" ${this.isReadOnly ? 'disabled' : ''} style="padding:4px; font-size:0.8rem;">
                                    <option value="small" ${s.settings.watermark_size==='small'?'selected':''}>Klein</option>
                                    <option value="normal" ${(!s.settings.watermark_size || s.settings.watermark_size==='normal')?'selected':''}>Normaal</option>
                                    <option value="large" ${s.settings.watermark_size==='large'?'selected':''}>Groot</option>
                                    <option value="xlarge" ${s.settings.watermark_size==='xlarge'?'selected':''}>Extra Groot</option>
                                </select>
                            </div>
                            <div class="ss-form-group" style="margin:0;">
                                <label class="ss-label" style="font-size:0.75rem;">Lettertype</label>
                                <select class="ss-select select-no-render" data-global="settings.watermark_font" ${this.isReadOnly ? 'disabled' : ''} style="padding:4px; font-size:0.8rem;">
                                    <option value="Inter" ${(!s.settings.watermark_font || s.settings.watermark_font==='Inter')?'selected':''}>Modern</option>
                                    <option value="serif" ${s.settings.watermark_font==='serif'?'selected':''}>Klassiek</option>
                                    <option value="monospace" ${s.settings.watermark_font==='monospace'?'selected':''}>Code</option>
                                </select>
                            </div>
                            <div class="ss-form-group" style="margin:0;">
                                <label class="ss-label" style="font-size:0.75rem;">Tekstkleur</label>
                                <input type="color" class="ss-input select-no-render" data-global="settings.watermark_color" value="${s.settings.watermark_color || '#ffffff'}" ${this.isReadOnly ? 'disabled' : ''} style="height:28px; padding:2px; width:100%; cursor:pointer;">
                            </div>
                            <div class="ss-form-group" style="margin:0;">
                                <label class="ss-label" style="font-size:0.75rem;">Achtergrond</label>
                                <input type="text" class="ss-input select-no-render" data-global="settings.watermark_bg" value="${s.settings.watermark_bg || 'transparent'}" placeholder="rgba of gradient" ${this.isReadOnly ? 'disabled' : ''} style="padding:4px; font-size:0.8rem; height:28px;">
                            </div>
                        </div>
                        
                        <div class="ss-form-group" style="margin-top:8px;">
                            <label class="ss-label" style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Transparantie (Dekking)</span><span style="color:var(--primary); font-weight:bold;"><span id="wm-op-val">${s.settings.watermark_opacity !== undefined ? s.settings.watermark_opacity : 100}</span>%</span></label>
                            <input type="range" class="ss-input select-no-render" data-global="settings.watermark_opacity" min="0" max="100" value="${s.settings.watermark_opacity !== undefined ? s.settings.watermark_opacity : 100}" ${this.isReadOnly ? 'disabled' : ''} style="padding:0; height:4px; background:rgba(128,128,128,0.2); appearance:none; outline:none; border-radius:2px; width:100%;">
                        </div>
                    </div>

                    <div style="margin-top:16px; padding-top:16px; border-top:1px dashed var(--border-color);">
                        <label class="ss-label">Aangepaste Laad-animatie (TV Speler)</label>
                        <div style="display:flex; gap:8px; margin-bottom:4px; align-items:center;">
                            ${s.settings.tv_loader_logo_id ? 
                                `<img src="/api/files?action=download&id=${s.settings.tv_loader_logo_id}" style="height:36px; border-radius:4px; object-fit:contain; background:#1e293b; padding:4px;">
                                 <button id="btn-remove-tv-logo" class="ss-btn-outline" style="border-color:var(--danger); color:var(--danger); padding:6px 10px;" ${this.isReadOnly ? 'disabled' : ''}>Wissen</button>` : 
                                `<button id="btn-select-tv-logo" class="ss-btn-secondary" style="width:100%; padding:8px;" ${this.isReadOnly ? 'disabled' : ''}>Kies Eigen Logo</button>`
                            }
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">Vervangt de standaard blauwe laad-spinner op de TV door je eigen logo. (Alleen PNG mogelijk)</div>
                    </div>
                `;

                const isPasswordProtected = s.privacy === 'password';
                const buildPrivacyHtml = (prefix) => `
                    <select class="ss-select select-no-render" id="ss-privacy-select${prefix}" ${this.isReadOnly ? 'disabled' : ''} style="padding:6px; font-size:0.8rem;">
                        <option value="public" ${!isPasswordProtected ? 'selected' : ''}>Publiek (Geen Pincode)</option>
                        <option value="password" ${isPasswordProtected ? 'selected' : ''}>Beveiligd met Pincode</option>
                    </select>
                    <div id="ss-password-container${prefix}" style="margin-top:8px; display: ${isPasswordProtected ? 'block' : 'none'};">
                        ${isPasswordProtected ? `
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 12px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; color:#10b981; font-weight:600; font-size:0.8rem;">
                                <span>✓ Ingesteld</span>
                                ${!this.isReadOnly ? `<button id="btn-remove-pin${prefix}" style="background:none; border:none; color:inherit; cursor:pointer; padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
                            </div>
                        ` : ``}
                    </div>
                `;

                let randomPlaybackHtml = `
                    <div class="ss-form-group" style="margin-top:16px;">
                        <label class="ss-label">Actie na laatste dia</label>
                        <select class="ss-select select-no-render" data-global="settings.end_action" ${this.isReadOnly ? 'disabled' : ''} style="padding:6px; font-size:0.8rem;">
                            <option value="loop" ${s.settings.end_action === 'loop' || !s.settings.end_action ? 'selected' : ''}>Blijf Herhalen (Loop)</option>
                            <option value="stop" ${s.settings.end_action === 'stop' ? 'selected' : ''}>Stop op laatste dia</option>
                            <option value="cover" ${s.settings.end_action === 'cover' ? 'selected' : ''}>Eindscherm (Cover / Info tonen)</option>
                        </select>
                    </div>
                    
                    <div class="ss-toggle-row" style="margin-top:12px;">
                        <span class="ss-toggle-label" style="font-size:0.85rem; font-weight:600; color:var(--text-main);">Willekeurige weergave op TV (Shuffle)</span>
                        <label class="apple-toggle">
                            <input type="checkbox" class="select-no-render" data-global="settings.random_playback" ${s.settings.random_playback ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                            <span class="apple-toggle-slider"></span>
                        </label>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">De originele mappen en volgorde blijven behouden in de editor, maar de TV toont elke ronde een andere unieke volgorde.</div>
                `;

                let compactActionsHtml = `
                    <div style="margin-top: 12px; padding-top:12px; border-top:1px dashed rgba(128,128,128,0.15);">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            ${!this.isReadOnly && videoItemsCount > 0 ? `
                            <button id="btn-master-video" class="ss-btn-outline" style="padding:8px 10px; font-size:0.8rem; border-color:${hasVideoActive ? 'var(--warning)' : 'var(--success)'}; color:${hasVideoActive ? 'var(--warning)' : 'var(--success)'};" data-turn-on="${hasVideoActive ? 'false' : 'true'}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                Videos ${hasVideoActive ? 'Uitschakelen' : 'Inschakelen'}
                            </button>
                            ` : ''}
                            ${!this.isReadOnly ? `
                            <button id="btn-shuffle-all" class="ss-btn-outline" style="padding:8px 10px; font-size:0.8rem; border-color:var(--primary); color:var(--primary);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg> Mix Effecten
                            </button>
                            <button id="btn-shuffle-order" class="ss-btn-outline" style="padding:8px 10px; font-size:0.8rem; border-color:var(--primary); color:var(--primary);">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> Mix Volgorde
                            </button>
                            ` : ''}
                            ${this.isAdmin ? `
                            <button id="btn-export-mp4" class="ss-btn-primary" style="padding:8px 10px; font-size:0.8rem; grid-column: span 2;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> MP4 Exporteren
                            </button>
                            ` : ''}
                        </div>
                    </div>
                `;

                const stLay  = this.getAccordionState('layout', 'open');
                const stRad  = this.getAccordionState('radio', '');
                const stCov  = this.getAccordionState('coverset', '');
                const stBg   = this.getAccordionState('bg', '');
                const stWm   = this.getAccordionState('watermark', 'open');
                const stTools = this.getAccordionState('tools', 'open');

                let selectedItemForCover = this.selectedIndices.length > 0 ? this.data.items[this.selectedIndices[0]] : null;
                let isCurrentCover = selectedItemForCover && (s.cover_file_id == selectedItemForCover.file_id);

                // ================= CLASSIC SIDEBAR (SCHERM) =================
                const sidebarSettingsLayout = `
                    <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid rgba(128,128,128,0.15);">
                        <h4 style="margin:0 0 6px 0; font-size:1.1rem; color:var(--text-main); font-weight:800;">TV Instellingen</h4>
                    </div>

                    <div class="ss-accordion ${stLay}" data-acc="layout">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> TV Layout Weergave</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            <div class="ss-visual-grid cols-3">${layoutHtml}</div>
                            ${scaleHtml}
                            <label class="ss-label" style="margin-top:12px;">Standaard Frame Stijl (Randen)</label>
                            <div class="ss-visual-grid cols-2" style="margin-bottom:16px;">${frameHtml}</div>
                            ${multiAnimSelectHtml}
                            
                            <div class="ss-form-group" style="margin-top:16px;">
                                <label class="ss-label">Tijdsweergave (Voortgangsbalk)</label>
                                <select class="ss-select select-no-render" data-global="settings.progress_bar" ${this.isReadOnly ? 'disabled' : ''}>
                                    <option value="none" ${(!s.settings.progress_bar || s.settings.progress_bar === 'none') ? 'selected' : ''}>Uitgeschakeld (Geen)</option>
                                    <option value="line_bottom" ${s.settings.progress_bar === 'line_bottom' ? 'selected' : ''}>Subtiele Lijn (Onderkant)</option>
                                    <option value="bar_top" ${s.settings.progress_bar === 'bar_top' ? 'selected' : ''}>Cinematic Balk (Bovenkant)</option>
                                    <option value="neon_border" ${s.settings.progress_bar === 'neon_border' ? 'selected' : ''}>Neon Glow Rand (Om de Dia)</option>
                                    <option value="apple_halo" ${s.settings.progress_bar === 'apple_halo' ? 'selected' : ''}>Apple TV Halo (Minimalistisch)</option>
                                    <option value="vignette" ${s.settings.progress_bar === 'vignette' ? 'selected' : ''}>Focus Vignette (Donkere randen)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="ss-accordion ${stBg}" data-acc="bg">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Geanimeerde Achtergrond</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            <div class="ss-visual-grid cols-2">${bgHtml}</div>
                        </div>
                    </div>

                    <div class="ss-accordion ${stRad}" data-acc="radio">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> Klokken & Audio</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            <label class="ss-label">Klok (Live Tijdweergave)</label>
                            <div class="ss-visual-grid cols-2" style="margin-bottom:16px;">${clockHtml}</div>
                            <div class="ss-form-group">
                                <label class="ss-label" style="display:flex; justify-content:space-between; align-items:center; margin-top:0;">
                                    <span>Klok Schaal (Grootte)</span><span id="clock-scale-val-display" style="color:var(--primary); font-size:0.9rem;">${Math.round((s.settings.clock_scale !== undefined ? s.settings.clock_scale : 1.0) * 100)}%</span>
                                </label>
                                <input type="range" class="ss-input" data-scale-slider="clock" min="0.5" max="2.0" step="0.1" value="${s.settings.clock_scale !== undefined ? s.settings.clock_scale : 1.0}" ${this.isReadOnly ? 'disabled' : ''} style="padding:0; height:4px; background:rgba(128,128,128,0.2); appearance:none; outline:none; border-radius:2px; width:100%; margin-bottom:16px;">
                            </div>
                            <div class="ss-form-group">
                                <label class="ss-label" style="display:flex; justify-content:space-between; align-items:center; margin-top:0;">
                                    <span>Klok Achtergrond (Transparantie)</span><span id="clock-bg-val-display" style="color:var(--primary); font-size:0.9rem;">${s.settings.clock_bg_opacity !== undefined ? s.settings.clock_bg_opacity : 60}%</span>
                                </label>
                                <input type="range" class="ss-input select-no-render" data-global="settings.clock_bg_opacity" min="0" max="100" step="5" value="${s.settings.clock_bg_opacity !== undefined ? s.settings.clock_bg_opacity : 60}" ${this.isReadOnly ? 'disabled' : ''} style="padding:0; height:4px; background:rgba(128,128,128,0.2); appearance:none; outline:none; border-radius:2px; width:100%; margin-bottom:16px;">
                            </div>
                            <div style="display:flex; gap:12px; margin-bottom:16px;">
                                <div class="ss-form-group" style="flex:1;">
                                    <label class="ss-label" style="display:flex; justify-content:space-between; align-items:center; margin-top:0;">
                                        <span>Klok Randdikte</span><span id="clock-border-val-display" style="color:var(--primary); font-size:0.9rem;">${s.settings.clock_border_size !== undefined ? s.settings.clock_border_size : 0}px</span>
                                    </label>
                                    <input type="range" class="ss-input select-no-render" data-global="settings.clock_border_size" min="0" max="10" step="1" value="${s.settings.clock_border_size !== undefined ? s.settings.clock_border_size : 0}" ${this.isReadOnly ? 'disabled' : ''} style="padding:0; height:4px; background:rgba(128,128,128,0.2); appearance:none; outline:none; border-radius:2px; width:100%;">
                                </div>
                                <div class="ss-form-group" style="width:60px;">
                                    <label class="ss-label" style="margin-top:0;">Kleur</label>
                                    <input type="color" class="ss-input select-no-render" data-global="settings.clock_border_color" value="${s.settings.clock_border_color || '#ffffff'}" style="height:28px; padding:2px; width:100%; cursor:pointer;" ${this.isReadOnly ? 'disabled' : ''}>
                                </div>
                            </div>
                            <label class="ss-label" style="margin-top:16px;">Achtergrond Audio (Radio)</label>
                            <div class="ss-visual-grid cols-3" style="margin-bottom:16px;">${radioHtml}</div>
                            <div class="ss-toggle-row" style="margin-top:12px; padding-top:12px; border-top:1px dashed rgba(128,128,128,0.2);">
                                <span class="ss-toggle-label">Globaal Geluid Dempen (Mute Alles)</span>
                                <label class="apple-toggle"><input type="checkbox" class="select-no-render" data-global="settings.global_mute" ${s.settings.global_mute ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}><span class="apple-toggle-slider"></span></label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ss-accordion ${stWm}" data-acc="watermark">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Branding & Watermerk</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            <div style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                                <button id="btn-open-overlay-editor" class="ss-btn-primary" style="width:100%; padding:8px; font-size:0.85rem; display:flex; align-items:center; justify-content:center; gap:6px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3h8v8h-8zM17 17v4M15 19h4"></path></svg> Posities Visueel Aanpassen
                                </button>
                            </div>
                            
                            <label class="ss-label">Watermerk Sjabloon</label>
                            <div class="ss-visual-grid cols-2" style="margin-bottom:12px;">
                                ${wmSjablonenHtml}
                            </div>
                            ${wmCustomHtml}
                        </div>
                    </div>

                    <div class="ss-accordion ${stCov}" data-acc="coverset">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Cover & Toegang</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            ${!isCurrentCover ? `
                            <button class="ss-btn-secondary" id="btn-set-as-cover" style="width:100%; margin-bottom:8px; padding:6px; font-size:0.8rem; display:flex; align-items:center; justify-content:center; gap:6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Maak huidige dia de Cover
                            </button>
                            ` : ''}
                            <button class="ss-btn-outline" id="btn-open-cover-cropper" style="width:100%; padding:6px; font-size:0.8rem; border-color:var(--primary); color:var(--primary); display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:16px;" ${this.isReadOnly ? 'disabled' : ''}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Cover Uitsnijden & Focus
                            </button>

                            <label class="ss-label" style="border-top:1px dashed rgba(128,128,128,0.2); margin-top:16px; padding-top:16px;">Toegankelijkheid & Beveiliging</label>
                            ${buildPrivacyHtml('')}
                        </div>
                    </div>
                    
                    <div class="ss-accordion ${stTools}" data-acc="tools">
                        <div class="ss-accordion-header">
                            <span style="display:flex; align-items:center; gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg> Gereedschap & Afspelen</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div class="ss-accordion-content">
                            ${randomPlaybackHtml}
                            ${compactActionsHtml}
                        </div>
                    </div>

                    ${statsHtml}
                `;

                // ================= MICROSOFT RIBBON (SCHERM) =================
                let msWmSjablonen = '';
                wmTemplates.forEach(t => {
                    const isActive = activeWmTemplate === t.id ? 'active' : '';
                    msWmSjablonen += `
                        <div class="ms-gallery-item ss-visual-card wm-template-btn ${isActive}" data-template="${t.id}" ${this.isReadOnly ? 'style="pointer-events:none;"' : ''}>
                            <div class="preview" style="background:#1e293b;">${t.html}</div>
                            <div class="lbl">${t.shortName}</div>
                        </div>
                    `;
                });

                const ribbonSettingsLayout = `
                    <div class="ms-ribbon-bar">
                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                ${buildMsGallery(layouts, 'settings.layout', s.settings.layout || 'full', true)}
                                ${buildMsGallery(frames, 'settings.frame_style', s.settings.frame_style || 'none', true)}
                                
                                <div class="ms-stack" style="padding-left:4px; min-width:120px;">
                                    <div class="ms-row">
                                        <label>Schaal</label>
                                        <input type="range" class="ms-input" data-scale-slider="media" min="0.5" max="1.0" step="0.05" value="${s.settings.media_scale !== undefined ? s.settings.media_scale : 0.85}" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">
                                    </div>
                                    <div class="ms-row">
                                        <label>Balk</label>
                                        <select class="ms-select select-no-render" data-global="settings.progress_bar" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">
                                            <option value="none" ${(!s.settings.progress_bar || s.settings.progress_bar === 'none') ? 'selected' : ''}>Uit</option>
                                            <option value="line_bottom" ${s.settings.progress_bar === 'line_bottom' ? 'selected' : ''}>Lijn</option>
                                            <option value="bar_top" ${s.settings.progress_bar === 'bar_top' ? 'selected' : ''}>Balk</option>
                                            <option value="neon_border" ${s.settings.progress_bar === 'neon_border' ? 'selected' : ''}>Neon</option>
                                        </select>
                                    </div>
                                    <div class="ms-row">
                                        <label>Opbouw</label>
                                        <select class="ms-select select-no-render" data-global="settings.multi_anim" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">
                                            <option value="sync" ${s.settings.multi_anim === 'sync' ? 'selected' : ''}>Samen</option>
                                            <option value="sequence" ${s.settings.multi_anim === 'sequence' ? 'selected' : ''}>Na Elkaar</option>
                                            <option value="cascade" ${s.settings.multi_anim === 'cascade' ? 'selected' : ''}>Waterval</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Layout & Weergave</div>
                        </div>

                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                ${buildMsGallery(radioObjects, 'radio_station_id', s.radio_station_id, true)}
                                ${buildMsGallery(bgObjects, 'background_id', s.background_id, true)}
                                
                                <div class="ms-stack" style="padding-left:4px;">
                                    <label class="ms-check-row">
                                        <input type="checkbox" class="select-no-render" data-global="settings.global_mute" ${s.settings.global_mute ? 'checked' : ''} ${this.isReadOnly ? 'disabled' : ''}>
                                        <span>Mute Alles</span>
                                    </label>
                                    ${!this.isReadOnly && videoItemsCount > 0 ? `
                                    <button id="btn-master-video-ribbon" class="ms-btn-small" style="margin-top:4px; border-color:${hasVideoActive ? 'var(--warning)' : 'var(--success)'}; color:${hasVideoActive ? 'var(--warning)' : 'var(--success)'};" data-turn-on="${hasVideoActive ? 'false' : 'true'}">
                                        Video's ${hasVideoActive ? 'Uit' : 'Aan'}
                                    </button>` : ''}
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Sfeer & Audio</div>
                        </div>

                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                ${buildMsGallery(clockObjects, 'clock_id', s.clock_id, true)}
                                <div class="ms-stack" style="padding-left:4px;">
                                    <button id="btn-open-overlay-editor-ribbon" class="ms-btn-small primary" ${this.isReadOnly ? 'disabled' : ''}>Posities</button>
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Klok</div>
                        </div>

                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content">
                                <div class="ms-gallery">${msWmSjablonen}</div>
                                <div class="ms-stack" style="padding-left:8px; border-left: 1px solid var(--ms-border);">
                                    <label class="ms-label" style="font-size:10px; color:var(--text-muted); font-weight:bold;">TV Laad-animatie</label>
                                    ${s.settings.tv_loader_logo_id ? 
                                        `<div style="display:flex; gap:4px; align-items:center;"><img src="/api/files?action=download&id=${s.settings.tv_loader_logo_id}" style="height:24px; border-radius:2px; background:#1e293b; padding:2px;"><button id="btn-remove-tv-logo-ribbon" class="ms-btn-small" style="color:var(--danger);" ${this.isReadOnly ? 'disabled' : ''}>Wissen</button></div>` : 
                                        `<button id="btn-select-tv-logo-ribbon" class="ms-btn-small" ${this.isReadOnly ? 'disabled' : ''}>Eigen Logo</button>`
                                    }
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Watermerk & Branding</div>
                        </div>

                        <div class="ms-ribbon-group" style="border:none;">
                            <div class="ms-ribbon-content">
                                <div class="ms-stack" style="min-width:140px;">
                                    <div class="ms-row">
                                        <label>Na afloop</label>
                                        <select class="ms-select select-no-render" data-global="settings.end_action" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">
                                            <option value="loop" ${s.settings.end_action === 'loop' || !s.settings.end_action ? 'selected' : ''}>Loop</option>
                                            <option value="stop" ${s.settings.end_action === 'stop' ? 'selected' : ''}>Stop</option>
                                            <option value="cover" ${s.settings.end_action === 'cover' ? 'selected' : ''}>Info/Cover</option>
                                        </select>
                                    </div>
                                    <div class="ms-row">
                                        <label>Privacy</label>
                                        <select class="ms-select select-no-render" id="ss-privacy-select-ribbon" ${this.isReadOnly ? 'disabled' : ''} style="flex:1;">
                                            <option value="public" ${!isPasswordProtected ? 'selected' : ''}>Publiek</option>
                                            <option value="password" ${isPasswordProtected ? 'selected' : ''}>Pincode</option>
                                        </select>
                                    </div>
                                    <div id="ss-password-container-ribbon" style="display: ${isPasswordProtected ? 'block' : 'none'};">
                                        ${isPasswordProtected ? `<div style="color:var(--success); font-weight:700; font-size:9px;">✓ Pincode ingesteld</div>` : ``}
                                    </div>
                                </div>
                                <div class="ms-stack" style="padding-left:8px;">
                                    ${!this.isReadOnly ? `
                                    <button id="btn-shuffle-all-ribbon" class="ms-btn-small">Mix Effecten</button>
                                    <button id="btn-shuffle-order-ribbon" class="ms-btn-small">Mix Volgorde</button>
                                    ` : ''}
                                    ${this.isAdmin ? `<button id="btn-export-mp4-ribbon" class="ms-btn-small primary">MP4 Exporteren</button>` : ''}
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Acties & Beveiliging</div>
                        </div>

                    </div>
                `;

                container.innerHTML = this.isRibbon ? ribbonSettingsLayout : sidebarSettingsLayout;

                if (!this.isRibbon) {
                    container.querySelectorAll('.ss-accordion-header').forEach(header => {
                        header.onclick = () => {
                            const acc = header.parentElement;
                            acc.classList.toggle('open');
                            this.setAccordionState(acc.dataset.acc, acc.classList.contains('open'));
                        };
                    });
                }

                if (!this.isReadOnly) {
                    const bindAction = (btnId, handler) => {
                        const btn = container.querySelector(btnId);
                        if (btn) btn.onclick = handler;
                    };

                    bindAction('#btn-open-overlay-editor', () => { if (this.openOverlayEditor) this.openOverlayEditor(); });
                    bindAction('#btn-open-overlay-editor-ribbon', () => { if (this.openOverlayEditor) this.openOverlayEditor(); });

                    container.querySelectorAll('.ss-visual-card, .pos-btn, .ms-gallery-item').forEach(card => {
                        if(card.dataset.globalProp) {
                            card.onclick = () => {
                                if (card.classList.contains('disabled')) return;
                                
                                card.parentElement.querySelectorAll('.ss-visual-card, .pos-btn, .ms-gallery-item').forEach(c => c.classList.remove('active'));
                                card.classList.add('active');
                                const propPath = card.dataset.globalProp;
                                let val = card.dataset.value;
                                if (val === 'null') val = null;
                                if (val !== null && typeof val === 'string' && !isNaN(val) && !val.includes('-') && val !== 'none' && val !== 'classic' && val !== 'rounded' && val !== 'polaroid') {
                                    val = Number(val);
                                }

                                if (propPath.startsWith('settings.')) {
                                    ensureGlobalSettingsObject();
                                    const subProp = propPath.split('.')[1];
                                    this.data.slideshow.settings[subProp] = val;
                                } else {
                                    this.data.slideshow[propPath] = val;
                                }
                                
                                if (this.triggerAutoSave) this.triggerAutoSave(`TV Instelling gewijzigd.`);
                                if (this.renderPreview) this.renderPreview();
                                if (propPath === 'settings.layout' || propPath === 'settings.frame_style') this.renderProperties();
                            };
                        }
                    });

                    container.querySelectorAll('.wm-template-btn').forEach(btn => {
                        btn.onclick = () => {
                            const type = btn.dataset.template;
                            ensureGlobalSettingsObject();
                            const sl = this.data.slideshow;
                            
                            if (type === 'none') {
                                sl.settings.watermark_text = '';
                                sl.settings.watermark_image_id = null;
                            } else if (type === 'datetime') {
                                sl.settings.watermark_text = '{datum} - {tijd}';
                                sl.settings.watermark_pos = 'bottom-right';
                                sl.settings.watermark_size = 'small';
                                sl.settings.watermark_bg = 'rgba(0,0,0,0.5)';
                                sl.settings.watermark_color = '#ffffff';
                                sl.settings.watermark_font = 'Inter';
                                sl.settings.watermark_image_id = null;
                            } else if (type === 'title') {
                                sl.settings.watermark_text = '{titel}';
                                sl.settings.watermark_pos = 'bottom-left';
                                sl.settings.watermark_size = 'normal';
                                sl.settings.watermark_bg = 'var(--primary)';
                                sl.settings.watermark_color = '#ffffff';
                                sl.settings.watermark_font = 'Inter';
                                sl.settings.watermark_image_id = null;
                            } else if (type === 'stamp') {
                                sl.settings.watermark_text = 'CONCEPT';
                                sl.settings.watermark_pos = 'center';
                                sl.settings.watermark_size = 'xlarge';
                                sl.settings.watermark_bg = 'transparent';
                                sl.settings.watermark_color = '#ffffff';
                                sl.settings.watermark_font = 'monospace';
                                sl.settings.watermark_opacity = 50;
                                sl.settings.watermark_image_id = null;
                            } else if (type === 'logo') {
                                this.showLogoPicker((fileId) => {
                                    this.data.slideshow.settings.watermark_image_id = fileId;
                                    this.data.slideshow.settings.watermark_text = '';
                                    if (this.triggerAutoSave) this.triggerAutoSave(`Watermerk logo ingesteld.`);
                                    this.renderProperties();
                                    if (this.renderPreview) this.renderPreview();
                                });
                                return; 
                            }
                            
                            if (this.triggerAutoSave) this.triggerAutoSave("Watermerk sjabloon toegepast");
                            this.renderProperties();
                            if (this.renderPreview) this.renderPreview();
                        };
                    });

                    const handleSelectTvLogo = () => {
                        this.showLogoPicker((fileId) => {
                            ensureGlobalSettingsObject();
                            this.data.slideshow.settings.tv_loader_logo_id = fileId;
                            if (this.triggerAutoSave) this.triggerAutoSave(`TV Laad-animatie ingesteld.`);
                            this.renderProperties();
                        });
                    };
                    const handleRemoveTvLogo = () => {
                        ensureGlobalSettingsObject();
                        this.data.slideshow.settings.tv_loader_logo_id = null;
                        if (this.triggerAutoSave) this.triggerAutoSave(`TV Laad-animatie verwijderd.`);
                        this.renderProperties();
                    };

                    bindAction('#btn-select-tv-logo', handleSelectTvLogo);
                    bindAction('#btn-select-tv-logo-ribbon', handleSelectTvLogo);
                    bindAction('#btn-remove-tv-logo', handleRemoveTvLogo);
                    bindAction('#btn-remove-tv-logo-ribbon', handleRemoveTvLogo);

                    const handleShuffleEffects = async () => {
                        if (window.ModalService) {
                            const conf = await window.ModalService.confirm('Effecten Mixen', "Wil je willekeurige overgangen toewijzen aan alle dias?", { danger: false, yesText: 'Mix Toepassen' });
                            if (conf) {
                                let changed = 0;
                                const transitions = this.data.dictionaries.transitions;
                                if (transitions && transitions.length > 0) {
                                    this.data.items.forEach(item => {
                                        const randomTrans = transitions[Math.floor(Math.random() * transitions.length)];
                                        item.transition_id = parseInt(randomTrans.id);
                                        this.pendingDeltaItems.set(item.id, item);
                                        changed++;
                                    });
                                    this.selectedIndices = [0];
                                    this.lastClickedIndex = 0;
                                    if (this.triggerAutoSave) this.triggerAutoSave(`Effecten willekeurig gemixt.`, true);
                                    if (this.renderUI) this.renderUI();
                                } else {
                                    if (window.EventBus) window.EventBus.emit('notify:error', 'Geen overgangen beschikbaar.');
                                }
                            }
                        }
                    };
                    bindAction('#btn-shuffle-all', handleShuffleEffects);
                    bindAction('#btn-shuffle-all-ribbon', handleShuffleEffects);

                    const handleShuffleOrder = async () => {
                        if (window.ModalService) {
                            const conf = await window.ModalService.confirm('Volgorde Mixen', "Wil je de huidige volgorde van alle dia's willekeurig door elkaar husselen? Dit overschrijft je huidige indeling permanent.", { danger: true, yesText: 'Ja, Husselen' });
                            if (conf) {
                                let array = [...this.data.items];
                                for (let i = array.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [array[i], array[j]] = [array[j], array[i]];
                                }
                                let changed = 0;
                                array.forEach((item, index) => {
                                    if (item.sort_order !== index) {
                                        item.sort_order = index;
                                        this.pendingDeltaItems.set(item.id, item);
                                        changed++;
                                    }
                                });
                                this.data.items = array; 
                                this.selectedIndices = [0];
                                this.lastClickedIndex = 0;
                                if (changed > 0) {
                                    if (this.triggerAutoSave) this.triggerAutoSave(`Dia-volgorde gehusseld.`, true);
                                    if (this.renderUI) this.renderUI();
                                }
                            }
                        }
                    };
                    bindAction('#btn-shuffle-order', handleShuffleOrder);
                    bindAction('#btn-shuffle-order-ribbon', handleShuffleOrder);

                    const handleExport = () => {
                        if (window.EventBus) window.EventBus.emit('notify:info', 'Server-side export gestart. Dit duurt even.');
                        fetch(`/api/slideshow/admin/export?id=${this.slideshowId}`, {method: 'POST'}).catch(()=>{});
                    };
                    bindAction('#btn-export-mp4', handleExport);
                    bindAction('#btn-export-mp4-ribbon', handleExport);
                    
                    const handleVideoAction = async (e) => {
                        const btn = e.currentTarget;
                        const turnOn = btn.dataset.turnOn === 'true';
                        if (window.ModalService) {
                            const actionText = turnOn ? 'inschakelen' : 'uitschakelen';
                            const conf = await window.ModalService.confirm(`Alle videos ${actionText}`, `Wil je alle videobestanden ${actionText}?`, { danger: !turnOn, yesText: turnOn ? 'Inschakelen' : 'Uitschakelen' });
                            if (conf) {
                                let changed = 0;
                                this.data.items.forEach(item => {
                                    if (item.mime_type && item.mime_type.startsWith('video')) {
                                        if ((turnOn && item.is_active == 0) || (!turnOn && item.is_active == 1)) {
                                            item.is_active = turnOn ? 1 : 0;
                                            this.pendingDeltaItems.set(item.id, item);
                                            changed++;
                                        }
                                    }
                                });
                                if (changed > 0) {
                                    if (this.triggerAutoSave) this.triggerAutoSave(`Alle videos aangepast (${changed} stuks).`, true);
                                    if (this.renderUI) this.renderUI();
                                }
                            }
                        }
                    };
                    bindAction('#btn-master-video', handleVideoAction);
                    bindAction('#btn-master-video-ribbon', handleVideoAction);

                    const bindPrivacyGroup = (prefix) => {
                        const privSelect = container.querySelector(`#ss-privacy-select${prefix}`);
                        const passContainer = container.querySelector(`#ss-password-container${prefix}`);
                        
                        if (privSelect) {
                            privSelect.onchange = (e) => {
                                if (e.target.value === 'password') {
                                    passContainer.style.display = 'block';
                                    passContainer.innerHTML = `
                                        <div style="display:flex; gap:4px; margin-top:${prefix ? '4px' : '0'};">
                                            <input type="text" class="${prefix ? 'ms-input' : 'ss-input'}" id="ss-password-input-temp${prefix}" placeholder="Nieuwe code..." autocomplete="off" style="font-size:0.8rem; padding:4px; height:26px; flex:1; box-sizing:border-box;">
                                            <button id="btn-save-pin-temp${prefix}" class="ss-btn-primary" style="padding:0 12px; font-size:0.8rem; height:26px; box-sizing:border-box;">Opslaan</button>
                                        </div>
                                    `;
                                    document.getElementById(`btn-save-pin-temp${prefix}`).onclick = () => {
                                        const pin = document.getElementById(`ss-password-input-temp${prefix}`).value.trim();
                                        if(pin.length > 0) {
                                            this.data.slideshow.privacy = 'password';
                                            this.data.slideshow.password_new = pin;
                                            if(this.triggerAutoSave) this.triggerAutoSave("Pincode ingesteld");
                                            this.renderProperties();
                                        }
                                    };
                                } else {
                                    this.data.slideshow.privacy = 'public';
                                    this.data.slideshow.password_new = '';
                                    if (this.data.slideshow.password_hash) this.data.slideshow.password_hash = null;
                                    if(this.triggerAutoSave) this.triggerAutoSave("Slideshow publiek gemaakt");
                                    this.renderProperties();
                                }
                            };
                        }

                        const btnRemovePin = container.querySelector(`#btn-remove-pin${prefix}`);
                        if (btnRemovePin) {
                            btnRemovePin.onclick = () => {
                                this.data.slideshow.privacy = 'public';
                                this.data.slideshow.password_new = '';
                                if (this.data.slideshow.password_hash) this.data.slideshow.password_hash = null;
                                if(this.triggerAutoSave) this.triggerAutoSave("Pincode verwijderd");
                                this.renderProperties();
                            };
                        }
                    };
                    bindPrivacyGroup('');
                    bindPrivacyGroup('-ribbon');

                    container.querySelectorAll('.ms-input[data-global], .ss-input[data-global], .ms-select[data-global]:not(#ss-privacy-select):not(#ss-privacy-select-ribbon), .ss-select[data-global]:not(#ss-privacy-select):not(#ss-privacy-select-ribbon), input[type="checkbox"][data-global]').forEach(el => {
                        const evt = el.type === 'checkbox' ? 'onchange' : 'oninput';
                        el[evt] = () => {
                            const propPath = el.dataset.global;
                            let val = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value; 
                            
                            if (val === '') {
                                val = null;
                            } else if (val !== null && typeof val === 'string' && !isNaN(val) && propPath !== 'settings.clock_border_color' && propPath !== 'settings.watermark_color' && propPath !== 'settings.watermark_bg' && propPath !== 'settings.frame_style' && propPath !== 'settings.end_action' && propPath !== 'settings.progress_bar' && propPath !== 'settings.watermark_text' && propPath !== 'settings.watermark_font' && propPath !== 'settings.watermark_size') {
                                val = Number(val);
                            }

                            if (propPath === 'settings.watermark_opacity') {
                                const disp = document.getElementById('wm-op-val');
                                if (disp) disp.innerText = val;
                            }
                            if (propPath === 'settings.clock_bg_opacity') {
                                const disp = document.getElementById('clock-bg-val-display');
                                if (disp) disp.innerText = val + '%';
                            }
                            if (propPath === 'settings.clock_border_size') {
                                const disp = document.getElementById('clock-border-val-display');
                                if (disp) disp.innerText = val + 'px';
                            }

                            if (propPath.startsWith('settings.')) {
                                ensureGlobalSettingsObject();
                                const subProp = propPath.split('.')[1];
                                this.data.slideshow.settings[subProp] = val;
                            } else {
                                this.data.slideshow[propPath] = val;
                            }
                            
                            if (this.triggerAutoSave && evt === 'onchange') this.triggerAutoSave("TV Instelling gewijzigd.");
                            
                            if (this.renderPreview && !el.classList.contains('select-no-render')) {
                                this.renderPreview(); 
                            }
                        };
                    });
                }
            }

            else if (this.activeTab === 'logs') {
                const sidebarLogsHtml = `
                    <div style="margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid rgba(128,128,128,0.15); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="margin:0 0 6px 0; font-size:1.1rem; color:var(--text-main); font-weight:800;">Time Machine</h4>
                            <div style="font-size:0.8rem; color:var(--text-muted);">Ga terug in de tijd.</div>
                        </div>
                        ${!this.isReadOnly ? `<button id="btn-create-snapshot" class="ss-btn-primary" style="padding: 8px 14px; font-size:0.8rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Nu Opslaan</button>` : ''}
                    </div>
                    <div id="ss-timeline-container">
                        <div class="ss-timeline-node"><div class="ss-timeline-content"><div class="ss-timeline-cover ss-skeleton"></div><div class="ss-timeline-info"><div class="ss-skeleton" style="height:16px; width:70%; margin-bottom:8px;"></div><div class="ss-skeleton" style="height:12px; width:40%;"></div></div></div></div>
                        <div class="ss-timeline-node"><div class="ss-timeline-content"><div class="ss-timeline-cover ss-skeleton"></div><div class="ss-timeline-info"><div class="ss-skeleton" style="height:16px; width:60%; margin-bottom:8px;"></div><div class="ss-skeleton" style="height:12px; width:50%;"></div></div></div></div>
                        <div class="ss-timeline-node"><div class="ss-timeline-content"><div class="ss-timeline-cover ss-skeleton"></div><div class="ss-timeline-info"><div class="ss-skeleton" style="height:16px; width:80%; margin-bottom:8px;"></div><div class="ss-skeleton" style="height:12px; width:30%;"></div></div></div></div>
                    </div>
                `;

                const ribbonLogsHtml = `
                    <div class="ms-ribbon-bar">
                        <div class="ms-ribbon-group">
                            <div class="ms-ribbon-content" style="align-items:center; padding:0 8px;">
                                ${!this.isReadOnly ? `
                                <button id="btn-create-snapshot-ribbon" class="ms-btn-large">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> 
                                    <span>Nu Opslaan</span>
                                </button>
                                ` : ''}
                            </div>
                            <div class="ms-ribbon-label">Nieuwe Revisie</div>
                        </div>
                        <div class="ms-ribbon-group" style="flex:1; border:none;">
                            <div class="ms-ribbon-content">
                                <div id="ss-timeline-container-ribbon" style="display:flex; gap:16px; overflow-x:auto; height: 100%; align-items:center; width:100%;">
                                    <div class="ss-timeline-node" style="min-width:200px;"><div class="ss-timeline-content"><div class="ss-timeline-cover ss-skeleton"></div><div class="ss-timeline-info"><div class="ss-skeleton" style="height:16px; width:70%; margin-bottom:8px;"></div><div class="ss-skeleton" style="height:12px; width:40%;"></div></div></div></div>
                                </div>
                            </div>
                            <div class="ms-ribbon-label">Time Machine - Revisies</div>
                        </div>
                    </div>
                `;

                container.innerHTML = this.isRibbon ? ribbonLogsHtml : sidebarLogsHtml;

                if (!this.isReadOnly) {
                    const bindSnap = (btnId) => {
                        const btn = document.getElementById(btnId);
                        if(btn) {
                            btn.onclick = () => {
                                if (this.openSnapshotModal) this.openSnapshotModal();
                            };
                        }
                    };
                    bindSnap('btn-create-snapshot');
                    bindSnap('btn-create-snapshot-ribbon');
                }

                setTimeout(() => {
                    const timelineContainer = document.getElementById(this.isRibbon ? 'ss-timeline-container-ribbon' : 'ss-timeline-container');
                    if (this.renderTimelineData && timelineContainer) this.renderTimelineData(timelineContainer);
                }, 600);
            }
        }
    });
})();