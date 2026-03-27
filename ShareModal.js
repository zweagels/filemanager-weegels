/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Share | FILE: public/js/modules/share/ShareModal.js */

(function() {
    class ShareModal {
        constructor(api) {
            this.api = api || fetch;
            this.mode = 'create';
            this.currentShareId = null;
            this.overlay = null;
            this.injectStyles();
        }

        injectStyles() {
            if (document.getElementById('share-modal-styles')) return;
            const style = document.createElement('style');
            style.id = 'share-modal-styles';
            style.innerHTML = `
                .ios-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
                .ios-switch input { opacity: 0; width: 0; height: 0; }
                .ios-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-dropdown); transition: .3s; border-radius: 24px; }
                .ios-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .ios-switch input:checked + .ios-slider { background-color: var(--primary); }
                .ios-switch input:checked + .ios-slider:before { transform: translateX(20px); }
                
                .tree-view-viz { margin-top: 10px; padding: 15px; background: rgba(128,128,128,0.05); border-radius: 8px; border: 1px solid var(--border-dropdown); display: flex; flex-direction: column; gap: 8px; transition: opacity 0.3s; }
                .tree-node { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-main); transition: all 0.3s; }
                .tree-node.sub { padding-left: 20px; position: relative; }
                .tree-node.sub::before { content: ''; position: absolute; left: 8px; top: -10px; bottom: 50%; width: 1px; border-left: 2px dotted var(--border-dropdown); }
                .tree-node.sub::after { content: ''; position: absolute; left: 8px; top: 50%; width: 8px; border-top: 2px dotted var(--border-dropdown); }
            `;
            document.head.appendChild(style);
        }

        showNotification(message, type = 'info') {
            if (window.EventBus) {
                window.EventBus.emit('notify:' + type, message);
            } else {
                alert(type.toUpperCase() + ': ' + message);
            }
        }

        async open(targetType, targetId, itemName) {
            this.mode = 'create';
            this.currentShareId = null;
            
            if (!itemName || itemName === 'undefined' || itemName === 'Onbekend Item') {
                const domEl = document.querySelector(`[data-id="${targetId}"]`);
                if (domEl) {
                    const nameEl = domEl.querySelector('.tile-name, .list-name');
                    itemName = nameEl ? nameEl.textContent.trim() : 'Geselecteerd Item';
                } else {
                    itemName = targetType === 'folder' ? 'Geselecteerde Map' : 'Geselecteerd Bestand';
                }
            }

            try {
                const checkRes = await fetch(`/api/share/check?target_type=${targetType}&target_id=${targetId}&_t=${Date.now()}`);
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData.status === 'exists') {
                        this.showNotification('Deze map of dit bestand is al gedeeld. Je bewerkt nu de bestaande externe link.', 'info');
                        this.openEdit(checkData.share.id);
                        return; 
                    }
                }
            } catch (e) {
                console.warn('Kon niet controleren op bestaande links:', e);
            }

            this.buildOverlay(targetType, targetId, itemName, null);
        }

        async openEdit(shareId) {
            this.mode = 'edit';
            this.currentShareId = shareId;
            
            this.showNotification('Gegevens ophalen...', 'info');

            try {
                const response = await fetch(`/api/share/get?id=${shareId}&_t=${Date.now()}`);
                if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                
                const responseText = await response.text();
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    throw new Error("Ongeldige server response: " + responseText.substring(0, 100));
                }

                if (data.status === 'success') {
                    const s = data.share;
                    
                    let editItemName = 'Geselecteerd Item';
                    const domEl = document.querySelector(`[data-id="${s.target_id}"]`);
                    if (domEl) {
                        const nameEl = domEl.querySelector('.tile-name, .list-name');
                        if (nameEl) editItemName = nameEl.textContent.trim();
                    }

                    this.buildOverlay(s.target_type, s.target_id, editItemName, s);
                } else {
                    this.showNotification(data.message, 'error');
                }
            } catch (err) {
                console.error(err);
                this.showNotification('Netwerkfout bij ophalen link data: ' + err.message, 'error');
            }
        }

        buildOverlay(targetType, targetId, itemName, existingData = null) {
            const isEdit = this.mode === 'edit';
            const title = isEdit ? 'Deellink Bewerken' : 'Maak Deellink';
            const btnText = isEdit ? 'Opslaan' : 'Aanmaken';

            const shareName = existingData && existingData.share_name ? existingData.share_name : '';
            
            let expDate = '';
            if (existingData && existingData.expires_at) {
                expDate = existingData.expires_at.replace(' ', 'T').substring(0, 16);
            }
            
            const maxDl = existingData && existingData.max_downloads ? existingData.max_downloads : '';
            const isBurn = existingData && existingData.is_burn_link == 1 ? 'checked' : '';
            const isNotify = existingData && existingData.notify_on_download == 1 ? 'checked' : '';
            const isPreviewOnly = existingData && existingData.is_preview_only == 1 ? 'checked' : '';
            
            const includeSubfolders = (!existingData || existingData.include_subfolders == 1) ? 'checked' : '';
            const allowedTypes = existingData && existingData.allowed_types ? existingData.allowed_types : 'all';
            
            const watermark = existingData && existingData.watermark_text ? existingData.watermark_text : '';
            const theme = existingData && existingData.theme ? existingData.theme : 'dark';

            if (this.overlay) {
                this.overlay.remove();
            }

            this.overlay = document.createElement('div');
            this.overlay.className = 'modal-overlay visible';
            this.overlay.style.zIndex = '12000';
            
            let requestHtml = '';
            let folderFeaturesHtml = '';

            if (targetType === 'folder' || targetType === 'request') {
                const reqChecked = targetType === 'request' ? 'checked' : '';
                const reqDisabled = isEdit ? 'disabled' : '';
                requestHtml = `
                    <div style="background: rgba(37,99,235,0.05); border: 1px solid rgba(37,99,235,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 5px;">
                            <label class="ios-switch">
                                <input type="checkbox" id="share-file-request" ${reqDisabled} ${reqChecked}>
                                <span class="ios-slider"></span>
                            </label>
                            <label for="share-file-request" style="font-weight: bold; cursor: pointer; color: var(--primary);">Bestandsaanvraag (Uploads toestaan)</label>
                        </div>
                        <p style="font-size: 0.85rem; margin:0; color: var(--text-muted); padding-left:56px;">Gasten kunnen bestanden uploaden naar deze map, zonder jouw bestanden te zien.</p>
                    </div>
                `;

                folderFeaturesHtml = `
                    <div class="modal-group" style="margin-bottom: 20px; border-bottom: 1px solid var(--border-dropdown); padding-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <label class="ios-switch">
                                <input type="checkbox" id="share-include-subfolders" ${includeSubfolders}>
                                <span class="ios-slider"></span>
                            </label>
                            <label for="share-include-subfolders" style="cursor: pointer; font-size: 0.95rem; color: var(--text-main); font-weight: 600;">Submappen Inclusief</label>
                        </div>
                        <p style="font-size:0.85rem; color:var(--text-muted); margin:6px 0 0 56px;">Gasten mogen onderliggende mappen openen en bekijken.</p>
                        
                        <div class="tree-view-viz" id="tree-view-preview" style="margin-left: 56px;">
                            <div class="tree-node">📁 <strong>${itemName}</strong></div>
                            <div class="tree-node sub sub-node-item">📁 Afbeeldingen</div>
                            <div class="tree-node sub sub-node-item">📁 Documenten</div>
                        </div>
                    </div>

                    <div class="modal-group" style="margin-bottom: 20px; padding-bottom: 20px;">
                        <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Toegestane Bestandstypen</label>
                        <select id="share-allowed-types" class="modal-input" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-dropdown); color:var(--text-main); cursor:pointer;">
                            <option value="all" ${allowedTypes === 'all' ? 'selected' : ''}>Alle bestanden tonen (Standaard)</option>
                            <option value="images" ${allowedTypes === 'images' ? 'selected' : ''}>Toon alleen Afbeeldingen</option>
                            <option value="media" ${allowedTypes === 'media' ? 'selected' : ''}>Toon alleen Afbeeldingen & Video's</option>
                        </select>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">Andere bestandstypen worden verborgen in de gast-weergave.</p>
                    </div>
                `;
            }

            let watermarkHtml = '';
            if (targetType === 'file' || targetType === 'folder') {
                watermarkHtml = `
                    <div class="modal-group" style="margin-top: 20px;">
                        <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Watermerk tekst op afbeeldingen</label>
                        <input type="text" id="share-watermark" class="modal-input" value="${watermark}" placeholder="Bijv. © Jouw Naam of Concept" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.05); color:var(--text-main);">
                    </div>
                `;
            }

            let removePwHtml = '';
            if (isEdit && existingData && existingData.password_hash) {
                removePwHtml = `
                    <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="share-remove-password" style="accent-color:var(--error);">
                        <label for="share-remove-password" style="font-size: 0.85rem; color: var(--error); cursor: pointer;">Verwijder huidig wachtwoord</label>
                    </div>
                `;
            }

            this.overlay.innerHTML = `
                <div class="modal-box" style="width: 550px; max-width: 95vw; background: var(--bg-dropdown); border: 1px solid var(--border-dropdown); border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display:flex; flex-direction:column; overflow:hidden;">
                    
                    <div style="padding:20px 24px; border-bottom:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; font-size:1.2rem; font-weight:700; color:var(--text-main);">${title}</h3>
                            <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Beheer toegang voor <strong style="color:var(--primary); background:rgba(37,99,235,0.1); padding:2px 6px; border-radius:4px;">${itemName}</strong></div>
                        </div>
                        <button class="btn-icon-small close-btn" style="color:var(--text-muted); border:none; background:transparent; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>

                    <div style="padding: 24px; overflow-y: auto; max-height: 65vh;" id="share-modal-body">
                        
                        <div style="display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid var(--border-dropdown);" id="share-tabs-nav">
                            <button type="button" id="tab-btn-basic" class="btn-text-small active" style="background:none; border:none; font-weight:bold; font-size:0.9rem; cursor:pointer; padding-bottom: 8px; border-bottom: 2px solid var(--primary); color: var(--primary);">Externe Link</button>
                            <button type="button" id="tab-btn-advanced" class="btn-text-small" style="background:none; border:none; font-weight:bold; font-size:0.9rem; cursor:pointer; padding-bottom: 8px; color: var(--text-muted); border-bottom: 2px solid transparent;">Geavanceerd & Rechten</button>
                            <button type="button" id="tab-btn-collab" class="btn-text-small" style="background:none; border:none; font-weight:bold; font-size:0.9rem; cursor:pointer; padding-bottom: 8px; color: var(--text-muted); border-bottom: 2px solid transparent;">Samenwerken (Intern)</button>
                        </div>

                        <div id="tab-basic" style="display: block;">
                            <div class="modal-group" style="margin-bottom: 15px;">
                                <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Naam voor deze link (Optioneel)</label>
                                <input type="text" id="share-name" class="modal-input" value="${shareName}" placeholder="Bijv. Project X voor Klant Y" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.05); color:var(--text-main);">
                            </div>

                            <div class="modal-group" style="margin-bottom: 15px;">
                                <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Wachtwoord ${isEdit ? '(Laat leeg om huidig te behouden)' : '(optioneel)'}</label>
                                <div style="position:relative; display:flex; align-items:center;">
                                    <input type="password" id="share-password" class="modal-input" placeholder="${isEdit ? '*** Verborgen ***' : 'Laat leeg voor publieke toegang'}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.05); color:var(--text-main); padding-right: 40px;">
                                    <button type="button" id="toggle-pw-visibility" style="position:absolute; right:10px; background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; padding:5px;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </button>
                                </div>
                                ${removePwHtml}
                            </div>
                            
                            <div class="modal-group" style="display: flex; gap: 15px; margin-bottom: 15px;">
                                <div style="flex:1;">
                                    <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Vervaldatum & Tijdstip</label>
                                    <input type="datetime-local" id="share-expiry" class="modal-input" value="${expDate}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.05); color:var(--text-main);">
                                </div>
                                <div style="flex:1;">
                                    <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Max downloads</label>
                                    <input type="number" id="share-max-downloads" class="modal-input" value="${maxDl}" min="1" placeholder="Geen limiet" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.05); color:var(--text-main);">
                                </div>
                            </div>
                            
                            <div class="modal-group" style="display: flex; align-items: center; gap: 12px; margin-top: 20px;">
                                <label class="ios-switch">
                                    <input type="checkbox" id="share-burn-link" ${isBurn}>
                                    <span class="ios-slider"></span>
                                </label>
                                <label for="share-burn-link" style="cursor: pointer; font-size: 0.95rem; color: var(--text-main); font-weight: 600;">Burn Link (vernietig direct na bereiken limiet)</label>
                            </div>
                        </div>

                        <div id="tab-advanced" style="display: none;">
                            ${requestHtml}
                            ${folderFeaturesHtml}
                            
                            <div class="modal-group" style="margin-bottom: 20px; background: rgba(128,128,128,0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-dropdown);">
                                <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.9rem; font-weight:bold; color:var(--text-main);">Visueel Thema (Gastenweergave)</label>
                                <select id="share-theme" class="modal-input" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-dropdown); background:var(--bg-dropdown); color:var(--text-main); cursor:pointer;">
                                    <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Donker (Standaard)</option>
                                    <option value="light" ${theme === 'light' ? 'selected' : ''}>Licht (Zakelijk)</option>
                                    <option value="creative" ${theme === 'creative' ? 'selected' : ''}>Kleurrijk (Creatief)</option>
                                </select>
                            </div>

                            <div class="modal-group" style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                                <label class="ios-switch">
                                    <input type="checkbox" id="share-preview-only" ${isPreviewOnly}>
                                    <span class="ios-slider"></span>
                                </label>
                                <label for="share-preview-only" style="cursor: pointer; font-size: 0.95rem; color: var(--text-main); font-weight: 600;">Alleen Preview (Downloaden blokkeren)</label>
                            </div>

                            <div class="modal-group" style="display: flex; align-items: center; gap: 12px;">
                                <label class="ios-switch">
                                    <input type="checkbox" id="share-notify" ${isNotify}>
                                    <span class="ios-slider"></span>
                                </label>
                                <label for="share-notify" style="cursor: pointer; font-size: 0.9rem; color: var(--text-main);">Stuur mij een e-mail bij download</label>
                            </div>

                            ${watermarkHtml}
                        </div>

                        <div id="tab-collab" style="display: none;">
                            <div style="margin-bottom: 20px; position:relative;">
                                <label class="modal-label" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Nodig gebruikers uit</label>
                                <input type="text" id="collab-search-input" class="modal-input" placeholder="Typ naam of e-mailadres..." autocomplete="off" style="width:100%; padding:10px 14px; border-radius:8px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.05); color:var(--text-main);">
                                <div id="collab-search-results" style="position:absolute; top:100%; left:0; width:100%; background:var(--bg-dropdown); border:1px solid var(--border-dropdown); border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.15); margin-top:4px; display:none; z-index:1000; max-height:200px; overflow-y:auto;"></div>
                            </div>
                            <div id="collab-list-container" style="background:rgba(128,128,128,0.02); border-radius:8px; padding:15px; border:1px solid var(--border-dropdown);">
                                <h4 style="margin:0 0 10px 0; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Wie heeft er toegang?</h4>
                                <div id="collab-list">
                                    <div style="text-align:center; padding:20px;">
                                        <div class="btn-loader" style="width:20px; height:20px; border-width:2px; border-top-color:var(--primary); margin:0 auto; display:inline-block;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="share-result" style="display:none; text-align:center;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); color: #22c55e; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto;">
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 style="margin-top: 0; color: var(--text-main); font-size:1.4rem;">${isEdit ? 'Link Bijgewerkt!' : 'Link Aangemaakt!'}</h2>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Je kunt deze externe link nu delen.</p>
                            
                            <input type="text" id="share-link-output" readonly style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--primary); background: rgba(37, 99, 235, 0.05); color: var(--primary); font-weight: bold; margin-bottom: 20px; text-align: center; cursor:pointer;">
                            
                            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                                <button id="btn-copy-link" class="btn btn-primary" style="flex:1; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; border:none; cursor:pointer;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Kopieer
                                </button>
                                <button id="btn-whatsapp" class="btn btn-secondary" style="flex:1; padding:10px; border-radius:8px; color: #25D366; border-color: rgba(37, 211, 102, 0.3); background:transparent; cursor:pointer;">WhatsApp</button>
                                <button id="btn-telegram" class="btn btn-secondary" style="flex:1; padding:10px; border-radius:8px; color: #0088cc; border-color: rgba(0, 136, 204, 0.3); background:transparent; cursor:pointer;">Telegram</button>
                                <button id="btn-email-share" class="btn btn-secondary" style="flex:1; padding:10px; border-radius:8px; color: #ea4335; border-color: rgba(234, 67, 53, 0.3); background:transparent; cursor:pointer;">E-mail</button>
                            </div>
                            
                            <div id="qr-container" style="background: white; padding: 10px; border-radius: 8px; width: fit-content; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.1);"></div>
                        </div>

                    </div>

                    <div id="share-modal-footer" style="padding:16px 24px; border-top:1px solid var(--border-dropdown); background: rgba(128,128,128,0.02); display:flex; justify-content:flex-end; gap:12px;">
                        <button class="btn btn-secondary cancel-btn" style="padding:8px 16px; border-radius:6px; border:1px solid var(--border-dropdown); background:transparent; cursor:pointer; color:var(--text-main);">Annuleren / Sluiten</button>
                        <button class="btn btn-primary confirm-btn" style="padding:8px 16px; border-radius:6px; border:none; background:var(--primary); color:white; cursor:pointer;">${btnText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.overlay);

            // Logica voor Oogje en Wachtwoord
            const eyeBtn = document.getElementById('toggle-pw-visibility');
            const pwInput = document.getElementById('share-password');
            if (eyeBtn && pwInput) {
                eyeBtn.onclick = () => {
                    if (pwInput.type === 'password') {
                        pwInput.type = 'text';
                        eyeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
                    } else {
                        pwInput.type = 'password';
                        eyeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
                    }
                };
            }

            // Logica voor Tree-view animatie
            const subToggle = document.getElementById('share-include-subfolders');
            const treePreview = document.getElementById('tree-view-preview');
            if (subToggle && treePreview) {
                subToggle.addEventListener('change', (e) => {
                    const subs = treePreview.querySelectorAll('.sub-node-item');
                    subs.forEach(s => {
                        s.style.opacity = e.target.checked ? '1' : '0.4';
                        s.style.textDecoration = e.target.checked ? 'none' : 'line-through';
                    });
                });
                // Trigger event immediately to set initial visual state
                subToggle.dispatchEvent(new Event('change'));
            }

            this.overlay.querySelector('.close-btn').onclick = () => {
                this.overlay.remove();
            };
            
            this.overlay.querySelector('.cancel-btn').onclick = () => {
                this.overlay.remove();
            };
            
            this.overlay.querySelector('.confirm-btn').onclick = () => {
                const tabCollab = document.getElementById('tab-collab');
                if (tabCollab && tabCollab.style.display === 'block') {
                    this.overlay.remove();
                } else {
                    const btn = this.overlay.querySelector('.confirm-btn');
                    btn.disabled = true;
                    btn.innerHTML = '<div class="btn-loader" style="width:14px;height:14px;border-width:2px;border-top-color:white;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Bezig...';
                    this.submitShare(targetType, targetId);
                }
            };

            const btnBasic = document.getElementById('tab-btn-basic');
            const btnAdv = document.getElementById('tab-btn-advanced');
            const btnCollab = document.getElementById('tab-btn-collab');
            
            const tabBasic = document.getElementById('tab-basic');
            const tabAdv = document.getElementById('tab-advanced');
            const tabCollab = document.getElementById('tab-collab');
            const footerBtn = this.overlay.querySelector('.confirm-btn');

            const switchTab = (activeBtn, activeTab) => {
                const allTabs = [tabBasic, tabAdv, tabCollab];
                allTabs.forEach(t => { 
                    if (t) t.style.display = 'none'; 
                });
                
                const allBtns = [btnBasic, btnAdv, btnCollab];
                allBtns.forEach(b => { 
                    if (b) { 
                        b.style.borderBottomColor = 'transparent'; 
                        b.style.color = 'var(--text-muted)'; 
                    }
                });
                
                activeTab.style.display = 'block';
                if (activeBtn) {
                    activeBtn.style.borderBottomColor = 'var(--primary)';
                    activeBtn.style.color = 'var(--primary)';
                }

                if (activeTab === tabCollab) {
                    footerBtn.textContent = 'Klaar';
                } else {
                    footerBtn.textContent = isEdit ? 'Opslaan' : 'Aanmaken';
                }
            };

            if (btnBasic) {
                btnBasic.onclick = () => switchTab(btnBasic, tabBasic);
            }
            if (btnAdv) {
                btnAdv.onclick = () => switchTab(btnAdv, tabAdv);
            }
            if (btnCollab) {
                btnCollab.onclick = () => switchTab(btnCollab, tabCollab);
            }

            this.setupCollabTab(targetType, targetId);
        }

        setupCollabTab(targetType, targetId) {
            this.loadCollaborators(targetType, targetId);
            
            const input = document.getElementById('collab-search-input');
            const resultsBox = document.getElementById('collab-search-results');
            
            if (!input || !resultsBox) return;

            let timeout = null;
            input.addEventListener('input', (e) => {
                const q = e.target.value.trim();
                clearTimeout(timeout);
                
                if (q.length < 2) {
                    resultsBox.style.display = 'none';
                    return;
                }
                
                timeout = setTimeout(async () => {
                    try {
                        const res = await fetch(`/api/share/users?q=${encodeURIComponent(q)}&_t=${Date.now()}`);
                        const data = await res.json();
                        
                        if (data.status === 'success' && data.users.length > 0) {
                            resultsBox.innerHTML = '';
                            data.users.forEach(u => {
                                const div = document.createElement('div');
                                div.style.cssText = 'padding:10px 15px; cursor:pointer; display:flex; align-items:center; gap:10px; border-bottom:1px solid rgba(128,128,128,0.1); transition:background 0.2s;';
                                
                                div.onmouseover = () => {
                                    div.style.background = 'rgba(37,99,235,0.05)';
                                };
                                div.onmouseout = () => {
                                    div.style.background = 'transparent';
                                };
                                
                                const avatarHtml = u.avatar_path 
                                    ? `<img src="${u.avatar_path}" style="width:100%; height:100%; object-fit:cover;">` 
                                    : u.username.charAt(0).toUpperCase();
                                
                                div.innerHTML = `
                                    <div style="width:30px; height:30px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:bold; overflow:hidden; flex-shrink:0;">
                                        ${avatarHtml}
                                    </div>
                                    <div style="flex:1; min-width:0;">
                                        <div style="font-size:0.85rem; font-weight:600; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                            ${u.username}
                                        </div>
                                        <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                            ${u.email}
                                        </div>
                                    </div>
                                    <div style="color:var(--primary); font-size:0.8rem; font-weight:600;">+ Toevoegen</div>
                                `;
                                
                                div.addEventListener('click', () => { 
                                    input.value = ''; 
                                    resultsBox.style.display = 'none'; 
                                    this.addCollaborator(targetType, targetId, u.id, 'viewer'); 
                                });
                                
                                resultsBox.appendChild(div);
                            });
                            resultsBox.style.display = 'block';
                        } else {
                            resultsBox.innerHTML = '<div style="padding:10px 15px; font-size:0.85rem; color:var(--text-muted);">Geen gebruikers gevonden.</div>';
                            resultsBox.style.display = 'block';
                        }
                    } catch(err) { 
                        console.error("Fout bij zoeken:", err); 
                    }
                }, 300);
            });
            
            document.addEventListener('click', (e) => { 
                if (input && resultsBox && !input.contains(e.target) && !resultsBox.contains(e.target)) {
                    resultsBox.style.display = 'none'; 
                }
            });
        }

        async loadCollaborators(targetType, targetId) {
            const listEl = document.getElementById('collab-list');
            if (!listEl) return;
            
            try {
                const res = await fetch(`/api/share/collaborators?target_type=${targetType}&target_id=${targetId}&_t=${Date.now()}`);
                const data = await res.json();
                
                if (data.status === 'success') {
                    listEl.innerHTML = '';
                    
                    if (data.collaborators.length === 0) {
                        listEl.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.85rem;">Alleen jij hebt momenteel toegang tot dit item.</div>';
                        return;
                    }
                    
                    data.collaborators.forEach(c => {
                        const div = document.createElement('div');
                        div.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(128,128,128,0.1);';
                        
                        const avatarHtml = c.avatar_path 
                            ? `<img src="${c.avatar_path}" style="width:100%; height:100%; object-fit:cover;">` 
                            : c.username.charAt(0).toUpperCase();
                            
                        div.innerHTML = `
                            <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                                <div style="width:36px; height:36px; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-size:1rem; font-weight:bold; overflow:hidden; flex-shrink:0;">
                                    ${avatarHtml}
                                </div>
                                <div style="min-width:0;">
                                    <div style="font-size:0.9rem; font-weight:600; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                        ${c.username}
                                    </div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                        ${c.email}
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <select class="collab-role-select" data-id="${c.user_id}" style="padding:6px 10px; border-radius:6px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.02); color:var(--text-main); font-size:0.8rem; outline:none; cursor:pointer;">
                                    <option value="viewer" ${c.role === 'viewer' ? 'selected' : ''}>Lezer</option>
                                    <option value="editor" ${c.role === 'editor' ? 'selected' : ''}>Bewerker</option>
                                    <option value="co_owner" ${c.role === 'co_owner' ? 'selected' : ''}>Mede-eigenaar</option>
                                </select>
                                <button class="btn-icon-tiny collab-remove-btn" data-collab-id="${c.collab_id}" style="background:rgba(239, 68, 68, 0.1); border:none; color:var(--error); cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center;" title="Toegang intrekken">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        `;
                        listEl.appendChild(div);
                    });
                    
                    listEl.querySelectorAll('.collab-role-select').forEach(sel => { 
                        sel.addEventListener('change', (e) => this.addCollaborator(targetType, targetId, e.target.dataset.id, e.target.value)); 
                    });
                    
                    listEl.querySelectorAll('.collab-remove-btn').forEach(btn => { 
                        btn.addEventListener('click', (e) => this.removeCollaborator(e.currentTarget.dataset.collabId, targetType, targetId)); 
                    });
                }
            } catch(e) { 
                listEl.innerHTML = '<div style="color:var(--error); font-size:0.85rem; padding:10px;">Fout bij laden van toegangslijst.</div>'; 
            }
        }

        async addCollaborator(targetType, targetId, userId, role) {
            try {
                const csrfRes = await fetch(`/api/csrf?_t=${Date.now()}`);
                const csrfData = await csrfRes.json();
                
                const fd = new FormData();
                fd.append('target_type', targetType); 
                fd.append('target_id', targetId); 
                fd.append('user_id', userId); 
                fd.append('role', role); 
                fd.append('csrf_token', csrfData.csrf_token);
                
                const res = await fetch('/api/share/collaborators/add', { method: 'POST', body: fd });
                const data = await res.json();
                
                if (data.status === 'success') { 
                    this.showNotification('Toegang bijgewerkt', 'success'); 
                    this.loadCollaborators(targetType, targetId); 
                } else { 
                    this.showNotification(data.message, 'error'); 
                }
            } catch(e) { 
                this.showNotification('Netwerkfout bij toevoegen', 'error'); 
            }
        }

        async removeCollaborator(collabId, targetType, targetId) {
            try {
                const csrfRes = await fetch(`/api/csrf?_t=${Date.now()}`);
                const csrfData = await csrfRes.json();
                
                const fd = new FormData();
                fd.append('collab_id', collabId); 
                fd.append('csrf_token', csrfData.csrf_token);
                
                const res = await fetch('/api/share/collaborators/remove', { method: 'POST', body: fd });
                const data = await res.json();
                
                if (data.status === 'success') { 
                    this.showNotification('Toegang verwijderd', 'success'); 
                    this.loadCollaborators(targetType, targetId); 
                } else { 
                    this.showNotification(data.message, 'error'); 
                }
            } catch(e) { 
                this.showNotification('Netwerkfout bij verwijderen', 'error'); 
            }
        }

        async submitShare(targetType, targetId) {
            const nameEl = document.getElementById('share-name');
            const shareName = nameEl ? nameEl.value : '';

            const passwordEl = document.getElementById('share-password');
            let password = passwordEl ? passwordEl.value : '';
            
            const removePwEl = document.getElementById('share-remove-password');
            if (removePwEl && removePwEl.checked) {
                password = 'REMOVE_PASSWORD';
            }

            let expiresAt = document.getElementById('share-expiry') ? document.getElementById('share-expiry').value : '';
            if (expiresAt) {
                expiresAt = expiresAt.replace('T', ' ') + ':00';
            }

            const maxDownloads = document.getElementById('share-max-downloads') ? document.getElementById('share-max-downloads').value : '';
            const isBurnLink = document.getElementById('share-burn-link') && document.getElementById('share-burn-link').checked ? '1' : '0';
            const isPreviewOnly = document.getElementById('share-preview-only') && document.getElementById('share-preview-only').checked ? '1' : '0';
            const isNotify = document.getElementById('share-notify') && document.getElementById('share-notify').checked ? '1' : '0';
            
            const incSubEl = document.getElementById('share-include-subfolders');
            const includeSubfolders = (incSubEl && !incSubEl.checked) ? '0' : '1';
            
            const typesEl = document.getElementById('share-allowed-types');
            const allowedTypes = typesEl ? typesEl.value : 'all';

            const watermarkEl = document.getElementById('share-watermark');
            const requestEl = document.getElementById('share-file-request');
            const themeEl = document.getElementById('share-theme');
            
            const theme = themeEl ? themeEl.value : 'dark';
            const watermark = watermarkEl ? watermarkEl.value : '';
            const isRequest = (requestEl && requestEl.checked) ? 'request' : targetType;

            const formData = new FormData();
            formData.append('target_id', targetId);
            formData.append('share_name', shareName);
            formData.append('password', password);
            formData.append('expires_at', expiresAt);
            formData.append('max_downloads', maxDownloads);
            formData.append('is_burn_link', isBurnLink);
            formData.append('is_preview_only', isPreviewOnly);
            formData.append('notify_on_download', isNotify);
            formData.append('watermark_text', watermark);
            formData.append('theme', theme);
            formData.append('include_subfolders', includeSubfolders);
            formData.append('allowed_types', allowedTypes);

            let endpoint = '/api/share/create';
            if (this.mode === 'edit') {
                endpoint = '/api/share/update';
                formData.append('share_id', this.currentShareId);
            } else {
                formData.append('target_type', isRequest); 
            }

            try {
                const csrfRes = await fetch(`/api/csrf?_t=${Date.now()}`);
                if (!csrfRes.ok) throw new Error('Kon CSRF token niet ophalen.');
                
                const csrfData = await csrfRes.json();
                formData.append('csrf_token', csrfData.csrf_token);

                const response = await fetch(endpoint, { method: 'POST', body: formData });
                const responseText = await response.text();
                
                let data;
                try { 
                    data = JSON.parse(responseText); 
                } catch (parseError) { 
                    throw new Error("Server stuurde ongeldige data."); 
                }

                if (data.status === 'success') {
                    this.showNotification(data.message, 'success');
                    this.showResult(data.link);
                    if (window.App && window.App.sharesViewInstance) {
                        window.App.sharesViewInstance.loadShares();
                    }
                } else {
                    this.showNotification('Fout: ' + data.message, 'error');
                    this.resetButton();
                }
            } catch (error) {
                this.showNotification('Fout bij opslaan: ' + error.message, 'error');
                this.resetButton();
            }
        }

        resetButton() {
            if (!this.overlay) return;
            const btn = this.overlay.querySelector('.confirm-btn');
            if (btn) {
                btn.disabled = false;
                btn.textContent = this.mode === 'edit' ? 'Opslaan' : 'Aanmaken';
            }
        }

        showResult(link) {
            if (!this.overlay) return;
            
            const tabsNav = document.getElementById('share-tabs-nav');
            if (tabsNav) {
                tabsNav.style.display = 'none';
            }
            
            const allTabs = ['tab-basic', 'tab-advanced', 'tab-collab'];
            allTabs.forEach(id => { 
                const el = document.getElementById(id); 
                if (el) el.style.display = 'none'; 
            });
            
            const footer = document.getElementById('share-modal-footer');
            if (footer) {
                footer.innerHTML = `<button class="btn btn-primary" style="width:100%; padding:10px; border-radius:6px; font-weight:bold; border:none; background:var(--primary); color:white; cursor:pointer;" onclick="document.querySelector('.modal-overlay.visible').remove()">Klaar & Sluiten</button>`;
            }

            const resultDiv = document.getElementById('share-result');
            const outputInput = document.getElementById('share-link-output');
            const qrContainer = document.getElementById('qr-container');
            
            if (!resultDiv) return;

            resultDiv.style.opacity = '0';
            resultDiv.style.display = 'block';
            
            setTimeout(() => { 
                resultDiv.style.transition = 'opacity 0.4s ease'; 
                resultDiv.style.opacity = '1'; 
            }, 50);

            outputInput.value = link;
            outputInput.onclick = () => { 
                outputInput.select(); 
                document.execCommand('copy'); 
                this.showNotification('Link gekopieerd!', 'success'); 
            };

            qrContainer.innerHTML = '';
            try { 
                new VanillaQR({ text: link, width: 150, height: 150 }).render(qrContainer); 
            } catch(e) { 
                qrContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">QR laden mislukt</p>'; 
            }

            document.getElementById('btn-copy-link').onclick = () => { 
                navigator.clipboard.writeText(link).then(() => { 
                    this.showNotification('Link gekopieerd naar klembord!', 'success'); 
                }); 
            };
            
            document.getElementById('btn-whatsapp').onclick = () => {
                window.open(`https://wa.me/?text=${encodeURIComponent('Ik heb een bestand met je gedeeld: ' + link)}`, '_blank');
            };
            
            document.getElementById('btn-telegram').onclick = () => {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Ik heb een bestand met je gedeeld via FileManager')}`, '_blank');
            };
            
            document.getElementById('btn-email-share').onclick = () => {
                window.location.href = `mailto:?subject=${encodeURIComponent('Bestand gedeeld via FileManager')}&body=${encodeURIComponent('Hier is de veilige link naar het bestand dat ik met je wil delen:\n\n' + link)}`;
            };
        }
    }

    class VanillaQR {
        constructor(options) { 
            this.text = options.text; 
            this.size = options.width || 150; 
        }
        render(container) {
            fetch(`https://api.qrserver.com/v1/create-qr-code/?size=${this.size}x${this.size}&data=${encodeURIComponent(this.text)}`)
                .then(res => res.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const img = document.createElement('img');
                    img.src = url; 
                    img.style.display = 'block'; 
                    img.style.borderRadius = '4px';
                    container.appendChild(img);
                }).catch(() => { 
                    container.innerHTML = '<span style="font-size:0.8rem;">QR Code geblokkeerd</span>'; 
                });
        }
    }

    window.ShareModal = ShareModal;
    window.App = window.App || {};
    window.App.ShareModalClass = ShareModal;
})();