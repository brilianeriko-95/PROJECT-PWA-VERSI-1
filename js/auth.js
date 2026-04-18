/* ============================================
   TURBINE LOGSHEET PRO - AUTHENTICATION MODULE
   ============================================ */

// ============================================
// 1. SESSION MANAGEMENT
// ============================================

function initAuth() {
    const session = getSession();
    
    if (session && isSessionValid(session)) {
        currentUser = session.user;
        isAuthenticated = true;
        updateUIForAuthenticatedUser();
        
        // 👇 PERBAIKAN: Hilangkan syarat .contains('active') agar selalu auto-login
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.classList.remove('active');
            loginScreen.style.display = 'none'; // Sembunyikan layar login paksa
        }

        // PENGECEKAN ROLE SAAT AUTO-LOGIN
        if (currentUser.role === 'supervisor' || currentUser.role === 'avp') {
            navigateTo('dashboardSupervisor');
        } else {
            navigateTo('homeScreen');
        }
        
        console.log("✅ Auto-Login Berhasil untuk:", currentUser.name);
    } else {
        clearSession();
        showLoginScreen();
    }
    
    loadUsersCache();
}

function isSessionValid(session) {
    if (!session || !session.expiresAt) return false;
    return Date.now() < session.expiresAt;
}

function saveSession(user, rememberMe = false) {
    // 👇 PERBAIKAN: Beri waktu otomatis 12 Jam (43.200.000 ms) jika AUTH_CONFIG gagal dibaca
    const defaultDuration = 12 * 60 * 60 * 1000; 
    let duration = defaultDuration;
    
    if (typeof AUTH_CONFIG !== 'undefined') {
        duration = rememberMe ? AUTH_CONFIG.REMEMBER_ME_DURATION : AUTH_CONFIG.SESSION_DURATION;
    }

    const session = {
        user: user,
        loginTime: Date.now(),
        expiresAt: Date.now() + duration,
        rememberMe: rememberMe
    };
    
    try {
        const key = (typeof AUTH_CONFIG !== 'undefined') ? AUTH_CONFIG.SESSION_KEY : 'turbine_session';
        localStorage.setItem(key, JSON.stringify(session));
    } catch (e) {
        console.error('Error saving session:', e);
    }
}

function getSession() {
    try {
        const sessionData = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
        return sessionData ? JSON.parse(sessionData) : null;
    } catch (e) {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
}

function requireAuth() {
    if (!isAuthenticated || !isSessionValid(getSession())) {
        clearSession();
        showLoginScreen();
        showCustomAlert('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
        return false;
    }
    return true;
}

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

// ============================================
// 2. LOGIN UI & HELPERS
// ============================================

function showLoginScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) loginScreen.classList.add('active');
    const savedUser = localStorage.getItem(AUTH_CONFIG.USER_KEY);
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            const usernameInput = document.getElementById('operatorUsername');
            if (usernameInput && user.username) {
                usernameInput.value = user.username;
                document.getElementById('operatorPassword')?.focus();
            }
        } catch (e) {
            console.error('Error parsing saved user:', e);
        }
    }
}

function showLoginError(message) {
    const errorMsg = document.getElementById('loginError');
    const usernameInput = document.getElementById('operatorUsername');
    const passwordInput = document.getElementById('operatorPassword');
    
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        errorMsg.style.color = '#ef4444';
        errorMsg.style.fontSize = '0.875rem';
        errorMsg.style.marginTop = '8px';
        errorMsg.style.textAlign = 'center';
        errorMsg.style.padding = '8px';
        errorMsg.style.background = 'rgba(239, 68, 68, 0.1)';
        errorMsg.style.borderRadius = '8px';
        errorMsg.style.border = '1px solid rgba(239, 68, 68, 0.2)';
    }
    
    if (usernameInput) usernameInput.style.borderColor = '#ef4444';
    if (passwordInput) passwordInput.style.borderColor = '#ef4444';
}

function hideLoginError() {
    const errorMsg = document.getElementById('loginError');
    const usernameInput = document.getElementById('operatorUsername');
    const passwordInput = document.getElementById('operatorPassword');
    
    if (errorMsg) {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
    }
    
    if (usernameInput) usernameInput.style.borderColor = '';
    if (passwordInput) passwordInput.style.borderColor = '';
}

