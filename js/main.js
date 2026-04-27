/* ============================================
   TURBINE LOGSHEET PRO - MAIN ENTRY & SYSTEM
   ============================================ */

// ============================================
// 0. SERVICE WORKER REGISTRATION & UPDATE
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // Deteksi jika ada update yang sedang menunggu (Waiting)
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // TAMPILKAN NOTIFIKASI KE OPERATOR
                        showUpdateNotification(reg);
                    }
                });
            });

            // Jika aplikasi dibuka dan sudah ada update yang menunggu
            if (reg.waiting) {
                showUpdateNotification(reg);
            }
        });
    });
}

/**
 * Memunculkan Custom Modal Notifikasi Update (Ganti fungsi lama)
 */
function showUpdateNotification(reg) {
    const modal = document.getElementById('updateModal');
    const btnUpdate = document.getElementById('btnUpdateNow');
    const btnLater = document.getElementById('btnUpdateLater');

    if (!modal) return;

    // 1. Tampilkan modal dengan animasi halus
    modal.classList.remove('hidden');

    // 2. Aksi tombol "Update Sekarang"
    btnUpdate.onclick = () => {
        if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Refresh otomatis setelah SW baru mengambil alih
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    };

    // 3. Aksi tombol "Nanti Saja"
    btnLater.onclick = () => {
        modal.classList.add('hidden');
    };
}
// ============================================
// 1. INITIALIZATION & SERVICE WORKER
// ============================================

function initState() {
    try {
        // 1. MUAT DRAFT LOGSHEET UNIVERSAL
        // Mengambil semua menu (LAPANGANTURBIN, CT, 1300, dst) secara otomatis
        Object.keys(LOGSHEET_CONFIG).forEach(menuKey => {
            const config = LOGSHEET_CONFIG[menuKey];
            const savedData = localStorage.getItem(config.draftKey);
            const savedPhotos = localStorage.getItem(config.photoKey);

            // Simpan ke state global window agar bisa diakses oleh module lain
            if (!window.activeDrafts) window.activeDrafts = {};
            if (!window.activePhotos) window.activePhotos = {};

            window.activeDrafts[menuKey] = savedData ? JSON.parse(savedData) : {};
            window.activePhotos[menuKey] = savedPhotos ? JSON.parse(savedPhotos) : {};
        });

        // 2. MUAT DRAFT TPM UNIVERSAL
        const savedTPM = localStorage.getItem('draft_tpm');
        window.activeTPMDraft = savedTPM ? JSON.parse(savedTPM) : {};

        console.log("✅ Seluruh state draf universal berhasil diinisialisasi.");
    } catch (e) {
        console.error('Error saat inisialisasi state:', e);
    }
}

// ============================================
// 2. PREMIUM LOADER SYSTEM
// ============================================

// Loading stages configuration
const loadingStages = [
    { percent: 0, text: "Memuat sistem...", stage: "Setup" },
    { percent: 20, text: "Menghubungkan ke server...", stage: "Network" },
    { percent: 40, text: "Mengambil data pengguna...", stage: "Auth" },
    { percent: 60, text: "Memuat konfigurasi...", stage: "Config" },
    { percent: 80, text: "Sinkronisasi logsheet...", stage: "Sync" },
    { percent: 95, text: "Menyelesaikan...", stage: "Finalize" },
    { percent: 100, text: "Siap!", stage: "Ready" }
];

function updateLoaderProgress(targetPercent) {
    const progressBar = document.getElementById('loaderProgress');
    const percentText = document.getElementById('loaderPercent');
    const statusText = document.getElementById('loaderStatusText');
    const stageText = document.getElementById('loaderStage');
    
    // Find current stage
    const stage = loadingStages.find(s => targetPercent <= s.percent) || loadingStages[loadingStages.length - 1];
    
    // Update width
    if (progressBar) progressBar.style.width = targetPercent + '%';
    
    // Update percentage with counting animation
    if (percentText) {
        animateNumber(percentText, parseInt(percentText.textContent) || 0, targetPercent, 300);
    }
    
    // Update texts
    if (statusText) statusText.textContent = stage.text;
    if (stageText) stageText.textContent = stage.stage;
    
    // Success state at 100%
    if (targetPercent >= 100) {
        setTimeout(() => {
            if (progressBar) {
                progressBar.style.background = 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
                progressBar.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)';
            }
            const percentEl = document.querySelector('.progress-percentage');
            if (percentEl) percentEl.style.color = '#34d399';
            if (statusText) statusText.textContent = "Memuat selesai!";
        }, 200);
    }
}

function animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;
    
    if (range === 0) return;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current + '%';
        if (current === end) {
            clearInterval(timer);
        }
    }, Math.max(stepTime, 16));
}

