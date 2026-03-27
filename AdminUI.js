/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Admin | FILE: public/js/modules/admin/AdminUI.js */

(function() {
    class AdminUI {
        constructor() {
            this.container = document.getElementById('file-view');
            this.adminData = { 
                stats: null, users: [], roles: [], logs: [], settings: {}, blacklist: [],
                advancedStats: null, globalFiles: [], globalLinks: [], tiers: [], 
                loginAttempts: [], mimeTypes: [], branding: {}
            };
            this.currentEditUserId = null;
            this.currentEditRoleId = null;
            this._stylesInjected = false; 

            if (window.EventBus) {
                window.EventBus.on('navigation:navigate', (path) => {
                    if (path === 'admin') {
                        if (!window.currentUser || (window.currentUser.role !== 'admin' && (!window.currentUser.permissions || !window.currentUser.permissions.admin_access))) {
                            window.EventBus.emit('notify:error', 'Toegang geweigerd. Alleen voor beheerders.');
                            window.EventBus.emit('navigation:navigate', 'dashboard');
                            return;
                        }
                        document.body.classList.add('settings-view-active');
                        this.mount();
                    }
                });
            }
        }

        injectAdminStyles() {
            if (this._stylesInjected) return;
            this._stylesInjected = true;

            document.addEventListener('click', (e) => {
                if(e.target.closest('#btn-stop-impersonate')) {
                    fetch('/api/admin/impersonate/stop', {method:'POST'}).then(r => { if(r.ok) window.location.href='/dashboard'; });
                }
            });
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

            this.injectAdminStyles();

            if (window.App && window.App.propertiesPanel && window.App.propertiesPanel.panel) {
                window.App.propertiesPanel.panel.classList.remove('visible');
            }
            const mainToolbar = document.getElementById('main-toolbar');
            if (mainToolbar) mainToolbar.style.display = 'none';

            this.container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 20px;">
                    <div style="width: 40px; height: 40px; border: 4px solid rgba(239, 68, 68, 0.2); border-top-color: #ef4444; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <div style="color: var(--text-muted);">Platform Beheer inladen...</div>
                </div>
            `;

            if (!document.getElementById('admin-modal-container')) {
                const mc = document.createElement('div');
                mc.id = 'admin-modal-container';
                document.body.appendChild(mc);
            }

            await this.loadAllData();
            this.renderLayout();
        }

        async loadAllData() {
            try {
                const isAdmin = window.currentUser && window.currentUser.role === 'admin';
                const p = window.currentUser ? (window.currentUser.permissions || {}) : {};
                
                const canUsers = isAdmin || p.admin_users;
                const canRoles = isAdmin || p.admin_roles;
                const canLogs = isAdmin || p.admin_logs;
                const canSettings = isAdmin || p.admin_settings;
                
                const fetches = [
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/settings'),
                    canUsers ? fetch('/api/admin/users') : null,
                    canRoles ? fetch('/api/admin/roles') : null,
                    canLogs ? fetch('/api/admin/logs') : null,
                    canSettings ? fetch('/api/admin/blacklist') : null,
                    fetch('/api/admin/advancedStats'),
                    canSettings ? fetch('/api/admin/globalFiles') : null,
                    canSettings ? fetch('/api/admin/globalLinks') : null,
                    fetch('/api/admin/tiers'),
                    canLogs ? fetch('/api/admin/loginAttempts') : null,
                    fetch('/api/admin/mimeTypes'),
                    fetch('/api/admin/branding')
                ];
                
                const validFetches = fetches.map(f => f ? f.catch(() => ({ ok: false, json: () => ({ status: 'error' }) })) : Promise.resolve({ ok: true, json: () => ({ status: 'success', data: [] }) }));
                const responses = await Promise.all(validFetches);
                const jsons = await Promise.all(responses.map(r => r.json ? r.json() : { status: 'error' }));

                if (jsons[0].status === 'success') this.adminData.stats = jsons[0].data;
                if (jsons[1].status === 'success') this.adminData.settings = jsons[1].data;
                if (canUsers && jsons[2].status === 'success') this.adminData.users = jsons[2].data;
                if (canRoles && jsons[3].status === 'success') this.adminData.roles = jsons[3].data;
                if (canLogs && jsons[4].status === 'success') this.adminData.logs = jsons[4].data;
                if (canSettings && jsons[5].status === 'success') this.adminData.blacklist = jsons[5].data;
                if (jsons[6].status === 'success') this.adminData.advancedStats = jsons[6].data;
                if (canSettings && jsons[7].status === 'success') this.adminData.globalFiles = jsons[7].data;
                if (canSettings && jsons[8].status === 'success') this.adminData.globalLinks = jsons[8].data;
                if (jsons[9].status === 'success') this.adminData.tiers = jsons[9].data;
                if (canLogs && jsons[10].status === 'success') this.adminData.loginAttempts = jsons[10].data;
                if (jsons[11].status === 'success') this.adminData.mimeTypes = jsons[11].data;
                if (jsons[12].status === 'success') this.adminData.branding = jsons[12].data;

            } catch (error) {
                console.error("Admin data laadfout:", error);
                if (window.EventBus) window.EventBus.emit('notify:error', 'Kon enterprise data niet volledig laden.');
            }
        }

        formatBytes(bytes) {
            if (bytes === 0 || !bytes) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        hasPerm(key) {
            if (window.currentUser && window.currentUser.role === 'admin') return true;
            if (window.currentUser && window.currentUser.role_id === 1) return true; 
            return window.currentUser && window.currentUser.permissions && window.currentUser.permissions[key] === true;
        }

        renderLayout() {
            const stats = this.adminData.stats || { total_users: 0, total_files: 0, total_size_bytes: 0, php_version: 'Unknown', server_os: 'Unknown' };
            const maxStorageLimit = 100 * 1024 * 1024 * 1024; 
            const pct = Math.min(100, (stats.total_size_bytes / maxStorageLimit) * 100);

            this.container.innerHTML = `
                <div class="settings-wrapper">
                    <div class="settings-sidebar" style="border-right-color: rgba(239,68,68,0.2);">
                        <div class="settings-sidebar-header">
                            <h2 class="settings-sidebar-title" style="color: #ef4444;">Platform Beheer</h2>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Enterprise Controlecentrum</div>
                        </div>

                        <div class="settings-nav-group">
                            <div class="settings-nav-group-title">Systeem</div>
                            <a class="settings-nav-item active" data-target="health">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                System Health
                            </a>
                            ${this.hasPerm('admin_users') ? `
                            <a class="settings-nav-item" data-target="users">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                                Gebruikers
                            </a>` : ''}
                            ${this.hasPerm('admin_roles') ? `
                            <a class="settings-nav-item" data-target="roles">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                Rollen (RBAC)
                            </a>` : ''}
                        </div>

                        <div class="settings-nav-group">
                            <div class="settings-nav-group-title">Bestandsbeheer</div>
                            ${this.hasPerm('admin_settings') ? `
                            <a class="settings-nav-item" data-target="godview">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                Global File Explorer
                            </a>
                            <a class="settings-nav-item" data-target="links">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                Central Link Manager
                            </a>` : ''}
                        </div>

                        <div class="settings-nav-group">
                            <div class="settings-nav-group-title">Configuratie</div>
                            <a class="settings-nav-item" data-target="tiers">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                Storage Pakketten
                            </a>
                            <a class="settings-nav-item" data-target="mimes">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                Badges & Extensies
                            </a>
                            ${this.hasPerm('admin_settings') ? `
                            <a class="settings-nav-item" data-target="branding">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>
                                Branding UI
                            </a>` : ''}
                        </div>

                        <div class="settings-nav-group">
                            <div class="settings-nav-group-title">Beveiliging & Systeem</div>
                            ${this.hasPerm('admin_logs') ? `
                            <a class="settings-nav-item" data-target="security">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                Security & Logins
                            </a>
                            <a class="settings-nav-item" data-target="logs">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                                Terminal Logs
                            </a>` : ''}
                            ${this.hasPerm('admin_settings') ? `
                            <a class="settings-nav-item" data-target="settings">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                Gevarenzone & Tools
                            </a>` : ''}
                        </div>
                    </div>

                    <div class="settings-content" style="max-width: 1400px; margin: 0 auto;">
                        
                        <div class="settings-section active" id="sec-health">
                            <div class="settings-section-header">
                                <h3 class="settings-section-title">System Health & Analyse</h3>
                                <p class="settings-section-desc">Diepgaande serverstatistieken en opschoontaken.</p>
                            </div>

                            <div class="health-grid" style="grid-template-columns: repeat(4, 1fr);">
                                <div class="health-card">
                                    <div class="health-icon"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div>
                                    <div><div class="health-value">${stats.total_users}</div><div class="health-label">Geregistreerde Gebruikers</div></div>
                                </div>
                                <div class="health-card">
                                    <div class="health-icon" style="background:rgba(16,185,129,0.1); color:#10b981;"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></div>
                                    <div><div class="health-value">${stats.total_files}</div><div class="health-label">Actieve Bestanden</div></div>
                                </div>
                                <div class="health-card">
                                    <div class="health-icon" style="background:rgba(245,158,11,0.1); color:#f59e0b;"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div>
                                    <div style="width:100%;">
                                        <div class="health-value">${this.formatBytes(stats.total_size_bytes)}</div>
                                        <div class="health-label">Opslag Gebruikt</div>
                                        <div style="width:100%; height:4px; background:var(--border-dropdown); border-radius:2px; margin-top:6px; overflow:hidden;">
                                            <div style="width:${pct}%; height:100%; background:var(--primary);"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="health-card">
                                    <div class="health-icon" style="background:rgba(139,92,246,0.1); color:#8b5cf6;"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
                                    <div><div class="health-value" style="font-size:1.4rem;">PHP ${stats.php_version}</div><div class="health-label">OS: ${stats.server_os}</div></div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:24px;">
                                <div class="admin-stat-card">
                                    <h4 style="margin:0; font-size:0.95rem; color:var(--text-main);">Opslag per Bestandstype</h4>
                                    <div id="as-mime-chart" style="margin-top:8px; max-height:150px; overflow-y:auto; font-size:0.8rem;"></div>
                                </div>
                                <div class="admin-stat-card">
                                    <h4 style="margin:0; font-size:0.95rem; color:var(--warning); display:flex; justify-content:space-between;">
                                        <span>Slapende Accounts (> 6 mnd)</span>
                                        <span id="as-zombie-count" class="badge" style="background:var(--warning); color:white;">0</span>
                                    </h4>
                                    <div id="as-zombie-list" style="margin-top:8px; max-height:150px; overflow-y:auto; font-size:0.8rem;"></div>
                                </div>
                                <div class="admin-stat-card">
                                    <h4 style="margin:0; font-size:0.95rem; color:var(--primary);">Top 5 Grootverbruikers</h4>
                                    <div id="as-top-users" style="margin-top:8px; font-size:0.8rem;"></div>
                                </div>
                                <div class="admin-stat-card">
                                    <h4 style="margin:0; font-size:0.95rem; color:var(--text-main);">Upload Groei (30 Dagen)</h4>
                                    <div id="as-growth-chart" style="margin-top:8px; font-size:0.8rem; display:flex; align-items:flex-end; height:100px; gap:2px;"></div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:24px; margin-top:24px;">
                                <div class="settings-card">
                                    <h4 style="margin:0 0 8px 0; display:flex; align-items:center; gap:8px;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        Thumbnail Generator
                                    </h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Genereert ontbrekende miniaturen.</p>
                                    <button id="btn-admin-thumb" class="btn-primary" style="padding:8px 16px; border-radius:8px; width:100%;">Genereren</button>
                                </div>
                                <div class="settings-card">
                                    <h4 style="margin:0 0 8px 0; display:flex; align-items:center; gap:8px; color:var(--error);">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        Ghostfile Scanner
                                    </h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Detecteert weesbestanden op schijf.</p>
                                    <button id="btn-admin-ghost" class="btn-secondary" style="padding:8px 16px; border-radius:8px; border-color:var(--error); color:var(--error); width:100%;">Start Server Scan</button>
                                    <div id="ghost-scan-results" style="margin-top:12px;"></div>
                                </div>
                                <div class="settings-card">
                                    <h4 style="margin:0 0 8px 0; display:flex; align-items:center; gap:8px; color:var(--primary);">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                                        Dubbele Bestanden
                                    </h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Vind en wis identieke bestanden.</p>
                                    <button id="btn-admin-dupes" class="btn-secondary" style="padding:8px 16px; border-radius:8px; width:100%;">Zoek Duplicaten</button>
                                </div>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-users">
                            <div class="admin-header-actions">
                                <div>
                                    <h3 class="settings-section-title">Gebruikersbeheer & Privacy</h3>
                                    <p class="settings-section-desc">Beheer accounts, wijs pakketten toe, exporteer GDPR data of verwijder in bulk.</p>
                                </div>
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <button class="btn-secondary" id="btn-admin-bulk-del" style="display:none; padding:10px 20px; border-radius:8px; font-weight:600; border-color:var(--error); color:var(--error);">
                                        Bulk Verwijderen
                                    </button>
                                    <button class="btn-primary" id="btn-admin-new-user" style="padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
                                        Nieuwe Gebruiker
                                    </button>
                                </div>
                            </div>
                            
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th style="width:40px;"><input type="checkbox" id="admin-chk-all-users" style="cursor:pointer;"></th>
                                            <th>Gebruiker</th>
                                            <th>Rol</th>
                                            <th>Opslag Quota</th>
                                            <th>Geregistreerd</th>
                                            <th style="text-align:right; width:220px;">Enterprise Acties</th>
                                        </tr>
                                    </thead>
                                    <tbody id="admin-users-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-godview">
                            <div class="admin-header-actions">
                                <div>
                                    <h3 class="settings-section-title">Global File Explorer</h3>
                                    <p class="settings-section-desc">Volledig inzicht in alle bestanden op de server. Lightbox, Quarantaine & Beheer.</p>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <select id="god-filter-type" class="settings-select" style="padding:6px; border-radius:6px;">
                                        <option value="">Alle Typen</option>
                                        <option value="image">Afbeeldingen</option>
                                        <option value="video">Video's</option>
                                        <option value="folder">Mappen</option>
                                    </select>
                                    <input type="text" id="god-search" class="settings-input" placeholder="Zoek bestandsnaam..." style="padding:6px; border-radius:6px;">
                                </div>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Bestandsnaam</th>
                                            <th>Eigenaar</th>
                                            <th>Type</th>
                                            <th>Grootte</th>
                                            <th>Geüpload</th>
                                            <th style="text-align:center;">Quarantaine (Lock)</th>
                                        </tr>
                                    </thead>
                                    <tbody id="admin-godview-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-links">
                            <div class="admin-header-actions">
                                <div>
                                    <h3 class="settings-section-title">Central Link Manager</h3>
                                    <p class="settings-section-desc">Overzicht van alle actieve publieke deellinks op het platform.</p>
                                </div>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Gedeeld Bestand</th>
                                            <th>Eigenaar</th>
                                            <th>Link Token</th>
                                            <th>Verloopt op</th>
                                            <th style="text-align:right;">Bypass & Intrekken</th>
                                        </tr>
                                    </thead>
                                    <tbody id="admin-links-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-roles">
                            <div class="admin-header-actions">
                                <div>
                                    <h3 class="settings-section-title">Rollen & Rechten (RBAC)</h3>
                                    <p class="settings-section-desc">Definieer machtigingen op microniveau per gebruikersgroep.</p>
                                </div>
                                <button class="btn-primary" id="btn-admin-new-role" style="padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
                                    Nieuwe Rol
                                </button>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead><tr><th>Rolnaam</th><th>Beschrijving</th><th>Type</th><th style="text-align:right;">Acties</th></tr></thead>
                                    <tbody id="admin-roles-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-tiers">
                            <div class="admin-header-actions">
                                <div>
                                    <h3 class="settings-section-title">Storage Pakketten (Tiers)</h3>
                                    <p class="settings-section-desc">Maak abonnementspakketten aan om snel quota toe te wijzen.</p>
                                </div>
                                <button class="btn-primary" id="btn-admin-new-tier" style="padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
                                    Nieuw Pakket
                                </button>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead><tr><th>Pakketnaam</th><th>Opslaglimiet</th><th>Prijs (Optioneel)</th><th style="text-align:right;">Acties</th></tr></thead>
                                    <tbody id="admin-tiers-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-mimes">
                            <div class="admin-header-actions">
                                <div>
                                    <h3 class="settings-section-title">Bestandstypen & Badges</h3>
                                    <p class="settings-section-desc">Pas kleuren en iconen aan voor specifieke bestandsextensies (.pdf, .mp4).</p>
                                </div>
                                <button class="btn-primary" id="btn-admin-new-mime" style="padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> 
                                    Nieuwe Badge
                                </button>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead><tr><th>Extensie</th><th>Mime Type</th><th>Kleur Badge</th><th style="text-align:right;">Bewerken</th></tr></thead>
                                    <tbody id="admin-mimes-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-branding">
                            <div class="settings-section-header">
                                <h3 class="settings-section-title">Branding UI</h3>
                                <p class="settings-section-desc">Pas de Sitetitel, Logo en het Welkomstbericht aan voor alle gebruikers.</p>
                            </div>
                            <div class="settings-card" style="max-width: 600px;">
                                <div class="settings-group">
                                    <label class="settings-label">Sitetitel</label>
                                    <input type="text" id="brand-title" class="settings-input" placeholder="Bijv: Mijn Cloud Bedrijf">
                                </div>
                                <div class="settings-group">
                                    <label class="settings-label">Logo URL (Absoluut of relatief)</label>
                                    <input type="text" id="brand-logo" class="settings-input" placeholder="/public/img/logo.png">
                                </div>
                                <div class="settings-group">
                                    <label class="settings-label">Primaire Kleur (Thema)</label>
                                    <input type="color" id="brand-color" class="settings-input" style="height:44px; padding:4px; width:100px; cursor:pointer;">
                                </div>
                                <div class="settings-group">
                                    <label class="settings-label">Globaal Welkomstbericht op Dashboard</label>
                                    <input type="text" id="brand-welcome" class="settings-input" placeholder="Welkom op ons platform!">
                                </div>
                                <button id="btn-save-branding" class="btn-primary" style="padding:10px 20px; border-radius:8px; margin-top:16px;">Branding Opslaan</button>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-security">
                            <div class="settings-section-header">
                                <h3 class="settings-section-title">Security & Logins</h3>
                                <p class="settings-section-desc">Overzicht van recente (mislukte) inlogpogingen.</p>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead><tr><th>Datum</th><th>IP Adres</th><th>Status</th><th>Gebruiker / Detail</th></tr></thead>
                                    <tbody id="admin-security-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="settings-section" id="sec-logs">
                            <div class="settings-section-header">
                                <h3 class="settings-section-title">Terminal Audit Logs</h3>
                                <p class="settings-section-desc">Onveranderlijke tijdlijn van server- en gebruikersacties.</p>
                            </div>
                            <div class="terminal-container" id="admin-terminal"></div>
                        </div>

                        <div class="settings-section" id="sec-settings">
                            <div class="settings-section-header">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <h3 class="settings-section-title">Gevarenzone & Tools</h3>
                                        <p class="settings-section-desc">Netwerk blacklists, opschonen en pushberichten.</p>
                                    </div>
                                    <div class="save-indicator" id="ind-admin-settings"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Opgeslagen</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
                                <div class="settings-card" style="border-top:4px solid var(--primary);">
                                    <h4 style="margin:0 0 12px 0;">Live Broadcast</h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">Stuur een push-bericht naar alle online gebruikers.</p>
                                    <input type="text" id="bc-title" class="settings-input" placeholder="Titel (bijv: Systeem Update)">
                                    <textarea id="bc-msg" class="settings-input hide-scrollbars" style="height:80px; margin-top:8px;" placeholder="Typ je mededeling..."></textarea>
                                    <div style="display:flex; gap:12px; margin-top:8px; align-items:center;">
                                        <select id="bc-type" class="settings-select" style="flex:1;">
                                            <option value="info">Info (Blauw)</option><option value="warning">Waarschuwing (Oranje)</option>
                                            <option value="error">Gevaar (Rood)</option><option value="success">Succes (Groen)</option>
                                        </select>
                                        <button id="btn-send-broadcast" class="btn-primary" style="padding:10px 16px; border-radius:8px;">Verzenden</button>
                                    </div>
                                </div>

                                <div class="settings-card">
                                    <h4 style="margin:0 0 12px 0;">IP Blacklist</h4>
                                    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">Blokkeer kwaadaardige netwerken.</p>
                                    <div style="display:flex; gap:8px; margin-bottom:12px;">
                                        <input type="text" id="bl-ip" class="settings-input" placeholder="IP Adres" style="flex:1;">
                                        <input type="text" id="bl-reason" class="settings-input" placeholder="Reden" style="flex:1.5;">
                                        <button id="btn-add-blacklist" class="btn-primary" style="padding:10px;">Blokkeer</button>
                                    </div>
                                    <div id="blacklist-table-container" style="max-height:150px; overflow-y:auto; border:1px solid var(--border-dropdown); border-radius:8px;"></div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:24px;">
                                <div class="settings-card" style="border-left:4px solid #ef4444;">
                                    <h4 style="margin:0 0 16px 0; color:#ef4444; display:flex; align-items:center; gap:8px;">
                                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        Gevarenzone (Maintenance)
                                    </h4>
                                    <div class="settings-toggle-row" style="border:none; padding:0;">
                                        <div>
                                            <div style="font-weight:600; color:var(--text-main);">Onderhoudsmodus Activeren</div>
                                            <div style="font-size:0.85rem; color:var(--text-muted);">Sluit niet-admins direct buiten de applicatie.</div>
                                        </div>
                                        <label class="toggle-switch">
                                            <input type="checkbox" id="admin-set-maintenance" class="admin-auto-save" ${this.adminData.settings.maintenance_mode === '1' ? 'checked' : ''}>
                                            <span class="toggle-slider" style="background-color: ${this.adminData.settings.maintenance_mode === '1' ? '#ef4444' : ''}"></span>
                                        </label>
                                    </div>
                                    <div class="settings-group" style="margin-top:16px;">
                                        <label class="settings-label">Reden voor onderhoud (zichtbaar voor gebruikers)</label>
                                        <input type="text" class="settings-input admin-auto-save" id="admin-set-maintenance-msg" value="${this.adminData.settings.maintenance_message || ''}">
                                    </div>
                                </div>
                                <div class="settings-card">
                                    <h4 style="margin:0 0 16px 0;">Systeem Beveiliging</h4>
                                    <div class="settings-toggle-row" style="border:none; padding:0; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <div style="font-weight:600; color:var(--text-main);">Open Registratie</div>
                                            <div style="font-size:0.85rem; color:var(--text-muted);">Nieuwe gebruikers kunnen zichzelf registreren.</div>
                                        </div>
                                        <label class="toggle-switch">
                                            <input type="checkbox" id="admin-set-registration" class="admin-auto-save" ${this.adminData.settings.allow_registration === '0' ? '' : 'checked'}>
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div class="settings-group">
                                        <label class="settings-label">Verboden Extensies (Komma gescheiden)</label>
                                        <input type="text" class="settings-input admin-auto-save" id="admin-set-blacklist" value="${this.adminData.settings.file_blacklist || ''}" placeholder="exe,bat,sh">
                                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:6px;">Deze bestandstypen worden geblokkeerd tijdens de upload.</div>
                                    </div>
                                    <div class="settings-group" style="margin-top:16px;">
                                        <label class="settings-label">Forceer Prullenbak Auto-Legen (Dagen, 0 = uit)</label>
                                        <input type="number" class="settings-input admin-auto-save" id="admin-set-auto-trash" value="${this.adminData.settings.force_trash_days || '0'}">
                                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Hiermee overschrijf en grey-out je de instelling van de gebruiker.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            `;

            this.renderAdvancedStats();
            this.renderUsersTable();
            this.renderGodView();
            this.renderGlobalLinks();
            this.renderRolesTable();
            this.renderTiersTable();
            this.renderMimesTable();
            this.renderSecurityTable();
            this.renderLogsTerminal();
            this.renderBlacklist();
            this.populateBrandingForm();
            this.initListeners();
            this.initAdvancedListeners();
        }

        // =====================================================================
        // RENDERING METHODS
        // =====================================================================

        renderAdvancedStats() {
            const adv = this.adminData.advancedStats;
            if(!adv) return;

            // Mime Chart
            const mc = document.getElementById('as-mime-chart');
            if(mc) {
                let h = '';
                (adv.storage_by_type || []).forEach(m => {
                    h += `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(128,128,128,0.1);"><span>${m.mime_type || 'Onbekend'}</span><span style="color:var(--text-muted);">${this.formatBytes(m.total_size)}</span></div>`;
                });
                mc.innerHTML = h || 'Geen data';
            }

            // Zombies
            const zc = document.getElementById('as-zombie-count');
            const zl = document.getElementById('as-zombie-list');
            if(zc && zl) {
                const zombies = adv.zombies || [];
                zc.textContent = zombies.length;
                let h = '';
                zombies.forEach(z => {
                    h += `<div style="padding:4px 0; border-bottom:1px solid rgba(128,128,128,0.1);">${z.username} <span style="color:var(--text-muted);">(${z.email})</span></div>`;
                });
                zl.innerHTML = h || '<div style="color:var(--primary);">Iedereen is actief!</div>';
            }

            // Top Users
            const tu = document.getElementById('as-top-users');
            if(tu) {
                let h = '';
                (adv.top_users || []).forEach((u, i) => {
                    h += `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(128,128,128,0.1);"><span>${i+1}. ${u.username}</span><span style="color:var(--primary); font-weight:bold;">${this.formatBytes(u.total_size)}</span></div>`;
                });
                tu.innerHTML = h || 'Geen data';
            }

            // Growth
            const gc = document.getElementById('as-growth-chart');
            if(gc) {
                const growth = adv.growth_30_days || [];
                if(growth.length === 0) gc.innerHTML = 'Geen uploads.';
                else {
                    const max = Math.max(...growth.map(g => g.uploads), 1);
                    let h = '';
                    growth.forEach(g => {
                        const pct = (g.uploads / max) * 100;
                        h += `<div title="${g.date}: ${g.uploads} uploads" style="flex:1; background:var(--primary); height:${pct}%; min-height:2px; border-radius:2px 2px 0 0; opacity:0.8; cursor:pointer;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'"></div>`;
                    });
                    gc.innerHTML = h;
                }
            }
        }

        renderUsersTable() {
            const tbody = document.getElementById('admin-users-tbody');
            if (!tbody) return;
            
            let html = '';
            this.adminData.users.forEach(u => {
                const isMe = (window.currentUser && String(window.currentUser.id) === String(u.id));
                const isSystemAdmin = u.role_id == 1;

                const roleName = u.role_name || (u.role === 'admin' ? 'Admin' : 'User');
                const roleColor = u.role_color || (u.role === 'admin' ? '#ef4444' : '#3b82f6');
                const badge = `<span class="badge" style="background: ${roleColor}20; color: ${roleColor}; border: 1px solid ${roleColor}40;">${roleName}</span>`;
                
                const quota = u.storage_quota ? this.formatBytes(u.storage_quota) : 'Onbeperkt';
                const date = new Date(u.created_at).toLocaleDateString();
                
                let actionsHtml = `<div style="display:flex; gap:8px; justify-content:flex-end;">`;
                
                // GDPR Export
                actionsHtml += `<button class="btn-icon-small btn-export-user" data-id="${u.id}" title="GDPR Export" style="color:#10b981; background:rgba(16,185,129,0.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>`;
                
                // Transfer Ownership
                actionsHtml += `<button class="btn-icon-small btn-transfer-user" data-id="${u.id}" title="Eigenaarschap Overdragen" style="color:var(--primary); background:rgba(37,99,235,0.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg></button>`;

                actionsHtml += `<button class="btn-icon-small btn-edit-user" data-id="${u.id}" title="Bewerken" style="color:var(--text-main); border:1px solid var(--border-dropdown);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`;
                
                if (!isMe) {
                    if (this.hasPerm('admin_impersonate') && !isSystemAdmin) { 
                        actionsHtml += `<button class="btn-icon-small btn-impersonate" data-id="${u.id}" title="Inloggen als..." style="color:var(--warning); border:1px solid var(--warning);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>`;
                    }
                    actionsHtml += `<button class="btn-icon-small btn-delete-user" data-id="${u.id}" title="Verwijderen" style="color:var(--error); border:1px solid var(--error);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;
                }
                actionsHtml += `</div>`;

                const cbDisabled = (isMe || isSystemAdmin) ? 'disabled' : '';

                html += `
                    <tr>
                        <td><input type="checkbox" class="admin-chk-user" value="${u.id}" ${cbDisabled} style="cursor:pointer;"></td>
                        <td>
                            <div style="font-weight:600; color:var(--text-main);">${u.first_name || ''} ${u.last_name || ''} ${isMe ? '(Jij)' : ''}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${u.email || u.username}</div>
                        </td>
                        <td>${badge}</td>
                        <td style="color:var(--text-main); font-family:monospace;">${quota}</td>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${date}</td>
                        <td>${actionsHtml}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            document.querySelectorAll('.btn-edit-user').forEach(btn => btn.addEventListener('click', (e) => this.openUserModal(e.currentTarget.dataset.id)));
            document.querySelectorAll('.btn-impersonate').forEach(btn => btn.addEventListener('click', (e) => this.startImpersonation(e.currentTarget.dataset.id)));
            document.querySelectorAll('.btn-delete-user').forEach(btn => btn.addEventListener('click', (e) => this.deleteUser(e.currentTarget.dataset.id)));
            document.querySelectorAll('.btn-export-user').forEach(btn => btn.addEventListener('click', (e) => this.exportUserData(e.currentTarget.dataset.id)));
            document.querySelectorAll('.btn-transfer-user').forEach(btn => btn.addEventListener('click', (e) => this.openTransferModal(e.currentTarget.dataset.id)));

            const chkAll = document.getElementById('admin-chk-all-users');
            const chks = document.querySelectorAll('.admin-chk-user:not(:disabled)');
            const btnBulk = document.getElementById('btn-admin-bulk-del');
            
            const updateBulkBtn = () => {
                const count = document.querySelectorAll('.admin-chk-user:checked').length;
                if (btnBulk && document.body.contains(btnBulk)) {
                    btnBulk.style.display = count > 0 ? 'block' : 'none';
                    if(count > 0) btnBulk.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Bulk Verwijderen (${count})`;
                }
            };

            if (chkAll) {
                chkAll.addEventListener('change', (e) => {
                    chks.forEach(c => c.checked = e.target.checked);
                    updateBulkBtn();
                });
            }
            chks.forEach(c => c.addEventListener('change', updateBulkBtn));
        }

        renderGodView(filter = '', search = '') {
            const tbody = document.getElementById('admin-godview-tbody');
            if(!tbody) return;
            
            let files = this.adminData.globalFiles || [];
            
            // Filters toepassen
            if(filter === 'image') files = files.filter(f => f.mime_type && f.mime_type.startsWith('image/'));
            if(filter === 'video') files = files.filter(f => f.mime_type && f.mime_type.startsWith('video/'));
            if(filter === 'folder') files = files.filter(f => !f.mime_type || f.mime_type === 'folder');
            
            if(search) {
                const s = search.toLowerCase();
                files = files.filter(f => f.original_name && f.original_name.toLowerCase().includes(s));
            }

            if(files.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">De server is helemaal leeg of er is niets gevonden.</td></tr>';
                return;
            }

            let html = '';
            files.forEach(f => {
                const isQ = f.is_quarantined == 1;
                const d = new Date(f.created_at).toLocaleDateString();
                const isMap = !f.mime_type || f.mime_type === 'folder';
                const isImg = f.mime_type && f.mime_type.startsWith('image/');
                
                const thumbHtml = isImg ? `<div class="god-thumb" style="background-image:url('/api/files/download?id=${f.id}');" onclick="window.open('/api/files/download?id=${f.id}', '_blank')"></div>` : '';

                html += `
                    <tr style="${isQ ? 'background:rgba(239,68,68,0.05);' : ''}">
                        <td style="font-weight:600; color:var(--text-main); display:flex; align-items:center;">
                            ${thumbHtml}
                            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;" title="${f.original_name}">
                                ${isQ ? '<svg width="14" height="14" fill="none" stroke="var(--error)" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px; vertical-align:middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : ''}
                                ${f.original_name}
                            </div>
                        </td>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${f.username || 'Onbekend'}</td>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${isMap ? 'Map' : f.mime_type}</td>
                        <td style="font-family:monospace;">${isMap ? '-' : this.formatBytes(f.size)}</td>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${d}</td>
                        <td style="text-align:center;">
                            <label class="toggle-switch">
                                <input type="checkbox" class="god-toggle-q apple-toggle danger" data-id="${f.id}" ${isQ ? 'checked' : ''} ${isMap ? 'disabled' : ''}>
                            </label>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            document.querySelectorAll('.god-toggle-q').forEach(chk => {
                chk.onchange = async (e) => {
                    const id = e.target.dataset.id;
                    const status = e.target.checked;
                    try {
                        const res = await fetch('/api/admin/quarantineFile', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({file_id:id, quarantine_status:status})});
                        if(!res.ok) throw new Error('Update mislukt');
                        if(window.EventBus) window.EventBus.emit('notify:success', 'Quarantaine status aangepast.');
                        const tr = e.target.closest('tr');
                        tr.style.background = status ? 'rgba(239,68,68,0.05)' : 'transparent';
                    } catch(err) { e.target.checked = !status; }
                }
            });
        }

        renderGlobalLinks() {
            const tbody = document.getElementById('admin-links-tbody');
            if(!tbody) return;
            const links = this.adminData.globalLinks || [];
            if(links.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Geen actieve publieke links.</td></tr>';
                return;
            }
            let html = '';
            links.forEach(l => {
                const exp = l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'Nooit';
                const hasPass = !!l.password_hash;
                html += `
                    <tr>
                        <td style="font-weight:600; color:var(--text-main);">${l.original_name || 'Map (Meerdere bestanden)'}</td>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${l.username}</td>
                        <td style="font-family:monospace; color:var(--primary); font-size:0.8rem;">
                            ${hasPass ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" style="margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : ''}
                            ${l.token}
                        </td>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${exp}</td>
                        <td style="text-align:right;">
                            <button class="btn-icon-small btn-avg-link" data-token="${l.token}" style="color:var(--primary); border:1px solid var(--border-dropdown); margin-right:4px;" title="Open Link (Master Key)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg></button>
                            <button class="btn-icon-small btn-revoke-link" data-id="${l.id}" style="color:var(--error); border:1px solid var(--error);" title="Direct Intrekken"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            document.querySelectorAll('.btn-revoke-link').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if(await window.ModalService.confirm('Link Intrekken', 'De link stopt direct met werken. Zeker weten?', {danger:true})) {
                        try {
                            const res = await fetch('/api/admin/revokeGlobalLink', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({link_id:id})});
                            if(res.ok) { e.currentTarget.closest('tr').remove(); if(window.EventBus) window.EventBus.emit('notify:success', 'Link ingetrokken'); }
                        } catch(err) {}
                    }
                }
            });

            // AVG Master Key Bypass
            document.querySelectorAll('.btn-avg-link').forEach(btn => {
                btn.onclick = async (e) => {
                    const token = e.currentTarget.dataset.token;
                    if(await window.ModalService.confirm('AVG / GDPR Waarschuwing', 'Je staat op het punt bestanden in te zien die door een gebruiker zijn gedeeld. Deze admin-override wordt gelogd. Doorgaan?', {danger:true, yesText:'Ja, inzien'})) {
                        window.open(`/s/${token}`, '_blank');
                    }
                }
            });
        }

        renderTiersTable() {
            const tbody = document.getElementById('admin-tiers-tbody');
            if(!tbody) return;
            const tiers = this.adminData.tiers || [];
            let html = '';
            tiers.forEach(t => {
                html += `
                    <tr>
                        <td style="font-weight:600; color:var(--text-main);"><span class="badge" style="background:rgba(37,99,235,0.1); color:var(--primary);">${t.name}</span></td>
                        <td style="font-family:monospace;">${this.formatBytes(t.storage_limit)}</td>
                        <td style="color:var(--text-muted); font-size:0.9rem;">€ ${t.price}</td>
                        <td style="text-align:right;">
                            <button class="btn-icon-small btn-del-tier" data-id="${t.id}" style="color:var(--error);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">Geen pakketten gedefinieerd.</td></tr>';

            document.querySelectorAll('.btn-del-tier').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if(await window.ModalService.confirm('Verwijderen', 'Pakket wissen?', {danger:true})) {
                        await fetch('/api/admin/tiers/delete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})});
                        await this.loadAllData(); this.renderTiersTable();
                    }
                }
            });
        }

        renderMimesTable() {
            const tbody = document.getElementById('admin-mimes-tbody');
            if(!tbody) return;
            const mimes = this.adminData.mimeTypes || [];
            let html = '';
            mimes.forEach(m => {
                html += `
                    <tr>
                        <td style="font-weight:bold; font-family:monospace; color:var(--text-main);">.${m.extension}</td>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${m.mime_type}</td>
                        <td><div style="width:20px; height:20px; border-radius:4px; background:${m.color};"></div></td>
                        <td style="text-align:right;">
                            <button class="btn-icon-small btn-edit-mime" data-ext="${m.extension}" data-mime="${m.mime_type}" data-col="${m.color}" data-icon='${m.icon||''}' style="color:var(--primary);"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">Geen badges ingesteld.</td></tr>';
            document.querySelectorAll('.btn-edit-mime').forEach(btn => btn.onclick = (e) => this.openMimeModal(e.currentTarget.dataset));
        }

        renderSecurityTable() {
            const tbody = document.getElementById('admin-security-tbody');
            if(!tbody) return;
            const logs = this.adminData.loginAttempts || [];
            let html = '';
            logs.forEach(l => {
                const isFail = l.action === 'login_failed';
                const color = isFail ? 'var(--error)' : '#10b981';
                const badge = `<span class="badge" style="background:${color}20; color:${color};">${isFail ? 'Mislukt' : 'Succes'}</span>`;
                html += `
                    <tr>
                        <td style="color:var(--text-muted); font-size:0.85rem;">${new Date(l.created_at).toLocaleString()}</td>
                        <td style="font-family:monospace; font-weight:bold;">${l.ip_address}</td>
                        <td>${badge}</td>
                        <td style="color:var(--text-main); font-size:0.85rem;">${l.description}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">Geen login data.</td></tr>';
        }

        renderRolesTable() {
            const tbody = document.getElementById('admin-roles-tbody');
            if (!tbody || !this.adminData.roles) return;
            let html = '';
            this.adminData.roles.forEach(r => {
                const isSystem = r.is_system == 1;
                const badge = `<span class="badge" style="background: ${r.color}20; color: ${r.color}; border: 1px solid ${r.color}40;">${r.name}</span>`;
                const typeLabel = isSystem ? '<span style="color:var(--text-muted); font-size:0.8rem;">Systeemrol</span>' : '<span style="color:var(--primary); font-size:0.8rem;">Aangepast</span>';
                
                let actionsHtml = `<div style="display:flex; gap:8px; justify-content:flex-end;">`;
                actionsHtml += `<button class="btn-icon-small btn-edit-role" data-id="${r.id}" title="Permissies Bewerken" style="color:var(--primary);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></button>`;
                
                if (!isSystem) {
                    actionsHtml += `<button class="btn-icon-small btn-delete-role" data-id="${r.id}" title="Rol Verwijderen" style="color:var(--error);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;
                }
                actionsHtml += `</div>`;

                html += `<tr><td>${badge}</td><td style="color:var(--text-muted); font-size:0.9rem;">${r.description || '-'}</td><td>${typeLabel}</td><td>${actionsHtml}</td></tr>`;
            });
            tbody.innerHTML = html;

            document.querySelectorAll('.btn-edit-role').forEach(btn => btn.addEventListener('click', (e) => this.openRoleModal(e.currentTarget.dataset.id)));
            document.querySelectorAll('.btn-delete-role').forEach(btn => btn.addEventListener('click', (e) => this.deleteRole(e.currentTarget.dataset.id)));
        }

        renderLogsTerminal() {
            const term = document.getElementById('admin-terminal');
            if (!term) return;
            if (this.adminData.logs.length === 0) { term.innerHTML = '<div style="color:#64748b;">> Geen logs gevonden in de database.</div>'; return; }

            let html = '';
            this.adminData.logs.forEach(log => {
                const date = new Date(log.created_at).toLocaleString();
                let typeClass = 'log-info';
                if (log.action.includes('delete') || log.action.includes('fail') || log.action.includes('error') || log.action.includes('blacklist')) typeClass = 'log-error';
                else if (log.action.includes('update') || log.action.includes('impersonate')) typeClass = 'log-warning';

                const userStr = log.username ? `[${log.username}]` : '[Systeem]';
                html += `<div class="terminal-line ${typeClass}"><span class="term-date">${date}</span><span class="term-ip">${log.ip_address || '127.0.0.1'}</span><span class="term-action">${log.action}</span><span class="term-desc">${userStr} ${log.description}</span></div>`;
            });
            term.innerHTML = html;
        }

        renderBlacklist() {
            const cont = document.getElementById('blacklist-table-container');
            if(!cont) return;
            if(!this.adminData.blacklist || this.adminData.blacklist.length === 0) {
                cont.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:0.85rem;">Geen IP adressen geblokkeerd.</div>'; return;
            }
            let html = '<table class="admin-table" style="margin:0;"><tbody>';
            this.adminData.blacklist.forEach(b => {
                html += `
                    <tr>
                        <td>
                            <div class="badge-ip">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                ${b.ip_address}
                            </div>
                        </td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">${b.reason || '-'}</td>
                        <td style="width:40px; text-align:right;">
                            <button class="btn-icon-small btn-remove-ip" data-id="${b.id}" style="color:var(--error); padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            cont.innerHTML = html;

            document.querySelectorAll('.btn-remove-ip').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const res = await fetch('/api/admin/removeBlacklist', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id})});
                        if(res.ok) {
                            this.adminData.blacklist = this.adminData.blacklist.filter(x => String(x.id) !== String(id));
                            this.renderBlacklist();
                            if(window.EventBus) window.EventBus.emit('notify:info', 'IP blokkade opgeheven.');
                        }
                    } catch(err) {}
                }
            });
        }

        populateBrandingForm() {
            const b = this.adminData.branding || {};
            const t = document.getElementById('brand-title'); if(t) t.value = b.site_title || '';
            const l = document.getElementById('brand-logo'); if(l) l.value = b.logo_url || '';
            const c = document.getElementById('brand-color'); if(c) c.value = b.primary_color || '#2563eb';
            const w = document.getElementById('brand-welcome'); if(w) w.value = b.welcome_message || '';
        }

        // =====================================================================
        // ACTIONS & LISTENERS
        // =====================================================================
        initListeners() {
            const navItems = document.querySelectorAll('.settings-nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    document.querySelectorAll('.settings-section').forEach(sec => sec.classList.remove('active'));
                    const targetId = 'sec-' + item.dataset.target;
                    const targetSec = document.getElementById(targetId);
                    if(targetSec) targetSec.classList.add('active');
                });
            });

            const btnNewUser = document.getElementById('btn-admin-new-user');
            if (btnNewUser) btnNewUser.addEventListener('click', () => this.openUserModal());

            const btnNewRole = document.getElementById('btn-admin-new-role');
            if (btnNewRole) btnNewRole.addEventListener('click', () => this.openRoleModal());
            
            const btnNewTier = document.getElementById('btn-admin-new-tier');
            if (btnNewTier) btnNewTier.addEventListener('click', () => this.openTierModal());
            
            const btnNewMime = document.getElementById('btn-admin-new-mime');
            if (btnNewMime) btnNewMime.addEventListener('click', () => this.openMimeModal());

            // Global View Filters
            const gSearch = document.getElementById('god-search');
            const gFilter = document.getElementById('god-filter-type');
            if(gSearch) gSearch.addEventListener('input', () => this.renderGodView(gFilter.value, gSearch.value));
            if(gFilter) gFilter.addEventListener('change', () => this.renderGodView(gFilter.value, gSearch.value));

            let saveTimer;
            const autoSaveInputs = document.querySelectorAll('.admin-auto-save');
            const indicator = document.getElementById('ind-admin-settings');

            autoSaveInputs.forEach(input => {
                const eventType = input.type === 'checkbox' ? 'change' : 'input';
                input.addEventListener(eventType, () => {
                    if (input.id === 'admin-set-maintenance') {
                        input.nextElementSibling.style.backgroundColor = input.checked ? '#ef4444' : 'rgba(128,128,128,0.3)';
                    }
                    if (indicator) {
                        indicator.innerHTML = `<div style="width:14px; height:14px; border:2px solid var(--warning); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div> Opslaan...`;
                        indicator.className = 'save-indicator saving';
                    }
                    clearTimeout(saveTimer);
                    saveTimer = setTimeout(async () => {
                        const payload = {
                            maintenance_mode: document.getElementById('admin-set-maintenance').checked ? '1' : '0',
                            maintenance_message: document.getElementById('admin-set-maintenance-msg').value,
                            file_blacklist: document.getElementById('admin-set-blacklist').value,
                            force_trash_days: document.getElementById('admin-set-auto-trash') ? document.getElementById('admin-set-auto-trash').value : '0',
                            // FASE 4: De nieuwe Registratie Toggle opslaan
                            allow_registration: document.getElementById('admin-set-registration') ? (document.getElementById('admin-set-registration').checked ? '1' : '0') : '1'
                        };
                        try {
                            const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                            const json = await res.json();
                            if (json.status === 'success') {
                                if (indicator) {
                                    indicator.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Opgeslagen`;
                                    indicator.className = 'save-indicator saved';
                                    setTimeout(() => { indicator.className = 'save-indicator'; }, 2000);
                                }
                            }
                        } catch (err) {}
                    }, 1000);
                });
            });
            
            const btnBrand = document.getElementById('btn-save-branding');
            if(btnBrand) {
                btnBrand.onclick = async () => {
                    btnBrand.innerHTML = 'Opslaan...';
                    const pl = {
                        site_title: document.getElementById('brand-title').value,
                        logo_url: document.getElementById('brand-logo').value,
                        primary_color: document.getElementById('brand-color').value,
                        welcome_message: document.getElementById('brand-welcome').value
                    };
                    try {
                        const res = await fetch('/api/admin/branding/save', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(pl) });
                        if(res.ok) {
                            if(window.EventBus) window.EventBus.emit('notify:success', 'Branding opgeslagen! Herlaad de app voor globaal effect.');
                        }
                    } catch(e) {}
                    if (btnBrand && document.body.contains(btnBrand)) {
                        btnBrand.innerHTML = 'Branding Opslaan';
                    }
                }
            }
        }

        initAdvancedListeners() {
            // Bulk Delete Users
            const btnBulkDel = document.getElementById('btn-admin-bulk-del');
            if (btnBulkDel) {
                btnBulkDel.onclick = async () => {
                    const ids = Array.from(document.querySelectorAll('.admin-chk-user:checked')).map(cb => parseInt(cb.value));
                    if(ids.length === 0) return;
                    if(await window.ModalService.confirm('Bulk Verwijderen', `Zeker weten dat je ${ids.length} gebruikers wilt wissen?`, {danger:true})) {
                        btnBulkDel.innerHTML = 'Wissen...';
                        try {
                            const res = await fetch('/api/admin/bulkDeleteUsers', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ids}) });
                            if(res.ok) {
                                window.EventBus.emit('notify:success', 'Gebruikers gewist');
                                await this.loadAllData(); this.renderUsersTable();
                                const currentBtn = document.getElementById('btn-admin-bulk-del');
                                if(currentBtn) currentBtn.style.display = 'none';
                                const checkAll = document.getElementById('admin-chk-all-users');
                                if(checkAll) checkAll.checked = false;
                            }
                        } catch(err) { 
                            if (btnBulkDel && document.body.contains(btnBulkDel)) {
                                btnBulkDel.innerHTML = 'Bulk Verwijderen'; 
                            }
                        }
                    }
                };
            }

            // Thumbnail Job
            const btnThumb = document.getElementById('btn-admin-thumb');
            if (btnThumb) {
                btnThumb.onclick = async () => {
                    btnThumb.innerHTML = 'Genereren... <div class="btn-loader" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;"></div>';
                    btnThumb.disabled = true;
                    try {
                        const res = await fetch('/api/admin/generateThumbnails', {method: 'POST'});
                        const json = await res.json();
                        if(json.status === 'success') window.EventBus.emit('notify:success', json.message);
                        else throw new Error(json.message);
                    } catch(err) { window.EventBus.emit('notify:error', err.message); }
                    if (btnThumb && document.body.contains(btnThumb)) {
                        btnThumb.innerHTML = 'Genereer Thumbnails';
                        btnThumb.disabled = false;
                    }
                };
            }

            // Ghostfile Scanner
            const btnGhost = document.getElementById('btn-admin-ghost');
            const resGhost = document.getElementById('ghost-scan-results');
            if (btnGhost) {
                btnGhost.onclick = async () => {
                    btnGhost.innerHTML = 'Scannen... <div class="btn-loader" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;border-top-color:var(--error);"></div>';
                    btnGhost.disabled = true;
                    try {
                        const res = await fetch('/api/admin/scanGhostFiles', {method: 'GET'});
                        const json = await res.json();
                        if (json.status === 'success') {
                            const ghosts = json.data || [];
                            if (ghosts.length === 0) resGhost.innerHTML = '<span style="color:var(--primary); font-weight:600;">Systeem is schoon.</span>';
                            else {
                                resGhost.innerHTML = `<div style="background:rgba(239,68,68,0.1); border:1px solid var(--error); padding:12px; border-radius:8px;"><div style="color:var(--error); font-weight:bold; margin-bottom:8px;">⚠️ ${ghosts.length} weesbestanden!</div><button id="btn-delete-ghosts" class="btn-secondary" style="color:var(--error); border-color:var(--error); padding:6px 12px; border-radius:6px; font-weight:bold;">Verwijder Permanent</button></div>`;
                                document.getElementById('btn-delete-ghosts').onclick = async (e) => {
                                    if(await window.ModalService.confirm('Wissen', 'Bestanden fysiek wissen?', {danger:true})) {
                                        e.target.innerHTML = 'Wissen...'; e.target.disabled = true;
                                        const delRes = await fetch('/api/admin/deleteGhostFiles', {method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({files: ghosts})});
                                        if(delRes.ok) { window.EventBus.emit('notify:success', 'Schoonmaak voltooid.'); resGhost.innerHTML = '<span style="color:var(--primary); font-weight:600;">Schoonmaak voltooid.</span>'; }
                                    }
                                };
                            }
                        }
                    } catch(err) { resGhost.innerHTML = `<span style="color:var(--error);">${err.message}</span>`; }
                    if (btnGhost && document.body.contains(btnGhost)) {
                        btnGhost.innerHTML = 'Start Server Scan'; 
                        btnGhost.disabled = false;
                    }
                };
            }

            // Duplicates Scanner
            const btnDupes = document.getElementById('btn-admin-dupes');
            if (btnDupes) {
                btnDupes.onclick = async () => {
                    btnDupes.innerHTML = 'Scannen... <div class="btn-loader" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;border-top-color:var(--primary);"></div>';
                    btnDupes.disabled = true;
                    try {
                        const res = await fetch('/api/admin/scanDuplicates');
                        const json = await res.json();
                        if (json.status === 'success') {
                            this.openDuplicatesModal(json.data);
                        }
                    } catch(e) {}
                    if (btnDupes && document.body.contains(btnDupes)) {
                        btnDupes.innerHTML = 'Zoek Duplicaten'; 
                        btnDupes.disabled = false;
                    }
                };
            }

            // Blacklist Add
            const btnAddIp = document.getElementById('btn-add-blacklist');
            if (btnAddIp) {
                btnAddIp.onclick = async () => {
                    const ip = document.getElementById('bl-ip').value.trim();
                    const reason = document.getElementById('bl-reason').value.trim();
                    if(!ip) return;
                    btnAddIp.innerHTML = '...';
                    try {
                        const res = await fetch('/api/admin/addBlacklist', {method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ip, reason})});
                        const json = await res.json();
                        if(json.status === 'success') {
                            window.EventBus.emit('notify:success', json.message);
                            document.getElementById('bl-ip').value = ''; document.getElementById('bl-reason').value = '';
                            await this.loadAllData(); this.renderBlacklist();
                        }
                    } catch(err) {}
                    if (btnAddIp && document.body.contains(btnAddIp)) {
                        btnAddIp.innerHTML = 'Blokkeer';
                    }
                };
            }

            // Broadcast
            const btnBc = document.getElementById('btn-send-broadcast');
            if (btnBc) {
                btnBc.onclick = async () => {
                    const title = document.getElementById('bc-title').value.trim();
                    const message = document.getElementById('bc-msg').value.trim();
                    const type = document.getElementById('bc-type').value;
                    if(!title || !message) return;
                    
                    btnBc.innerHTML = 'Verzenden...'; btnBc.disabled = true;
                    try {
                        const res = await fetch('/api/admin/sendBroadcast', {method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, message, type})});
                        if(res.ok) {
                            window.EventBus.emit('notify:success', 'Verzonden');
                            document.getElementById('bc-title').value = ''; document.getElementById('bc-msg').value = '';
                        }
                    } catch(err) {}
                    if (btnBc && document.body.contains(btnBc)) {
                        btnBc.innerHTML = 'Verzenden'; 
                        btnBc.disabled = false;
                    }
                };
            }
        }

        openDuplicatesModal(duplicates) {
            const mc = document.getElementById('admin-modal-container');
            if (!mc) return;
            let html = `
                <div class="admin-modal-overlay">
                    <div class="admin-modal-box large">
                        <div class="admin-modal-header">
                            <h3>Dubbele Bestanden Scanner</h3>
                            <button class="btn-icon-small" id="dupe-close-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                        </div>
                        <div class="admin-modal-body">
            `;
            if(!duplicates || duplicates.length === 0) {
                html += `<div style="text-align:center; color:var(--primary); padding:20px; font-weight:bold;">Geen dubbele bestanden gevonden! Je server is optimaal ingedeeld.</div>`;
            } else {
                html += `<p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">De volgende bestanden hebben exact dezelfde bestandsgrootte en naam. Je kunt duplicaten hier direct wissen om ruimte te besparen.</p>`;
                duplicates.forEach((group, gIdx) => {
                    html += `
                        <div style="border:1px solid var(--border-dropdown); border-radius:8px; margin-bottom:16px; overflow:hidden;">
                            <div style="background:rgba(128,128,128,0.05); padding:10px 16px; font-weight:bold; color:var(--text-main); border-bottom:1px solid var(--border-dropdown); display:flex; justify-content:space-between;">
                                <span>${group.name}</span>
                                <span style="color:var(--text-muted); font-family:monospace; font-size:0.85rem;">${this.formatBytes(group.size)}</span>
                            </div>
                            <div style="padding:0;">
                    `;
                    group.files.forEach((file, fIdx) => {
                        const date = new Date(file.created_at).toLocaleString('nl-NL');
                        html += `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid rgba(128,128,128,0.1);">
                                <div>
                                    <div style="font-size:0.85rem; color:var(--text-main);">Geüpload door: <b>${file.username || 'Onbekend'}</b></div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${date}</div>
                                </div>
                                <button class="btn-secondary btn-del-dupe" data-id="${file.id}" style="padding:6px 12px; font-size:0.8rem; border-color:var(--error); color:var(--error);">Wis Bestand</button>
                            </div>
                        `;
                    });
                    html += `</div></div>`;
                });
            }
            html += `
                        </div>
                        <div class="admin-modal-footer">
                            <button class="btn-secondary" id="dupe-close-btn" style="padding:8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); cursor:pointer;">Sluiten</button>
                        </div>
                    </div>
                </div>
            `;
            mc.innerHTML = html;
            
            const closeFn = () => { mc.innerHTML = ''; };
            document.getElementById('dupe-close-modal').onclick = closeFn;
            document.getElementById('dupe-close-btn').onclick = closeFn;
            
            mc.querySelectorAll('.btn-del-dupe').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if(await window.ModalService.confirm('Bestand Wissen', 'Weet je zeker dat je dit duplicaat fysiek wilt verwijderen?', {danger:true})) {
                        e.currentTarget.innerHTML = 'Wissen...'; e.currentTarget.disabled = true;
                        try {
                            const res = await fetch('/api/trash/force-delete', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({type:'file', id:id})});
                            if(res.ok) {
                                e.currentTarget.closest('div').style.display = 'none';
                                if(window.EventBus) window.EventBus.emit('notify:success', 'Duplicaat gewist!');
                                this.loadAllData().then(() => this.renderAdvancedStats());
                            }
                        } catch(err) { e.currentTarget.innerHTML = 'Fout'; }
                    }
                }
            });
        }

        // =====================================================================
        // MODALS (CRUD)
        // =====================================================================
        openUserModal(userId = null) {
            const mc = document.getElementById('admin-modal-container');
            if (!mc) return;

            this.currentEditUserId = userId;
            let user = null;
            if (userId) user = this.adminData.users.find(u => String(u.id) === String(userId));

            let roleOptions = '';
            if (this.adminData.roles && this.adminData.roles.length > 0) {
                this.adminData.roles.forEach(r => { roleOptions += `<option value="${r.id}" ${user && String(user.role_id) === String(r.id) ? 'selected' : ''}>${r.name}</option>`; });
            }
            
            let tierOptions = '<option value="">Geen (Onbeperkt / Rol standaard)</option>';
            if(this.adminData.tiers && this.adminData.tiers.length > 0) {
                this.adminData.tiers.forEach(t => { tierOptions += `<option value="${t.storage_limit}" ${user && user.storage_quota == t.storage_limit ? 'selected' : ''}>${t.name} (${this.formatBytes(t.storage_limit)})</option>`; });
            }

            mc.innerHTML = `
                <div class="admin-modal-overlay" id="admin-user-modal">
                    <div class="admin-modal-box">
                        <div class="admin-modal-header">
                            <h3>${user ? 'Gebruiker Bewerken' : 'Nieuwe Gebruiker'}</h3>
                            <button class="btn-icon-small" id="btn-close-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                        </div>
                        <div class="admin-modal-body">
                            <div style="display:flex; gap:16px;">
                                <div class="settings-group" style="flex:1;"><label class="settings-label">Gebruikersnaam *</label><input type="text" id="mu-username" class="settings-input" value="${user ? user.username : ''}" ${user ? 'disabled style="background:rgba(128,128,128,0.1);"' : ''}></div>
                                <div class="settings-group" style="flex:1;"><label class="settings-label">Gekoppelde Rol *</label><select id="mu-role-id" class="settings-select">${roleOptions}</select></div>
                            </div>
                            <div class="settings-group"><label class="settings-label">E-mailadres *</label><input type="email" id="mu-email" class="settings-input" value="${user ? (user.email || '') : ''}"></div>
                            <div style="display:flex; gap:16px;">
                                <div class="settings-group" style="flex:1;"><label class="settings-label">Voornaam</label><input type="text" id="mu-fname" class="settings-input" value="${user ? (user.first_name || '') : ''}"></div>
                                <div class="settings-group" style="flex:1;"><label class="settings-label">Achternaam</label><input type="text" id="mu-lname" class="settings-input" value="${user ? (user.last_name || '') : ''}"></div>
                            </div>
                            <div class="settings-group"><label class="settings-label">Opslag Pakket (Quota)</label><select id="mu-quota" class="settings-select">${tierOptions}</select></div>
                            <div class="settings-group">
                                <label class="settings-label">Wachtwoord ${user ? '(Laat leeg om niet te wijzigen)' : '*'}</label>
                                <input type="password" id="mu-password" class="settings-input" placeholder="${user ? 'Nieuw wachtwoord' : 'Minimaal 8 karakters'}">
                                <div style="height:4px; width:100%; background:var(--border-dropdown); margin-top:6px; border-radius:2px; overflow:hidden;">
                                    <div id="pwd-strength-bar" style="height:100%; width:0%; background:var(--error); transition:width 0.3s, background 0.3s;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="admin-modal-footer">
                            <button class="btn-secondary" id="btn-cancel-modal" style="padding:8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); cursor:pointer; background:transparent; color:var(--text-muted);">Annuleren</button>
                            <button class="btn-primary" id="btn-save-user" style="padding:8px 16px; border-radius:8px; background:var(--primary); color:white; border:none; font-weight:600; cursor:pointer;">Opslaan</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('btn-close-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-cancel-modal').onclick = () => mc.innerHTML = '';
            
            // Wachtwoord Sterkte Meter Logica
            document.getElementById('mu-password').addEventListener('input', (e) => {
                const val = e.target.value;
                const bar = document.getElementById('pwd-strength-bar');
                if(!val) { bar.style.width = '0%'; return; }
                let score = 0;
                if(val.length >= 8) score += 25;
                if(val.length >= 12) score += 25;
                if(/[A-Z]/.test(val)) score += 25;
                if(/[0-9!@#$%^&*]/.test(val)) score += 25;
                bar.style.width = score + '%';
                if(score <= 25) bar.style.background = 'var(--error)';
                else if(score <= 75) bar.style.background = 'var(--warning)';
                else bar.style.background = '#10b981';
            });

            document.getElementById('btn-save-user').onclick = async () => {
                const btn = document.getElementById('btn-save-user'); 
                if (btn) { btn.innerHTML = 'Opslaan...'; btn.disabled = true; }
                
                const quotaVal = document.getElementById('mu-quota').value;
                const payload = {
                    id: this.currentEditUserId, username: document.getElementById('mu-username').value, email: document.getElementById('mu-email').value,
                    first_name: document.getElementById('mu-fname').value, last_name: document.getElementById('mu-lname').value,
                    role_id: parseInt(document.getElementById('mu-role-id').value), password: document.getElementById('mu-password').value,
                    storage_quota: quotaVal ? parseInt(quotaVal) : null
                };
                try {
                    const res = await fetch(this.currentEditUserId ? '/api/admin/users/update' : '/api/admin/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (res.ok) { window.EventBus.emit('notify:success', 'Opgeslagen'); mc.innerHTML = ''; await this.loadAllData(); this.renderUsersTable(); }
                } catch (err) { 
                    if (btn && document.body.contains(btn)) {
                        btn.disabled = false; btn.innerHTML = 'Opslaan'; 
                    }
                }
            };
        }

        async exportUserData(userId) {
            try {
                window.EventBus.emit('notify:info', 'Export genereren...');
                const res = await fetch('/api/admin/exportUserData', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
                const json = await res.json();
                if (json.status === 'success' && json.download_url) {
                    window.EventBus.emit('notify:success', 'Export geslaagd! Download start.');
                    window.location.href = json.download_url; // Direct downloaden
                }
            } catch(e) { window.EventBus.emit('notify:error', 'Export mislukt'); }
        }

        openTransferModal(fromUserId) {
            const mc = document.getElementById('admin-modal-container');
            if (!mc) return;
            const user = this.adminData.users.find(u => String(u.id) === String(fromUserId));
            if(!user) return;
            
            let uOpts = '';
            this.adminData.users.forEach(u => { if(u.id != fromUserId) uOpts += `<option value="${u.id}">${u.username} (${u.email})</option>`; });

            mc.innerHTML = `
                <div class="admin-modal-overlay" id="admin-transfer-modal">
                    <div class="admin-modal-box">
                        <div class="admin-modal-header"><h3>Data Overdragen</h3><button class="btn-icon-small" id="btn-close-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button></div>
                        <div class="admin-modal-body">
                            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">Verplaats alle bestanden, mappen en links van <b>${user.username}</b> naar een andere gebruiker.</p>
                            <label class="settings-label">Kies nieuwe eigenaar:</label>
                            <select id="sel-transfer-to" class="settings-select">${uOpts}</select>
                        </div>
                        <div class="admin-modal-footer">
                            <button class="btn-secondary" id="btn-cancel-modal" style="padding:8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); cursor:pointer; background:transparent; color:var(--text-muted);">Annuleren</button>
                            <button class="btn-primary" id="btn-save-transfer" style="padding:8px 16px; border-radius:8px; background:var(--primary); color:white; border:none; font-weight:600; cursor:pointer;">Nu Overdragen</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('btn-close-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-cancel-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-save-transfer').onclick = async () => {
                const btn = document.getElementById('btn-save-transfer'); 
                if (btn) { btn.innerHTML = 'Bezig...'; btn.disabled = true; }
                
                const toId = document.getElementById('sel-transfer-to').value;
                try {
                    const res = await fetch('/api/admin/transferOwnership', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({from_user_id: fromUserId, to_user_id: toId})});
                    if(res.ok) { window.EventBus.emit('notify:success', 'Data succesvol overgedragen!'); mc.innerHTML = ''; await this.loadAllData(); this.renderGodView(); }
                } catch(e) {
                    if (btn && document.body.contains(btn)) {
                        btn.innerHTML = 'Nu Overdragen'; btn.disabled = false;
                    }
                }
            };
        }

        async deleteUser(userId) {
            if (!window.ModalService) return;
            const confirmed = await window.ModalService.confirm('Gebruiker Verwijderen', 'Zeker weten? Tip: Je kunt ook eerst de bestanden overdragen.', { danger: true, yesText: 'Verwijderen' });
            if (confirmed) {
                try {
                    const res = await fetch('/api/admin/users/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userId }) });
                    if (res.ok) { window.EventBus.emit('notify:success', 'Gebruiker verwijderd.'); await this.loadAllData(); this.renderUsersTable(); }
                } catch(err) {}
            }
        }

        async startImpersonation(userId) {
            try {
                const res = await fetch('/api/admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
                if (res.ok) window.location.href = '/dashboard'; 
            } catch (err) {}
        }

        openTierModal(tierId = null) {
            const mc = document.getElementById('admin-modal-container');
            if (!mc) return;
            const tier = tierId ? this.adminData.tiers.find(t => String(t.id) === String(tierId)) : null;

            mc.innerHTML = `
                <div class="admin-modal-overlay">
                    <div class="admin-modal-box">
                        <div class="admin-modal-header"><h3>${tier ? 'Pakket Bewerken' : 'Nieuw Pakket'}</h3><button class="btn-icon-small" id="btn-close-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button></div>
                        <div class="admin-modal-body">
                            <div class="settings-group"><label class="settings-label">Pakketnaam</label><input type="text" id="mt-name" class="settings-input" value="${tier?tier.name:''}" placeholder="Bijv: Pro 50GB"></div>
                            <div class="settings-group"><label class="settings-label">Opslaglimiet (in Bytes)</label><input type="number" id="mt-limit" class="settings-input" value="${tier?tier.storage_limit:'53687091200'}" placeholder="53687091200 (50GB)"></div>
                            <div class="settings-group"><label class="settings-label">Prijs per maand (€)</label><input type="number" step="0.01" id="mt-price" class="settings-input" value="${tier?tier.price:'0.00'}"></div>
                        </div>
                        <div class="admin-modal-footer">
                            <button class="btn-secondary" id="btn-cancel-modal" style="padding:8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); cursor:pointer; background:transparent; color:var(--text-muted);">Annuleren</button>
                            <button class="btn-primary" id="btn-save-tier" style="padding:8px 16px; border-radius:8px; background:var(--primary); color:white; border:none; font-weight:600; cursor:pointer;">Opslaan</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('btn-close-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-cancel-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-save-tier').onclick = async () => {
                const btn = document.getElementById('btn-save-tier');
                if (btn) { btn.innerHTML = 'Opslaan...'; btn.disabled = true; }
                
                const pl = { id: tierId, name: document.getElementById('mt-name').value, storage_limit: document.getElementById('mt-limit').value, price: document.getElementById('mt-price').value };
                try {
                    await fetch('/api/admin/tiers/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(pl) });
                    mc.innerHTML = ''; await this.loadAllData(); this.renderTiersTable();
                } catch(e) {
                    if (btn && document.body.contains(btn)) {
                        btn.innerHTML = 'Opslaan'; btn.disabled = false;
                    }
                }
            };
        }

        openMimeModal(data = {}) {
            const mc = document.getElementById('admin-modal-container');
            if (!mc) return;
            mc.innerHTML = `
                <div class="admin-modal-overlay">
                    <div class="admin-modal-box">
                        <div class="admin-modal-header"><h3>Bestandstype Badge Configuratie</h3><button class="btn-icon-small" id="btn-close-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button></div>
                        <div class="admin-modal-body">
                            <div style="display:flex; gap:16px;">
                                <div class="settings-group" style="flex:1;"><label class="settings-label">Extensie (zonder punt)</label><input type="text" id="mm-ext" class="settings-input" value="${data.ext||''}" placeholder="mp4"></div>
                                <div class="settings-group" style="flex:2;"><label class="settings-label">Mime Type</label><input type="text" id="mm-mime" class="settings-input" value="${data.mime||''}" placeholder="video/mp4"></div>
                            </div>
                            <div style="display:flex; gap:16px;">
                                <div class="settings-group" style="flex:1;"><label class="settings-label">Kleur Badge</label><input type="color" id="mm-col" class="settings-input" value="${data.col||'#64748b'}" style="height:44px; padding:4px;"></div>
                                <div class="settings-group" style="flex:2;"><label class="settings-label">Icoon (SVG code)</label><input type="text" id="mm-icon" class="settings-input" value='${data.icon||''}' placeholder="<svg>...</svg>"></div>
                            </div>
                        </div>
                        <div class="admin-modal-footer">
                            <button class="btn-secondary" id="btn-cancel-modal" style="padding:8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); cursor:pointer; background:transparent; color:var(--text-muted);">Annuleren</button>
                            <button class="btn-primary" id="btn-save-mime" style="padding:8px 16px; border-radius:8px; background:var(--primary); color:white; border:none; font-weight:600; cursor:pointer;">Opslaan</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('btn-close-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-cancel-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-save-mime').onclick = async () => {
                const btn = document.getElementById('btn-save-mime');
                if (btn) { btn.innerHTML = 'Opslaan...'; btn.disabled = true; }
                
                const pl = { extension: document.getElementById('mm-ext').value.toLowerCase(), mime_type: document.getElementById('mm-mime').value, color: document.getElementById('mm-col').value, icon: document.getElementById('mm-icon').value };
                try {
                    await fetch('/api/admin/mimeTypes/save', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(pl) });
                    mc.innerHTML = ''; await this.loadAllData(); this.renderMimesTable();
                } catch(e) {
                    if (btn && document.body.contains(btn)) {
                        btn.innerHTML = 'Opslaan'; btn.disabled = false;
                    }
                }
            };
        }

        openRoleModal(roleId = null) {
            const mc = document.getElementById('admin-modal-container');
            if (!mc) return;

            this.currentEditRoleId = roleId;
            let role = null;
            let p = {};
            if (roleId) {
                role = this.adminData.roles.find(r => String(r.id) === String(roleId));
                if (role && role.permissions) p = role.permissions;
            }

            const isSystem = role && role.is_system == 1;
            const lockMsg = isSystem ? '<div style="background:rgba(245,158,11,0.1); color:#f59e0b; padding:10px; border-radius:8px; font-size:0.85rem; margin-bottom:16px;">Dit is een ingebouwde systeemrol. De naam en het type kunnen niet gewijzigd worden, maar de rechten wel.</div>' : '';

            const matrixDef = [
                {
                    cat: 'Bestandsbeheer', icon: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>',
                    items: [
                        { k: 'file_view', l: 'Inzien & Lezen', d: 'Mag bestanden en mappen openen in de weergave.' },
                        { k: 'file_upload', l: 'Uploaden', d: 'Mag nieuwe bestanden toevoegen aan het systeem.' },
                        { k: 'file_download', l: 'Downloaden', d: 'Krijgt de download-knop te zien.' },
                        { k: 'file_delete', l: 'Verwijderen', d: 'Mag bestanden naar de prullenbak verplaatsen.' },
                        { k: 'folder_create', l: 'Mappen Maken', d: 'Mag nieuwe structuurmappen aanmaken.' },
                        { k: 'item_rename', l: 'Hernoemen', d: 'Mag namen van mappen en bestanden wijzigen.' },
                        { k: 'item_move', l: 'Verplaatsen', d: 'Mag slepen en knippen/plakken.' }
                    ]
                },
                {
                    cat: 'Prullenbak', icon: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
                    items: [
                        { k: 'trash_view', l: 'Prullenbak Inzien', d: 'Mag de prullenbak openen.' },
                        { k: 'trash_restore', l: 'Herstellen', d: 'Mag items terugplaatsen uit de prullenbak.' },
                        { k: 'trash_empty', l: 'Definitief Legen', d: 'Gevaarlijk: Mag de server fysiek opschonen.' }
                    ]
                },
                {
                    cat: 'Samenwerking', icon: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>',
                    items: [
                        { k: 'share_create', l: 'Links Delen', d: 'Mag publieke deellinks genereren.' },
                        { k: 'share_revoke', l: 'Links Intrekken', d: 'Mag actieve links stoppen.' },
                        { k: 'share_enforce_password', l: 'Forceer Wachtwoord', d: 'Beperking: Moet altijd een wachtwoord invullen bij delen.' },
                        { k: 'tag_manage', l: 'Labels Beheren', d: 'Mag nieuwe kleurlabels aanmaken en wijzigen.' },
                        { k: 'album_create', l: 'Albums Maken', d: 'Mag collecties/albums aanmaken.' }
                    ]
                },
                {
                    cat: 'Platform Beheer (Enterprise)', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
                    items: [
                        { k: 'admin_access', l: 'Beheerpaneel Inzien', d: 'Mag het Platform Beheer überhaupt openen.' },
                        { k: 'admin_users', l: 'Gebruikers Beheren', d: 'Mag accounts aanmaken, wachtwoorden resetten en Tiers toewijzen.' },
                        { k: 'admin_roles', l: 'Rollen Beheren', d: 'Mag de permissie matrix (dit scherm) wijzigen.' },
                        { k: 'admin_logs', l: 'Security Logs Inzien', d: 'Mag de inlog-pogingen en terminal acties uitlezen.' },
                        { k: 'admin_settings', l: 'Enterprise Instellingen', d: 'Mag Blacklist, Quarantaine, Tiers, Mime-Types en Branding aanpassen.' },
                        { k: 'admin_impersonate', l: 'Inloggen Als', d: 'Mag inloggen als een andere gebruiker (Support functie).' }
                    ]
                }
            ];

            let matrixHtml = '<div class="permissions-matrix">';
            matrixDef.forEach(group => {
                matrixHtml += `<div class="perm-category"><div class="perm-category-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${group.icon}</svg>${group.cat}</div>`;
                group.items.forEach(item => {
                    const checked = p[item.k] === true ? 'checked' : '';
                    matrixHtml += `
                        <div class="perm-row">
                            <div class="perm-info"><span class="perm-title">${item.l}</span><span class="perm-desc">${item.d}</span></div>
                            <label style="display:flex; align-items:center;"><input type="checkbox" class="role-perm-checkbox apple-toggle" data-key="${item.k}" ${checked}></label>
                        </div>
                    `;
                });
                matrixHtml += `</div>`;
            });
            matrixHtml += '</div>';

            mc.innerHTML = `
                <div class="admin-modal-overlay" id="admin-role-modal">
                    <div class="admin-modal-box xlarge">
                        <div class="admin-modal-header">
                            <h3>${role ? 'Permissie Matrix Bewerken' : 'Nieuwe Rol Aanmaken'}</h3>
                            <button class="btn-icon-small" id="btn-close-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
                        </div>
                        <div class="admin-modal-body">
                            ${lockMsg}
                            <div style="display:flex; gap:16px; margin-bottom: 24px;">
                                <div class="settings-group" style="flex:2;"><label class="settings-label">Rolnaam</label><input type="text" id="mr-name" class="settings-input" value="${role ? role.name : ''}" ${isSystem ? 'disabled style="background:rgba(128,128,128,0.1);"' : ''}></div>
                                <div class="settings-group" style="flex:1;"><label class="settings-label">Kleur/Badge</label><input type="color" id="mr-color" class="settings-input" value="${role ? role.color : '#3b82f6'}" style="padding:4px; height:44px; cursor:pointer;"></div>
                            </div>
                            <div class="settings-group" style="margin-bottom: 24px;"><label class="settings-label">Beschrijving</label><input type="text" id="mr-desc" class="settings-input" value="${role && role.description ? role.description : ''}"></div>
                            <h4 style="margin: 0 0 12px 0;">Machtigingen (Vink aan wat is toegestaan)</h4>
                            ${matrixHtml}
                        </div>
                        <div class="admin-modal-footer">
                            <button class="btn-secondary" id="btn-cancel-modal" style="padding:8px 16px; border-radius:8px; border:1px solid var(--border-dropdown); cursor:pointer; color:var(--text-muted); background:transparent;">Annuleren</button>
                            <button class="btn-primary" id="btn-save-role" style="padding:8px 16px; border-radius:8px; background:var(--primary); color:white; border:none; font-weight:600; cursor:pointer;">Matrix Opslaan</button>
                        </div>
                    </div>
                </div>
            `;

            const overlay = document.getElementById('admin-role-modal');
            overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) mc.innerHTML = ''; });
            document.getElementById('btn-close-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-cancel-modal').onclick = () => mc.innerHTML = '';
            document.getElementById('btn-save-role').onclick = async () => {
                const btn = document.getElementById('btn-save-role'); 
                if (btn) { btn.innerHTML = 'Opslaan...'; btn.disabled = true; }
                
                const perms = {}; document.querySelectorAll('.role-perm-checkbox').forEach(chk => { perms[chk.dataset.key] = chk.checked; });
                const payload = { id: this.currentEditRoleId, name: document.getElementById('mr-name').value, description: document.getElementById('mr-desc').value, color: document.getElementById('mr-color').value, permissions: perms };

                try {
                    const res = await fetch(this.currentEditRoleId ? '/api/admin/roles/update' : '/api/admin/roles/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (res.ok) { document.getElementById('admin-modal-container').innerHTML = ''; await this.loadAllData(); this.renderRolesTable(); }
                } catch (err) { 
                    if (btn && document.body.contains(btn)) {
                        btn.innerHTML = 'Opslaan'; btn.disabled = false; 
                    }
                }
            };
        }
    }

    window.App = window.App || {};
    document.addEventListener('DOMContentLoaded', () => { window.App.adminUI = new AdminUI(); });
})();