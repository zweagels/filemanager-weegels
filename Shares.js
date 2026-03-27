/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/modules/share/Shares.js */

(function() {
    class Shares {
        constructor(api, modalService) {
            this.api = api || fetch; 
            this.modalService = modalService || (window.App ? window.App.modalService : null) || window.ModalService;
            this.containerId = 'file-view'; 
            this.currentFilter = 'all'; 
            this.allShares = [];
        }

        async render() {
            const container = document.getElementById(this.containerId);
            if (!container) return;
            
            if (window.App && window.App.propertiesPanel && window.App.propertiesPanel.panel) {
                window.App.propertiesPanel.panel.classList.remove('visible');
            }

            const mainToolbar = document.getElementById('main-toolbar');
            if (mainToolbar) mainToolbar.style.display = 'none';

            container.innerHTML = `
                <div class="view-header" style="padding: 20px 30px 0 30px; max-width: 1400px; margin: 0 auto; width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:15px; margin-bottom: 32px; border-bottom: 1px solid var(--border-light); padding-bottom: 20px;">
                        <div>
                            <h1 style="font-size: 2.2rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px; display:flex; align-items:center; gap:12px;">
                                <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(139,92,246,0.1); color: #8B5CF6; display:flex; align-items:center; justify-content:center;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                </div>
                                Mijn Externe Links
                            </h1>
                            <p style="margin:0; color:var(--text-muted); font-size:1.05rem;">Beheer al je publieke deellinks, albums en bestandsaanvragen.</p>
                        </div>
                        
                        <div id="share-filters" style="display:flex; gap:8px; background:var(--bg-dropdown); padding:4px; border-radius:8px; border:1px solid var(--border-dropdown);">
                            <button class="share-filter-btn active" data-filter="all" style="padding:6px 12px; border-radius:6px; border:none; background:var(--primary); color:white; font-size:0.85rem; font-weight:600; cursor:pointer;">Alles</button>
                            <button class="share-filter-btn" data-filter="file" style="padding:6px 12px; border-radius:6px; border:none; background:transparent; color:var(--text-muted); font-size:0.85rem; font-weight:600; cursor:pointer; transition:background 0.2s;">Bestanden</button>
                            <button class="share-filter-btn" data-filter="folder" style="padding:6px 12px; border-radius:6px; border:none; background:transparent; color:var(--text-muted); font-size:0.85rem; font-weight:600; cursor:pointer; transition:background 0.2s;">Mappen</button>
                            <button class="share-filter-btn" data-filter="album" style="padding:6px 12px; border-radius:6px; border:none; background:transparent; color:var(--text-muted); font-size:0.85rem; font-weight:600; cursor:pointer; transition:background 0.2s;">Albums</button>
                            <button class="share-filter-btn" data-filter="slideshow" style="padding:6px 12px; border-radius:6px; border:none; background:transparent; color:var(--text-muted); font-size:0.85rem; font-weight:600; cursor:pointer; transition:background 0.2s;">Slideshows</button>
                            <button class="share-filter-btn" data-filter="request" style="padding:6px 12px; border-radius:6px; border:none; background:transparent; color:var(--text-muted); font-size:0.85rem; font-weight:600; cursor:pointer; transition:background 0.2s;">Aanvragen</button>
                            <button class="share-filter-btn" data-filter="collab" style="padding:6px 12px; border-radius:6px; border:none; background:transparent; color:var(--text-muted); font-size:0.85rem; font-weight:600; cursor:pointer; transition:background 0.2s;" title="Interne Samenwerkingen">Samenwerken</button>
                        </div>
                    </div>
                </div>
                <div id="shares-list-container" style="padding: 0 30px 40px 30px; max-width: 1400px; margin: 0 auto;">
                    <div style="text-align:center; padding: 40px; color:var(--text-muted);">
                        <div class="btn-loader" style="display:inline-block; border-color:rgba(37,99,235,0.2); border-top-color:var(--primary); width:30px; height:30px; border-width:3px; border-radius:50%; animation: spin 1s linear infinite;"></div>
                    </div>
                </div>
            `;

            this.bindFilters();
            await this.loadShares();
        }

        bindFilters() {
            const btns = document.querySelectorAll('.share-filter-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    btns.forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.color = 'var(--text-muted)';
                    });
                    
                    e.target.classList.add('active');
                    e.target.style.background = 'var(--primary)';
                    e.target.style.color = 'white';
                    
                    this.currentFilter = e.target.dataset.filter;
                    this.renderTable();
                });
            });
        }

        async loadShares() {
            const listContainer = document.getElementById('shares-list-container');
            if (!listContainer) return;

            try {
                const response = await fetch(`/api/share/list?_t=${Date.now()}`);
                const data = await response.json();
                
                if (data.status === 'success') {
                    this.allShares = data.data || data.shares || []; 
                    this.renderTable();
                } else {
                    listContainer.innerHTML = `<p style="color: var(--error); text-align: center; padding: 40px;">${data.message}</p>`;
                }
            } catch (error) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 80px 20px; background: var(--bg-surface); border-radius: 16px; border: 2px dashed var(--border-dropdown);">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--error); margin-bottom: 20px; opacity: 0.4;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <h3 style="color: var(--error); margin-bottom: 10px; font-size: 1.5rem;">Verbindingsfout</h3>
                        <p style="color: var(--text-muted); font-size: 1.05rem;">Kon de lijst niet laden.</p>
                    </div>
                `;
            }
        }

        renderTable() {
            const listContainer = document.getElementById('shares-list-container');
            if (!listContainer) return;

            if (this.currentFilter === 'collab') {
                listContainer.innerHTML = `
                    <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 300px; text-align: center; color: var(--text-muted); background:var(--bg-dropdown); border-radius:12px; border:1px dashed var(--border-dropdown);">
                        <div style="width: 60px; height: 60px; border-radius: 16px; background: rgba(37, 99, 235, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <h2 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.2rem;">Interne Samenwerkingen</h2>
                        <p style="margin: 0; max-width: 480px; line-height: 1.5; font-size:0.9rem;">Interne samenwerkingen en gebruikersrechten worden live en direct op de map zelf opgeslagen, niet als een losse publieke link.<br><br><b>Hoe beheer ik dit?</b><br>Ga naar "Mijn Bestanden", klik op 'Delen' bij een map en beheer de rechten via de tab <b>Samenwerken (Intern)</b>.</p>
                    </div>
                `;
                return;
            }

            const filteredShares = this.allShares.filter(s => {
                if (this.currentFilter === 'all') return true;
                if (this.currentFilter === 'file' && s.target_type === 'file') return true;
                if (this.currentFilter === 'folder' && s.target_type === 'folder') return true;
                if (this.currentFilter === 'album' && s.target_type === 'album') return true;
                if (this.currentFilter === 'slideshow' && s.target_type === 'slideshow') return true;
                if (this.currentFilter === 'request' && s.target_type === 'request') return true;
                return false;
            });

            if (filteredShares.length === 0) {
                let emptyMsg = "Je hebt momenteel geen bestanden of mappen gedeeld.";
                if (this.currentFilter === 'request') emptyMsg = "Je hebt nog geen externe bestandsaanvragen openstaan.";
                if (this.currentFilter === 'file') emptyMsg = "Je hebt nog geen losse bestanden gedeeld.";
                if (this.currentFilter === 'folder') emptyMsg = "Je hebt nog geen mappen gedeeld.";
                if (this.currentFilter === 'album') emptyMsg = "Je hebt nog geen albums gedeeld.";
                if (this.currentFilter === 'slideshow') emptyMsg = "Je hebt nog geen slideshows gedeeld.";

                listContainer.innerHTML = `
                    <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 300px; text-align: center; color: var(--text-muted); background:var(--bg-dropdown); border-radius:12px; border:1px dashed var(--border-dropdown); padding: 80px 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 20px; opacity: 0.4;"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.5rem;">Geen resultaten</h3>
                        <p style="color: var(--text-muted); font-size: 1.05rem; margin: 0; max-width: 400px; line-height: 1.5;">${emptyMsg}</p>
                    </div>
                `;
                return;
            }

            const now = new Date();
            let html = `
                <div class="view-list" style="overflow-x: auto; background: var(--bg-dropdown); border-radius: 12px; border: 1px solid var(--border-dropdown); box-shadow: 0 4px 15px rgba(0,0,0,0.02);">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: rgba(128,128,128,0.02); border-bottom: 2px solid var(--border-dropdown); color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">
                                <th style="padding: 16px 20px; width:40px;"></th>
                                <th style="padding: 16px 0;">Item Naam</th>
                                <th style="padding: 16px 20px;">Type</th>
                                <th style="padding: 16px 20px;">Beveiliging</th>
                                <th style="padding: 16px 20px;">Downloads</th>
                                <th style="padding: 16px 20px;">Verloopt op</th>
                                <th style="padding: 16px 20px; text-align: right;">Acties</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            filteredShares.forEach(share => {
                const originalName = share.share_name || share.file_name || share.folder_name || share.album_name || share.slideshow_name || 'Naamloze Link';
                const link = `${window.location.origin}/s/${share.token}`;
                
                let isExpired = false;
                if (share.expires_at && new Date(share.expires_at) < now) isExpired = true;
                const maxDl = share.max_downloads ? parseInt(share.max_downloads, 10) : 0;
                const curDl = parseInt(share.downloads_count || share.views_count, 10) || 0;
                if (maxDl > 0 && curDl >= maxDl) isExpired = true;
                
                const statusDot = isExpired 
                    ? `<div title="Verlopen" style="width:10px; height:10px; border-radius:50%; background:var(--error); box-shadow:0 0 8px var(--error);"></div>` 
                    : `<div title="Actief" style="width:10px; height:10px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;"></div>`;

                let iconColor = 'var(--text-muted)';
                let iconHtml = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
                let typeBadge = `<span class="badge" style="background:rgba(128,128,128,0.1); color:var(--text-muted); border:1px solid rgba(128,128,128,0.2);">${share.target_type}</span>`;

                if (share.target_type === 'folder') {
                    iconColor = '#f59e0b';
                    typeBadge = `<span class="badge" style="background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2);">Map</span>`;
                    iconHtml = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
                } else if (share.target_type === 'file') {
                    iconColor = '#3b82f6';
                    typeBadge = `<span class="badge" style="background:rgba(37,99,235,0.1); color:#3b82f6; border:1px solid rgba(37,99,235,0.2);">Bestand</span>`;
                    iconHtml = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
                } else if (share.target_type === 'album') {
                    iconColor = '#ec4899';
                    typeBadge = `<span class="badge" style="background:rgba(236,72,153,0.1); color:#ec4899; border:1px solid rgba(236,72,153,0.2);">Album</span>`;
                    iconHtml = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
                } else if (share.target_type === 'request') {
                    iconColor = '#10b981';
                    typeBadge = `<span class="badge" style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2);">Aanvraag</span>`;
                    iconHtml = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
                } else if (share.target_type === 'slideshow') {
                    iconColor = '#8b5cf6';
                    typeBadge = `<span class="badge" style="background:rgba(139,92,246,0.1); color:#8b5cf6; border:1px solid rgba(139,92,246,0.2);">Slideshow</span>`;
                    iconHtml = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><polygon points="10 7 15 10 10 13 10 7"></polygon></svg>`;
                }

                let displayNameHtml = `<strong style="color:var(--text-main); font-size:1rem;">${originalName}</strong>`;
                if (share.share_name && share.share_name.trim() !== '') {
                    displayNameHtml = `<strong style="color:var(--text-main); font-size:1rem;">${share.share_name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted); opacity:0.8;">Origineel: ${originalName}</span>`;
                }

                let passBadge = share.password_hash 
                    ? `<span class="badge" style="background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2);" title="Beveiligd met wachtwoord"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Slot</span>` 
                    : '';

                let securityBadges = '';
                if (share.is_protected === 1) {
                    securityBadges += '<span style="color: var(--warning); margin-right: 8px;">🔒 Wachtwoord</span>';
                } else {
                    securityBadges += '<span style="color: var(--success); margin-right: 8px;">🌍 Publiek</span>';
                }

                if (share.is_preview_only === 1) {
                    securityBadges += '<br><span style="color: var(--primary); font-size: 0.8rem; display:inline-block; margin-top:4px;">👁️ Alleen Preview</span>';
                }
                
                let expires = '<span style="opacity:0.5;">Nooit</span>';
                if (share.expires_at) {
                    const date = new Date(share.expires_at);
                    expires = date.toLocaleDateString();
                    if (isExpired) {
                        expires += ' <span style="color: var(--error); font-weight: bold; font-size:0.8rem;"><br>(Verlopen)</span>';
                    }
                }

                let downloadsStr = `${curDl} ${maxDl > 0 ? '/ ' + maxDl : ''}`;
                if (maxDl > 0 && curDl >= maxDl) {
                    downloadsStr = `<span style="color:var(--error); font-weight:bold;">${downloadsStr} (Limiet)</span>`;
                }

                const burnBadge = share.is_burn_link == 1 ? `<span style="background: var(--error); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 8px;">Burn</span>` : '';

                html += `
                    <tr style="border-bottom: 1px solid var(--border-dropdown); transition: background 0.2s; opacity:${isExpired ? '0.6' : '1'};">
                        <td style="padding: 16px 20px;">${statusDot}</td>
                        <td style="padding: 16px 0; color: var(--text-main);">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="color:${iconColor}; display:flex; align-items:center; justify-content:center;">
                                    ${iconHtml}
                                </div>
                                <div>
                                    ${displayNameHtml} ${burnBadge}
                                    <div style="font-size:0.75rem; margin-top:4px; display:flex; align-items:center; gap:6px;">
                                        <a href="${link}" target="_blank" style="color:var(--primary); text-decoration:none;">${link}</a>
                                        <button class="btn-icon-tiny" data-action="quick-copy" data-link="${link}" title="Snel Kopiëren" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 16px 20px;">${typeBadge}</td>
                        <td style="padding: 16px 20px; line-height: 1.4;">${securityBadges}</td>
                        <td style="padding: 16px 20px; color: var(--text-muted);">${downloadsStr}</td>
                        <td style="padding: 16px 20px; color: var(--text-muted);">${expires}</td>
                        <td style="padding: 16px 20px; text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                            <button class="btn btn-secondary btn-sm" data-action="stats" data-id="${share.id}" data-name="${share.share_name || originalName}" style="padding: 6px 10px; background: rgba(59, 130, 246, 0.1); color: var(--primary); border: none; border-radius: 4px; cursor: pointer;" title="Toon Statistieken">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            </button>
                            <button class="btn btn-secondary btn-sm" data-action="qr" data-link="${link}" data-name="${share.share_name || originalName}" style="padding: 6px 10px; background: rgba(128,128,128,0.1); color: var(--text-main); border: none; border-radius: 4px; cursor: pointer;" title="Toon QR Code">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            </button>
                            <button class="btn btn-primary btn-sm" data-action="edit" data-id="${share.id}" style="padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;" title="Bewerken"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            <button class="btn btn-danger btn-sm" data-action="revoke" data-id="${share.id}" style="padding: 6px 12px; background: var(--error); color: white; border: none; border-radius: 4px; cursor: pointer;" title="Intrekken"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            listContainer.innerHTML = html;

            listContainer.querySelectorAll('tbody tr').forEach(row => {
                row.addEventListener('mouseover', () => row.style.backgroundColor = 'rgba(128,128,128,0.03)');
                row.addEventListener('mouseout', () => row.style.backgroundColor = 'transparent');
            });

            this.bindActions();
        }

        bindActions() {
            const container = document.getElementById('shares-list-container');
            if(!container) return;
            
            container.querySelectorAll('.btn-icon-tiny[data-action="quick-copy"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const link = e.currentTarget.dataset.link;
                    navigator.clipboard.writeText(link).then(() => {
                        if (window.EventBus) window.EventBus.emit('notify:success', 'Link gekopieerd!');
                    });
                });
            });

            container.querySelectorAll('button[data-action="stats"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const name = e.currentTarget.dataset.name;
                    if (typeof this.showStatsModal === 'function') this.showStatsModal(id, name);
                });
            });

            container.querySelectorAll('button[data-action="qr"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const link = e.currentTarget.dataset.link;
                    const name = e.currentTarget.dataset.name;
                    if (typeof this.showQRModal === 'function') this.showQRModal(link, name);
                });
            });

            container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (window.App && window.App.shareModal) {
                        window.App.shareModal.openEdit(id);
                    }
                });
            });

            container.querySelectorAll('button[data-action="revoke"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    this.revokeShare(id);
                });
            });
        }

        async showStatsModal(shareId, shareName) {
            if (!this.modalService) return;
            
            const loadingHtml = `
                <div style="text-align:center; padding:30px;">
                    <div class="btn-loader" style="border-color:rgba(0,0,0,0.1); border-top-color:var(--primary); border-width:3px; width:30px; height:30px; margin:0 auto;"></div>
                    <p style="color:var(--text-muted); margin-top:15px;">Statistieken ophalen...</p>
                </div>
            `;
            
            this.modalService.alert('Statistieken: ' + shareName, `<div id="stats-container-${shareId}">${loadingHtml}</div>`);

            try {
                const res = await fetch(`/api/share/stats?id=${shareId}&_t=${Date.now()}`); 
                const data = await res.json();
                
                const container = document.getElementById(`stats-container-${shareId}`);
                if (!container) return;

                if (data.status === 'success') {
                    const s = data.stats;
                    
                    let html = `
                        <div style="display:flex; gap:15px; margin-bottom:20px;">
                            <div style="flex:1; background:rgba(37,99,235,0.05); border:1px solid rgba(37,99,235,0.2); border-radius:12px; padding:20px; text-align:center;">
                                <div style="font-size:2rem; font-weight:800; color:var(--primary); line-height:1;">${s.views}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:5px;">Keer Bekeken</div>
                            </div>
                            <div style="flex:1; background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2); border-radius:12px; padding:20px; text-align:center;">
                                <div style="font-size:2rem; font-weight:800; color:#22c55e; line-height:1;">${s.total_downloads}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:5px;">Downloads</div>
                            </div>
                        </div>
                    `;

                    if (s.top_files && s.top_files.length > 0) {
                        html += `
                            <h4 style="margin:0 0 10px 0; color:var(--text-main); font-size:0.9rem;">Meest gedownloade bestanden</h4>
                            <div style="background:var(--bg-dropdown); border:1px solid var(--border-dropdown); border-radius:8px; overflow:hidden; margin-bottom:20px;">
                        `;
                        s.top_files.forEach((f, idx) => {
                            html += `
                                <div style="display:flex; justify-content:space-between; padding:10px 15px; border-bottom:${idx === s.top_files.length - 1 ? 'none' : '1px solid var(--border-dropdown)'};">
                                    <span style="color:var(--text-main); font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;" title="${f.name}">${f.name}</span>
                                    <span style="color:var(--primary); font-size:0.85rem; font-weight:bold;">${f.dl_count}x</span>
                                </div>
                            `;
                        });
                        html += `</div>`;
                    }

                    if (s.top_folders && s.top_folders.length > 0) {
                        html += `
                            <h4 style="margin:0 0 10px 0; color:var(--text-main); font-size:0.9rem;">Populairste submappen</h4>
                            <div style="background:var(--bg-dropdown); border:1px solid var(--border-dropdown); border-radius:8px; overflow:hidden; margin-bottom:20px;">
                        `;
                        s.top_folders.forEach((f, idx) => {
                            html += `
                                <div style="display:flex; justify-content:space-between; padding:10px 15px; border-bottom:${idx === s.top_folders.length - 1 ? 'none' : '1px solid var(--border-dropdown)'};">
                                    <span style="color:var(--text-main); font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;" title="${f.name}">📁 ${f.name}</span>
                                    <span style="color:#f59e0b; font-size:0.85rem; font-weight:bold;">${f.dl_count} acties</span>
                                </div>
                            `;
                        });
                        html += `</div>`;
                    } else if ((!s.top_files || s.top_files.length === 0) && (!s.top_folders || s.top_folders.length === 0)) {
                        html += `<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:10px;">Er zijn nog geen specifieke statistieken gemeten.</p>`;
                    }

                    container.innerHTML = html;
                } else {
                    container.innerHTML = `<div style="color:var(--error); text-align:center;">Fout: ${data.message}</div>`;
                }
            } catch (e) {
                const container = document.getElementById(`stats-container-${shareId}`);
                if (container) container.innerHTML = `<div style="color:var(--error); text-align:center;">Verbindingsfout bij ophalen statistieken.</div>`;
            }
        }

        showQRModal(link, name) {
            if (!this.modalService) return;
            
            const htmlContent = `
                <div style="text-align:center;">
                    <p style="margin-bottom:15px; color:var(--text-muted); font-size:0.9rem;">Scan deze code om direct naar <b>${name}</b> te gaan.</p>
                    <div id="shares-qr-box" style="background: white; padding: 10px; border-radius: 8px; width: 170px; height: 170px; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display:flex; justify-content:center; align-items:center;">
                        <div class="btn-loader" style="border-color:rgba(0,0,0,0.1); border-top-color:var(--primary); border-width:3px;"></div>
                    </div>
                    <input type="text" value="${link}" readonly style="margin-top:20px; width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-dropdown); background:rgba(0,0,0,0.02); color:var(--text-main); font-weight:bold; text-align:center; cursor:pointer;" title="Klik om te kopiëren">
                </div>
            `;

            this.modalService.alert('Deellink & QR', htmlContent);

            setTimeout(() => {
                const modalEl = document.querySelector('.modal-overlay.visible');
                if (modalEl) {
                    const input = modalEl.querySelector('input');
                    if (input) {
                        input.addEventListener('click', () => {
                            input.select();
                            document.execCommand('copy');
                            if (window.EventBus) window.EventBus.emit('notify:success', 'Link gekopieerd!');
                        });
                    }
                }
            }, 50);

            setTimeout(() => {
                const box = document.getElementById('shares-qr-box');
                if (!box) return;

                fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`)
                    .then(res => res.blob())
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        box.innerHTML = `<img src="${url}" alt="QR Code" style="display:block; width:150px; height:150px; border-radius:4px;">`;
                    })
                    .catch(() => {
                        box.innerHTML = '<span style="color:var(--error); font-size:0.8rem;">Laden mislukt</span>';
                    });
            }, 100);
        }

        revokeShare(shareId) {
            if(!this.modalService) return;
            
            this.modalService.confirm('Link intrekken', 'Weet je zeker dat je deze link wilt intrekken? Gasten verliezen direct de toegang.', { danger: true, yesText: 'Intrekken' })
            .then(async agreed => {
                if (agreed) {
                    const formData = new FormData();
                    formData.append('id', shareId); 
                    
                    try {
                        const csrfRes = await fetch('/api/csrf');
                        const csrfData = await csrfRes.json();
                        formData.append('csrf_token', csrfData.csrf_token);

                        const response = await fetch('/api/share/revoke', { method: 'POST', body: formData });
                        const data = await response.json();
                        
                        if (data.status === 'success') {
                            if (window.EventBus) window.EventBus.emit('notify:success', 'Link succesvol ingetrokken');
                            this.loadShares(); 
                        } else {
                            if (window.EventBus) window.EventBus.emit('notify:error', 'Fout: ' + data.message);
                        }
                    } catch (error) {
                        if (window.EventBus) window.EventBus.emit('notify:error', 'Netwerkfout bij intrekken link');
                    }
                }
            });
        }
    }

    window.Shares = Shares;
})();