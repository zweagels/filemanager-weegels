/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: UI | FILE: public/js/ui/NotificationCenter.js */

class NotificationCenter {
    constructor() {
        if (window.App && window.App.notifications && window.App.notifications !== this) {
            return window.App.notifications;
        }

        this.container = document.getElementById('toast-container-modern');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container-modern';
            this.container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 999999; display: flex; flex-direction: column; gap: 12px; pointer-events: none;';
            document.body.appendChild(this.container);
        }
        
        this.history = this.loadHistory(); 
        this.unreadCount = this.history.filter(h => !h.read).length;
        this.lastNotif = { message: '', time: 0 }; 
        
        // FASE 4 FIX: Toasts array toegevoegd om stapeling (stacking) bij te houden
        this.activeToasts = [];
        
        this.injectModernToastCSS();

        if (window.EventBus) {
            window.EventBus.on('notify:success', (msg) => this.show('Succes', msg, 'success'));
            window.EventBus.on('notify:error', (msg) => this.show('Foutmelding', msg, 'error'));
            window.EventBus.on('notify:info', (msg) => this.show('Informatie', msg, 'info'));
            window.EventBus.on('notify:warning', (msg) => this.show('Waarschuwing', msg, 'warning'));
        }

        this.initDelegatedBellListener();
        this.updateBellIcon();
    }

    loadHistory() {
        try {
            const data = localStorage.getItem('fm_notif_history');
            return data ? JSON.parse(data) : [];
        } catch(e) {
            return [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('fm_notif_history', JSON.stringify(this.history.slice(0, 20)));
        } catch(e) {}
    }

    injectModernToastCSS() {
        if (document.getElementById('modern-toast-css')) return;
        const style = document.createElement('style');
        style.id = 'modern-toast-css';
        // FASE 4 FIX: Transform animatie CSS aangepast voor vloeiend opstapelen
        style.innerHTML = `
            .fm-toast {
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: flex-start;
                gap: 14px;
                background: var(--bg-dropdown, #ffffff);
                color: var(--text-main, #1e293b);
                padding: 16px;
                border-radius: 12px;
                box-shadow: 0 10px 40px -10px rgba(0,0,0,0.3);
                border: 1px solid var(--border-dropdown, rgba(128,128,128,0.2));
                width: 340px;
                transform: translateX(120%) scale(0.9);
                opacity: 0;
                transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease, margin-top 0.4s ease;
                pointer-events: auto;
                cursor: default;
                margin-top: 0;
            }
            .fm-toast.show {
                transform: translateX(0) scale(1);
                opacity: 1;
            }
            .fm-toast.hide {
                transform: translateX(120%) scale(0.9);
                opacity: 0;
            }
            .fm-toast-icon {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
            }
            .fm-toast-content {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .fm-toast-title {
                font-weight: 700;
                font-size: 0.95rem;
                line-height: 1.2;
            }
            .fm-toast-msg {
                font-size: 0.85rem;
                color: var(--text-muted, #64748b);
                line-height: 1.4;
            }
            .fm-toast-close {
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 0;
                font-size: 1.2rem;
                line-height: 1;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            .fm-toast-close:hover {
                opacity: 1;
                color: var(--text-main);
            }
            .fm-toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 4px;
                background: rgba(0,0,0,0.1);
                width: 100%;
                transform-origin: left;
            }
            
            .fm-toast-success .fm-toast-icon { color: var(--success, #10b981); }
            .fm-toast-error .fm-toast-icon { color: var(--error, #ef4444); }
            .fm-toast-warning .fm-toast-icon { color: var(--warning, #f59e0b); }
            .fm-toast-info .fm-toast-icon { color: var(--primary, #3b82f6); }
            
            .fm-toast-success .fm-toast-progress { background: var(--success, #10b981); opacity: 0.8; }
            .fm-toast-error .fm-toast-progress { background: var(--error, #ef4444); opacity: 0.8; }
            .fm-toast-warning .fm-toast-progress { background: var(--warning, #f59e0b); opacity: 0.8; }
            .fm-toast-info .fm-toast-progress { background: var(--primary, #3b82f6); opacity: 0.8; }
            
            #dropdown-notifications {
                position: absolute;
                top: 50px;
                right: 0;
                width: 380px;
                background: var(--bg-dropdown, #ffffff);
                border: 1px solid var(--border-dropdown, rgba(0,0,0,0.1));
                border-radius: 12px;
                box-shadow: 0 15px 40px -5px rgba(0,0,0,0.2);
                z-index: 10000;
                display: none;
                flex-direction: column;
                max-height: 500px;
                opacity: 0;
                transform: translateY(-10px);
                transition: opacity 0.2s, transform 0.2s;
            }
            #dropdown-notifications.visible {
                display: flex;
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }

    show(title, message, type = 'info', duration = 4000) {
        const now = Date.now();
        if (this.lastNotif.message === message && (now - this.lastNotif.time) < 2000) {
            return;
        }
        this.lastNotif = { message: message, time: now };

        const toast = document.createElement('div');
        toast.className = `fm-toast fm-toast-${type}`;

        let icon = '';
        if(type === 'success') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        else if(type === 'error') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        else if(type === 'warning') icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        else icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

        toast.innerHTML = `
            <div class="fm-toast-icon">${icon}</div>
            <div class="fm-toast-content">
                <span class="fm-toast-title">${title}</span>
                <span class="fm-toast-msg">${message}</span>
            </div>
            <button class="fm-toast-close">&times;</button>
            <div class="fm-toast-progress"></div>
        `;

        this.container.appendChild(toast);
        this.activeToasts.push(toast);

        // FASE 4 FIX: Stacking Offset toepassen
        this.updateToastPositions();

        void toast.offsetWidth;
        toast.classList.add('show');

        const progress = toast.querySelector('.fm-toast-progress');
        const anim = progress.animate([
            { transform: 'scaleX(1)' },
            { transform: 'scaleX(0)' }
        ], { duration: duration, easing: 'linear' });

        let autoCloseTimer = setTimeout(() => this.closeToast(toast), duration);

        toast.addEventListener('mouseenter', () => {
            anim.pause();
            clearTimeout(autoCloseTimer);
        });

        toast.addEventListener('mouseleave', () => {
            anim.play();
            autoCloseTimer = setTimeout(() => this.closeToast(toast), anim.effect.getComputedTiming().duration - anim.currentTime);
        });

        toast.querySelector('.fm-toast-close').addEventListener('click', () => {
            this.closeToast(toast);
        });

        this.history.unshift({ title, message, type, time: new Date().toISOString(), read: false });
        if (this.history.length > 50) this.history.pop();
        this.unreadCount++;
        
        this.saveHistory();
        this.updateDropdown();
        this.updateBellIcon();
    }

    // FASE 4 FIX: Helpt bij het netjes naar boven schuiven als er veel komen
    updateToastPositions() {
        // We tonen max 5 toasts tegelijk, de rest is verborgen totdat er ruimte is
        const MAX_VISIBLE = 5;
        let visibleCount = 0;
        
        // Loop achterwaarts door de actieve toasts
        for (let i = this.activeToasts.length - 1; i >= 0; i--) {
            const t = this.activeToasts[i];
            visibleCount++;
            
            if (visibleCount > MAX_VISIBLE) {
                t.style.display = 'none'; // Verberg de oudste als er meer dan 5 zijn
            } else {
                t.style.display = 'flex';
                // Een subtiele margin-top zorgt voor de stapeling, flex-direction column doet de rest
                t.style.marginTop = visibleCount > 1 ? '0' : '0';
            }
        }
    }

    closeToast(toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        
        // Verwijder uit de actieve lijst
        this.activeToasts = this.activeToasts.filter(t => t !== toast);
        this.updateToastPositions(); // Herbereken de posities van overgebleven toasts
        
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400); 
    }

    updateDropdown() {
        const menu = document.getElementById('dropdown-notifications');
        if (!menu) return;

        const list = menu.querySelector('.dropdown-body');
        if (!list) return;

        if (this.history.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">Geen recente meldingen.</div>`;
            return;
        }

        let html = '';
        this.history.forEach((h, idx) => {
            let iconColor = 'var(--primary)';
            if (h.type === 'error') iconColor = 'var(--error)';
            if (h.type === 'success') iconColor = 'var(--success)';
            if (h.type === 'warning') iconColor = 'var(--warning)';

            const opacity = h.read ? '0.6' : '1';
            const dot = !h.read ? `<div style="width:8px; height:8px; background:var(--primary); border-radius:50%;"></div>` : '';

            const d = new Date(h.time);
            const timeStr = isNaN(d.getTime()) ? '' : d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

            html += `
                <div class="history-item" style="padding: 12px; border-bottom: 1px solid var(--border-dropdown); transition: background 0.2s; cursor: pointer; opacity: ${opacity};">
                    <div style="display:flex; align-items:center; gap: 12px;">
                        <div style="width:32px; height:32px; border-radius:50%; background:${iconColor}20; color:${iconColor}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <div style="flex-grow:1; min-width:0;">
                            <div style="font-weight:600; font-size:0.85rem; color:var(--text-main); margin-bottom:2px; display:flex; justify-content:space-between; align-items:center;">
                                <span>${h.title}</span>
                                <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">${timeStr}</span>
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-muted); line-height:1.3; word-break:break-word;">${h.message}</div>
                        </div>
                        ${dot}
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    }

    initDelegatedBellListener() {
        document.addEventListener('click', (e) => {
            const bellBtn = e.target.closest('#btn-notifications');
            const menu = document.getElementById('dropdown-notifications');
            
            if (bellBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                if (menu) {
                    menu.classList.toggle('visible');
                    if (menu.classList.contains('visible')) {
                        this.unreadCount = 0;
                        this.history.forEach(h => h.read = true);
                        this.saveHistory(); 
                        this.updateDropdown();
                        this.updateBellIcon();
                    }
                }
            } else if (menu && !menu.contains(e.target)) {
                menu.classList.remove('visible');
            }
            
            const clearBtn = e.target.closest('#btn-clear-notifs');
            if (clearBtn) {
                e.stopPropagation(); 
                this.history = [];
                this.unreadCount = 0;
                this.saveHistory(); 
                this.updateDropdown();
                this.updateBellIcon();
                if (menu) menu.classList.remove('visible');
            }
        });

        document.addEventListener('contextmenu', () => {
            const menu = document.getElementById('dropdown-notifications');
            if (menu) menu.classList.remove('visible');
        });
    }

    updateBellIcon() {
        const dot = document.querySelector('#btn-notifications .badge-dot');
        if (dot) {
            if (this.unreadCount > 0) {
                dot.classList.remove('hidden');
                dot.style.transform = 'scale(1.5)';
                setTimeout(() => dot.style.transform = 'scale(1)', 200);
            } else {
                dot.classList.add('hidden');
            }
        }
    }
}

window.App = window.App || {};
document.addEventListener('DOMContentLoaded', () => {
    if (!window.App.notifications) window.App.notifications = new NotificationCenter();
});