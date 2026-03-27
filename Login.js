/* PROJECT: FILEMANAGER | V1.1.2 | MODULE: Views | FILE: public/js/views/Login.js */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Login.js Gestart');

    const get = (id) => document.getElementById(id);
    let csrfToken = null;

    // --- 1. CSRF SETUP ---
    async function initCsrf() {
        try {
            const res = await fetch('/api/csrf');
            if (res.ok) {
                const data = await res.json();
                csrfToken = data.csrf_token;
            }
        } catch (e) { 
            console.error("CSRF Fout", e); 
        }
    }
    initCsrf();

    // --- 1.B FASE 4: ALLOW_REGISTRATION CHECK ---
    async function checkRegistrationStatus() {
        const linkReg = get('link-to-register');
        if (!linkReg) return;
        
        const registerPromptContainer = linkReg.parentElement;
        
        try {
            // SLIMME ROUTING FIX: We gebruiken de bestaande /api/register route met een GET verzoek!
            const res = await fetch('/api/register');
            const data = await res.json();
            
            // Als de backend zegt dat registratie uit staat, verberg de hele sectie.
            if (!data || (data.allow_registration !== '1' && data.allow_registration !== true)) {
                registerPromptContainer.style.display = 'none';
            } else {
                registerPromptContainer.style.display = ''; 
            }
        } catch(e) {
            // Veiligheid: Als de server niet antwoordt, verbergen we de knop.
            registerPromptContainer.style.display = 'none';
        }
    }
    checkRegistrationStatus();

    // --- 2. VIEW SWITCHING ---
    const loginCard = get('card-login');
    const registerCard = get('card-register');
    const linkLog = get('link-to-login');

    const linkRegBtn = get('link-to-register'); 
    if(linkRegBtn) {
        linkRegBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(loginCard) loginCard.classList.remove('active');
            setTimeout(() => {
                if(loginCard) loginCard.classList.add('hidden');
                if(registerCard) {
                    registerCard.classList.remove('hidden');
                    setTimeout(() => registerCard.classList.add('active'), 50);
                }
            }, 400);
        });
    }

    if(linkLog) {
        linkLog.addEventListener('click', (e) => {
            e.preventDefault();
            if(registerCard) registerCard.classList.remove('active');
            setTimeout(() => {
                if(registerCard) registerCard.classList.add('hidden');
                if(loginCard) {
                    loginCard.classList.remove('hidden');
                    setTimeout(() => loginCard.classList.add('active'), 50);
                }
            }, 400);
        });
    }

    // --- 3. CROPPER LOGIC ---
    let cropper = null;
    const cropperModal = get('modal-cropper');
    const canvas = get('cropper-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let img = new Image();
    
    let cropState = {
        zoom: 1, offsetX: 0, offsetY: 0, isDragging: false, startX: 0, startY: 0
    };

    const avatarUpload = get('register-avatar');
    const placeholder = get('avatar-placeholder');
    const avatarImg = get('avatar-preview-img');
    const finalAvatar = get('final-avatar-base64');
    
    if(avatarUpload) {
        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    img.onload = () => {
                        cropState = { zoom: 1, offsetX: 0, offsetY: 0, isDragging: false, startX: 0, startY: 0 };
                        if(get('cropper-zoom')) get('cropper-zoom').value = 1;
                        if(cropperModal) cropperModal.classList.remove('hidden');
                        drawCropper();
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function drawCropper() {
        if(!canvas || !ctx) return;
        const wrapper = document.querySelector('.cropper-wrapper');
        if(!wrapper) return;
        
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * cropState.zoom;
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2 + cropState.offsetX;
        const y = (canvas.height - h) / 2 + cropState.offsetY;
        
        ctx.drawImage(img, x, y, w, h);
    }

    if(canvas) {
        canvas.addEventListener('mousedown', startDrag);
        canvas.addEventListener('mousemove', drag);
        canvas.addEventListener('mouseup', endDrag);
        canvas.addEventListener('mouseleave', endDrag);
        
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrag(e.touches[0]); }, {passive: false});
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); drag(e.touches[0]); }, {passive: false});
        canvas.addEventListener('touchend', endDrag);
    }

    function startDrag(e) {
        cropState.isDragging = true;
        cropState.startX = e.clientX - cropState.offsetX;
        cropState.startY = e.clientY - cropState.offsetY;
    }

    function drag(e) {
        if (!cropState.isDragging) return;
        cropState.offsetX = e.clientX - cropState.startX;
        cropState.offsetY = e.clientY - cropState.startY;
        requestAnimationFrame(drawCropper);
    }

    function endDrag() { cropState.isDragging = false; }

    const zoomSlider = get('cropper-zoom');
    if(zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            cropState.zoom = parseFloat(e.target.value);
            drawCropper();
        });
    }

    const btnCancelCrop = get('btn-crop-cancel');
    if(btnCancelCrop) {
        btnCancelCrop.addEventListener('click', () => {
            if(cropperModal) cropperModal.classList.add('hidden');
            if(avatarUpload) avatarUpload.value = '';
        });
    }

    const btnSaveCrop = get('btn-crop-save');
    if(btnSaveCrop) {
        btnSaveCrop.addEventListener('click', () => {
            const size = 300; 
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = size;
            finalCanvas.height = size;
            const finalCtx = finalCanvas.getContext('2d');
            
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * cropState.zoom;
            const w = img.width * scale;
            const h = img.height * scale;
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            const sourceX = (centerX - cropState.offsetX - w/2) / scale;
            const sourceY = (centerY - cropState.offsetY - h/2) / scale;
            const sourceSize = size / scale;
            
            finalCtx.fillStyle = '#ffffff';
            finalCtx.fillRect(0, 0, size, size);
            
            finalCtx.drawImage(
                img,
                sourceX, sourceY, sourceSize, sourceSize,
                0, 0, size, size
            );
            
            const base64 = finalCanvas.toDataURL('image/jpeg', 0.85);
            
            if(avatarImg) {
                avatarImg.src = base64;
                avatarImg.classList.remove('hidden');
            }
            if(placeholder) placeholder.classList.add('hidden');
            if(finalAvatar) finalAvatar.value = base64;
            
            if(cropperModal) cropperModal.classList.add('hidden');
        });
    }

    // --- 4. FORM SUBMITS ---
    const loginForm = get('form-login');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!csrfToken) await initCsrf();
            
            const btn = get('btn-login');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');
            const msg = get('login-msg');

            btn.disabled = true;
            if(btnText) btnText.classList.add('hidden');
            if(btnLoader) btnLoader.classList.remove('hidden');
            if(msg) msg.classList.add('hidden');

            const payload = Object.fromEntries(new FormData(loginForm).entries());
            payload.csrf_token = csrfToken;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if(data.status === 'success') {
                    window.location.href = '/dashboard';
                } else {
                    throw new Error(data.message);
                }
            } catch(err) {
                if(msg) { msg.textContent = err.message; msg.classList.remove('hidden'); }
                btn.disabled = false;
                if(btnLoader) btnLoader.classList.add('hidden');
                if(btnText) btnText.classList.remove('hidden');
            }
        });
    }

    const regForm = get('form-register');
    if(regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!csrfToken) await initCsrf();
            
            const pwd = get('reg-password').value;
            const pwd2 = get('reg-password-confirm').value;
            const msg = get('register-msg');

            if(pwd !== pwd2) {
                if(msg) { msg.textContent = "Wachtwoorden komen niet overeen."; msg.classList.remove('hidden','success'); msg.classList.add('error'); }
                return;
            }

            const btn = get('btn-register');
            const btnText = btn.querySelector('.btn-text');
            const btnLoader = btn.querySelector('.btn-loader');

            btn.disabled = true;
            if(btnText) btnText.classList.add('hidden');
            if(btnLoader) btnLoader.classList.remove('hidden');
            if(msg) msg.classList.add('hidden');

            const payload = Object.fromEntries(new FormData(regForm).entries());
            payload.csrf_token = csrfToken;

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if(data.status === 'success') {
                    if(msg) { msg.textContent = data.message; msg.classList.remove('hidden','error'); msg.classList.add('success'); }
                    regForm.reset();
                    if(avatarImg) avatarImg.classList.add('hidden');
                    if(placeholder) placeholder.classList.remove('hidden');
                    
                    // Switch naar login view na 2s
                    setTimeout(() => { if(linkLog) linkLog.click(); }, 2000);
                } else {
                    throw new Error(data.message);
                }
            } catch(err) {
                if(msg) { msg.textContent = err.message; msg.classList.remove('hidden','success'); msg.classList.add('error'); }
            } finally {
                const isSuccess = msg && msg.classList.contains('success');
                if(!isSuccess) btn.disabled = false;
                if(btnLoader) btnLoader.classList.add('hidden');
                if(btnText) btnText.classList.remove('hidden');
            }
        });
    }
});