function simulateLoading() {
    let progress = 0;
    
    const increment = () => {
        const randomJump = Math.random() * 15 + 5;
        progress += randomJump;
        
        if (progress >= 100) {
            progress = 100;
            updateLoaderProgress(Math.floor(progress));
            setTimeout(() => {
                hideLoader();
            }, 800);
        } else {
            updateLoaderProgress(Math.floor(progress));
            setTimeout(increment, 400 + Math.random() * 400);
        }
    };
    
    // Start after text animation completes (approx 1s)
    setTimeout(increment, 1200);
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 600);
    }
}

// ============================================
// 3. UI & NAVIGATION HELPERS
// ============================================

// State Global untuk menandai posisi operator
window.currentActiveMenu = ''; 

/**
 * Mesin Navigasi Utama PWA
 * Mengatur perpindahan layar dengan transisi halus dan pemicu data otomatis.
 */
function navigateTo(screenId) {
    console.log('🚀 Navigating to screen:', screenId);
    
    // 1. Amankan posisi scroll ke atas setiap ganti layar
    window.scrollTo(0, 0);

    // 2. Sembunyikan semua layar secara paksa
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none';
    });

    // 3. Tampilkan layar tujuan
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'block';
        // Delay sedikit agar browser sempat memproses display:block sebelum animasi CSS jalan
        setTimeout(() => {
            targetScreen.classList.add('active');
        }, 10);
    }

    // --- LOGIKA INTERCEPTOR KHUSUS (Pemicu Otomatis) ---

    // 👇 PERBAIKAN: Update otomatis semua nama user ("-") di setiap layar 👇
    if (typeof currentUser !== 'undefined' && currentUser) {
        const userName = currentUser.name || 'Operator';
        
        // Update elemen badge di berbagai layar
        const userBadgeIds = [
            'logsheetSelectUser', // Layar Pilih Logsheet
            'tpmHeaderUser',      // Layar Daftar TPM
            'tpmInputUser',       // Layar Input TPM
            'balancingUser'       // Layar Balancing
        ];
        
        userBadgeIds.forEach(id => {
            const badgeEl = document.getElementById(id);
            if (badgeEl) badgeEl.textContent = userName;
        });
    }
    // 👆 ================================================================ 👆
    
    // Sinkronisasi data offline saat kembali ke Home
    if (screenId === 'homeScreen') {
        checkOfflineData();
    }

    // Render ulang area TPM jika masuk ke menu TPM
    if (screenId === 'tpmScreen' && typeof renderTPMAreas === 'function') {
        renderTPMAreas();
    }

    // Update data dashboard jika supervisor masuk
    if (screenId === 'dashboardSupervisor' && typeof loadSupervisorDashboard === 'function') {
        loadSupervisorDashboard();
    }
}

/**
 * PINTU MASUK UNIVERSAL (Gatekeeper Unit)
 */
// 👇 WAJIB tambahkan kata "async" di depan function
async function openLogsheetMenu(menuKey) { 
    const config = LOGSHEET_CONFIG[menuKey];
    
    // 1. Validasi Konfigurasi
    if (!config) {
        console.error("❌ Config tidak ditemukan untuk key:", menuKey);
        if (typeof showCustomAlert === 'function') showCustomAlert("Menu belum dikonfigurasi!", "error");
        return;
    }

    // 2. Set State Global
    window.currentActiveMenu = menuKey;

    // 3. PISAHKAN LOGIKA BALANCING VS LOGSHEET UNIVERSAL
    if (menuKey === 'BALANCING') {
        navigateTo('balancingScreen');
        if (typeof initBalancingScreen === 'function') {
            initBalancingScreen();
        }
    } else {
        // 👇 1. PANGGIL MODAL CUSTOM & TUNGGU JAWABAN (DULU PAKAI confirm) 👇
        // Fungsi askPabrikStatus() akan memunculkan Pop-up yang kita buat di index.html
        const statusPabrik = await askPabrikStatus(); 
        // Program akan "berhenti" di sini sampai operator klik OPERASI atau STOP
        // 👆 ============================================================= 👆

        // 2. PINDAH LAYAR (Setelah status dipilih)
        navigateTo('universalAreaListScreen'); 

        // 3. BARU LEMPAR STATUS KE PEMBUAT FORM
        if (typeof openUniversalLogsheet === 'function') {
            openUniversalLogsheet(menuKey, statusPabrik); 
        }
        
        if (typeof fetchLastDataUniversal === 'function') {
            fetchLastDataUniversal(menuKey);
        }
    }
}
// ============================================
// 5. UI SETUP & LISTENERS
// ============================================