function updateUIForAuthenticatedUser() {
    if (!currentUser) return;
    
    const userElements = [
        'displayUserName', 'tpmHeaderUser', 'tpmInputUser', 
        'areaListUser', 'paramUser', 'balancingUser', 
        'ctAreaListUser', 'ctParamUser'
    ];
    
    userElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = currentUser.name || currentUser.username;
    });
    
    if (currentUser.role === 'admin') {
        const homeHeader = document.querySelector('.home-header .user-info');
        if (homeHeader && !homeHeader.querySelector('.admin-badge')) {
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = 'Admin';
            homeHeader.appendChild(badge);
        }
        setTimeout(() => {
            if(typeof updateAdminBranchVisibility === 'function') updateAdminBranchVisibility();
        }, 100);
    }

    // ========================================================
    // TAMPILKAN INFO GRUP SHIFT & STATUS ON DUTY
    // ========================================================
    try {
        const shiftInfo = getCurrentDutyGroup();
        const userNameEl = document.getElementById('displayUserName');
        
        if (userNameEl) {
            // Ambil data grup dari user yang sedang login, ubah ke huruf besar
            const userGroup = currentUser.group ? currentUser.group.toUpperCase() : '-';
            let statusBadge = '';
            
            // Logika Cerdas: Cek jadwal pabrik vs jadwal user
            if (userGroup !== '-' && userGroup !== 'UNKNOWN') {
                const userShiftToday = shiftInfo.schedule[userGroup];

                if (userGroup === shiftInfo.group) {
                    // ON DUTY - Dihilangkan margin-left manual, diganti dengan gap di container
                    statusBadge = `<span style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 3px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; box-shadow: 0 0 10px rgba(16,185,129,0.4); border: 1px solid #34d399; white-space: nowrap;">ON DUTY ✓</span>`;
                } else {
                    // OFF DUTY - Teks dipersingkat agar muat di HP layar kecil
                    let textPeringatan = userShiftToday === 'OFF' ? 'LIBUR ❌' : `JADWAL: ${userShiftToday} ❌`;
                    statusBadge = `<span style="background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; padding: 3px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; border: 1px solid #f87171; box-shadow: 0 0 10px rgba(239,68,68,0.3); white-space: nowrap;">${textPeringatan}</span>`;
                }
            }

            // Tampilkan dengan Layout Flexbox agar Rapi di Layar Kecil HP
            userNameEl.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px; justify-content: center;">
                    <div style="font-weight: 700; font-size: 0.95rem; line-height: 1;">${currentUser.name || currentUser.username}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                        <span style="font-size: 0.65rem; background: rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">
                            Sekarang: Grup ${shiftInfo.group} | ${shiftInfo.shift}
                        </span>
                        ${statusBadge}
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.warn('Gagal memuat info grup shift:', e);
    }
    // ========================================================

   // 👇 TAMBAHKAN PEMICU TEMA DI SINI 👇
    if (typeof applyUnitTheme === 'function' && currentUser && currentUser.department) {
        applyUnitTheme(currentUser.department);
    }
    // 👆 =============================== 👆

    // 👇 BARIS BAWAAN ANDA (JANGAN DIHAPUS) 👇
    filterMenuByUnit();
}
// ============================================
// ROLE-BASED UI: FILTER MENU BERDASARKAN UNIT
// ============================================
function filterMenuByUnit() {
    try {
        if (!currentUser) return;
        
        // Ambil nama departemen dan role user
        const unit = (currentUser.department || '').toUpperCase();
        const role = (currentUser.role || '').toLowerCase(); // <-- BACA ROLE USER
        
        console.log('🛠️ FILTER MENU BERJALAN UNTUK DEPARTEMEN:', unit, '| ROLE:', role);

        // 1. Cari elemen Layar (Screens)
        const homeScreen = document.getElementById('homeScreen');
        const dashSupervisor = document.getElementById('dashboardSupervisor');

        // 2. Cari elemen Menu
        const menuTurbin = document.getElementById('menu-Turbin');
        const menuCT = document.getElementById('menu-CT');
        const menu1300 = document.getElementById('menu-1300');
        const menu1100 = document.getElementById('menu-1100');
        const menu1000 = document.getElementById('menu-1000');
        const menuBalancing = document.getElementById('menu-balancing');
        const menuUser = document.getElementById('menu-user');
        const menuPanelSTG = document.getElementById('menu-PanelSTG');
        const menuPanelAsamSulfat = document.getElementById('menu-PanelAsamSulfat');

        // 3. RESET TAMPILAN LAYAR (Default State)
        if (homeScreen) homeScreen.style.display = 'block'; // Layar home biasa muncul
        if (dashSupervisor) dashSupervisor.style.display = 'none'; // Layar SPV sembunyi

        // 4. SEMBUNYIKAN SEMUA MENU (Default State)
        if (menuTurbin) menuTurbin.style.display = 'none';
        if (menuCT) menuCT.style.display = 'none';
        if (menu1300) menu1300.style.display = 'none';
        if (menu1100) menu1100.style.display = 'none';
        if (menu1000) menu1000.style.display = 'none';
        if (menuBalancing) menuBalancing.style.display = 'none';
        if (menuUser) menuUser.style.display = 'none';
        if (menuPanelSTG) menuPanelSTG.style.display = 'none';
        if (menuPanelAsamSulfat) menuPanelAsamSulfat.style.display = 'none';


        // ==========================================
        // 5. TAMPILKAN BERDASARKAN ROLE & UNIT
        // ==========================================

        // 👇 LOGIKA KHUSUS SUPERVISOR & AVP (Dashboard Dual-Zone) 👇
        if (role === 'supervisor' || role === 'avp') {
            console.log('👑 Mode Eksekutif: Menampilkan Dashboard Monitoring SA & SU');
            
            // Tukar Layar!
            if (homeScreen) homeScreen.style.display = 'none'; 
            if (dashSupervisor) dashSupervisor.style.display = 'block';

            // Ubah Judul Dashboard secara cerdas sesuai siapa yang login
            const headerTitle = dashSupervisor.querySelector('h2');
            if (headerTitle) {
                headerTitle.innerHTML = role === 'avp' ? '👔 AVP Dashboard' : '👨‍💼 Supervisor Dashboard';
            }

            // Panggil mesin penarik data otomatis
            if (typeof loadSupervisorDashboard === 'function') {
                loadSupervisorDashboard();
            }
            return; // Berhenti di sini agar tidak memproses menu bawahnya
        }

        // 👇 CEK ROLE ADMIN (Prioritas Utama Menu) 👇
        else if (role === 'admin' || unit.includes('MANAJEMEN')) {
            console.log('✅ Mode Admin/Supervisor: Menampilkan Semua Menu');
            if (menuTurbin) menuTurbin.style.display = 'flex';
            if (menuCT) menuCT.style.display = 'flex';
            if (menu1300) menu1300.style.display = 'flex';
            if (menu1100) menu1100.style.display = 'flex';
            if (menu1000) menu1000.style.display = 'flex';
            if (menuBalancing) menuBalancing.style.display = 'flex';
            if (menuUser) menuUser.style.display = 'flex';
            if (menuPanelSTG) menuPanelSTG.style.display = 'flex';
            if (menuPanelAsamSulfat) menuPanelAsamSulfat.style.display = 'flex';
        }
        // Jika bukan admin/supervisor, baru cek unitnya
        else if (unit.includes('UTILITAS') || unit.includes('UTIL')) {
            console.log('✅ Menampilkan Menu SU (Turbin, CT, Balancing)');
            if (menuTurbin) menuTurbin.style.display = 'flex';
            if (menuCT) menuCT.style.display = 'flex';
            if (menuBalancing) menuBalancing.style.display = 'flex';
            if (menuPanelSTG) menuPanelSTG.style.display = 'flex';
        } 
        else if (unit.includes('SA') || unit.includes('SULFAT')) {
            console.log('✅ Menampilkan Menu SA (1100 & 1300)');
            if (menu1100) menu1100.style.display = 'flex';
            if (menu1300) menu1300.style.display = 'flex';
            if (menuPanelAsamSulfat) menuPanelAsamSulfat.style.display = 'flex';
        } 
        else if (unit.includes('MELTER') || unit.includes('BELERANG')) {
            console.log('✅ Menampilkan Menu Melter (1000)');
            if (menu1000) menu1000.style.display = 'flex';
        } 
        
    } catch (error) {
        console.error('❌ Error saat menyaring menu unit:', error);
    }
}
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('operatorPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (!passwordInput) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (eyeIcon) {
            eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
        }
    } else {
        passwordInput.type = 'password';
        if (eyeIcon) {
            eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        }
    }
}

