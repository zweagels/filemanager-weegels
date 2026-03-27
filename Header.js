/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/Header.js */

class Header {
    constructor() {
        this.el = document.getElementById('main-header');
        if (!this.el) return;

        if (this.el.dataset.headerInit === 'true') return;
        this.el.dataset.headerInit = 'true';

        // FASE 5 FIX: Voeg hamburger knop toe voor mobiel
        this.initMobileMenuToggle();

        this.initListeners();
        
        // --- ADDED FASE 13 & FASE F: Dropdown, Impersonation, Branding & Notificaties ---
        this.initProfileDropdown();
        this.initImpersonationBanner();
        this.initBranding();
        this.initNotifications();
        // ------------------------------------------------------------------------

        if (window.EventBus) {
            window.EventBus.on('render:complete', () => this.updateBreadcrumbs());
            window.EventBus.on('selection:changed', () => this.updateSelectionStatus());
            window.EventBus.on('clipboard:updated', () => this.updateClipboardStatus());
        }

        setTimeout(() => this.updateClipboardStatus(), 500);
    }

    // FASE 5: Mobiele Menu Knop Toevoegen en Koppelen
    initMobileMenuToggle() {
        const headerLeft = this.el.querySelector('.header-left');
        if (!headerLeft) return;

        let btn = document.getElementById('btn-mobile-menu');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-mobile-menu';
            btn.className = 'mobile-menu-btn';
            btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
            
            // Zet hem als allereerste element in de linkersectie
            headerLeft.insertBefore(btn, headerLeft.firstChild);
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.body.classList.toggle('mobile-menu-open');
            });
        }
    }

    // FASE F: Globale Applicatie Branding Toepassen
    async initBranding() {
        try {
            const res = await fetch('/api/admin/branding');
            const json = await res.json();
            if (json.status === 'success' && json.data) {
                const b = json.data;
                
                // Sitetitel (Tabblad en App-titel)
                if (b.site_title) {
                    document.title = b.site_title;
                    // FIX: Brede selectie aan mogelijke classes in jouw sidebar
                    document.querySelectorAll('.sidebar-title, .app-title, .brand-text, .logo-text, .sidebar-brand').forEach(el => el.textContent = b.site_title);
                }
                
                // Primaire Kleur (Thema)
                if (b.primary_color) {
                    document.documentElement.style.setProperty('--primary', b.primary_color);
                }
                
                // Logo URL (Zowel SVG's als IMG tags vervangen)
                if (b.logo_url) {
                    document.querySelectorAll('.sidebar-logo img, .app-logo img, .brand-logo img').forEach(img => img.src = b.logo_url);
                    document.querySelectorAll('.sidebar-logo svg, .app-logo svg, .brand-logo svg').forEach(svg => {
                        const img = document.createElement('img');
                        img.src = b.logo_url;
                        img.style.height = '100%';
                        img.style.width = 'auto';
                        img.style.objectFit = 'contain';
                        svg.replaceWith(img);
                    });
                }
            }
        } catch(e) {}
    }

    // FASE F: Notificatie Belletje Logica (Dropdown & API)
    async initNotifications() {
        const btnNotif = document.getElementById('btn-notifications');
        if (!btnNotif) return;

        let dropNotif = document.getElementById('dropdown-notifications');
        if (!dropNotif) {
            dropNotif = document.createElement('div');
            dropNotif.id = 'dropdown-notifications';
            dropNotif.className = 'dropdown-menu';
            dropNotif.style.cssText = `
                position: absolute; top: 60px; right: 80px; width: 340px; 
                background: var(--bg-surface); border: 1px solid var(--border-dropdown); 
                border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                display: none; flex-direction: column; z-index: 9999;
                overflow: hidden;
            `;
            document.body.appendChild(dropNotif);
        }

        try {
            const res = await fetch('/api/dashboard/notifications');
            const json = await res.json();
            if (json.status === 'success' && json.data) {
                const notifs = json.data;
                
                // Rode Badge Tekenen als er ongelezen meldingen zijn
                let badge = btnNotif.querySelector('.notif-badge');
                if (notifs.length > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'notif-badge';
                        badge.style.cssText = 'position:absolute; top:-2px; right:-2px; background:var(--error); width:12px; height:12px; border-radius:50%; border:2px solid var(--bg-main); box-shadow: 0 0 5px rgba(239,68,68,0.5);';
                        btnNotif.style.position = 'relative';
                        btnNotif.appendChild(badge);
                    }
                } else if (badge) {
                    badge.remove();
                }

                // Dropdown Inhoud Tekenen
                let html = `<div style="padding:16px; border-bottom:1px solid var(--border-dropdown); font-weight:700; color:var(--text-main); display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.02);">
                    🔔 Systeem Meldingen
                    ${notifs.length > 0 ? `<button id="btn-mark-read" style="background:none; border:none; color:var(--primary); font-size:0.8rem; cursor:pointer; font-weight:700; padding:4px 8px; border-radius:6px; transition:background 0.2s;" onmouseover="this.style.background='rgba(37,99,235,0.1)'" onmouseout="this.style.background='transparent'">Gelezen Markeren</button>` : ''}
                </div><div class="hide-scrollbars" style="max-height:350px; overflow-y:auto; padding:12px;">`;

                if (notifs.length === 0) {
                    html += `<div style="padding:30px 20px; text-align:center; color:var(--text-muted); font-size:0.85rem; display:flex; flex-direction:column; align-items:center; gap:8px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        Geen nieuwe meldingen. Je bent helemaal bij!
                    </div>`;
                } else {
                    notifs.forEach(n => {
                        let color = 'var(--primary)';
                        if(n.type === 'warning') color = '#f59e0b';
                        if(n.type === 'error') color = '#ef4444';
                        if(n.type === 'success') color = '#10b981';

                        html += `
                            <div style="padding:12px; border-left:4px solid ${color}; background:rgba(128,128,128,0.03); margin-bottom:10px; border-radius:4px 8px 8px 4px; border-top:1px solid var(--border-dropdown); border-right:1px solid var(--border-dropdown); border-bottom:1px solid var(--border-dropdown);">
                                <div style="font-weight:700; font-size:0.9rem; color:var(--text-main);">${n.title}</div>
                                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px; line-height:1.4;">${n.message}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted); margin-top:8px; opacity:0.6; font-weight:600;">${new Date(n.created_at).toLocaleString('nl-NL')}</div>
                            </div>
                        `;
                    });
                }
                html += `</div>`;
                dropNotif.innerHTML = html;

                const btnRead = dropNotif.querySelector('#btn-mark-read');
                if (btnRead) {
                    btnRead.onclick = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            const tokenRes = await fetch('/api/csrf');
                            const tokenData = await tokenRes.json();
                            await fetch('/api/dashboard/notifications/read', {
                                method:'POST', 
                                headers:{'Content-Type':'application/json'},
                                body: JSON.stringify({csrf_token: tokenData.csrf_token})
                            });
                            this.initNotifications(); 
                        } catch(err) {}
                    };
                }
            }
        } catch(e) {}
    }

    openMenu(menuElement) {
        if (!menuElement) return;
        menuElement.classList.add('visible');
        menuElement.style.display = 'flex'; 
        menuElement.style.opacity = '1';
        menuElement.style.visibility = 'visible';
        menuElement.style.pointerEvents = 'auto';
        menuElement.style.zIndex = '9999';
    }

    closeMenu(menuElement) {
        if (!menuElement) return;
        menuElement.classList.remove('visible');
        menuElement.style.display = 'none';
        menuElement.style.opacity = '0';
        menuElement.style.visibility = 'hidden';
        menuElement.style.pointerEvents = 'none';
    }

    initListeners() {
        document.addEventListener('click', (e) => {
            const btnSidebar = e.target.closest('#btn-toggle-sidebar');
            const btnNotif = e.target.closest('#btn-notifications');
            const btnAvatar = e.target.closest('#header-avatar') || e.target.closest('.user-menu-wrapper') || e.target.closest('.header-profile');
            
            let dropNotif = document.getElementById('dropdown-notifications');
            if (btnNotif && btnNotif.parentElement) {
                dropNotif = btnNotif.parentElement.querySelector('.dropdown-menu') || dropNotif;
            }

            let dropProfile = document.getElementById('global-profile-dropdown');
            if (!dropProfile && btnAvatar && btnAvatar.parentElement) {
                dropProfile = btnAvatar.parentElement.querySelector('.dropdown-menu');
            }

            const isClickInsideNotif = e.target.closest('#dropdown-notifications') || (dropNotif && dropNotif.contains(e.target));
            const isClickInsideProfile = e.target.closest('#global-profile-dropdown') || (dropProfile && dropProfile.contains(e.target));

            if (btnSidebar) {
                e.preventDefault();
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    const isCollapsed = sidebar.classList.toggle('collapsed');
                    
                    if (isCollapsed) {
                        sidebar.dataset.oldWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim();
                        document.documentElement.style.setProperty('--sidebar-width', '80px');
                    } else {
                        document.documentElement.style.setProperty('--sidebar-width', sidebar.dataset.oldWidth || '260px');
                    }

                    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
                }
                return;
            }

            if (btnNotif && !isClickInsideNotif) {
                e.preventDefault();
                e.stopPropagation();
                if (dropNotif) {
                    const isOpen = dropNotif.style.display === 'flex' || dropNotif.style.display === 'block' || dropNotif.classList.contains('visible');
                    if (isOpen) this.closeMenu(dropNotif);
                    else { this.openMenu(dropNotif); this.closeMenu(dropProfile); }
                }
                return;
            }

            if (btnAvatar && !isClickInsideProfile) {
                e.preventDefault();
                e.stopPropagation();
                if (dropProfile) {
                    const isOpen = dropProfile.style.display === 'flex' || dropProfile.style.display === 'block' || dropProfile.classList.contains('visible');
                    if (isOpen) {
                        this.closeMenu(dropProfile);
                    } else { 
                        this.openMenu(dropProfile); 
                        if(dropNotif) this.closeMenu(dropNotif); 
                    }
                }
                return;
            }

            if (dropNotif && !isClickInsideNotif) this.closeMenu(dropNotif);
            if (dropProfile && !isClickInsideProfile) this.closeMenu(dropProfile);
        });

        const searchInput = document.getElementById('spotlight-search');
        if (searchInput && window.App && window.App.filterEngine) {
            searchInput.addEventListener('input', (e) => {
                window.App.filterEngine.setSearch(e.target.value);
            });
        }
    }

    updateClipboardStatus() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        let indicator = document.getElementById('header-clipboard-indicator');
        const clipDataStr = localStorage.getItem('fm_clipboard');
        let clipData = null;
        
        if (clipDataStr) {
            try { clipData = JSON.parse(clipDataStr); } catch(e) {}
        }

        if (!clipData || !clipData.items || clipData.items.length === 0) {
            if (indicator) indicator.style.display = 'none';
            return;
        }

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'header-clipboard-indicator';
            indicator.style.cssText = 'display:flex; align-items:center; gap:6px; background:rgba(245, 158, 11, 0.1); border:1px solid rgba(245, 158, 11, 0.3); color:var(--warning, #f59e0b); padding:6px 12px; border-radius:20px; font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.2s; margin-right:8px; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.1);';
            indicator.title = 'Klik om hier te plakken (Ctrl+V)';
            
            indicator.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                <span class="clip-text">0 items</span>
                <div id="btn-clear-clipboard" style="margin-left:4px; display:flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:rgba(245,158,11,0.2); cursor:pointer; transition:background 0.2s;" title="Klembord wissen (Esc)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            `;
            headerRight.insertBefore(indicator, headerRight.firstChild);

            indicator.addEventListener('mouseenter', () => { indicator.style.background = 'rgba(245, 158, 11, 0.15)'; });
            indicator.addEventListener('mouseleave', () => { indicator.style.background = 'rgba(245, 158, 11, 0.1)'; });

            indicator.addEventListener('click', (e) => {
                const clearBtn = e.target.closest('#btn-clear-clipboard');
                if (clearBtn) {
                    e.stopPropagation();
                    localStorage.removeItem('fm_clipboard');
                    if (window.EventBus) window.EventBus.emit('clipboard:updated');
                    if (window.EventBus) window.EventBus.emit('notify:info', 'Klembord geleegd.');
                    
                    const view = document.getElementById('file-view');
                    if (view) {
                        view.querySelectorAll('.grid-tile, .list-row, .masonry-tile').forEach(el => {
                            el.style.opacity = '1'; el.style.filter = 'none';
                        });
                    }
                    return;
                }
                if (window.App && window.App.hotkeys) window.App.hotkeys.pasteFromClipboard();
            });
        }

        indicator.style.display = 'flex';
        const textEl = indicator.querySelector('.clip-text');
        if (textEl) {
            const actionTxt = clipData.action === 'cut' ? 'Geknipt' : 'Gekopieerd';
            textEl.textContent = `${clipData.items.length} ${actionTxt}`;
        }
    }

    updateBreadcrumbs() {
        const container = document.getElementById('breadcrumbs');
        if (!container) return;

        let data = { breadcrumbs: [] };
        if (window.App && window.App.renderEngine && window.App.renderEngine.currentData) {
            data = window.App.renderEngine.currentData;
        }

        let html = `<div style="display:flex; align-items:center;">`;
        
        if (!data.breadcrumbs || data.breadcrumbs.length === 0) {
            html += `<span class="crumb root breadcrumb-drop" data-folder-id="root" style="cursor:pointer; display:flex; align-items:center;" data-path="root">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span style="font-weight:600; color:var(--text-main);">Mijn Bestanden</span>
            </span>`;
        } else {
            html += `<span class="crumb root breadcrumb-drop" data-folder-id="root" style="cursor:pointer; display:flex; align-items:center;" data-path="root">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </span>`;
            
            data.breadcrumbs.forEach((crumb, index) => {
                html += `<span class="separator" style="margin:0 8px; opacity:0.5;">/</span>`;
                const isLast = index === data.breadcrumbs.length - 1;
                const dropClass = !isLast ? 'breadcrumb-drop' : '';
                const dropData = !isLast ? `data-folder-id="${crumb.id}"` : '';

                if (isLast) {
                    html += `<span class="${dropClass}" ${dropData} style="font-weight:600; color:var(--text-main);">${crumb.name}</span>`;
                } else {
                    html += `<span class="breadcrumb-link ${dropClass}" data-path="${crumb.id}" ${dropData} style="cursor:pointer; color:var(--text-muted); transition:color 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">${crumb.name}</span>`;
                }
            });
        }
        
        html += `</div>`;
        container.innerHTML = html;
        this.attachBreadcrumbEvents(container);

        if (window.App && window.App.selectionManager && window.App.selectionManager.selectedItems && window.App.selectionManager.selectedItems.size > 0) {
            const count = window.App.selectionManager.selectedItems.size;
            const badge = document.createElement('div');
            badge.style.cssText = 'display:flex; align-items:center; gap:10px; background:rgba(37,99,235,0.1); padding:4px 12px; border-radius:20px; border:1px solid rgba(37,99,235,0.2); margin-left: 15px;';
            badge.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                <span style="font-weight:700; color:var(--primary); font-size:0.9rem;">${count} item${count > 1 ? 's' : ''} geselecteerd</span>
                <button id="btn-header-clear-selection" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-left:5px; padding:0; display:flex; align-items:center;" title="Wissen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            container.appendChild(badge);

            const clearBtn = badge.querySelector('#btn-header-clear-selection');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => window.App.selectionManager.clearSelection());
            }
        }
    }

    attachBreadcrumbEvents(container) {
        container.querySelectorAll('.breadcrumb-link, .root').forEach(link => {
            link.addEventListener('click', (e) => {
                const path = e.currentTarget.dataset.path || 'root';
                if (path === 'root') {
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', '/');
                } else if (['trash', 'favorites', 'recent', 'tags_overview', 'albums_overview'].includes(path)) {
                    if (window.EventBus) window.EventBus.emit('navigation:action', path);
                } else if (path.startsWith('tag_detail_') || path.startsWith('album_')) {
                    if (window.EventBus) window.EventBus.emit('navigation:navigate', path);
                } else {
                    if (window.App && window.App.renderEngine) window.App.renderEngine.loadFolder(path);
                }
            });
        });
    }

    updateSelectionStatus() {
        this.updateBreadcrumbs();
    }

    initProfileDropdown() {
        const isAdmin = window.currentUser && window.currentUser.role === 'admin';
        const dropdownHtml = `
            <div id="global-profile-dropdown" style="
                position: absolute; 
                top: 60px; 
                right: 20px; 
                background: var(--bg-surface); 
                border: 1px solid var(--border-dropdown); 
                border-radius: 12px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                width: 220px; 
                padding: 8px; 
                display: none; 
                flex-direction: column; 
                z-index: 9999;
                animation: slideInFade 0.2s ease forwards;
            ">
                <div style="padding: 12px; border-bottom: 1px solid var(--border-dropdown); margin-bottom: 8px;">
                    <div style="font-weight: 700; color: var(--text-main); font-size: 1rem;">${window.currentUser ? window.currentUser.first_name || window.currentUser.username : 'Gebruiker'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${window.currentUser && window.currentUser.email ? window.currentUser.email : ''}</div>
                </div>

                <a href="#" id="menu-link-settings" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:var(--text-main); text-decoration:none; font-weight:600; border-radius:8px; transition:background 0.2s;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Mijn Instellingen
                </a>

                ${isAdmin ? `
                <a href="#" id="menu-link-admin" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:#ef4444; text-decoration:none; font-weight:600; border-radius:8px; transition:background 0.2s;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    Platform Beheer
                </a>
                ` : ''}

                <div style="height: 1px; background: var(--border-dropdown); margin: 8px 0;"></div>

                <a href="#" id="menu-link-logout" style="display:flex; align-items:center; gap:10px; padding:10px 12px; color:var(--text-muted); text-decoration:none; font-weight:600; border-radius:8px; transition:background 0.2s;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Uitloggen
                </a>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dropdownHtml);
        const dropdown = document.getElementById('global-profile-dropdown');

        dropdown.querySelectorAll('a').forEach(a => {
            a.addEventListener('mouseenter', () => a.style.background = 'rgba(128,128,128,0.1)');
            a.addEventListener('mouseleave', () => a.style.background = 'transparent');
        });

        document.getElementById('menu-link-settings').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeMenu(dropdown);
            if (window.EventBus) window.EventBus.emit('navigation:navigate', 'settings');
        });

        const linkAdmin = document.getElementById('menu-link-admin');
        if (linkAdmin) {
            linkAdmin.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeMenu(dropdown);
                if (window.EventBus) window.EventBus.emit('navigation:navigate', 'admin');
            });
        }

        document.getElementById('menu-link-logout').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/login';
            } catch (err) {
                console.error('Logout failed', err);
            }
        });
    }

    initImpersonationBanner() {
        if (window.isImpersonating === true) {
            const banner = document.createElement('div');
            banner.className = 'impersonation-banner';
            banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #ef4444; color: white; padding: 12px; z-index: 1000000; display: flex; justify-content: center; align-items: center; gap: 15px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.2);';
            banner.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>Je bent momenteel ingelogd als <strong>${window.currentUser ? window.currentUser.username : 'Gebruiker'}</strong></span>
                <button class="btn-stop-impersonate" id="btn-stop-impersonate" style="background: white; color: #ef4444; border: none; padding: 6px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: transform 0.2s;">Terug naar Admin</button>
            `;
            document.body.prepend(banner);
            document.body.classList.add('is-impersonating'); 

            if (this.el) this.el.style.marginTop = '45px'; 

            const btn = document.getElementById('btn-stop-impersonate');
            btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'none');
            
            btn.addEventListener('click', async () => {
                btn.innerText = 'Bezig...';
                try {
                    const res = await fetch('/api/admin/impersonate/stop', { method: 'POST' });
                    if (res.ok) {
                        window.location.href = '/admin'; 
                    } else {
                        if (window.EventBus) window.EventBus.emit('notify:error', 'Sessie kon niet hersteld worden.');
                    }
                } catch(e) {
                    if (window.EventBus) window.EventBus.emit('notify:error', 'Kon impersonatie niet stoppen.');
                }
            });
        }
    }
}

window.Header = Header;

document.addEventListener('DOMContentLoaded', () => {
    window.App = window.App || {};
    if (!window.App.header) window.App.header = new Header();
});