function setupLoginListeners() {
    const usernameInput = document.getElementById('operatorUsername');
    const passwordInput = document.getElementById('operatorPassword');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', hideLoginError);
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') passwordInput?.focus();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', hideLoginError);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginOperator();
        });
    }
}

function setupTPMListeners() {
    const tpmCamera = document.getElementById('tpmCamera');
    if (tpmCamera && typeof handleTPMPhoto === 'function') {
        tpmCamera.addEventListener('change', handleTPMPhoto);
    }
}

function setupParamPhotoListeners() {
    const paramCamera = document.getElementById('paramCamera');
    const ctParamCamera = document.getElementById('ctParamCamera');
    
    if (paramCamera && typeof handleParamPhoto === 'function') {
        paramCamera.addEventListener('change', handleParamPhoto);
    }
    if (ctParamCamera && typeof handleCTParamPhoto === 'function') {
        ctParamCamera.addEventListener('change', handleCTParamPhoto);
    }
}

// Fungsi Cerdas untuk Navigasi Enter (Mendukung Kotak Angka & Dropdown Pilihan)
function setupEnterKeyNavigation() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault(); // Cegah form tersubmit otomatis
            
            // 1. CEK MODE WIZARD (Layar 1 Parameter)
            const allButtons = Array.from(document.querySelectorAll('button'));
            const btnLanjut = allButtons.find(btn => 
                (btn.textContent.toLowerCase().includes('lanjut') || 
                 btn.textContent.toLowerCase().includes('next')) &&
                btn.offsetParent !== null // <--- KUNCI PENYELAMAT: Pastikan tombol sedang TAMPIL, bukan disembunyikan
            );

            if (btnLanjut && (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT')) {
                btnLanjut.click(); // Langsung otomatis klik "Simpan & Lanjut"
                return; // Hentikan fungsi di sini
            }

            // 2. CEK MODE FORM PANJANG (Control Room / Grouped Logsheet)
            // KUNCI PENYELAMAT: Hanya daftarkan input/select yang SEDANG TAMPIL di layar
            const focusableElements = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'))
                                           .filter(el => el.offsetParent !== null); 
                                           
            const currentIndex = focusableElements.indexOf(event.target);
            
            if (currentIndex > -1 && currentIndex < focusableElements.length - 1) {
                focusableElements[currentIndex + 1].focus(); // Pindah ke input/dropdown berikutnya
            }
        }
    });
}
// ============================================
// 6. PWA INSTALLATION LOGIC
// ============================================

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.classList.remove('hidden');
});

function installPWA() {
    if (!deferredPrompt) {
        showCustomAlert('Aplikasi sudah terinstal atau tidak mendukung instalasi saat ini.', 'info');
        return;
    }
    
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User menerima instalasi PWA');
        } else {
            console.log('User menolak instalasi PWA');
        }
        deferredPrompt = null;
    });
}

window.addEventListener('appinstalled', (evt) => {
    console.log('PWA berhasil diinstal!');
    showCustomAlert('Aplikasi berhasil ditambahkan ke layar utama.', 'success');
    
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.classList.add('hidden');
});

// ============================================
// 8. OFFLINE SYNC ENGINE (MESIN PENGIRIMAN BACKUP)
// ============================================
function checkOfflineData() {
    let totalOffline = 0;
   
   // 👇 TAMBAHKAN INI: Jalankan pelunasan Laporan Akhir secara siluman 👇
    if (navigator.onLine && typeof syncOfflineLaporanAkhir === 'function') {
        syncOfflineLaporanAkhir();
     }
   // 👆 ============================================================== 👆
    // 1. SCANNING OTOMATIS: Kelilingi seluruh memori localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // 2. FILTER CERDAS: Ambil hanya kunci yang mengandung kata 'offline'
        if (key && key.toLowerCase().includes('offline') && key !== 'offline_laporan_akhir') {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(data)) {
                    totalOffline += data.length; 
                }
            } catch (e) {
                console.warn('Gagal membaca draf otomatis untuk kunci:', key);
            }
        }
    }
    // 3. UPDATE UI: Tampilkan total akumulasi ke Operator
    const syncContainer = document.getElementById('offlineSyncContainer');
    const syncBadge = document.getElementById('offlineSyncBadge');
    const syncText = document.getElementById('offlineSyncText');

    if (syncContainer) {
        if (totalOffline > 0) {
            syncContainer.style.display = 'block'; 
            if (syncBadge) syncBadge.textContent = totalOffline; 
            if (syncText) syncText.textContent = `Ada ${totalOffline} laporan tertunda (Klik untuk sinkron)`; 
        } else {
            syncContainer.style.display = 'none'; 
        }
    }
}

