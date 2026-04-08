/* ============================================
   TURBINE LOGSHEET PRO - MAIN ENTRY & SYSTEM
   ============================================ */

// ============================================
// 1. INITIALIZATION & SERVICE WORKER
// ============================================

function initState() {
    try {
        const savedDraft = localStorage.getItem(DRAFT_KEYS.LOGSHEET);
        if (savedDraft) currentInput = JSON.parse(savedDraft);
        
        const savedCTDraft = localStorage.getItem(DRAFT_KEYS_CT.LOGSHEET);
        if (savedCTDraft) currentInputCT = JSON.parse(savedCTDraft);
        
        if (typeof loadParamPhotosFromDraft === 'function') loadParamPhotosFromDraft();
        if (typeof loadCTParamPhotosFromDraft === 'function') loadCTParamPhotosFromDraft();
        
        totalParams = Object.values(AREAS).reduce((acc, arr) => acc + arr.length, 0);
        totalParamsCT = Object.values(AREAS_CT).reduce((acc, arr) => acc + arr.length, 0);
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

// Register Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered:', registration.scope);
                registration.update();

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateAlert();
                        }
                    });
                });
            })
            .catch(err => console.error('SW registration failed:', err));
            
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    });
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

function goToLogsheetTurbin() {
    navigateTo('areaListScreen');
    if (typeof fetchLastData === 'function') {
        fetchLastData(); 
    } else if (typeof renderMenu === 'function') {
        renderMenu();
    }
}

function goToLogsheetCT() {
    navigateTo('ctAreaListScreen');
    if (typeof fetchLastDataCT === 'function') {
        fetchLastDataCT();
    } else if (typeof renderCTMenu === 'function') {
        renderCTMenu();
    }
}

function goToBalancing() {
    navigateTo('balancingScreen');
    if (typeof initBalancingScreen === 'function') {
        initBalancingScreen();
    }
}

function toggleBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) overlay.classList.toggle('hidden');
}

function closeBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function showUpdateAlert() {
    const updateAlert = document.getElementById('updateAlert');
    if (updateAlert) {
        updateAlert.classList.remove('hidden');
    }
}

function applyUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
                window.location.reload();
            }
        });
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
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
                btn.textContent.toLowerCase().includes('lanjut') || 
                btn.textContent.toLowerCase().includes('next')
            );

            // 👇 PERUBAHAN DI SINI: Menambahkan dukungan untuk elemen SELECT (Dropdown)
            if (btnLanjut && (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT')) {
                btnLanjut.click(); // Langsung otomatis klik "Simpan & Lanjut"
                return; // Hentikan fungsi di sini
            }

            // 2. CEK MODE FORM PANJANG
            const focusableElements = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
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

/**
 * Mencari dan menghitung semua data tertunda di memori HP
 */
function checkOfflineData() {
    let totalOffline = 0;
    
    // Cari semua data di localStorage yang kuncinya mengandung kata 'offline'
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.toLowerCase().includes('offline')) {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(data)) {
                    totalOffline += data.length;
                }
            } catch (e) {
                console.warn('Gagal membaca draf offline untuk key:', key);
            }
        }
    }

    // Update UI Tombol
    const syncContainer = document.getElementById('offlineSyncContainer');
    const syncBadge = document.getElementById('offlineSyncBadge');
    const syncText = document.getElementById('offlineSyncText');

    if (syncContainer) {
        if (totalOffline > 0) {
            syncContainer.style.display = 'block'; // Munculkan tombol
            if (syncBadge) syncBadge.textContent = totalOffline;
            if (syncText) syncText.textContent = `Ada ${totalOffline} data belum terkirim`;
        } else {
            syncContainer.style.display = 'none'; // Sembunyikan tombol jika bersih
        }
    }
}

/**
 * Menjalankan proses pengiriman data yang tertunda
 */
async function syncOfflineData() {
    if (!navigator.onLine) {
        showCustomAlert('Anda masih offline! Cari sinyal internet/Wi-Fi terlebih dahulu.', 'error');
        return;
    }

    const progress = showUploadProgress('Menyiapkan Sinkronisasi...');
    let totalSuccess = 0;
    currentUploadController = new AbortController();

    // Loop semua kunci di memori HP
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.toLowerCase().includes('offline')) continue;

        let offlineArray = [];
        try {
            offlineArray = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { continue; }

        if (!Array.isArray(offlineArray) || offlineArray.length === 0) continue;

        let failedArray = []; // Untuk menyimpan data yang masih gagal

        // Loop setiap data tertunda di dalam kategori ini
        for (let j = 0; j < offlineArray.length; j++) {
            const item = offlineArray[j];
            progress.updateText(`Mengirim data ${j + 1}/${offlineArray.length}...`);

            // Pisahkan foto dari payload teks (sesuai format asli Anda)
            const photos = item.photos || {};
            delete item.photos; 

            try {
                // 1. Kirim Foto Dulu (Jika ada)
                for (const [photoKey, photoData] of Object.entries(photos)) {
                    const photoPayload = {
                        type: 'LOGSHEET_PHOTO',
                        parentType: item.type || 'LOGSHEET',
                        Operator: item.Operator || 'Unknown',
                        photoKey: photoKey,
                        photo: photoData,
                        timestamp: new Date().toISOString()
                    };
                    await fetch(GAS_URL, {
                        method: 'POST', mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(photoPayload),
                        signal: currentUploadController.signal
                    });
                    await new Promise(r => setTimeout(r, 300)); // Jeda agar server tidak kaget
                }

                // 2. Kirim Data Teks Utama
                await fetch(GAS_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                    signal: currentUploadController.signal
                });

                totalSuccess++;

            } catch (error) {
                console.error('Gagal mengirim item tertunda:', error);
                // Jika gagal, kembalikan foto ke item, dan masukkan ke daftar gagal
                item.photos = photos;
                failedArray.push(item);
            }
        }

        // Update memori lokal: Simpan yang gagal, hapus jika sukses semua
        if (failedArray.length > 0) {
            localStorage.setItem(key, JSON.stringify(failedArray));
        } else {
            localStorage.removeItem(key);
        }
    }

    progress.complete();
    checkOfflineData(); // Cek ulang dan update UI

    if (totalSuccess > 0) {
        showCustomAlert(`✓ Luar biasa! ${totalSuccess} data tertunda berhasil masuk ke server.`, 'success');
    } else {
        showCustomAlert('Sinkronisasi selesai. Pastikan koneksi internet stabil.', 'info');
    }
}
// ============================================
// 7. DOM READY INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    initState();
    loadTodayJobs();
    checkOfflineData();

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
