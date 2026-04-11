/* ============================================
   TURBINE LOGSHEET PRO - BALANCING MODULE
   FILE: js/balancing.js
   ============================================ */

// ============================================
// 1. INITIALIZATION & SHIFT DETECTION
// ============================================

function initBalancingScreen() {
    if (!requireAuth()) return;
    
    const balancingUser = document.getElementById('balancingUser');
    if (balancingUser && currentUser) balancingUser.textContent = currentUser.name;
    
    detectShift();
    
    // Tarik data terakhir dari server
    loadLastBalancingData(true);
    
    // Sinkronisasi draf dari memori global (Hasil load initState main.js)
    if (window.activeDrafts && window.activeDrafts['BALANCING']) {
        loadBalancingDraft();
    }
    
    calculateLPBalance();
    setupBalancingAutoSave();
    updateDraftStatusIndicator();
    startRealtimeClock();
}

function detectShift() {
    const hour = new Date().getHours();
    let shift = 3;
    let shiftText = "Shift 3 (23:00 - 07:00)";
    
    if (hour >= 7 && hour < 15) {
        shift = 1;
        shiftText = "Shift 1 (07:00 - 15:00)";
    } else if (hour >= 15 && hour < 23) {
        shift = 2;
        shiftText = "Shift 2 (15:00 - 23:00)";
    }
    
    currentShift = shift;
    
    const badge = document.getElementById('currentShiftBadge');
    const info = document.getElementById('balancingShiftInfo');
    const kegiatanNum = document.getElementById('kegiatanShiftNum');
    
    if (badge) {
        badge.textContent = `SHIFT ${shift}`;
        const colors = [
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        ];
        badge.style.background = colors[shift - 1];
    }
    if (info) info.textContent = `${shiftText} • Auto Save Aktif`;
    if (kegiatanNum) kegiatanNum.textContent = shift;
    
    updateBalancingDateTime();
}

function updateBalancingDateTime() {
    const now = new Date();
    const dateInput = document.getElementById('balancingDate');
    const timeInput = document.getElementById('balancingTime');
    
    if (dateInput) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }
    if (timeInput) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }
}

// ============================================
// 2. DRAFT & AUTO-SAVE MANAGEMENT
// ============================================

function saveBalancingDraft() {
    try {
        const config = LOGSHEET_CONFIG['BALANCING'];
        const draftData = {};
        
        BALANCING_FIELDS.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) draftData[fieldId] = element.value;
        });
        
        draftData._shift = currentShift;
        draftData._savedAt = new Date().toISOString();
        
        // 1. UPDATE GLOBAL STATE RAM (Penting agar sinkron dengan main.js)
        if (!window.activeDrafts) window.activeDrafts = {};
        window.activeDrafts['BALANCING'] = draftData;

        // 2. UPDATE PHYSICAL MEMORY
        localStorage.setItem(config.draftKey, JSON.stringify(draftData));
        updateDraftStatusIndicator();
    } catch (e) {
        console.error('Error saving balancing draft:', e);
    }
}

function loadBalancingDraft() {
    try {
        const config = LOGSHEET_CONFIG['BALANCING'];
        // Ambil dari global RAM dulu, jika kosong baru cek localStorage
        const draftData = window.activeDrafts['BALANCING'] || JSON.parse(localStorage.getItem(config.draftKey));
        
        if (!draftData) return false;
        
        let loadedCount = 0;
        BALANCING_FIELDS.forEach(fieldId => {
            if (fieldId === 'balancingDate' || fieldId === 'balancingTime') return; 

            const element = document.getElementById(fieldId);
            if (element && draftData[fieldId] !== undefined && draftData[fieldId] !== '') {
                element.value = draftData[fieldId];
                loadedCount++;
            }
        });
        
        // Refresh UI & Perhitungan
        const eksporEl = document.getElementById('eksporMW');
        if (eksporEl && eksporEl.value) handleEksporInput(eksporEl);
        
        calculateLPBalance();
        return loadedCount > 0;
    } catch (e) {
        console.error('Error loading balancing draft:', e);
        return false;
    }
}