/**
 * Menjalankan proses pengiriman data yang tertunda (Versi Perbaikan)
 */
async function syncOfflineData() {
    if (!navigator.onLine) {
        showCustomAlert('Masih Offline! Cari sinyal stabil dulu.', 'error'); 
        return;
    }

    const progress = showUploadProgress('Sinkronisasi Seluruh Unit...');
    let totalSuccess = 0;
    currentUploadController = new AbortController(); 

    // 1. BUAT DAFTAR KUNCI STATIS (Agar indeks tidak bergeser saat dihapus)
    const offlineKeys = Object.keys(localStorage).filter(key => key.toLowerCase().includes('offline'));

    for (const key of offlineKeys) {
        let offlineArray = JSON.parse(localStorage.getItem(key) || '[]'); 
        if (offlineArray.length === 0) continue;

        let failedItems = []; 

        for (let j = 0; j < offlineArray.length; j++) {
            const item = offlineArray[j];
            progress.updateText(`Mengirim ${key}: ${j + 1}/${offlineArray.length}`); 

            const photos = item.photos || {};
            delete item.photos;

            try {
                // A. Kirim Foto dengan Jeda Singkat (Mencegah Rate Limit)
                for (const [photoKey, photoData] of Object.entries(photos)) {
                    const responsePhoto = await fetch(GAS_URL, {
                        method: 'POST', 
                        // ❌ HAPUS mode: 'no-cors' dan headers Content-Type
                        body: JSON.stringify({
                            type: 'LOGSHEET_PHOTO',
                            parentType: item.type || 'LOGSHEET_GENERAL', 
                            photo: photoData,
                            photoKey: photoKey,
                            timestamp: new Date().toISOString()
                        })
                    });
                    
                    // ✅ TANGKAP BALASAN SERVER
                    const resPhoto = await responsePhoto.json();
                    if (!resPhoto.success) throw new Error("Server menolak foto offline");

                    // Jeda 300ms antar foto agar server tidak overload
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // B. Kirim Data Teks Utama
                const responseText = await fetch(GAS_URL, {
                    method: 'POST', 
                    // ❌ HAPUS mode: 'no-cors' dan headers Content-Type
                    body: JSON.stringify(item),
                    signal: currentUploadController.signal
                });
                
                // ✅ TANGKAP BALASAN SERVER
                const resText = await responseText.json();
                if (!resText.success) throw new Error("Server menolak teks offline");
                
                totalSuccess++;
                
                // Tambahkan jeda acak 1-2 detik antar laporan agar distribusi beban merata
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

            } catch (error) {
                console.error('Gagal kirim item:', error);
                item.photos = photos;
                failedItems.push(item); 
            }
        }

        // C. Update memori HP secara bersih
        if (failedItems.length > 0) {
            localStorage.setItem(key, JSON.stringify(failedItems));
        } else {
            localStorage.removeItem(key);
        }
    }

    progress.complete(); 
    checkOfflineData();
    showCustomAlert(`✓ Sukses sinkronisasi ${totalSuccess} data!`, 'success'); 
}
// ============================================
// 7. DOM READY INITIALIZATION
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    initState();
    //loadTodayJobs();
    if (typeof loadRoutineChecklist === 'function') {
        loadRoutineChecklist();
    }
    checkOfflineData();
    runStorageMaintenance();
    fetchMasterAlat();

    // Deteksi jika aplikasi dibuka dari Homescreen HP (Standalone Mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        const installBtn = document.getElementById('installPwaBtn');
        if (installBtn) {
            installBtn.style.display = 'none'; // Hilangkan paksa
            installBtn.classList.add('hidden');
        }
    }
  
    const versionDisplay = document.getElementById('versionDisplay');
    if (versionDisplay) versionDisplay.textContent = APP_VERSION;
    
    if (typeof initAuth === 'function') initAuth();
    
    setupLoginListeners();
    setupTPMListeners();
    setupParamPhotoListeners();
    setupEnterKeyNavigation();    
    
    // Start premium loading animation
    simulateLoading();
    
    // ==========================================
    // FITUR ANTI-BACK BUTTON (Mencegah Keluar PWA)
    // ==========================================
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
        // Dorong lagi state ke history agar tidak bisa mundur ke luar aplikasi
        window.history.pushState(null, null, window.location.href);
        
        // Tampilkan pesan peringatan
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('⚠️ Gunakan tombol "Kembali" di layar, jangan tombol Back HP.', 'warning');
        }
    };

    // ==========================================
    // SENSOR SMART AUTO-SYNC (KEMBALI ONLINE)
    // ==========================================
    window.addEventListener('online', () => {
        // 1. Cek apakah ada data offline yang mengantre
        let totalAntrean = 0;
        Object.keys(localStorage).forEach(key => {
            if (key.includes('offline')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '[]');
                    totalAntrean += Array.isArray(data) ? data.length : 0;
                } catch(e) {}
            }
        });

        if (totalAntrean > 0) {
            // 2. Cek apakah operator sedang santai di Home Screen
            const isAtHome = document.getElementById('homeScreen')?.classList.contains('active');

            if (isAtHome) {
                // Eksekusi Auto-Sync jika di Home
                if (typeof showTemporaryToast === 'function') {
                    showTemporaryToast('📶 Sinyal Wi-Fi stabil terdeteksi! Memulai sinkronisasi otomatis...', 'info', 3000);
                }
                
                // Jeda 3 detik (Anti-Flapping) untuk pastikan sinyal beneran kuat
                setTimeout(() => {
                    if (navigator.onLine && typeof syncOfflineData === 'function') {
                        syncOfflineData(); 
                    }
                }, 3000);
            } else {
                // Cuma kasih Notif kalau operator lagi sibuk ngetik form
                if (typeof showTemporaryToast === 'function') {
                    showTemporaryToast('📶 Sinyal kembali! Laporan Anda siap disinkronisasi nanti.', 'success', 4000);
                }
                checkOfflineData(); // Update lencana angka merah
            }
        }
    });

    // Sensor kalau tiba-tiba offline
    window.addEventListener('offline', () => {
        if (typeof showTemporaryToast === 'function') {
            showTemporaryToast('⚠️ Koneksi terputus. Anda masuk Mode Offline.', 'warning', 3000);
        }
    });
   
    console.log(`${APP_NAME} v${APP_VERSION} initialized successfully`);
});