// ============================================
// 3. VALIDATION & CACHE
// ============================================

function validateUserOffline(username, password) {
    const inputUsername = String(username).toLowerCase().trim();
    const inputPassword = String(password).trim();
    
    const cachedUsers = loadUsersCache();
    if (cachedUsers && cachedUsers[inputUsername]) {
        const user = cachedUsers[inputUsername];
        if (String(user.password).trim() === inputPassword) {
            if (user.status === 'INACTIVE') {
                return { success: false, error: 'User tidak aktif' };
            }
            return { 
                success: true, 
                user: {
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    department: user.department
                }
            };
        }
        return { success: false, error: 'Password salah' };
    }
    
    const legacyUser = OFFLINE_USERS[inputUsername];
    if (!legacyUser) {
        return { success: false, error: 'User tidak ditemukan' };
    }
    
    if (legacyUser.password !== inputPassword) {
        return { success: false, error: 'Password salah' };
    }
    
    return { 
        success: true, 
        user: {
            username: inputUsername,
            name: legacyUser.name,
            role: legacyUser.role,
            department: legacyUser.department
        }
    };
}

function validateUserOnline(username, password) {
    return new Promise((resolve, reject) => {
        const callbackName = 'loginCallback_' + Date.now();
        const timeout = setTimeout(() => {
            reject(new Error('Timeout'));
        }, 10000);
        
        window[callbackName] = (response) => {
            clearTimeout(timeout);
            cleanupJSONP(callbackName);
            resolve(response);
        };
        
        const script = document.createElement('script');
        script.src = `${GAS_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&callback=${callbackName}`;
        
        script.onerror = () => {
            clearTimeout(timeout);
            cleanupJSONP(callbackName);
            reject(new Error('Network error'));
        };
        
        document.body.appendChild(script);
    });
}