function clearBalancingDraft() {
    const config = LOGSHEET_CONFIG['BALANCING'];
    localStorage.removeItem(config.draftKey);
    if (window.activeDrafts) delete window.activeDrafts['BALANCING'];
    updateDraftStatusIndicator();
}

function updateDraftStatusIndicator() {
    const indicator = document.getElementById('draftStatusIndicator');
    if (indicator) {
        const config = LOGSHEET_CONFIG['BALANCING'];
        const hasDraft = localStorage.getItem(config.draftKey) !== null;
        indicator.style.display = hasDraft ? 'flex' : 'none';
    }
}

// ... (Logika loadLastBalancingData, handleEksporInput, calculateLPBalance, formatWhatsApp tetap sama) ...

// ============================================
// 3. SUBMIT DATA & OFFLINE HANDLER
// ============================================

async function submitBalancingData() {
    if (!requireAuth()) return;
    
    const config = LOGSHEET_CONFIG['BALANCING'];
    
    // Validasi field wajib
    const requiredFields = ['loadMW', 'fq1105', 'stgSteam'];
    for (let id of requiredFields) {
        const el = document.getElementById(id);
        if (!el || !el.value) {
            showCustomAlert(`Field ${id} wajib diisi!`, 'error');
            return;
        }
    }
    
    const progress = showUploadProgress('Mengirim Data Balancing...');
    currentUploadController = new AbortController();
    
    const eksporValue = getEksporImporValue();
    const lpBalance = calculateLPBalance();
    
    // Siapkan Payload
    const balancingData = {
        type: config.submitType,
        Operator: currentUser?.name || 'Unknown',
        Timestamp: new Date().toISOString(),
        Tanggal: document.getElementById('balancingDate')?.value || '',
        Jam: document.getElementById('balancingTime')?.value || '',
        Shift: currentShift,
        'Load_MW': parseFloat(document.getElementById('loadMW')?.value) || 0,
        'Ekspor_Impor_MW': eksporValue,
        'Ekspor_Impor_Status': eksporValue > 0 ? 'Impor' : (eksporValue < 0 ? 'Ekspor' : 'Netral'),
        // ... (sisanya tetap lakukan mapping field Anda seperti biasa) ...
    };
    
    // (Masukkan field lainnya ke balancingData di sini...)
    BALANCING_FIELDS.forEach(field => {
        if (!balancingData[field]) {
             const el = document.getElementById(field);
             if (el) balancingData[field] = el.value;
        }
    });

    try {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(balancingData),
            signal: currentUploadController.signal
        });
        
        progress.complete();
        showCustomAlert('✓ Data Balancing berhasil dikirim!', 'success');
        
        // Simpan ke riwayat lokal
        let history = JSON.parse(localStorage.getItem('balancing_history') || '[]');
        history.push({...balancingData, submittedAt: new Date().toISOString()});
        localStorage.setItem('balancing_history', JSON.stringify(history));

        setTimeout(() => {
            const waMessage = encodeURIComponent(formatWhatsAppMessage(balancingData));
            window.open(`https://wa.me/6281382160345?text=${waMessage}`, '_blank');
            navigateTo('homeScreen');
            clearBalancingDraft();
        }, 1000);
        
    } catch (error) {
        console.error('Balancing Submit Error:', error);
        progress.error();

        // SIMPAN KE ANTREAN OFFLINE (Gunakan config.offlineKey)
        let queue = JSON.parse(localStorage.getItem(config.offlineKey) || '[]');
        queue.push({
            ...balancingData,
            photos: {} // Balancing biasanya tidak ada foto, tapi tetap beri objek kosong agar sync-engine tidak error
        });

        localStorage.setItem(config.offlineKey, JSON.stringify(queue));
        checkOfflineData(); // Munculkan tombol merah di home
        showCustomAlert('Data balancing disimpan offline!', 'warning');
    }
}