// =======================================================================
// 🛡️ STORAGE MANAGEMENT & AUTO-CLEANUP (FAIL-SAFE SYSTEM)
// =======================================================================

function runStorageMaintenance() {
    // 1. Jalankan pembersihan draf usang terlebih dahulu
    autoCleanupOldDrafts();
    
    // 2. Setelah dibersihkan, baru hitung sisa kuotanya
    setTimeout(() => {
        checkStorageQuota();
    }, 1000);
}

function autoCleanupOldDrafts() {
    const MAX_DAYS = 3; // Batas umur draf (hari)
    const now = new Date().getTime();
    let deletedCount = 0;

    Object.keys(localStorage).forEach(key => {
        // Kita fokus membersihkan Draf (Teks) yang usang
        if (key.startsWith('draft_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                
                // Cek apakah ada stempel waktu pembuatannya
                if (data && data._savedAt) {
                    const savedTime = new Date(data._savedAt).getTime();
                    const daysOld = (now - savedTime) / (1000 * 3600 * 24);

                    if (daysOld > MAX_DAYS) {
                        // Hapus Draf Teks
                        localStorage.removeItem(key);
                        
                        // Hapus Draf Foto yang terkait (otomatis mendeteksi nama key fotonya)
                        // Contoh: 'draft_1300' akan mencari 'photos_1300'
                        const photoKey = key.replace('draft_', 'photos_');
                        if (localStorage.getItem(photoKey)) {
                            localStorage.removeItem(photoKey);
                        }
                        
                        deletedCount++;
                        console.warn(`[Auto-Cleanup] Menghapus draf & foto usang (>3 hari): ${key}`);
                    }
                }
            } catch (e) {
                console.warn('Gagal membaca draf untuk cleanup:', e);
            }
        }
    });

    if (deletedCount > 0) {
        console.log(`[Auto-Cleanup] ${deletedCount} pasang draf dan foto usang berhasil dibersihkan untuk melegakan memori.`);
    }
}

function checkStorageQuota() {
    let totalBytes = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
        // String di JavaScript menggunakan format UTF-16 (2 byte per karakter)
        const item = localStorage.getItem(key);
        totalBytes += (item ? item.length * 2 : 0);
    });

    const mbUsed = (totalBytes / (1024 * 1024)).toFixed(2);
    console.log(`[Storage Check] Kapasitas memori terpakai: ${mbUsed} MB`);

    // Batas aman localStorage adalah 5MB. Kita beri peringatan keras jika menyentuh 4MB.
    if (mbUsed > 4.0) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(`⚠️ Memori HP Penuh (${mbUsed}MB)! Segera SINKRONISASI antrean merah atau aplikasi akan macet.`, 'error');
        } else {
            alert(`⚠️ Memori HP Penuh (${mbUsed}MB)! Segera SINKRONISASI data offline Anda.`);
        }
    }
}
// --- LOGIKA MODAL CUSTOM STATUS PABRIK ---
let modalStatusResolve = null; // Variabel penyimpan jawaban