function loadUsersCache() {
    try {
        const cache = localStorage.getItem(AUTH_CONFIG.USERS_CACHE_KEY);
        return cache ? JSON.parse(cache) : null;
    } catch (e) {
        return null;
    }
}

function updateUserCache(username, password, userData) {
    try {
        let cache = loadUsersCache() || {};
        
        cache[username.toLowerCase()] = {
            username: userData.username || username,
            password: password,
            role: userData.role || 'operator',
            name: userData.name || username,
            department: userData.department || 'Unit Utilitas 3B',
            status: 'ACTIVE',
            lastSync: new Date().toISOString()
        };
        
        localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
        usersCache = cache;
        console.log('User cached for offline:', username);
    } catch (e) {
        console.error('Error saving cache:', e);
    }
}

function updatePasswordInCache(username, newPassword) {
    if (!username) return;
    
    const cache = loadUsersCache() || {};
    const key = String(username).toLowerCase();
    
    if (cache[key]) {
        cache[key].password = newPassword;
        cache[key].lastSync = new Date().toISOString();
        localStorage.setItem(AUTH_CONFIG.USERS_CACHE_KEY, JSON.stringify(cache));
        usersCache = cache;
        console.log('Password updated in cache for:', username);
    }
}

// ============================================
// 4. MAIN ACTIONS (LOGIN / LOGOUT)
// ============================================

