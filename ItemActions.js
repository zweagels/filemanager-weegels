/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/ItemActions.js */

(function() {
    class ItemActions {
        constructor() {
            // FIX: "Capture Phase" (true) forceert de browser om DEZE klik als allereerste 
            // af te handelen, vóórdat Render.js hem kan blokkeren met stopPropagation().
            document.addEventListener('click', (e) => {
                const btnFav = e.target.closest('.btn-favorite');
                if (btnFav) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const itemEl = btnFav.closest('.grid-tile, .list-row, .masonry-tile');
                    if (itemEl) {
                        const id = itemEl.dataset.id;
                        const type = itemEl.dataset.type || 'file';
                        this.toggleFavorite(id, type, btnFav);
                    }
                }
            }, true);
        }
        
        attach3DEffect(element) {
            if (element.classList.contains('list-row')) return;

            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect(); 
                const x = e.clientX - rect.left; 
                const y = e.clientY - rect.top;  
                const rotateX = ((y - rect.height/2) / (rect.height/2)) * -15;
                const rotateY = ((x - rect.width/2) / (rect.width/2)) * 15;
                element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`; 
                element.style.transition = 'none'; 
            });
            
            element.addEventListener('mouseleave', () => { 
                element.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`; 
                element.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'; 
            });
        }

        attachFavoriteEvent(btn, item, type) {
            // Bewust leeg gelaten: logica zit nu veiliger in de constructor delegation.
        }

        async toggleFavorite(id, type, btnElement = null) {
            if (!id) return;

            let newStatus = true;
            let fileObj = null;

            // 1. Zoek het item op in het lokale geheugen
            if (window.App && window.App.renderEngine && window.App.renderEngine.currentData) {
                const list = type === 'folder' ? window.App.renderEngine.currentData.folders : window.App.renderEngine.currentData.files;
                if (list) fileObj = list.find(i => String(i.id) === String(id));
            }

            // 2. Bepaal of het aan of uit moet
            if (fileObj) {
                newStatus = !(parseInt(fileObj.is_favorite || 0) === 1 || fileObj.is_favorite === true);
            } else if (btnElement) {
                newStatus = !btnElement.classList.contains('active');
            }

            // 3. Update direct het DOM element voor een snappy gevoel
            if (!btnElement) {
                btnElement = document.querySelector(`.grid-tile[data-id="${id}"] .btn-favorite, .list-row[data-id="${id}"] .btn-favorite, .masonry-tile[data-id="${id}"] .btn-favorite`);
            }

            if (btnElement) {
                if (newStatus) {
                    btnElement.classList.add('active');
                    btnElement.style.color = '#f59e0b';
                    btnElement.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
                } else {
                    btnElement.classList.remove('active');
                    btnElement.style.color = 'var(--text-muted)';
                    btnElement.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
                }
            }

            // 4. Update de database via API
            try {
                const csrfRes = await fetch('/api/csrf');
                const csrfData = await csrfRes.json();

                const res = await fetch('/api/favorite/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: type,
                        id: id,
                        is_favorite: newStatus,
                        csrf_token: csrfData.csrf_token
                    })
                });

                if (res.ok) {
                    if (fileObj) fileObj.is_favorite = newStatus;
                    if (window.EventBus) {
                        window.EventBus.emit('favorite:toggled', { id, type, is_favorite: newStatus });
                        window.EventBus.emit('view:refresh'); // Dit forceert de visuele update in de app
                        window.EventBus.emit('notify:success', newStatus ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten');
                    }
                } else {
                    throw new Error('API weigert favoriet');
                }
            } catch (err) {
                console.error("Favoriet opslaan mislukt:", err);
            }
        }
    }

    window.App = window.App || {};
    window.App.itemActions = new ItemActions();
})();