function askPabrikStatus() {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalStatusPabrik');
        if (modal) modal.style.display = 'flex'; // Tampilkan Modal
        modalStatusResolve = resolve; // Simpan fungsi "tunggu"
    });
}

function resolveModalStatus(status) {
    const modal = document.getElementById('modalStatusPabrik');
    if (modal) modal.style.display = 'none'; // Sembunyikan Modal
    
    if (modalStatusResolve) {
        modalStatusResolve(status); // Kirim jawaban (OPERASI / STOP)
        modalStatusResolve = null;
    }
}
// ============================================
// DYNAMIC THEME ENGINE (MESIN PENGGANTI BAJU)
// ============================================
function applyUnitTheme(deptName) {
    // Pengaman jika lemari tema belum dimuat
    if (typeof UNIT_THEMES === 'undefined') return; 

    let unitKey = 'DEFAULT';
    let dept = String(deptName).toUpperCase();

    // 1. Deteksi Unit dari Data User
    if (dept.includes('UTILITAS') || dept.includes('UTIL')) unitKey = 'UTILITAS';
    else if (dept.includes('BATU BARA') || dept.includes('UBB')) unitKey = 'UBB';
    else if (dept.includes('SULFAT') || dept.includes('SA') || dept.includes('MELTER')) unitKey = 'SA';

    // 2. Ambil Baju dari Lemari (Fallback ke DEFAULT jika tidak ketemu)
    const theme = UNIT_THEMES[unitKey] || UNIT_THEMES['DEFAULT'];

    console.log(`🎨 [THEME ENGINE] Mengubah tema menjadi: ${unitKey}`);

    // 3. Suntik Warna Dasar CSS (Otomatis se-aplikasi berubah!)
    document.documentElement.style.setProperty('--primary-color', theme.color);
    document.documentElement.style.setProperty('--header-bg', theme.bgGradient);
    
    // 4. Ganti Logo di Berbagai Layar
    const homeLogo = document.getElementById('mainLogo'); 
    if (homeLogo) {
        homeLogo.src = theme.logo;
        homeLogo.style.display = 'block';
    }

    const loginLogo = document.getElementById('loginLogo');
    if (loginLogo) {
        loginLogo.src = theme.logo;
        loginLogo.style.display = 'block';
    }

    const spvLogo = document.getElementById('spvLogo'); // Pastikan ID ini sudah ditambahkan di HTML layar SPV
    if (spvLogo) {
        spvLogo.src = theme.logo;
        spvLogo.style.display = 'block';
    }

    // 5. Ganti Judul Teks (Title) Menggunakan Konfigurasi Baru
    // Mengubah tulisan "ASAM SULFAT 3B" di halaman login
    const loginTitle = document.querySelector('.app-title');
    if (loginTitle) {
        loginTitle.textContent = theme.title;
    }

    // Mengubah tulisan "LOGSHEET DIGITAL" di halaman home
    const homeTitle = document.querySelector('.home-title');
    if (homeTitle) {
        homeTitle.textContent = theme.title;
    }

    // Mengubah tulisan di Dashboard Supervisor (opsional, jika Anda menggunakan elemen ini)
    const spvTitle = document.getElementById('spvDashboardTitle');
    if (spvTitle) {
        spvTitle.textContent = theme.title;
    }
}
// ============================================================
// SYSTEM SELF-HEALING: SINKRONISASI LAPORAN AKHIR TERTUNDA
// ============================================================
async function syncOfflineLaporanAkhir() {
    let pendingLaporan = [];
    try {
        pendingLaporan = JSON.parse(localStorage.getItem('offline_laporan_akhir') || '[]');
    } catch(e) { return; }

    if (pendingLaporan.length === 0) return;

    console.log(`🔄 Menemukan ${pendingLaporan.length} antrean Laporan Akhir. Mulai melunasi diam-diam...`);
    
    const remainingLaporan = []; 

    for (const data of pendingLaporan) {
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            const res = await response.json();
            if (!res.success) throw new Error("Server masih menolak");
            
            console.log('✅ 1 Laporan Akhir tertunda berhasil disusulkan!');
            await new Promise(resolve => setTimeout(resolve, 500)); 
            
        } catch (error) {
            console.warn('⚠️ Gagal menyusulkan laporan akhir, dikembalikan ke antrean.');
            remainingLaporan.push(data); 
        }
    }

    // Update brankas memori HP
    if (remainingLaporan.length > 0) {
        localStorage.setItem('offline_laporan_akhir', JSON.stringify(remainingLaporan));
    } else {
        localStorage.removeItem('offline_laporan_akhir');
    }
}
/* ============================================================
   FITUR ENTERPRISE: CMMS & HISTORY ALAT (JURUS DOUBLE ENTRY)
   ============================================================ */

