/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Core | FILE: public/js/app.js */

document.addEventListener('DOMContentLoaded', () => {
    console.log('FileManager App Initializing...');

    // --- FASE 1: Sitetitel (Branding) Globaal Toepassen met Anti-Flicker ---
    const applyBranding = (title) => {
        document.title = title + " - FileManager";
        const titleElements = document.querySelectorAll('.brand-name, .brand-title, .sidebar-title, .logo-text');
        titleElements.forEach(el => {
            // Update alleen de tekst als we zeker weten dat het geen container met iconen is
            if (el.tagName === 'SPAN' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'DIV') {
                el.textContent = title;
            }
        });
    };

    // Laad direct uit cache voor snelle weergave (Anti-knipper/FOUC oplosser)
    const cachedBranding = localStorage.getItem('fm_branding_title');
    if (cachedBranding) {
        applyBranding(cachedBranding);
    }

    fetch('/api/admin/branding')
        .then(res => res.json())
        .then(json => {
            if (json.status === 'success' && json.data && json.data.site_title) {
                const title = json.data.site_title;
                // Alleen updaten/overschrijven als het veranderd is
                if (title !== cachedBranding) {
                    localStorage.setItem('fm_branding_title', title);
                    applyBranding(title);
                }
            }
        })
        .catch(err => console.error("Fout bij ophalen branding:", err));

    // 1. Zorg dat de globale App namespace bestaat
    window.App = window.App || {};

    // 2. Initialiseer Core UI Componenten
    if (typeof NotificationCenter !== 'undefined') window.App.notifications = new NotificationCenter();
    if (typeof Sidebar !== 'undefined') window.App.sidebar = new Sidebar();
    if (typeof Header !== 'undefined') window.App.header = new Header();
    if (typeof ContextMenu !== 'undefined') window.App.contextMenu = new ContextMenu();
    if (typeof SidebarHistory !== 'undefined') window.App.history = new SidebarHistory();

    // 3. FASE 11 FIX: Initialiseer de nieuwe Share modules veilig met logging
    try {
        if (window.ShareModal) {
            window.App.shareModal = new window.ShareModal(window.App.api || fetch, window.ModalService);
            console.log('ShareModal Module succesvol geladen.');
        } else {
            console.warn('Let op: window.ShareModal is niet gevonden in de DOM.');
        }
        
        if (window.Shares) {
            window.App.sharesView = new window.Shares(window.App.api || fetch, window.ModalService);
            console.log('SharesView Module succesvol geladen.');
        }
    } catch (error) {
        console.error('Fout bij het laden van de Share modules:', error);
    }

    // 4. Sidebar Event Listener voor 'Gedeelde Links'
    if (window.EventBus) {
        window.EventBus.on('navigation:action', (action) => {
            if (action === 'shares') {
                if (window.App.sharesView) {
                    window.App.sharesView.render();
                } else if (window.Shares) {
                    // Fallback als hij de eerste keer gemist was
                    window.App.sharesView = new window.Shares(window.App.api || fetch, window.ModalService);
                    window.App.sharesView.render();
                }
            }
        });
    }

    // 5. Gebruiker Initialisatie
    if (window.currentUser) {
        const user = window.currentUser;
        
        // Update avatar
        const avatarImg = document.getElementById('header-avatar');
        if (avatarImg) {
            if (user.avatar_path) {
                avatarImg.src = user.avatar_path;
            }
            avatarImg.onerror = function() {
                this.style.display = 'none';
                this.parentElement.style.backgroundColor = '#2563EB';
            };
        }
        
        // De 'Welkom terug' toast-melding is hier verwijderd.
    }

    console.log('FileManager Ready.');
});