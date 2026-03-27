/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Upload | FILE: public/js/modules/upload/ChunkHandler.js */

(function() {
    class ChunkHandler {
        constructor(file, folderId, csrfToken) {
            this.file = file;
            this.folderId = folderId;
            this.csrfToken = csrfToken;
            this.chunkSize = 2 * 1024 * 1024; // Precies 2MB per partitie voor Strato performance
            this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
            this.uuid = this.generateUUID();
            this.fileHash = null;
            this.isPaused = false;
            this.aborted = false;
        }

        // Genereert een unieke ID voor deze upload-sessie
        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // Client-side Hashing voor Duplicate & Integriteit check
        async generateHash() {
            try {
                // Gebruik Web Crypto API. Dit zorgt voor een 1-op-1 match met de PHP server-side hash.
                const buffer = await this.file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                this.fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return this.fileHash;
            } catch (e) {
                throw new Error("Bestand is onleesbaar of te groot om in RAM te hashen.");
            }
        }

        // De Hoofd-loop voor het verwerken van 1 bestand
        async process(callbacks) {
            this.callbacks = callbacks; 
            
            try {
                // STAP 1: Bereken Hash
                if(this.callbacks.onStateChange) this.callbacks.onStateChange('hashing');
                await this.generateHash();
                
                // STAP 2: Duplicate Check in Database (Nu mét bestandsnaam!)
                if(this.callbacks.onStateChange) this.callbacks.onStateChange('checking');
                const duplicateRes = await fetch('/api/upload/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        csrf_token: this.csrfToken,
                        hash: this.fileHash,
                        original_name: this.file.name, // Stuur naam mee voor strikte check
                        relative_path: this.file.webkitRelativePath || "", // Voor checken in submappen
                        folder_id: this.folderId,
                        size: this.file.size
                    })
                });
                
                const duplicateData = await duplicateRes.json();
                if (duplicateData.status !== 'success') throw new Error(duplicateData.message);
                
                if (duplicateData.exists) {
                    if (this.callbacks.onDuplicate) {
                        // Pauzeer en wacht op input van de gebruiker (via Modal UI in Uploader.js)
                        const action = await this.callbacks.onDuplicate(this.file, duplicateData.file);
                        
                        if (action === 'skip') {
                            if(this.callbacks.onSuccess) this.callbacks.onSuccess({ status: 'skipped', message: 'Bestand overgeslagen.' });
                            return;
                        }
                        if (action === 'cancel') {
                            this.aborted = true;
                            return;
                        }
                        // Bij 'overwrite' of 'copy' gaan we gewoon door met de upload loop
                    }
                }

                if (this.aborted) return;

                // STAP 3: Upload Chunks (met Retry Logic)
                if(this.callbacks.onStateChange) this.callbacks.onStateChange('uploading');
                for (let i = 0; i < this.totalChunks; i++) {
                    if (this.aborted) return;
                    
                    // Laat gebruiker handmatig pauzeren
                    while (this.isPaused) {
                        await new Promise(r => setTimeout(r, 500));
                        if (this.aborted) return;
                    }
                    
                    await this.uploadChunkWithRetry(i);
                }

                // STAP 4: Merge Chunks op de server
                if (this.aborted) return;
                if(this.callbacks.onStateChange) this.callbacks.onStateChange('merging');
                const mergeResult = await this.mergeChunks();
                
                if (this.callbacks.onSuccess) this.callbacks.onSuccess(mergeResult);

            } catch (err) {
                if (this.callbacks.onError) this.callbacks.onError(err);
            }
        }

        // Upload partitie inclusief Exponential Backoff bij fouten
        async uploadChunkWithRetry(chunkIndex, retries = 3) {
            const start = chunkIndex * this.chunkSize;
            const end = Math.min(start + this.chunkSize, this.file.size);
            const chunk = this.file.slice(start, end);

            const formData = new FormData();
            formData.append('csrf_token', this.csrfToken);
            formData.append('uuid', this.uuid);
            formData.append('chunk_index', chunkIndex);
            formData.append('total_chunks', this.totalChunks);
            
            // ====================================================================
            // FIX: formData.append('file', ...) in plaats van 'chunk' 
            // Hierdoor matcht het perfect met $_FILES['file'] in de UploadController!
            // Daarbij geven we de naam mee, zodat PHP snapt dat het een bestand is.
            // ====================================================================
            formData.append('file', chunk, this.file.name);
            formData.append('hash', this.fileHash);

            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const res = await fetch('/api/upload/chunk', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!res.ok) throw new Error(`HTTP Fout: ${res.status}`);
                    const data = await res.json();
                    if (data.status !== 'success') throw new Error(data.message);

                    // Geef voortgang + de overgezette bytes door (voor live KB/s berekening)
                    if (this.callbacks.onProgress) {
                        const progress = Math.round(((chunkIndex + 1) / this.totalChunks) * 100);
                        this.callbacks.onProgress(progress, chunk.size); 
                    }
                    return; // Gelukt, verlaat retry loop
                    
                } catch (err) {
                    if (attempt === retries) {
                        throw new Error(`Upload mislukt na ${retries} pogingen bij deel ${chunkIndex + 1}. Controleer je internetverbinding.`);
                    }
                    // Wacht exponentieel langer voordat we het nog eens proberen
                    await new Promise(r => setTimeout(r, 2000 * attempt));
                }
            }
        }

        // Het signaal aan de server dat de puzzle compleet is
        async mergeChunks() {
            const res = await fetch('/api/upload/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    csrf_token: this.csrfToken,
                    uuid: this.uuid,
                    total_chunks: this.totalChunks,
                    original_name: this.file.name,
                    hash: this.fileHash,
                    total_size: this.file.size,
                    folder_id: this.folderId,
                    relative_path: this.file.webkitRelativePath || ""
                })
            });
            const data = await res.json();
            if (data.status !== 'success') throw new Error(data.message);
            return data;
        }

        // Externe bedieningsknoppen
        pause() { this.isPaused = true; }
        resume() { this.isPaused = false; }
        abort() { this.aborted = true; }
    }

    // Koppel aan globaal App object
    window.App = window.App || {};
    window.App.ChunkHandler = ChunkHandler;
})();