// 1. Tarik Data Master Alat dari Server
async function fetchMasterAlat() {
    try {
        // Cek brankas lokal dulu biar offline tetap jalan
        const localData = localStorage.getItem('master_alat');
        if (localData) {
            window.masterAlat = JSON.parse(localData);
        }

        if (!navigator.onLine) return; 

        // Telepon server untuk daftar terbaru
        const response = await fetch(`${GAS_URL}?action=getMasterAlat`);
        const res = await response.json();
        
        if (res.success && res.data) {
            window.masterAlat = res.data;
            localStorage.setItem('master_alat', JSON.stringify(res.data));
            console.log(`✅ [CMMS] Berhasil download ${res.data.length} Master Alat`);
        }
    } catch (error) {
        console.warn('Gagal fetch Master Alat:', error);
    }
}

// 2. Buka Form & Otomatis Filter Area Sesuai Unit Operator
function openCMMSModal() {
    const modal = document.getElementById('cmmsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // --- LOGIKA SMART FILTER AREA ---
        const areaSelect = document.getElementById('cmmsArea');
        areaSelect.innerHTML = '<option value="">Pilih Area...</option>'; // Reset isi
        
        // Ambil unit operator yang sedang login (Ubah jadi huruf besar biar gampang dicocokkan)
        const unitUser = (typeof currentUser !== 'undefined' && currentUser && currentUser.department) 
                         ? currentUser.department.toUpperCase() : '';

        // Master Data Area dan kepemilikan Unitnya
        const daftarArea = [
            { value: 'LAPANGANTURBIN', label: 'Lapangan Turbin', owner: 'UTILITAS 3B' },
            { value: 'PANEL_STG', label: 'Panel STG', owner: 'UTILITAS 3B' },
            { value: 'CT', label: 'Cooling Tower', owner: 'UTILITAS 3B' },
            { value: '1000', label: 'Area 1000', owner: 'ASAM SULFAT' },
            { value: '1100_1200', label: 'Area 1100/1200', owner: 'ASAM SULFAT' },
            { value: '1300', label: 'Area 1300', owner: 'ASAM SULFAT' },
            { value: 'PANEL_ASAM_SULFAT', label: 'Panel Asam Sulfat', owner: 'ASAM SULFAT' },
            { value: 'UBB', label: 'Utilitas Batu Bara', owner: 'UBB' }
        ];

        // Suntikkan hanya area yang cocok dengan unit operator
        daftarArea.forEach(item => {
            // Jika dia Admin, atau nama unitnya mengandung kata kunci (misal "UTILITAS" cocok dengan "UTILITAS 3B")
            if (unitUser.includes('ADMIN') || unitUser.includes(item.owner) || unitUser === '') {
                const opt = document.createElement('option');
                opt.value = item.value;
                opt.textContent = item.label;
                areaSelect.appendChild(opt);
            }
        });
        // ---------------------------------
        
        // Jika dibuka dari dalam suatu logsheet area, otomatiskan dropdown areanya
        if (window.currentActiveMenu) {
            areaSelect.value = window.currentActiveMenu;
        }
        
        filterCMMSAlat(); // Panggil filter dropdown alat
    }
}
function closeCMMSModal() {
    const modal = document.getElementById('cmmsModal');
    if (modal) {
        modal.classList.add('hidden');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// 3. Filter Alat Berdasarkan Area yang Dipilih
function filterCMMSAlat() {
    const selectedArea = document.getElementById('cmmsArea').value;
    const alatSelect = document.getElementById('cmmsAlat');
    
    alatSelect.innerHTML = '<option value="">Pilih Alat...</option>';

    if (!window.masterAlat || !selectedArea) return;

    // Filter daftar alat yang sesuai dengan area
    const filtered = window.masterAlat.filter(item => item.area.toUpperCase() === selectedArea.toUpperCase());
    
    filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.namaAlat;
        opt.textContent = item.namaAlat;
        alatSelect.appendChild(opt);
    });

    if (filtered.length === 0) {
        alatSelect.innerHTML = '<option value="">(Tidak ada alat di area ini)</option>';
    }
}