async function loginOperator() {
    const usernameInput = document.getElementById('operatorUsername');
    const passwordInput = document.getElementById('operatorPassword');
    const loginBtn = document.querySelector('#loginScreen .btn-primary');
    
    if (!usernameInput || !passwordInput) return;
    
    const username = String(usernameInput.value).trim().toLowerCase();
    const password = String(passwordInput.value).trim();
    
    if (!username || !password) {
        showLoginError('Username dan password wajib diisi!');
        return;
    }
    
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>⏳ Memverifikasi...</span>';
    }
    
    hideLoginError();
    
    if (navigator.onLine) {
        try {
            console.log('Trying online login for:', username);
            const result = await validateUserOnline(username, password);
            console.log('Server response:', result);
            
            if (result.success === true) {
                updateUserCache(username, password, result.user);
                handleLoginSuccess(result.user, username, password, false);
                return;
            } else {
                console.log('Server returned error:', result.error);
                showLoginError(result.error || 'Username atau password salah');
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>🔓 Masuk</span>';
                }
                return;
            }
        } catch (error) {
            console.log('Network error, trying offline mode:', error);
        }
    } else {
        console.log('Device offline, using offline mode');
    }
    
    const offlineResult = validateUserOffline(username, password);
    
    if (offlineResult.success) {
        handleLoginSuccess(offlineResult.user, username, password, true);
        showCustomAlert('Login offline berhasil! (Mode Local)', 'warning');
    } else {
        showLoginError(offlineResult.error || 'Login gagal. Periksa koneksi atau username/password.');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>🔓 Masuk</span>';
        }
    }
}

