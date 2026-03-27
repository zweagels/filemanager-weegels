/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Views | FILE: public/js/views/EmptyStates.js */

(function() {
    class EmptyStates {
        
        render(targetElement, currentMode, currentTagName = null, currentFolderId = null) {
            if (!targetElement) return;

            let html = '';
            
            // FASE 4 FIX: Verbeterde Visuele Feedback (Drop shadows, padding en zachte animaties)
            if (currentMode === 'album_detail') {
                html = `
                    <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted); animation: fadeIn 0.5s ease;">
                        <div style="width: 80px; height: 80px; border-radius: 20px; background: rgba(37,99,235,0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(37,99,235,0.15), inset 0 0 0 1px rgba(37,99,235,0.2); animation: pulse 2s infinite;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                        <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 1.5rem;">Album is leeg</h2>
                        <p style="max-width: 400px; line-height: 1.6; font-size:1.05rem;">Voeg foto's en bestanden toe aan dit album door ze te selecteren en op "Koppelen" te klikken.</p>
                    </div>
                `;
            } else if (currentMode === 'trash') {
                html = `
                    <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted); animation: fadeIn 0.5s ease;">
                        <div style="width: 80px; height: 80px; border-radius: 20px; background: rgba(239, 68, 68, 0.1); color: var(--error); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(239,68,68,0.15), inset 0 0 0 1px rgba(239, 68, 68, 0.2);">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.8;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </div>
                        <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 1.5rem;">Prullenbak is leeg</h2>
                        <p style="max-width: 400px; line-height: 1.6; font-size:1.05rem;">Verwijderde bestanden worden hier bewaard. Momenteel is de prullenbak helemaal leeg.</p>
                    </div>
                `;
            } else if (currentMode === 'favorites') {
                html = `
                    <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted); animation: fadeIn 0.5s ease;">
                        <div style="width: 80px; height: 80px; border-radius: 20px; background: rgba(245, 158, 11, 0.1); color: var(--warning); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(245,158,11,0.15), inset 0 0 0 1px rgba(245, 158, 11, 0.2);">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 21.78 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2.22 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 1.5rem;">Geen favorieten</h2>
                        <p style="max-width: 400px; line-height: 1.6; font-size:1.05rem;">Klik op het ster-icoon bij een bestand of map om deze hier snel terug te kunnen vinden.</p>
                    </div>
                `;
            } else if (currentMode === 'recent') {
                html = `
                    <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted); animation: fadeIn 0.5s ease;">
                        <div style="width: 80px; height: 80px; border-radius: 20px; background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(16,185,129,0.15), inset 0 0 0 1px rgba(16, 185, 129, 0.2);">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 1.5rem;">Geen recente activiteit</h2>
                        <p style="max-width: 400px; line-height: 1.6; font-size:1.05rem;">Bestanden die je toevoegt, bewerkt of opent zullen hier automatisch chronologisch verschijnen.</p>
                        <button id="btn-empty-upload" class="btn-primary" style="margin-top: 24px; padding: 12px 24px; border-radius: 8px; font-weight:600; box-shadow: 0 4px 10px rgba(37,99,235,0.2);">
                            Upload een bestand
                        </button>
                    </div>
                `;
            } else if (currentMode === 'tag_detail') {
                html = `
                    <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted); animation: fadeIn 0.5s ease;">
                        <div style="width: 80px; height: 80px; border-radius: 20px; background: rgba(128, 128, 128, 0.1); color: var(--text-main); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.2);">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.7;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                        </div>
                        <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 1.5rem;">Geen items met dit label</h2>
                        <p style="max-width: 400px; line-height: 1.6; font-size:1.05rem;">Er zijn momenteel geen bestanden of mappen gekoppeld aan het label '${currentTagName || 'deze tag'}'.</p>
                    </div>
                `;
            } else {
                const dropClass = currentMode === 'folder' ? 'breadcrumb-drop' : '';
                const dropData = currentMode === 'folder' ? `data-folder-id="${currentFolderId || 'root'}"` : '';

                html = `
                    <div class="empty-state-placeholder ${dropClass}" ${dropData} style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted); animation: fadeIn 0.5s ease;">
                        <div id="drop-zone-empty" style="width: 120px; height: 120px; border-radius: 30px; background: rgba(37, 99, 235, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; border: 2px dashed rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
                            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        </div>
                        <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 1.6rem;">Deze map is leeg</h2>
                        <p style="max-width: 400px; line-height: 1.6; font-size: 1.05rem;">Sleep bestanden hierheen om ze te uploaden, of klik rechtsboven op de upload knop.</p>
                        <button class="btn-primary" onclick="document.getElementById('mock-upload-input').click()" style="margin-top: 24px; padding: 12px 24px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 15px rgba(37,99,235,0.3);">
                            Bestanden Uploaden
                        </button>
                    </div>
                `;
            }

            targetElement.innerHTML = html;

            if (currentMode === 'recent') {
                const btn = document.getElementById('btn-empty-upload');
                if (btn) {
                    btn.addEventListener('click', () => {
                        const mockInput = document.getElementById('mock-upload-input');
                        if (mockInput) mockInput.click();
                    });
                }
            }
        }

        renderFilterEmptyState(targetElement) {
            if (!targetElement) return;
            targetElement.innerHTML = `
                <div class="empty-state-placeholder" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; min-height: 400px; text-align: center; color: var(--text-muted); animation: fadeIn 0.5s ease;">
                    <div style="width: 80px; height: 80px; border-radius: 20px; background: rgba(128,128,128,0.1); color: var(--text-main); display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: inset 0 0 0 1px rgba(128,128,128,0.2);">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.6;">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                    </div>
                    <h2 style="color: var(--text-main); margin-bottom: 8px; font-size: 1.5rem;">Geen resultaten gevonden</h2>
                    <p style="margin-top: 10px; margin-bottom: 24px; max-width: 400px; line-height: 1.6; font-size: 1.05rem;">Je huidige filters en/of zoekopdracht verbergen alle bestanden.</p>
                    <button id="btn-reset-empty-filters" class="btn-primary" style="padding: 10px 20px; border-radius: 8px; font-weight:600;">Wis Alle Filters</button>
                </div>
            `;
            
            const btn = document.getElementById('btn-reset-empty-filters');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (window.App && window.App.filterEngine) {
                        window.App.filterEngine.reset();
                        const searchInput = document.getElementById('spotlight-search');
                        if (searchInput) searchInput.value = '';
                        if (window.App.renderEngine) window.App.renderEngine.render();
                        if (window.EventBus) window.EventBus.emit('view:refresh');
                    }
                });
            }
        }
    }
    
    window.App = window.App || {};
    window.App.emptyStates = new EmptyStates();
})();