// 4. JURUS DOUBLE ENTRY (Eksekusi Pengiriman)
async function submitCMMSData() {
    const area = document.getElementById('cmmsArea').value;
    const alat = document.getElementById('cmmsAlat').value;
    const tindakan = document.getElementById('cmmsTindakan').value;
    const keterangan = document.getElementById('cmmsKeterangan').value;

    if (!area || !alat || !tindakan) {
        showCustomAlert('⚠️ Area, Alat, dan Tindakan wajib diisi!', 'error');
        return;
    }

    const now = new Date();
    // Hitung shift (Pagi=1, Sore=2, Malam=3)
    const hour = now.getHours();
    const shift = (hour >= 7 && hour < 15) ? 1 : (hour >= 15 && hour < 23) ? 2 : 3;
    const operatorName = currentUser ? currentUser.name : 'Unknown';

    // ----------------------------------------------------
    // PAKET 1: Untuk Database CMMS Terpusat
    // ----------------------------------------------------
    const payloadCMMS = {
        type: 'SUBMIT_HISTORY_ALAT',
        Tanggal: formatDate(now),
        Jam: formatTime(now),
        Shift: shift,
        Area: area,
        Nama_Alat: alat,
        Tindakan: tindakan,
        Keterangan: keterangan,
        Operator: operatorName
    };

    // ----------------------------------------------------
    // PAKET 2: Untuk Disuntik ke Laporan Akhir (Handover WA)
    // ----------------------------------------------------
    let icon = '🔧';
    if(tindakan.includes('Breakdown')) icon = '🛑';
    else if(tindakan.includes('Oli') || tindakan.includes('Flushing')) icon = '💧';
    else if(tindakan.includes('Rutin')) icon = '✅';

    const formatKegiatan = `${icon} [${alat}] - ${tindakan}: ${keterangan}`;
    
    const payloadRoutine = {
        type: 'CHECKLIST_ROUTINE',
        targetArea: 'LOGSHEET_' + area, // Sesuaikan dengan standar Laporan Akhir
        Operator: operatorName,
        Jam: formatTime(now),
        tugas: formatKegiatan,
        isRoutine: true
    };

    const btnSubmit = document.querySelector('button[onclick="submitCMMSData()"]');
    const originalBtnText = btnSubmit ? btnSubmit.innerHTML : 'Kirim Laporan';
    
    if (btnSubmit) {
        btnSubmit.disabled = true; // Kunci tombol biar gak di-spam klik
        btnSubmit.innerHTML = '⏳ Mengirim...';
        btnSubmit.style.opacity = '0.7';
    }

    // Munculkan notifikasi ngambang kecil
    if (typeof showTemporaryToast === 'function') {
        showTemporaryToast('🔄 Memproses Data Mesin...', 'info');
    }
    
    try {
        if (!navigator.onLine) throw new Error("Offline Mode");

        // Tembakan 1: Ke CMMS (HAPUS progress.updateText di sini)
        const res1 = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payloadCMMS) });
        const json1 = await res1.json();
        if(!json1.success) throw new Error(json1.error || "Gagal simpan CMMS");

        // Tembakan 2: Ke Laporan Akhir Area Terkait (HAPUS progress.updateText di sini)
        const res2 = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payloadRoutine) });
        
        // HAPUS progress.complete() di sini
        showCustomAlert('✓ Pekerjaan berhasil dicatat ganda!', 'success');
        
        // Bersihkan form & JANGAN tutup modal
        document.getElementById('cmmsKeterangan').value = '';
        document.getElementById('cmmsTindakan').value = '';
        document.getElementById('cmmsAlat').value = ''; 

    } catch (err) {
        console.warn("[CMMS Offline Triggered]:", err);
        
        // Simpan CMMS ke brankas offline
        let queueCMMS = JSON.parse(localStorage.getItem('offline_cmms') || '[]');
        queueCMMS.push(payloadCMMS);
        localStorage.setItem('offline_cmms', JSON.stringify(queueCMMS));
        
        // Simpan Rutinan ke brankas offline laporan akhir
        let queueRoutine = JSON.parse(localStorage.getItem('offline_laporan_akhir') || '[]');
        queueRoutine.push(payloadRoutine);
        localStorage.setItem('offline_laporan_akhir', JSON.stringify(queueRoutine));

        showCustomAlert('Sinyal lemah! Data History & Laporan disimpan offline.', 'warning');
        
        // Bersihkan form & JANGAN tutup modal
        document.getElementById('cmmsKeterangan').value = '';
        document.getElementById('cmmsTindakan').value = '';
        document.getElementById('cmmsAlat').value = ''; 
        
        checkOfflineData(); // Perbarui lencana sinkronisasi di layar
        
    } finally {
        // 👇 WAJIB ADA: Kembalikan Tombol seperti semula saat sukses/gagal 👇
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
            btnSubmit.style.opacity = '1';
        }
        // 👆 ============================================================= 👆
    }
}
// ==========================================
// HELPER FORMAT WAKTU (FRONTEND)
// ==========================================

function formatDate(date) {
    // Menghasilkan: "Kamis, 24 April 2026"
    return date.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
}

function formatTime(date) {
    // Menghasilkan: "14:30" atau "08:15"
    return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}
