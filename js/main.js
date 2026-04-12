/* ============================================
   TURBINE LOGSHEET PRO - MAIN ENTRY & SYSTEM
   ============================================ */

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
// 3. JOB LIST FROM SPREADSHEET
// ============================================

const JOB_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzkh6ZViJMh8MJWFnunALO3QIrjqBv1ePXJ8ObW3C_HCGKl4FHX19XGvuUFc9-Fzvwz/exec';

function loadTodayJobs() {
    const jobDateEl = document.getElementById('jobDate');
    const jobListContainer = document.getElementById('jobListContainer');
    
    const today = new Date();
    if (jobDateEl) {
        jobDateEl.textContent = today.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }
    
    if (jobListContainer) {
        jobListContainer.innerHTML = `
            <div class="job-loading">
                <div class="spinner"></div>
                <span>Memuat data...</span>
            </div>
        `;
    }
    
    fetchJobsFromSheet();
}

async function fetchJobsFromSheet() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const targetSheet = encodeURIComponent("joblist hari ini");
        const response = await fetch(`${JOB_SHEET_URL}?action=getJobs&date=today&sheetName=${targetSheet}`, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        
        if (data.success && data.jobs && data.jobs.length > 0) {
            renderJobList(data.jobs);
        } else {
            renderEmptyJobList();
        }
    } catch (error) {
        console.log('Fetch jobs error/timeout, memuat sample:', error);
        clearTimeout(timeoutId);
        renderSampleJobs();
    }
}

function renderJobList(jobs) {
    const jobListContainer = document.getElementById('jobListContainer');
    if (!jobListContainer) return;
    
    let html = '';
    jobs.forEach(job => {
        const statusClass = job.status === 'completed' ? 'completed' : 'pending';
        html += `
            <div class="job-item">
                <div class="job-item-status ${statusClass}"></div>
                <span class="job-item-text">${job.description || job.name}</span>
            </div>
        `;
    });
    
    jobListContainer.innerHTML = html;
}

function renderEmptyJobList() {
    const jobListContainer = document.getElementById('jobListContainer');
    if (!jobListContainer) return;
    
    jobListContainer.innerHTML = `
        <div class="job-empty">
            <div class="job-empty-icon">📋</div>
            <p>Tidak ada job untuk hari ini</p>
        </div>
    `;
}

function renderSampleJobs() {
    const jobListContainer = document.getElementById('jobListContainer');
    if (!jobListContainer) return;
    
    const sampleJobs = [
        { description: 'Input Logsheet Shift 3', status: 'pending' },
        { description: 'TPM Area Turbin', status: 'completed' },
        { description: 'Update Balancing Power', status: 'pending' }
    ];
    
    let html = '';
    sampleJobs.forEach(job => {
        const statusClass = job.status === 'completed' ? 'completed' : 'pending';
        html += `
            <div class="job-item">
                <div class="job-item-status ${statusClass}"></div>
                <span class="job-item-text">${job.description}</span>
            </div>
        `;
    });
    
    jobListContainer.innerHTML = html;
}
// ============================================
// 4. UI & NAVIGATION HELPERS
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
function openLogsheetMenu(menuKey) {
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
        // PENTING: Panggil openUniversalLogsheet agar logsheet.js bisa mengecek 
        // apakah config unit ini memiliki properti 'groups' (Panel) atau tidak (Wizard).
        if (typeof openUniversalLogsheet === 'function') {
            openUniversalLogsheet(menuKey);
        }
        
        // Tarik data background secara diam-diam
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
    
    // 1. SCANNING OTOMATIS: Kelilingi seluruh memori localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // 2. FILTER CERDAS: Ambil hanya kunci yang mengandung kata 'offline'
        if (key && key.toLowerCase().includes('offline')) {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(data)) {
                    totalOffline += data.length; // Tambahkan jumlah antrean dari kunci ini
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
                    await fetch(GAS_URL, {
                        method: 'POST', mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'LOGSHEET_PHOTO',
                            parentType: item.type || 'LOGSHEET_GENERAL', 
                            photo: photoData,
                            photoKey: photoKey,
                            timestamp: new Date().toISOString()
                        })
                    });
                    // Jeda 300ms antar foto agar server tidak overload
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // B. Kirim Data Teks Utama
                await fetch(GAS_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                    signal: currentUploadController.signal
                });
                
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
    loadTodayJobs();
    checkOfflineData();
    runStorageMaintenance();

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
