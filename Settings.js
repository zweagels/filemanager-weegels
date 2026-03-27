/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Settings | FILE: public/js/modules/admin/Settings.js */

(function() {
    class Settings {
        constructor() {
            this.container = document.getElementById('file-view');
            this.userData = null;
            this.saveTimer = null;

            if (window.EventBus) {
                window.EventBus.on('navigation:navigate', (path) => {
                    if (path === 'settings') {
                        document.body.classList.add('settings-view-active');
                        this.mount();
                    } else {
                        document.body.classList.remove('settings-view-active');
                    }
                });
            }
        }

        async mount() {
            if (!this.container) return;

            if (!document.getElementById('settings-css-link')) {
                const link = document.createElement('link');
                link.id = 'settings-css-link';
                link.rel = 'stylesheet';
                link.href = '/public/css/views/settings.css';
                document.head.appendChild(link);
            }

            if (window.App && window.App.propertiesPanel && window.App.propertiesPanel.panel) {
                window.App.propertiesPanel.panel.classList.remove('visible');
            }
            const mainToolbar = document.getElementById('main-toolbar');
            if (mainToolbar) mainToolbar.style.display = 'none';

            this.container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 20px;">
                    <div style="width: 40px; height: 40px; border: 4px solid rgba(37, 99, 235, 0.2); border-top-color: #2563EB; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="color: var(--text-muted);">Instellingen laden...</div>
                </div>
            `;

            await this.loadData();
            this.renderLayout();
        }

        async loadData() {
            try {
                const res = await fetch('/api/settings');
                const json = await res.json();
                
                if (json.status === 'success') {
                    this.userData = json.data;
                } else {
                    throw new Error(json.message);
                }
            } catch (error) {
                console.error("Instellingen laadfout:", error);
                if (window.EventBus) window.EventBus.emit('notify:error', 'Kon instellingen niet laden.');
            }
        }

        renderLayout() {
            if (!this.userData) return;

            const prefs = this.userData.preferences || {};
            const defView = prefs.default_view || 'grid';
            const defSort = prefs.default_sort || 'name';
            const notifEnabled = prefs.notifications !== false; 
            const darkTheme = prefs.theme === 'dark';
            
            // FASE F: Grey-Out logic voor de Prullenbak als de Admin het dicteert
            const forcedTrash = window.currentUser && window.currentUser.force_trash_days ? parseInt(window.currentUser.force_trash_days) : 0;
            const trashDisabled = forcedTrash > 0 ? 'disabled style="background:rgba(128,128,128,0.1); cursor:not-allowed;"' : '';
            const trashDays = prefs.auto_clear_trash_days !== undefined ? prefs.auto_clear_trash_days : 30;

            const avatarHtml = this.userData.avatar_file_id 
                ? `<img src="/api/files?action=thumb&id=${this.userData.avatar_file_id}" style="width:100%; height:100%; object-fit:cover;">`
                : `<svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-top:20px; color:var(--text-muted);"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

            const headerHtml = this.userData.header_file_id
                ? `<img src="/api/files?action=thumb&id=${this.userData.header_file_id}" style="width:100%; height:100%; object-fit:cover;">`
                : ``;

            this.container.innerHTML = `
                <div class="settings-wrapper">
                    <div class="settings-sidebar">
                        <div class="settings-sidebar-header">
                            <h2 class="settings-sidebar-title">Instellingen</h2>
                            <div class="settings-search-box">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input type="text" id="settings-search" class="settings-search-input" placeholder="Zoek instelling...">
                            </div>
                        </div>

                        <div class="settings-nav-group">
                            <div class="settings-nav-group-title">Account</div>
                            <a class="settings-nav-item active" data-target="profiel">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                Profiel
                            </a>
                            <a class="settings-nav-item" data-target="security">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                Beveiliging
                            </a>
                        </div>

                        <div class="settings-nav-group">
                            <div class="settings-nav-group-title">Applicatie</div>
                            <a class="settings-nav-item" data-target="voorkeuren">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="21"></line></svg>
                                Weergave
                            </a>
                        </div>
                    </div>

                    <div class="settings-content" id="settings-content-area">
                        
                        <div class="settings-section active" id="sec-profiel" data-keywords="profiel naam email avatar foto achtergrond banner">
                            <div class="settings-section-header">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <h3 class="settings-section-title">Profiel</h3>
                                        <p class="settings-section-desc">Beheer je persoonlijke gegevens en publieke weergave.</p>
                                    </div>
                                    <div class="save-indicator" id="ind-profiel">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Opgeslagen
                                    </div>
                                </div>
                            </div>

                            <div class="settings-card" style="padding:0; padding-bottom: 24px;">
                                <div class="profile-banner-edit" title="Binnenkort beschikbaar">
                                    ${headerHtml}
                                    <div class="edit-overlay"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                                </div>
                                <div class="profile-avatar-wrapper">
                                    <div class="profile-avatar-edit" title="Binnenkort beschikbaar">
                                        ${avatarHtml}
                                        <div class="edit-overlay"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div>
                                    </div>
                                </div>
                                <div style="padding: 0 24px;">
                                    <div style="display:flex; gap:20px;">
                                        <div class="settings-group" style="flex:1;">
                                            <label class="settings-label">Voornaam</label>
                                            <input type="text" class="settings-input auto-save-input" id="set-fname" value="${this.userData.first_name || ''}">
                                        </div>
                                        <div class="settings-group" style="flex:1;">
                                            <label class="settings-label">Achternaam</label>
                                            <input type="text" class="settings-input auto-save-input" id="set-lname" value="${this.userData.last_name || ''}">
                                        </div>
                                    </div>
                                    <div class="settings-group" style="margin-top:20px;">
                                        <label class="settings-label">E-mailadres</label>
                                        <input type="email" class="settings-input auto-save-input" id="set-email" value="${this.userData.email || ''}">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-security" data-keywords="beveiliging wachtwoord veranderen security sessies">
                            <div class="settings-section-header">
                                <h3 class="settings-section-title">Beveiliging</h3>
                                <p class="settings-section-desc">Wijzig je wachtwoord en beheer je actieve sessies.</p>
                            </div>

                            <div class="settings-card">
                                <h4 style="margin: 0 0 20px 0; font-size: 1.1rem;">Wachtwoord Wijzigen</h4>
                                <div class="settings-group">
                                    <label class="settings-label">Huidig wachtwoord</label>
                                    <input type="password" class="settings-input" id="pwd-old" placeholder="Verplicht om te wijzigen">
                                </div>
                                <div class="settings-group">
                                    <label class="settings-label">Nieuw wachtwoord</label>
                                    <input type="password" class="settings-input" id="pwd-new" placeholder="Minimaal 8 karakters">
                                </div>
                                <div class="settings-group">
                                    <label class="settings-label">Bevestig nieuw wachtwoord</label>
                                    <input type="password" class="settings-input" id="pwd-confirm" placeholder="Typ nogmaals">
                                </div>
                                <button id="btn-save-password" class="btn-primary" style="margin-top: 10px; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border:none; color:white; background:var(--primary);">Wachtwoord Bijwerken</button>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-voorkeuren" data-keywords="weergave voorkeuren grid lijst thema donker notificaties">
                            <div class="settings-section-header">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <h3 class="settings-section-title">Weergave & Voorkeuren</h3>
                                        <p class="settings-section-desc">Pas de applicatie aan naar jouw werkstijl.</p>
                                    </div>
                                    <div class="save-indicator" id="ind-voorkeuren">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Opgeslagen
                                    </div>
                                </div>
                            </div>

                            <div class="settings-card">
                                <div class="settings-group">
                                    <label class="settings-label">Standaard Weergave</label>
                                    <select class="settings-select auto-save-input" id="set-def-view">
                                        <option value="grid" ${defView === 'grid' ? 'selected' : ''}>Tegels (Grid)</option>
                                        <option value="list" ${defView === 'list' ? 'selected' : ''}>Lijst</option>
                                        <option value="masonry" ${defView === 'masonry' ? 'selected' : ''}>Pinterest (Masonry)</option>
                                    </select>
                                </div>
                                <div class="settings-group">
                                    <label class="settings-label">Standaard Sortering</label>
                                    <select class="settings-select auto-save-input" id="set-def-sort">
                                        <option value="name" ${defSort === 'name' ? 'selected' : ''}>Naam (A-Z)</option>
                                        <option value="date" ${defSort === 'date' ? 'selected' : ''}>Datum (Nieuwste eerst)</option>
                                        <option value="size" ${defSort === 'size' ? 'selected' : ''}>Grootte (Grootste eerst)</option>
                                    </select>
                                </div>
                                
                                <div class="settings-group" style="margin-top:20px;">
                                    <label class="settings-label">Prullenbak automatisch legen</label>
                                    <select class="settings-select auto-save-input" id="set-trash-days" ${trashDisabled}>
                                        <option value="0" ${trashDays == 0 ? 'selected' : ''}>Nooit (Handmatig)</option>
                                        <option value="7" ${trashDays == 7 ? 'selected' : ''}>Na 7 dagen</option>
                                        <option value="30" ${trashDays == 30 ? 'selected' : ''}>Na 30 dagen</option>
                                    </select>
                                    ${forcedTrash > 0 ? `<div style="color:var(--warning); font-size:0.8rem; margin-top:4px; font-weight:600;">🔒 Beheerd door Admin (Geforceerd op ${forcedTrash} dagen)</div>` : `<div style="color:var(--text-muted); font-size:0.8rem; margin-top:4px;">Items ouder dan dit aantal dagen worden permanent gewist.</div>`}
                                </div>

                                <div style="margin-top:30px; margin-bottom:10px; font-weight:700; color:var(--text-muted); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px;">Systeem Schakelaars</div>
                                
                                <div class="settings-toggle-row">
                                    <div>
                                        <div style="font-weight:600; color:var(--text-main);">Push Notificaties (Toasts)</div>
                                        <div style="font-size:0.85rem; color:var(--text-muted);">Toon succes- en foutmeldingen rechtsonderin.</div>
                                    </div>
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="set-notif" class="auto-save-input" ${notifEnabled ? 'checked' : ''}>
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>

                                <div class="settings-toggle-row">
                                    <div>
                                        <div style="font-weight:600; color:var(--text-main);">Forceer Donker Thema</div>
                                        <div style="font-size:0.85rem; color:var(--text-muted);">Negeer de OS instelling en gebruik altijd Dark Mode.</div>
                                    </div>
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="set-theme" class="auto-save-input" ${darkTheme ? 'checked' : ''}>
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            `;

            this.initListeners();
        }

        initListeners() {
            const navItems = document.querySelectorAll('.settings-nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    document.querySelectorAll('.settings-section').forEach(sec => sec.classList.remove('active'));
                    document.getElementById('sec-' + item.dataset.target).classList.add('active');
                });
            });

            const searchInput = document.getElementById('settings-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const q = e.target.value.toLowerCase();
                    if (q === '') {
                        document.querySelectorAll('.settings-section').forEach(sec => sec.style.display = '');
                        const activeNav = document.querySelector('.settings-nav-item.active');
                        if(activeNav) {
                            document.querySelectorAll('.settings-section').forEach(sec => sec.classList.remove('active'));
                            document.getElementById('sec-' + activeNav.dataset.target).classList.add('active');
                        }
                        return;
                    }

                    document.querySelectorAll('.settings-section').forEach(sec => {
                        const keywords = sec.dataset.keywords || '';
                        if (keywords.includes(q)) {
                            sec.style.display = 'block';
                            sec.classList.add('active');
                        } else {
                            sec.style.display = 'none';
                            sec.classList.remove('active');
                        }
                    });
                });
            }

            const autoSaveInputs = document.querySelectorAll('.auto-save-input');
            autoSaveInputs.forEach(input => {
                input.addEventListener('input', () => this.triggerAutoSave());
                input.addEventListener('change', () => this.triggerAutoSave());
            });

            const btnSavePwd = document.getElementById('btn-save-password');
            if (btnSavePwd) {
                btnSavePwd.addEventListener('click', () => this.changePassword());
            }
        }

        triggerAutoSave() {
            const activeTab = document.querySelector('.settings-section.active');
            let indicator = null;
            if (activeTab && activeTab.id === 'sec-profiel') indicator = document.getElementById('ind-profiel');
            if (activeTab && activeTab.id === 'sec-voorkeuren') indicator = document.getElementById('ind-voorkeuren');

            if (indicator) {
                indicator.innerHTML = `<div style="width:14px; height:14px; border:2px solid var(--warning); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div> Opslaan...`;
                indicator.className = 'save-indicator saving';
            }

            clearTimeout(this.saveTimer);
            this.saveTimer = setTimeout(() => this.executeSave(indicator), 1000);
        }

        async executeSave(indicator) {
            const payload = {
                first_name: document.getElementById('set-fname').value,
                last_name: document.getElementById('set-lname').value,
                email: document.getElementById('set-email').value,
                preferences: {
                    default_view: document.getElementById('set-def-view').value,
                    default_sort: document.getElementById('set-def-sort').value,
                    auto_clear_trash_days: parseInt(document.getElementById('set-trash-days').value),
                    notifications: document.getElementById('set-notif').checked,
                    theme: document.getElementById('set-theme').checked ? 'dark' : 'system'
                }
            };

            try {
                const res = await fetch('/api/settings/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const json = await res.json();
                if (json.status === 'success') {
                    if (indicator) {
                        indicator.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Opgeslagen`;
                        indicator.className = 'save-indicator saved';
                        setTimeout(() => { indicator.className = 'save-indicator'; }, 2000);
                    }
                    if (payload.preferences.theme === 'dark') document.body.classList.add('theme-dark');
                    else if (payload.preferences.theme === 'system') document.body.classList.remove('theme-dark');
                } else {
                    throw new Error(json.message);
                }
            } catch (err) {
                if (indicator) {
                    indicator.innerHTML = `<span style="color:var(--error);">Fout bij opslaan</span>`;
                    indicator.className = 'save-indicator saved';
                }
                if (window.EventBus) window.EventBus.emit('notify:error', err.message);
            }
        }

        async changePassword() {
            const oldPwd = document.getElementById('pwd-old').value;
            const newPwd = document.getElementById('pwd-new').value;
            const confirmPwd = document.getElementById('pwd-confirm').value;

            if (!oldPwd || !newPwd || !confirmPwd) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Vul alle wachtwoord velden in.');
                return;
            }

            if (newPwd !== confirmPwd) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Nieuwe wachtwoorden komen niet overeen.');
                return;
            }

            if (newPwd.length < 8) {
                if (window.EventBus) window.EventBus.emit('notify:error', 'Wachtwoord moet minimaal 8 tekens zijn.');
                return;
            }

            const btn = document.getElementById('btn-save-password');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Opslaan...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/settings/password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
                });
                
                const json = await res.json();
                if (json.status === 'success') {
                    if (window.EventBus) window.EventBus.emit('notify:success', 'Wachtwoord succesvol gewijzigd!');
                    document.getElementById('pwd-old').value = '';
                    document.getElementById('pwd-new').value = '';
                    document.getElementById('pwd-confirm').value = '';
                } else {
                    throw new Error(json.message);
                }
            } catch (err) {
                if (window.EventBus) window.EventBus.emit('notify:error', err.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => {
        window.App.settings = new Settings();
    });
})();