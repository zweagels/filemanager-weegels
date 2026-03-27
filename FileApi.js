/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: API | FILE: public/js/api/FileApi.js */

(function() {
    class FileApi {
        
        constructor() {
            // FASE 3 FIX: CSRF Caching. 
            // In plaats van bij élke actie de server te bevragen, slaan we de token 1x op in het geheugen.
            this.cachedCsrfToken = null;
            this.csrfPromise = null;
        }

        /**
         * FASE 3: Slimme CSRF Fetcher. 
         * Haalt de token op als hij niet bestaat, anders geeft hij direct de opgeslagen versie terug.
         */
        async getCsrfToken() {
            if (this.cachedCsrfToken) return this.cachedCsrfToken;
            
            // Voorkom dubbele gelijktijdige aanvragen door Promises te bundelen
            if (this.csrfPromise) return this.csrfPromise;

            this.csrfPromise = fetch('/api/csrf')
                .then(res => res.json())
                .then(data => {
                    this.cachedCsrfToken = data.csrf_token;
                    this.csrfPromise = null;
                    return this.cachedCsrfToken;
                })
                .catch(err => {
                    this.csrfPromise = null;
                    console.error("Fout bij ophalen CSRF:", err);
                    return ''; // Fallback (de server zal de actie dan weigeren, wat veilig is)
                });

            return this.csrfPromise;
        }

        /**
         * Hulpfunctie: Zorgt ervoor dat bestanden ALTIJD een geldige 'name' eigenschap hebben.
         */
        sanitizeData(data) {
            if (!data) return { breadcrumbs: [], folders: [], files: [] };
            
            if (data.files && Array.isArray(data.files)) {
                data.files = data.files.map(f => {
                    if (!f.name && f.original_name) f.name = f.original_name;
                    return f;
                });
            }
            if (data.folders && Array.isArray(data.folders)) {
                data.folders = data.folders.map(f => {
                    if (!f.name && f.original_name) f.name = f.original_name;
                    return f;
                });
            }
            return data;
        }

        /**
         * Haalt de inhoud van een specifieke map op.
         */
        async getFolder(folderId) {
            const query = folderId ? `folder=${folderId}&` : '';
            const res = await fetch(`/api/files?${query}t=${Date.now()}`);
            
            if (res.status === 401) { 
                window.location.href = '/login'; 
                return null; 
            }
            
            const json = await res.json();
            if (json.status !== 'success') {
                throw new Error(json.message || 'Fout bij laden van map');
            }
            
            return this.sanitizeData(json.data);
        }

        /**
         * Haalt ALLE recente bestanden op via de backend
         */
        async getRecent() {
            const res = await fetch(`/api/files?action=recent&t=${Date.now()}`);
            if (res.status === 401) { 
                window.location.href = '/login'; 
                return null; 
            }
            
            const json = await res.json();
            if (json.status !== 'success') {
                throw new Error('Fout bij laden recent');
            }
            
            return this.sanitizeData(json.data);
        }

        /**
         * Haalt ALLE favorieten (mappen + bestanden) op via de backend
         */
        async getFavorites() {
            const res = await fetch(`/api/files?action=favorites&t=${Date.now()}`);
            if (res.status === 401) { 
                window.location.href = '/login'; 
                return null; 
            }
            
            const json = await res.json();
            if (json.status !== 'success') {
                throw new Error('Fout bij laden favorieten');
            }
            
            return this.sanitizeData(json.data);
        }

        /**
         * Haalt de inhoud van de prullenbak op.
         */
        async getTrash() {
            const res = await fetch(`/api/trash?t=${Date.now()}`);
            if (res.status === 401) { 
                window.location.href = '/login'; 
                return null; 
            }
            
            const json = await res.json();
            if (json.status !== 'success') {
                throw new Error('Fout bij laden prullenbak');
            }
            
            return this.sanitizeData(json.data) || { breadcrumbs: [{ id: 'trash', name: 'Prullenbak' }], folders: [], files: [] };
        }

        /**
         * Haalt de inhoud van een specifiek album op.
         */
        async getAlbum(albumId) {
            const res = await fetch(`/api/albums/contents?id=${albumId}&t=${Date.now()}`);
            if (res.status === 401) { 
                window.location.href = '/login'; 
                return null; 
            }
            
            const json = await res.json();
            if (json.status !== 'success') {
                throw new Error(json.message || 'Fout bij laden album');
            }
            
            return this.sanitizeData(json.data) || { breadcrumbs: [], folders: [], files: [] };
        }

        /**
         * Haalt ALLE bestanden op die gelinkt zijn aan een tag via de backend
         */
        async getTag(tagName) {
            const res = await fetch(`/api/files?action=tag&name=${encodeURIComponent(tagName)}&t=${Date.now()}`);
            if (res.status === 401) { 
                window.location.href = '/login'; 
                return null; 
            }
            
            const json = await res.json();
            if (json.status !== 'success') {
                throw new Error('Fout bij laden tags');
            }
            
            return this.sanitizeData(json.data);
        }

        /**
         * Verstuurt een request om de favoriet-status te togglen.
         */
        async toggleFavorite(id, type, newStatus) {
            const token = await this.getCsrfToken(); // FASE 3 FIX: Ophalen uit cache
            
            const res = await fetch('/api/favorite/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: id, 
                    type: type, 
                    is_favorite: newStatus, 
                    csrf_token: token 
                })
            });
            
            const json = await res.json();
            if (json.status !== 'success') {
                throw new Error(json.message || 'Kon favoriet niet aanpassen');
            }
            return json;
        }

        // --- FASE 2: PRULLENBAK & HERSTEL API CALLS --- //

        /**
         * Soft-delete: Verplaats een item (bestand of map) naar de prullenbak
         */
        async deleteItem(id, type) {
            const token = await this.getCsrfToken(); // FASE 3 FIX: Ophalen uit cache
            
            const res = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type, csrf_token: token })
            });
            
            return await res.json();
        }

        /**
         * Restore: Haal een item terug uit de prullenbak
         */
        async restoreItem(id, type) {
            const token = await this.getCsrfToken(); // FASE 3 FIX: Ophalen uit cache
            
            const res = await fetch('/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type, csrf_token: token })
            });
            
            return await res.json();
        }

        /**
         * Force Delete: Verwijder een item permanent (kan niet ongedaan worden gemaakt)
         */
        async forceDeleteItem(id, type) {
            const token = await this.getCsrfToken(); // FASE 3 FIX: Ophalen uit cache
            
            const res = await fetch('/api/force-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type, csrf_token: token })
            });
            
            return await res.json();
        }

        /**
         * Empty Trash: Gooi de hele prullenbak leeg
         */
        async emptyTrash() {
            const token = await this.getCsrfToken(); // FASE 3 FIX: Ophalen uit cache
            
            const res = await fetch('/api/empty-trash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csrf_token: token })
            });
            
            return await res.json();
        }
    }

    window.App = window.App || {};
    window.App.fileApi = new FileApi();
})();