function handleLoginSuccess(user, username, password, isOffline = false) {
    currentUser = user;
    isAuthenticated = true;
    
    saveSession(user, false);
    updateUIForAuthenticatedUser();
    
    // PENGECEKAN ROLE UNTUK NAVIGASI LAYAR
    if (user.role === 'supervisor' || user.role === 'avp') {
        navigateTo('dashboardSupervisor');
    } else {
        navigateTo('homeScreen');
    }
    
    if (isOffline) {
        showCustomAlert(`✓ Login offline berhasil! Selamat datang, ${user.name || user.username}`, 'warning');
    } else {
        showCustomAlert(`✓ Login berhasil! Selamat datang, ${user.name || user.username}`, 'success');
        if (user.role === 'admin' && typeof syncUsersForOffline === 'function') {
            syncUsersForOffline();
        }
    }
    
    const loginBtn = document.querySelector('#loginScreen .btn-primary');
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>🔓 Masuk</span>';
    }
    
    const passwordInput = document.getElementById('operatorPassword');
    if (passwordInput) passwordInput.value = '';
    
    console.log(`[LOGIN] Success - User: ${user.username}, Role: ${user.role}, Mode: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
}

function logoutOperator() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        // Simpan draf jika ada
        if (typeof currentInput !== 'undefined' && Object.keys(currentInput).length > 0) {
            localStorage.setItem(DRAFT_KEYS.LOGSHEET_BACKUP, JSON.stringify(currentInput));
        }
        
        // Bersihkan sesi
        if (typeof clearSession === 'function') clearSession();
        currentUser = null;
        isAuthenticated = false;
        
        // Reset input login
        const usernameInput = document.getElementById('operatorUsername');
        const passwordInput = document.getElementById('operatorPassword');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // BERSIHKAN SEMUA LAYAR SECARA PAKSA (Perbaikan untuk masalah tampilan nembus)
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            // Hapus class active
            screen.classList.remove('active');
            
            // Sembunyikan paksa via inline style (mengatasi nyangkut di homeScreen & supervisor)
            screen.style.display = 'none'; 
        });
        
        // Tampilkan layar login kembali
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            // Hilangkan display none khusus layar login agar bisa dikontrol class .active
            loginScreen.style.display = ''; 
            loginScreen.classList.add('active');
        }

        // Panggil navigasi bawaan Anda jika ada
        if (typeof showLoginScreen === 'function') showLoginScreen();
        
        // Tutup menu bulat popup jika nyangkut terbuka
        const menuOverlay = document.getElementById('branchMenuPopupOverlay');
        if (menuOverlay) menuOverlay.classList.add('hidden');

        showCustomAlert('Anda telah keluar dari sistem.', 'success');
        
        // Gulir ke atas layar agar rapi
        window.scrollTo(0, 0);
    }
}

// ============================================
// 5. CHANGE PASSWORD
// ============================================

function showChangePasswordModal() {
    if (!currentUser) {
        showCustomAlert('Silakan login terlebih dahulu', 'error');
        return;
    }
    
    const modal = document.getElementById('changePasswordModal');
    const usernameSpan = document.getElementById('cpUsername');
    const oldPasswordGroup = document.getElementById('oldPasswordGroup');
    const form = document.getElementById('changePasswordForm');
    
    if (usernameSpan) usernameSpan.textContent = currentUser.username;
    
    if (currentUser.role === 'admin') {
        if (oldPasswordGroup) oldPasswordGroup.style.display = 'none';
        const oldPassInput = document.getElementById('cpOldPassword');
        if(oldPassInput) oldPassInput.removeAttribute('required');
    } else {
        if (oldPasswordGroup) oldPasswordGroup.style.display = 'block';
        const oldPassInput = document.getElementById('cpOldPassword');
        if(oldPassInput) oldPassInput.setAttribute('required', 'true');
    }
    
    if(form) form.reset();
    hideCPError();
    
    if (modal) modal.classList.remove('hidden');
    
    setTimeout(() => {
        if (currentUser.role === 'admin') {
            document.getElementById('cpNewPassword')?.focus();
        } else {
            document.getElementById('cpOldPassword')?.focus();
        }
    }, 100);
    
    if(form) form.onsubmit = handleChangePasswordSubmit;
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.add('hidden');
}

function toggleCPVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

function showCPError(message) {
    const errorDiv = document.getElementById('cpError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function hideCPError() {
    const errorDiv = document.getElementById('cpError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  hideCPError();
  
  if (!currentUser || !currentUser.username) {
    showCPError('Session tidak valid. Silakan login ulang.');
    return;
  }
  
  const oldPassword = document.getElementById('cpOldPassword')?.value || '';
  const newPassword = document.getElementById('cpNewPassword')?.value || '';
  const confirmPassword = document.getElementById('cpConfirmPassword')?.value || '';
  
  if (newPassword.length < 4) {
    showCPError('Password baru minimal 4 karakter');
    return;
  }
  if (newPassword !== confirmPassword) {
    showCPError('Password baru dan konfirmasi tidak cocok');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'Simpan';
  if(submitBtn) {
    submitBtn.textContent = '⏳ Menyimpan...';
    submitBtn.disabled = true;
  }
  
  try {
    console.log('Changing password for:', currentUser.username);
    
    const result = await changePasswordJSONP(
      currentUser.username,
      currentUser.role === 'admin' ? '' : oldPassword,
      newPassword
    );
    
    if (result.success) {
      updatePasswordInCache(currentUser.username, newPassword);
      
      showCustomAlert('✓ Password berhasil diubah! Silakan login ulang.', 'success');
      closeChangePasswordModal();
      
      setTimeout(() => {
        logoutOperator();
      }, 2000);
    } else {
      showCPError(result.error || 'Gagal mengubah password');
    }
    
  } catch (error) {
    console.error('Change password error:', error);
    showCPError('Gagal mengubah password: ' + error.message);
  } finally {
    if(submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

function changePasswordJSONP(username, oldPassword, newPassword) {
  return new Promise((resolve, reject) => {
    const callbackName = 'cpCallback_' + Date.now();
    const timeout = setTimeout(() => {
      cleanupJSONP(callbackName);
      reject(new Error('Timeout - Server tidak merespon'));
    }, 15000); 
    
    window[callbackName] = (response) => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      console.log('Change password response:', response);
      resolve(response);
    };
    
    const script = document.createElement('script');
    const url = `${GAS_URL}?action=changePassword&username=${encodeURIComponent(username)}&oldPassword=${encodeURIComponent(oldPassword)}&newPassword=${encodeURIComponent(newPassword)}&callback=${callbackName}`;
    
    script.src = url;
    
    script.onerror = () => {
      clearTimeout(timeout);
      cleanupJSONP(callbackName);
      reject(new Error('Network error'));
    };
    
    document.body.appendChild(script);
  });
}
