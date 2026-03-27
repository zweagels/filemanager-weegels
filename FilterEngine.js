/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Files | FILE: public/js/modules/files/FilterEngine.js */

(function() {
    class FilterEngine {
        constructor() {
            this.storageKey = 'fm_enterprise_filters';
            
            // Standaard Waarden
            this.sortField = 'name'; 
            this.sortOrder = 'asc';
            this.groupBy = 'none';
            this.filterCat = 'alles';
            this.filterDate = 'all';
            this.filterSize = 'all';
            this.activeExtensions = [];
            
            this.searchQuery = '';

            this.loadState();
        }

        loadState() {
            try {
                const savedItem = localStorage.getItem(this.storageKey);
                if (savedItem) {
                    const saved = JSON.parse(savedItem);
                    this.sortField = saved.sortField || 'name';
                    this.sortOrder = saved.sortOrder || 'asc';
                    this.groupBy = saved.groupBy || 'none';
                    this.filterCat = saved.filterCat || 'alles';
                    this.filterDate = saved.filterDate || 'all';
                    this.filterSize = saved.filterSize || 'all';
                    this.activeExtensions = saved.activeExtensions || [];
                }
            } catch(e) {
                console.warn('Kon filters niet laden uit opslag.', e);
            }
        }

        saveState() {
            try {
                const state = {
                    sortField: this.sortField,
                    sortOrder: this.sortOrder,
                    groupBy: this.groupBy,
                    filterCat: this.filterCat,
                    filterDate: this.filterDate,
                    filterSize: this.filterSize,
                    activeExtensions: this.activeExtensions
                };
                localStorage.setItem(this.storageKey, JSON.stringify(state));
            } catch(e) {
                console.warn('Kon filters niet opslaan.', e);
            }
        }

        // Setters
        setSort(field, order) { this.sortField = field; this.sortOrder = order; this.saveState(); }
        setGroupBy(group) { this.groupBy = group; this.saveState(); }
        setCategory(cat) { this.filterCat = cat; this.saveState(); }
        setDate(date) { this.filterDate = date; this.saveState(); }
        setSize(size) { this.filterSize = size; this.saveState(); }
        
        toggleExtension(extStr, isActive) {
            if (isActive) {
                if (!this.activeExtensions.includes(extStr)) this.activeExtensions.push(extStr);
            } else {
                this.activeExtensions = this.activeExtensions.filter(e => e !== extStr);
            }
            this.saveState();
        }
        
        setSearch(query) { 
            this.searchQuery = (query || '').toLowerCase(); 
            if(window.App && window.App.renderEngine) window.App.renderEngine.render();
        }
        
        clearAll() {
            this.sortField = 'name';
            this.sortOrder = 'asc';
            this.groupBy = 'none';
            this.filterCat = 'alles';
            this.filterDate = 'all';
            this.filterSize = 'all';
            this.activeExtensions = [];
            this.searchQuery = '';
            this.saveState();
        }

        apply(data) {
            let folders = data.folders || [];
            let files = data.files || [];
            let breadcrumbs = data.breadcrumbs || [];

            // 1. Bereken de bestandsaantallen voor badges
            let counts = { pdf:0, doc:0, xls:0, ppt:0, txt:0, csv:0, zip:0, mp4:0, mp3:0, jpg:0, png:0, svg:0, psd:0, ai:0, json:0 };
            
            files.forEach(f => {
                const ext = (f.extension || '').toLowerCase();
                if(ext === 'pdf') counts.pdf++;
                else if(['doc','docx'].includes(ext)) counts.doc++;
                else if(['xls','xlsx'].includes(ext)) counts.xls++;
                else if(['ppt','pptx'].includes(ext)) counts.ppt++;
                else if(ext === 'txt') counts.txt++;
                else if(ext === 'csv') counts.csv++;
                else if(['zip','rar','7z'].includes(ext)) counts.zip++;
                else if(['mp4','mov','avi'].includes(ext)) counts.mp4++;
                else if(['mp3','wav','ogg'].includes(ext)) counts.mp3++;
                else if(['jpg','jpeg'].includes(ext)) counts.jpg++;
                else if(ext === 'png') counts.png++;
                else if(ext === 'svg') counts.svg++;
                else if(ext === 'psd') counts.psd++;
                else if(ext === 'ai') counts.ai++;
                else if(['json','xml'].includes(ext)) counts.json++;
            });

            // 2. Filter Mappen
            let filteredFolders = folders.filter(f => {
                if (this.searchQuery && !(f.name || '').toLowerCase().includes(this.searchQuery)) return false;
                return true;
            });

            // 3. Filter Bestanden
            let filteredFiles = files.filter(f => {
                if (this.searchQuery && !(f.name || f.original_name || '').toLowerCase().includes(this.searchQuery)) return false;
                
                if (this.filterCat !== 'alles') {
                    const type = f.category || f.type || 'unknown';
                    const ext = (f.extension || '').toLowerCase();
                    if (this.filterCat === 'doc' && !['doc','pdf','txt','csv','xls','ppt'].includes(type) && !['doc','docx','pdf','txt','csv','xls','xlsx','ppt','pptx'].includes(ext)) return false;
                    if (this.filterCat === 'image' && type !== 'image' && !['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return false;
                    if (this.filterCat === 'video' && type !== 'video' && type !== 'audio' && !['mp4','mov','avi','mkv','mp3','wav'].includes(ext)) return false; 
                }

                if (this.filterDate !== 'all') {
                    const d = new Date(f.created_at || Date.now());
                    const now = new Date();
                    const diffTime = Math.abs(now - d);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    if (this.filterDate === 'today' && diffDays > 1) return false;
                    if (this.filterDate === 'week' && diffDays > 7) return false;
                    if (this.filterDate === 'month' && diffDays > 30) return false;
                }

                if (this.filterSize !== 'all') {
                    const sizeMB = (f.size || 0) / (1024 * 1024);
                    if (this.filterSize === 'small' && sizeMB >= 1) return false;
                    if (this.filterSize === 'medium' && (sizeMB < 1 || sizeMB > 50)) return false;
                    if (this.filterSize === 'large' && sizeMB <= 50) return false;
                }

                if (this.activeExtensions.length > 0) {
                    const ext = (f.extension || '').toLowerCase();
                    let match = false;
                    for (let activeExt of this.activeExtensions) {
                        const exts = activeExt.split(','); 
                        if (exts.includes(ext)) { match = true; break; }
                    }
                    if (!match) return false;
                }

                return true;
            });

            // 4. Sorteer Logica
            const sortFn = (a, b) => {
                let valA, valB;
                switch(this.sortField) {
                    case 'date_created':
                        valA = new Date(a.created_at || 0).getTime();
                        valB = new Date(b.created_at || 0).getTime();
                        break;
                    case 'date_modified':
                        valA = new Date(a.updated_at || a.created_at || 0).getTime();
                        valB = new Date(b.updated_at || b.created_at || 0).getTime();
                        break;
                    case 'size':
                        valA = a.size || 0;
                        valB = b.size || 0;
                        break;
                    case 'type':
                        valA = (a.extension || 'map').toLowerCase();
                        valB = (b.extension || 'map').toLowerCase();
                        break;
                    case 'color': 
                        valA = (a.color && a.color !== 'none') ? a.color : 'zzzzzz'; 
                        valB = (b.color && b.color !== 'none') ? b.color : 'zzzzzz';
                        break;
                    case 'name':
                    default:
                        valA = (a.name || a.original_name || '').toLowerCase();
                        valB = (b.name || b.original_name || '').toLowerCase();
                        break;
                }
                
                if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            };

            filteredFolders.sort(sortFn);
            filteredFiles.sort(sortFn);

            let groupedFiles = null;
            if (this.groupBy !== 'none' && filteredFiles.length > 0) {
                groupedFiles = this.calculateGroups(filteredFiles);
            }

            return {
                breadcrumbs: breadcrumbs,
                folders: filteredFolders,
                files: filteredFiles,
                groupedFiles: groupedFiles,
                groupBy: this.groupBy,
                counts: counts
            };
        }

        calculateGroups(files) {
            const groups = {};
            
            files.forEach(f => {
                let groupName = 'Overig';
                
                switch(this.groupBy) {
                    case 'type':
                        const ext = (f.extension || '').toLowerCase();
                        if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) groupName = 'Afbeeldingen';
                        else if (['mp4','mov','avi','mkv'].includes(ext)) groupName = 'Video\'s';
                        else if (['mp3','wav','ogg'].includes(ext)) groupName = 'Audio';
                        else if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv'].includes(ext)) groupName = 'Documenten';
                        else if (['zip','rar','7z','tar','gz'].includes(ext)) groupName = 'Archieven';
                        else groupName = ext ? ext.toUpperCase() + ' Bestanden' : 'Overig';
                        break;
                    
                    case 'date':
                        const d = new Date(f.created_at || Date.now());
                        const now = new Date();
                        const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const diffDays = Math.round((nowMidnight - dMidnight) / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 0) groupName = 'Vandaag';
                        else if (diffDays === 1) groupName = 'Gisteren';
                        else if (diffDays <= 7) groupName = 'Afgelopen week';
                        else if (diffDays <= 30) groupName = 'Deze maand';
                        else if (diffDays <= 365) groupName = 'Dit jaar';
                        else groupName = 'Ouder';
                        break;
                        
                    case 'size':
                        const sizeMB = (f.size || 0) / (1024 * 1024);
                        if (sizeMB < 1) groupName = 'Klein (< 1MB)';
                        else if (sizeMB <= 50) groupName = 'Middel (1MB - 50MB)';
                        else if (sizeMB <= 500) groupName = 'Groot (50MB - 500MB)';
                        else groupName = 'Zeer Groot (> 500MB)';
                        break;
                        
                    case 'alpha':
                        const firstChar = (f.name || f.original_name || '#').charAt(0).toUpperCase();
                        groupName = /[A-Z]/.test(firstChar) ? firstChar : '#';
                        break;
                }

                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push(f);
            });

            const sortedGroups = {};
            let keys = Object.keys(groups);
            
            if (this.groupBy === 'alpha') {
                keys.sort();
            } else if (this.groupBy === 'date') {
                const order = ['Vandaag', 'Gisteren', 'Afgelopen week', 'Deze maand', 'Dit jaar', 'Ouder'];
                keys.sort((a, b) => {
                    let idxA = order.indexOf(a) === -1 ? 99 : order.indexOf(a);
                    let idxB = order.indexOf(b) === -1 ? 99 : order.indexOf(b);
                    return idxA - idxB;
                });
            } else if (this.groupBy === 'size') {
                const order = ['Zeer Groot (> 500MB)', 'Groot (50MB - 500MB)', 'Middel (1MB - 50MB)', 'Klein (< 1MB)'];
                keys.sort((a, b) => {
                    let idxA = order.indexOf(a) === -1 ? 99 : order.indexOf(a);
                    let idxB = order.indexOf(b) === -1 ? 99 : order.indexOf(b);
                    return idxA - idxB;
                });
            } else {
                keys.sort(); 
            }

            keys.forEach(k => sortedGroups[k] = groups[k]);
            return sortedGroups;
        }
    }

    window.App = window.App || {};
    window.App.filterEngine = new FilterEngine();
})();