/* ============================================
   TURBINE LOGSHEET PRO - LOGSHEET & CT MODULE
   ============================================ */

let univLastData = {};
let silentFetchAbortController = null;

function fetchLastDataUniversal(type) {
    // 1. TAMPILKAN INSTAN DARI MEMORI HP
    const cachedLastData = localStorage.getItem('last_data_' + type);
    univLastData = cachedLastData ? JSON.parse(cachedLastData) : {};
    
    // 2. DIAM-DIAM CARI DATA BARU DI BELAKANG LAYAR
    silentFetchLastData(type);
}

function silentFetchLastData(type) {
    if (silentFetchAbortController) {
        silentFetchAbortController.abort();
        console.warn(`[Background Sync] Fetch data ${type} sebelumnya dibatalkan.`);
    }

    silentFetchAbortController = new AbortController();
    const signal = silentFetchAbortController.signal;

    const callbackName = 'jsonp_silent_' + type + '_' + Date.now();
    const scriptId = 'script_' + callbackName;
    let fetchTimeout;

    window[callbackName] = (data) => {
        clearTimeout(fetchTimeout);
        if (signal.aborted) {
            cleanupJSONP(callbackName);
            const oldScript = document.getElementById(scriptId);
            if (oldScript) oldScript.remove();
            return;
        }

        if (data.success) {
            // 👇 1. UPDATE MEMORI HP
            localStorage.setItem('last_data_' + type, JSON.stringify(data.data));
            
            // 👇 2. UPDATE VARIABEL YANG SEDANG DIPAKAI SAAT INI
            univLastData = data.data; 
            console.log(`[Background Sync] Data riwayat ${type} berhasil diperbarui.`);

            // 👇 3. BERITAHU LAYAR AGAR BERUBAH AJAIB (LIVE UPDATE) 👇
            if (typeof updateLiveLastDataUI === 'function') {
                updateLiveLastDataUI();
            }
        }
        cleanupJSONP(callbackName);
        silentFetchAbortController = null;
    };

    const config = LOGSHEET_CONFIG[type];
    const fileId = config ? config.spreadsheetId : '';
    
    let actionParam = '&action=getLast' + type.toUpperCase();
    if (fileId) {
        actionParam += '&targetFileId=' + fileId; // Titipkan Kunci Rumah di URL!
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${GAS_URL}?callback=${callbackName}${actionParam}`;
    
    signal.addEventListener('abort', () => {
        clearTimeout(fetchTimeout);
        const scriptToRemove = document.getElementById(scriptId);
        if (scriptToRemove) scriptToRemove.remove();
    });

    fetchTimeout = setTimeout(() => {
        cleanupJSONP(callbackName);
        console.warn(`[Background Sync] Timeout saat menarik data ${type}.`);
    }, 15000);

    script.onerror = () => {
        clearTimeout(fetchTimeout);
        cleanupJSONP(callbackName);
        console.warn(`[Background Sync] Gagal menarik data ${type}.`);
    };
    
    document.body.appendChild(script);
}

// =========================================================
// 👇 FUNGSI SAKTI: MENGUBAH TULISAN DI LAYAR (WIZARD & PANEL)
// =========================================================
function updateLiveLastDataUI() {
    // --- 1. JALANKAN UNTUK MODE WIZARD (LAPANGAN) ---
    const lastDataElWizard = document.getElementById('univLastDataDisplay');
    if (lastDataElWizard && typeof activeUnivArea !== 'undefined' && typeof activeUnivFilteredParams !== 'undefined') {
        const fullLabel = activeUnivFilteredParams[activeUnivIdx];
        if (fullLabel) {
            const fullLabelBersih = fullLabel.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();
            const nameOnly = fullLabelBersih.split(' (')[0];
            
            // PERBAIKAN: Gunakan ?? agar nilai 0 tidak dianggap kosong
            let newValue = univLastData[fullLabel] ?? univLastData[fullLabelBersih] ?? univLastData[nameOnly];
            const newTime = univLastData._lastTime || '--:--';

            if (typeof newValue === 'object' && newValue !== null) {
                newValue = (newValue.value !== undefined && newValue.value !== null) ? newValue.value : '-';
            }

            // PERBAIKAN: Pengecekan tidak boleh memblokir angka 0
            if (newValue !== undefined && newValue !== null && newValue !== '') {
                const currentText = lastDataElWizard.innerText;
                if (!currentText.includes(String(newValue)) || !currentText.includes(newTime)) {
                    lastDataElWizard.innerHTML = `🕒 Tersinkron (${newTime}): <span style="color: #10b981; font-weight: 900; text-shadow: 0 0 10px rgba(16,185,129,0.8); transition: all 0.5s;">${newValue}</span> <span style="font-size: 0.75rem; color: #10b981; margin-left: 6px;">✨ Baru</span>`;
                    lastDataElWizard.style.transform = 'scale(1.05)';
                    setTimeout(() => { lastDataElWizard.style.transform = 'scale(1)'; }, 300);
                }
            }
        }
    }

    // --- 2. JALANKAN UNTUK MODE PANEL (DROPDOWN) ---
    const panelElements = document.querySelectorAll('.live-update-panel');
    if (panelElements.length > 0) {
        panelElements.forEach(el => {
            const fullLabel = el.getAttribute('data-label');
            const fullLabelBersih = el.getAttribute('data-bersih');
            const nameOnly = el.getAttribute('data-name');
            
            // PERBAIKAN: Gunakan ?? agar nilai 0 tidak terlewat
            let newValue = univLastData[fullLabel] ?? (fullLabelBersih ? univLastData[fullLabelBersih] : undefined) ?? univLastData[nameOnly];
            let newTime = univLastData._lastTime || '--:--';

            if (typeof newValue === 'object' && newValue !== null) {
                newValue = (newValue.value !== undefined && newValue.value !== null) ? newValue.value : '-';
            }

            // PERBAIKAN: Pengecekan tidak boleh memblokir angka 0
            if (newValue !== undefined && newValue !== null && newValue !== '') {
                const currentText = el.innerText;
                if (!currentText.includes(String(newValue)) || !currentText.includes(newTime)) {
                    el.innerHTML = `🕒 Tersinkron (${newTime}): <strong style="color: #10b981; text-shadow: 0 0 8px rgba(16,185,129,0.6);">${newValue}</strong> ✨`;
                    el.style.transform = 'scale(1.03)';
                    setTimeout(() => { el.style.transform = 'scale(1)'; }, 400);
                }
            }
        });
    }
}
function updateStatusIndicator(isOnline) {
    console.log('System Status:', isOnline ? 'Online' : 'Offline');
    // Jika Anda punya elemen UI indikator online/offline, bisa diupdate di sini
}


function detectInputType(label) {
    for (const [type, config] of Object.entries(INPUT_TYPES)) {
        for (const pattern of config.patterns) {
            if (label.includes(pattern)) {
                return {
                    type: 'select',
                    options: config.options[pattern],
                    pattern: pattern
                };
            }
        }
    }
    return { type: 'text', options: null, pattern: null };
}

// ==========================================
// DYNAMIC TEMPLATE ENGINE
// ==========================================

// Variabel State Universal
let activeLogsheetType = null; // Akan berisi 'TURBINE', 'CT', '1300', atau '1100'
let univCurrentInput = {};     // Draf input sementara
let univParamPhotos = {};      // Foto sementara

/**
 * Fungsi untuk membuka Logsheet apa saja (Turbin, CT, 1300, 1100)
 * @param {string} type - Sesuai dengan key di LOGSHEET_CONFIG (misal: '1300')
 */
function openUniversalLogsheet(type, statusPabrik) {
    const config = LOGSHEET_CONFIG[type];
    if (!config) return;

    activeLogsheetType = type;
    window.currentStatusPabrik = statusPabrik || 'OPERASI';
    // Cek Grouped Logsheet
    if (config.groups) {
        if (typeof openGroupedLogsheet === 'function') openGroupedLogsheet();
        return; 
    }

    // Header & User (Bawaan Asli Anda)
    const titleEl = document.getElementById('univHeaderTitle');
    const userEl = document.getElementById('univAreaListUser');
    if (titleEl) titleEl.textContent = config.title;
    if (userEl) userEl.textContent = (currentUser && currentUser.name) ? currentUser.name : 'Operator';

    // AMBIL DATA LANGSUNG DARI WINDOW (Hasil load main.js)
    univCurrentInput = window.activeDrafts[type] || {};
    univParamPhotos = window.activePhotos[type] || {};

    // 👇 1. INJEKSI STICKY HEADER SAJA (Aman untuk UI) 👇
    const oldHeader = document.getElementById('sticky-status-header');
    if (oldHeader) oldHeader.remove(); // Bersihkan header lama kalau ada

    const warnaBg = statusPabrik === 'OPERASI' ? '#27ae60' : '#e74c3c';
    const headerHtml = `
        <div id="sticky-status-header" style="background: ${warnaBg}; color: white; padding: 12px; text-align: center; font-weight: bold; position: sticky; top: 80px; z-index: 99; margin: 0 16px 16px 16px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ⚠️ KONDISI PABRIK: ${statusPabrik}
        </div>
    `;
    
    const areaListContainer = document.getElementById('univAreaList');
    if (areaListContainer) {
        areaListContainer.insertAdjacentHTML('beforebegin', headerHtml);
    }
    // 👆 ================================================= 👆

    // 👇 2. PANGGIL PENGGAMBAR UI PREMIUM (Yang sudah dipasang Satpam Filter tadi) 👇
    if (typeof renderMenuUniversal === 'function') {
        renderMenuUniversal(type, statusPabrik); 
    }
    
    navigateTo('universalAreaListScreen');
}
/**
 * Fungsi untuk merender daftar kotak Area secara otomatis (DIUBAH NAMANYA AGAR SINKRON)
 * ⚠️ DITAMBAHKAN PARAMETER statusPabrik UNTUK LOGIKA FILTER [ALL]/[OPERASI]/[STOP]
 */
function renderMenuUniversal(menuKey, statusPabrik = 'OPERASI') { 
    // 👇 1. SIMPAN KE MEMORI GLOBAL AGAR TIDAK LUPA 👇
    window.currentStatusPabrik = statusPabrik;

    const config = LOGSHEET_CONFIG[menuKey];
    const listContainer = document.getElementById('univAreaList');
    if (!listContainer || !config || !config.areas) return;
    
    activeLogsheetType = menuKey; 
    const currentDraft = window.activeDrafts[menuKey] || {};
    
    let html = '';
    let totalParams = 0;
    let filledParams = 0;
    // 👇 TAMBAHKAN LOGIKA WAKTU DI SINI (Di luar loop agar ringan) 👇
    const jamSekarang = new Date().getHours();
    const isWaktuLaporan = (jamSekarang >= 13 && jamSekarang < 15) || 
                           (jamSekarang >= 21 && jamSekarang < 23) || 
                           (jamSekarang >= 5 && jamSekarang < 7);
    Object.entries(config.areas).forEach(([areaNameLengkap, paramsList]) => {
        // 👇 1. SATPAM AREA 👇
        const isAreaOperasi = areaNameLengkap.toUpperCase().includes('[OPERASI]');
        const isAreaStop = areaNameLengkap.toUpperCase().includes('[STOP]');
        const isAreaAll = areaNameLengkap.toUpperCase().includes('[ALL]');
        const isAreaLaporan = areaNameLengkap.toUpperCase().includes('[LAPORAN]');
        const isAreaJam00 = areaNameLengkap.toUpperCase().includes('[JAM00]');
        const isAreaJam06 = areaNameLengkap.toUpperCase().includes('[JAM06]');
        
        if (statusPabrik === 'STOP' && isAreaOperasi) return; 
        if (statusPabrik === 'OPERASI' && isAreaStop) return;
        if (isAreaLaporan && !isWaktuLaporan) return;
        if (isAreaJam00 && jamSekarang !== 0) return; // Sembunyikan area jam 00
        if (isAreaJam06 && jamSekarang !== 6) return; // Sembunyikan area jam 06

        // 👇 2. SATPAM PARAMETER 👇
        const parameterLolosFilter = paramsList.filter(fullLabel => {
            const isParamAll = fullLabel.toUpperCase().includes('[ALL]');
            const isParamStop = fullLabel.toUpperCase().includes('[STOP]');
            const isParamLaporan = fullLabel.toUpperCase().includes('[LAPORAN]');
            const isParamJam00 = fullLabel.toUpperCase().includes('[JAM00]');
            const isParamJam06 = fullLabel.toUpperCase().includes('[JAM06]');
            
            if (statusPabrik === 'OPERASI' && isParamStop) return false; 
            if (statusPabrik === 'STOP' && !isAreaStop && !isAreaAll && !isParamAll && !isParamStop) return false; 
            if (isParamLaporan && !isWaktuLaporan) return false;
            
            if (isParamJam00 && jamSekarang !== 0) return false; // Sembunyikan alat jam 00
            if (isParamJam06 && jamSekarang !== 6) return false; // Sembunyikan alat jam 06
            
            return true;
        });

        if (parameterLolosFilter.length === 0) return; 

        const areaNameBersih = areaNameLengkap.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();

        let areaFilled = 0;
        const areaTotal = parameterLolosFilter.length; 
        totalParams += areaTotal;

        parameterLolosFilter.forEach(fullLabel => {
            if (currentDraft[areaNameLengkap] && currentDraft[areaNameLengkap][fullLabel]) {
                areaFilled++;
                filledParams++;
            }
        });

        const isComplete = areaFilled === areaTotal && areaTotal > 0;
        const progressPercent = areaTotal === 0 ? 0 : Math.round((areaFilled / areaTotal) * 100);
        
        const hasAbnormal = parameterLolosFilter.some(fullLabel => {
            const val = (univCurrentInput[areaNameLengkap] && univCurrentInput[areaNameLengkap][fullLabel]) || '';
            const firstLine = val.split('\n')[0];
            return ['ERROR', 'MAINTENANCE', 'NOT_INSTALLED', 'OFF'].includes(firstLine);
        });

        let statusIcon = '📝';
        let iconBg = `${config.themeColor}25`; 
        let iconColor = config.themeColor;
        let ringColor = `${config.themeColor}40`;
        let themeColor = config.themeColor;

        if (isComplete) {
            statusIcon = '✅';
            iconBg = 'rgba(16, 185, 129, 0.15)'; 
            iconColor = '#10b981';
            ringColor = 'rgba(16, 185, 129, 0.3)';
            themeColor = '#10b981';
        } else if (areaFilled > 0) {
            statusIcon = '⏳';
        }

        if (hasAbnormal) {
            iconBg = 'rgba(239, 68, 68, 0.15)'; 
            iconColor = '#ef4444';
            ringColor = 'rgba(239, 68, 68, 0.3)';
            themeColor = '#ef4444';
        }

        html += `
            <div class="premium-area-card" onclick="openUnivAreaInput('${areaNameLengkap}')" style="--theme-color: ${themeColor};">
                ${hasAbnormal ? '<div class="abnormal-pulse" style="position:absolute; top:16px; right:16px; width:12px; height:12px; background:#ef4444; border-radius:50%;"></div>' : ''}
                
                <div class="premium-area-header">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div class="premium-icon-box" style="background: ${iconBg}; color: ${iconColor}; border: 1px solid ${ringColor};">
                            ${statusIcon}
                        </div>
                        <div class="premium-area-info">
                            <h3 class="premium-area-title">${areaNameBersih}</h3>
                            <p class="premium-area-subtitle">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                                ${areaFilled} / ${areaTotal} Diisi
                            </p>
                        </div>
                    </div>
                    <div style="padding: 4px 12px; background: ${isComplete ? iconColor : 'rgba(15, 23, 42, 0.6)'}; color: ${isComplete ? 'white' : '#e2e8f0'}; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; font-size: 0.8rem; font-weight: 800;">
                        ${progressPercent}%
                    </div>
                </div>

                <div class="premium-progress-bar-bg">
                    <div class="premium-progress-fill" style="width: ${progressPercent}%; background: ${themeColor}; box-shadow: 0 0 10px ${themeColor}80;"></div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    const overallPercent = totalParams === 0 ? 0 : Math.round((filledParams / totalParams) * 100);
    const overallPercentEl = document.getElementById('univOverallPercent');
    const overallProgressBarEl = document.getElementById('univOverallProgressBar');
    const progressTextEl = document.getElementById('univProgressText');
    
    if (overallPercentEl) overallPercentEl.textContent = `${overallPercent}%`;
    if (overallProgressBarEl) {
        overallProgressBarEl.style.width = `${overallPercent}%`;
        overallProgressBarEl.style.backgroundColor = config.themeColor;
        overallProgressBarEl.style.boxShadow = `0 0 12px ${config.themeColor}80`; 
    }
    if (progressTextEl) progressTextEl.textContent = `${overallPercent}% Selesai`;

    const submitBtn = document.getElementById('univSubmitBtn');
    if (submitBtn) {
        if (overallPercent > 0) {
            submitBtn.style.display = 'block';
            submitBtn.style.background = `linear-gradient(135deg, ${config.themeColor}, color-mix(in srgb, ${config.themeColor} 70%, black))`;
            submitBtn.style.boxShadow = `0 8px 24px ${config.themeColor}60`;
        } else {
            submitBtn.style.display = 'none';
        }
    }
}

let activeUnivArea = null;
let activeUnivIdx = 0;
let activeUnivFilteredParams = [];

function openUnivAreaInput(areaNameLengkap) { 
    activeUnivArea = areaNameLengkap; 
    activeUnivIdx = 0;
    
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const paramsListRaw = config.areas[areaNameLengkap];

    const statusPabrik = window.currentStatusPabrik || 'OPERASI';
    const isAreaStop = areaNameLengkap.toUpperCase().includes('[STOP]');
    const isAreaAll = areaNameLengkap.toUpperCase().includes('[ALL]');
    const isAreaLaporan = areaNameLengkap.toUpperCase().includes('[LAPORAN]');
    const isAreaJam00 = areaNameLengkap.toUpperCase().includes('[JAM00]');
    const isAreaJam06 = areaNameLengkap.toUpperCase().includes('[JAM06]');

    const jamSekarang = new Date().getHours();
    const isWaktuLaporan = (jamSekarang >= 13 && jamSekarang < 15) || 
                           (jamSekarang >= 21 && jamSekarang < 23) || 
                           (jamSekarang >= 5 && jamSekarang < 7);

    // 👇 1. PENGAMAN PINTU AREA 👇
    if (isAreaLaporan && !isWaktuLaporan) {
        if (typeof showCustomAlert === 'function') showCustomAlert('⚠️ Bukan waktu pengisian laporan!', 'error');
        return; 
    }
    if (isAreaJam00 && jamSekarang !== 0) {
        if (typeof showCustomAlert === 'function') showCustomAlert('⚠️ Area ini khusus Pukul 00:00 - 00:59', 'error');
        return;
    }
    if (isAreaJam06 && jamSekarang !== 6) {
        if (typeof showCustomAlert === 'function') showCustomAlert('⚠️ Area ini khusus Pukul 06:00 - 06:59', 'error');
        return;
    }

    // 👇 2. FILTER ALAT DI WIZARD 👇
    activeUnivFilteredParams = paramsListRaw.filter(fullLabel => {
        const isParamAll = fullLabel.toUpperCase().includes('[ALL]');
        const isParamStop = fullLabel.toUpperCase().includes('[STOP]');
        const isParamLaporan = fullLabel.toUpperCase().includes('[LAPORAN]');
        const isParamJam00 = fullLabel.toUpperCase().includes('[JAM00]');
        const isParamJam06 = fullLabel.toUpperCase().includes('[JAM06]');
        
        if (statusPabrik === 'OPERASI' && isParamStop) return false; 
        if (statusPabrik === 'STOP' && !isAreaStop && !isAreaAll && !isParamAll && !isParamStop) return false;
        if (isParamLaporan && !isWaktuLaporan) return false;
        
        if (isParamJam00 && jamSekarang !== 0) return false;
        if (isParamJam06 && jamSekarang !== 6) return false;
        
        return true;
    });
    
    const stepBadge = document.getElementById('univStepBadge');
    if (stepBadge) {
        stepBadge.style.color = config.themeColor;
        stepBadge.style.backgroundColor = `${config.themeColor}15`; 
        stepBadge.style.borderColor = `${config.themeColor}40`;
    }
    
    const submitBtnStep = document.getElementById('univBtnSubmitStep');
    if (submitBtnStep) {
        submitBtnStep.style.backgroundColor = config.themeColor;
        submitBtnStep.style.boxShadow = `0 4px 16px ${config.themeColor}40`;
    }

    const currentAreaNameEl = document.getElementById('univCurrentAreaName');
    if (currentAreaNameEl) {
        // Regex Mesin Cuci Anda sudah benar di sini 👍
        const areaNameBersih = areaNameLengkap.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();
        currentAreaNameEl.textContent = areaNameBersih; 
        currentAreaNameEl.style.color = config.themeColor;
    }

    navigateTo('univParamScreen');
    showUnivStep(); 
}

/**
 * Menampilkan parameter aktif berdasarkan index (Menggunakan Alat Lolos Filter)
 */
function showUnivStep() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    
    // 👇 GANTI SUMBER DATANYA KE WADAH YANG SUDAH DIFILTER 👇
    const paramsList = activeUnivFilteredParams; 
    const fullLabel = paramsList[activeUnivIdx];
    const total = paramsList.length;
    
    // Update Header & Counter
    document.getElementById('univStepInfo').textContent = `Step ${activeUnivIdx + 1}/${total}`;
    document.getElementById('univAreaProgress').textContent = `${activeUnivIdx + 1}/${total}`;
    
    // 👇 MESIN PENCUCI NAMA ALAT AGAR [ALL]/[STOP] TIDAK MUNCUL DI LAYAR 👇
    const fullLabelBersih = fullLabel.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();
    const nameOnly = fullLabelBersih.split(' (')[0];
    const unitMatch = fullLabelBersih.match(/\(([^)]+)\)/);
    // 👆 =============================================================== 👆
    
    document.getElementById('univLabelInput').textContent = nameOnly;
    
    // --- TAMBAHAN UNTUK MENAMPILKAN LAST DATA (Gunakan nama asli untuk fetch) ---
    let lastValue = univLastData[fullLabel] ?? univLastData[fullLabelBersih] ?? univLastData[nameOnly]; 
    const lastTime = univLastData._lastTime || '--:--'; 
    
    if (typeof lastValue === 'object' && lastValue !== null) {
        lastValue = (lastValue.value !== undefined && lastValue.value !== null) ? lastValue.value : '-';
    } 
    
    let lastDataEl = document.getElementById('univLastDataDisplay');
    if (!lastDataEl) {
        lastDataEl = document.createElement('div');
        lastDataEl.id = 'univLastDataDisplay';
        lastDataEl.style.fontSize = '0.85rem';
        lastDataEl.style.color = '#94a3b8';
        lastDataEl.style.marginBottom = '16px';
        lastDataEl.style.fontWeight = '500';
        document.getElementById('univLabelInput').after(lastDataEl);
    }
    
    // PERBAIKAN: Jika nilainya 0, tetap render ke layar
    if (lastValue !== undefined && lastValue !== null && lastValue !== '') {
        lastDataEl.innerHTML = `🕒 Data sebelumnya (${lastTime}): <span style="color: ${config.themeColor}; font-weight: bold;">${lastValue}</span>`;
    } else {
        lastDataEl.innerHTML = `🕒 Data sebelumnya: -`;
    }
   // -----------------------------------------------------------//
   
    const unitDisplay = document.getElementById('univUnitDisplay');
    if (unitDisplay) {
        unitDisplay.textContent = unitMatch ? unitMatch[1] : "--";
        unitDisplay.style.color = config.themeColor;
    }

    // Ambil data dari draft (Gunakan nama ASLI agar nyambung ke database)
    let savedValue = (univCurrentInput[activeUnivArea] && univCurrentInput[activeUnivArea][fullLabel]) || '';
    
    let displayValue = savedValue;
    if (['ERROR', 'NOT_INSTALLED'].includes(savedValue.split('\n')[0])) {
        displayValue = ''; 
    }

    // Render Input Field (Gunakan nama asli untuk deteksi)
    const inputContainer = document.getElementById('univInputFieldContainer');
    const inputType = detectInputType(fullLabel); 

    if (inputType.type === 'select') {
        let optionsHtml = `<option value="" disabled ${!displayValue ? 'selected' : ''}>Pilih Status...</option>`;
        inputType.options.forEach(opt => {
            optionsHtml += `<option value="${opt}" ${displayValue === opt ? 'selected' : ''}>${opt}</option>`;
        });
        inputContainer.innerHTML = `<select id="univValInput" class="status-select" style="width:100%; border:none; background:transparent; color:white; font-size:1.4rem; font-weight:700;">${optionsHtml}</select>`;
    } else {
        let isTextNeeded = fullLabel.includes('A/B/C/D/E') || fullLabel.includes('A/B/C');
        let keyboardMode = isTextNeeded ? "text" : "decimal";
        
        inputContainer.innerHTML = `<input type="text" id="univValInput" inputmode="${keyboardMode}" placeholder="${isTextNeeded ? 'Contoh: CE20' : '0.00'}" value="${displayValue}" autocomplete="off" style="width:100%; border:none; background:transparent; color:white; font-size:1.6rem; font-weight:700; outline:none;">`;
    }

    // Load Status Abnormal (Checkbox) - Gunakan nama asli
    loadUnivAbnormalStatus(fullLabel);
    
    // Perbaikan Titik Progress (Biar jumlah titiknya sama dengan alat yang difilter)
    if (typeof renderUnivProgressDots === 'function') {
        renderUnivProgressDots();
    }
    
    if (typeof loadUnivParamPhotoForCurrentStep === 'function') {
        loadUnivParamPhotoForCurrentStep();
    }
    
    // Auto focus ke input
    setTimeout(() => {
        const inputEl = document.getElementById('univValInput');
        if (inputEl && !inputEl.disabled) {
            inputEl.focus();
            if (inputEl.select) inputEl.select();
        }
    }, 150);
}

/**
 * Menyimpan step saat ini ke dalam memori draf
 */
function saveUnivStep() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    // 👇 GANTI SUMBER DATA KE WADAH FILTER 👇
    const paramsList = activeUnivFilteredParams; 
    const fullLabel = paramsList[activeUnivIdx];
    const input = document.getElementById('univValInput');
    
    if (!univCurrentInput[activeUnivArea]) univCurrentInput[activeUnivArea] = {};
    
    let valueToSave = '';
    if (input && input.value.trim()) {
        valueToSave = input.value.trim();
    }
    
    // Cek apakah ada status abnormal yang dicentang
    const checkedStatus = document.querySelector('input[name="univParamStatus"]:checked');
    const note = document.getElementById('univStatusNote')?.value || '';
    
    if (checkedStatus) {
        valueToSave = checkedStatus.value + (note ? `\n${note}` : '');
    }
    
    if (valueToSave) {
        univCurrentInput[activeUnivArea][fullLabel] = valueToSave;
    } else {
        delete univCurrentInput[activeUnivArea][fullLabel];
    }
    
    // UPDATE STATE GLOBAL JUGA
    // 1. Sisipkan stempel waktu saat ini ke dalam draf
    univCurrentInput._savedAt = new Date().toISOString();

    // 2. UPDATE STATE GLOBAL JUGA
    window.activeDrafts[activeLogsheetType] = univCurrentInput;
    
    // 3. Simpan draf utuh (yang sudah ada waktunya) ke memori HP
    localStorage.setItem(config.draftKey, JSON.stringify(univCurrentInput));
}

/**
 * Navigasi ke parameter selanjutnya (DENGAN PERBAIKAN NAVIGASI STATUS PABRIK)
 */
/**
 * LANGKAH 3: Navigasi Lanjut (Dengan Portal Validasi Wajib Foto)
 */
function nextUnivStep() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const fullLabel = activeUnivFilteredParams[activeUnivIdx];
    
    // 👇 PORTAL VALIDASI WAJIB FOTO UNTUK ERROR 👇
    const checkedStatus = document.querySelector('input[name="univParamStatus"]:checked');
    if (checkedStatus) {
        // Cek apakah tombol "Temuan Berulang" dicentang
        const isBypass = document.getElementById('univBypassFoto') && document.getElementById('univBypassFoto').checked;
        const currentPhoto = univParamPhotos[activeUnivArea]?.[fullLabel];
        
        if (isBypass) {
            // JIKA LAMA/BYPASS: Foto tidak wajib, TAPI Keterangan Wajib!
            const noteInput = document.getElementById('univStatusNote');
            if (!noteInput || noteInput.value.trim() === '') {
                if (typeof showTemporaryToast === 'function') showTemporaryToast('⚠️ Wajib isi keterangan kerusakan!', 'error');
                return;
            }
        } else {
            // JIKA BARU: Wajib ada Foto!
            if (!currentPhoto || currentPhoto.trim() === '') {
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('📸 Bukti foto WAJIB dilampirkan untuk status Abnormal!', 'error');
                } else if (typeof showTemporaryToast === 'function') {
                    showTemporaryToast('📸 Bukti foto WAJIB dilampirkan!', 'error');
                }
                
                const photoContainer = document.getElementById('univParamPhotoSection');
                if (photoContainer) {
                    photoContainer.style.border = '2px solid #ef4444';
                    setTimeout(() => { photoContainer.style.border = ''; }, 1000);
                }
                return; 
            }
        }
    }

    // 👇 LOGIKA AUTO-FILL "-" SAAT STOP (WIZARD MODE) 👇
    const inputEl = document.getElementById('univValInput');
    const currentValue = inputEl ? inputEl.value.trim().toUpperCase() : '';
    const isStatusParam = fullLabel.includes('(RUN/STOP)') || fullLabel.includes('STATUS');
    
    if (isStatusParam && currentValue === 'STOP') {
        const equipmentPrefix = fullLabel.split(' (')[0].trim();
        activeUnivFilteredParams.forEach((p, idx) => {
            if (idx > activeUnivIdx && p.includes(equipmentPrefix)) {
                if (!univCurrentInput[activeUnivArea]) univCurrentInput[activeUnivArea] = {};
                univCurrentInput[activeUnivArea][p] = "-";
            }
        });
    }

    saveUnivStep(); 
    
    // 1. LOGIKA BACKGROUND UPLOAD FOTO
    const currentPhotoAfterSave = univParamPhotos[activeUnivArea]?.[fullLabel];
    if (currentPhotoAfterSave && currentPhotoAfterSave.length > 100 && currentPhotoAfterSave !== 'UPLOADED_BACKGROUND') {
        if (navigator.onLine) {
            uploadPhotoInBackground(activeUnivArea, fullLabel, currentPhotoAfterSave);
            univParamPhotos[activeUnivArea][fullLabel] = 'UPLOADED_BACKGROUND';
            try {
                localStorage.setItem(config.photoKey, JSON.stringify(univParamPhotos));
            } catch(e) {
                console.warn('Gagal menyimpan status UPLOADED_BACKGROUND ke lokal karena memori penuh.');
            }
        } else {
            if (typeof showTemporaryToast === 'function') {
                showTemporaryToast('Sinyal hilang. Foto disimpan di memori HP.', 'warning');
            }
        }
    }

    // 👇 2. CEK NAVIGASI DENGAN FITUR "SMART AUTO-SKIP" 👇
    let isFinished = false;

    if (activeUnivIdx < activeUnivFilteredParams.length - 1) {
        activeUnivIdx++; // Maju 1 langkah dulu

        // 🚀 MESIN LONCAT: Skip terus selama isinya "-"
        while (activeUnivIdx < activeUnivFilteredParams.length) {
            const nextLabel = activeUnivFilteredParams[activeUnivIdx];
            const nextSavedValue = (univCurrentInput[activeUnivArea] && univCurrentInput[activeUnivArea][nextLabel]) || '';
            
            if (nextSavedValue === "-") {
                activeUnivIdx++; // Alat ini di-skip, loncat lagi!
            } else {
                break; // Stop loncat, tampilkan alat ini
            }
        }

        // Cek apakah setelah meloncat-loncat ternyata kebablasan sampai ujung area
        if (activeUnivIdx >= activeUnivFilteredParams.length) {
            isFinished = true;
        } else {
            showUnivStep(); // Tampilkan alat yang butuh diisi
        }
    } else {
        isFinished = true;
    }

    // Eksekusi jika sudah sampai di ujung area
    if (isFinished) {
        const areaNameBersih = activeUnivArea.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();
        if (typeof showCustomAlert === 'function') showCustomAlert(`Area ${areaNameBersih} Selesai!`, 'success');
        
        setTimeout(() => {
            const statusPabrik = window.currentStatusPabrik || 'OPERASI';
            renderMenuUniversal(activeLogsheetType, statusPabrik); 
            navigateTo('universalAreaListScreen');
        }, 1200);
    }
}

/**
 * Navigasi kembali (Tetap aman)
 */
function prevUnivStep(forceBack = false) {
    saveUnivStep();
    
    if (!forceBack && activeUnivIdx > 0) {
        activeUnivIdx--; // Mundur 1 langkah

        // 🚀 MESIN LONCAT MUNDUR: Skip mundur selama isinya "-"
        while (activeUnivIdx > 0) {
            const prevLabel = activeUnivFilteredParams[activeUnivIdx];
            const prevSavedValue = (univCurrentInput[activeUnivArea] && univCurrentInput[activeUnivArea][prevLabel]) || '';
            
            if (prevSavedValue === "-") {
                activeUnivIdx--; // Alat ini isinya "-", mundur lagi!
            } else {
                break; // Stop mundur, ini alat aslinya
            }
        }

        showUnivStep();
    } else {
        const statusPabrik = window.currentStatusPabrik || 'OPERASI';
        renderMenuUniversal(activeLogsheetType, statusPabrik); 
        navigateTo('universalAreaListScreen');
    }
}

/**
 * LANGKAH 1: Logika Checkbox Status Abnormal (Universal) - Efek Siluman
 */
function handleUnivStatusChange(checkbox) {
    const noteContainer = document.getElementById('univStatusNoteContainer');
    const valInput = document.getElementById('univValInput');
    const photoContainer = document.getElementById('univParamPhotoSection'); 

    // 👇 INJEKSI SAKLAR BYPASS FOTO OTOMATIS 👇
    let bypassDiv = document.getElementById('bypassContainer');
    if (!bypassDiv && noteContainer) {
        bypassDiv = document.createElement('div');
        bypassDiv.id = 'bypassContainer';
        bypassDiv.style.marginTop = '10px';
        bypassDiv.style.marginBottom = '10px';
        bypassDiv.style.padding = '10px';
        bypassDiv.style.background = 'rgba(245, 158, 11, 0.1)';
        bypassDiv.style.border = '1px dashed #f59e0b';
        bypassDiv.style.borderRadius = '8px';
        bypassDiv.innerHTML = `
            <label style="display:flex; align-items:center; gap:8px; color:#fbbf24; font-size:0.85rem; font-weight:bold; cursor:pointer;">
                <input type="checkbox" id="univBypassFoto" onchange="toggleBypassFoto(this)" style="width:18px; height:18px;">
                🔄 Alat Masih Rusak (Tidak Perlu Foto)
            </label>
        `;
        // Sisipkan pas di atas kotak kamera
        if (photoContainer) {
            photoContainer.parentElement.insertBefore(bypassDiv, photoContainer);
        }
        
        // Logika saat saklar dicentang
        window.toggleBypassFoto = function(cb) {
            const pContainer = document.getElementById('univParamPhotoSection');
            const noteInput = document.getElementById('univStatusNote');
            if (cb.checked) {
                if (pContainer) pContainer.style.display = 'none'; // Hilangkan kamera
                if (noteInput && noteInput.value === '') noteInput.value = 'Temuan berulang. Alat masih rusak / menunggu perbaikan.';
            } else {
                if (pContainer) pContainer.style.display = 'block'; // Munculkan kamera
            }
        };
    }
    // 👆 ====================================== 👆

    // Matikan checkbox lain (radio-like behavior)
    document.querySelectorAll('input[name="univParamStatus"]').forEach(cb => {
        if (cb !== checkbox) cb.checked = false;
        cb.closest('.status-chip').classList.toggle('active', cb.checked);
    });

    checkbox.closest('.status-chip').classList.toggle('active', checkbox.checked);

    if (checkbox.checked) {
        if (noteContainer) noteContainer.style.display = 'block';
        if (bypassDiv) bypassDiv.style.display = 'block';
        
        // Cek status bypass saat ini
        const isBypass = document.getElementById('univBypassFoto') && document.getElementById('univBypassFoto').checked;
        if (photoContainer) photoContainer.style.display = isBypass ? 'none' : 'block'; 
        
        if (valInput) {
            valInput.disabled = true;
            valInput.style.opacity = '0.3';
        }
    } else {
        if (noteContainer) noteContainer.style.display = 'none';
        if (photoContainer) photoContainer.style.display = 'none'; 
        if (bypassDiv) bypassDiv.style.display = 'none';
        if (valInput) {
            valInput.disabled = false;
            valInput.style.opacity = '1';
        }
    }
}

/**
 * LANGKAH 2: Memuat Status Abnormal Saat Pindah Step
 */
function loadUnivAbnormalStatus(fullLabel) {
    const savedValue = (univCurrentInput[activeUnivArea] && univCurrentInput[activeUnivArea][fullLabel]) || '';
    const lines = savedValue.split('\n');
    const statusPart = lines[0];
    const notePart = lines[1] || '';
    
    const checkboxes = document.querySelectorAll('input[name="univParamStatus"]');
    const noteContainer = document.getElementById('univStatusNoteContainer');
    const noteInput = document.getElementById('univStatusNote');
    const valInput = document.getElementById('univValInput');
    const photoContainer = document.getElementById('univParamPhotoSection'); 
    const bypassDiv = document.getElementById('bypassContainer'); 

    let foundStatus = false;
    checkboxes.forEach(cb => {
        cb.checked = (cb.value === statusPart);
        cb.closest('.status-chip').classList.toggle('active', cb.checked);
        if (cb.checked) foundStatus = true;
    });

    if (foundStatus) {
        if (noteContainer) noteContainer.style.display = 'block';
        if (noteInput) noteInput.value = notePart;
        if (valInput) {
            valInput.disabled = true;
            valInput.style.opacity = '0.3';
        }

        // Cek memori: Apakah dulu diklik temuan berulang?
        const isBypass = notePart.includes('Temuan berulang') || notePart.includes('masih rusak');
        const bypassCb = document.getElementById('univBypassFoto');
        
        if (bypassDiv) bypassDiv.style.display = 'block';
        if (bypassCb) {
            bypassCb.checked = isBypass;
            if (photoContainer) photoContainer.style.display = isBypass ? 'none' : 'block';
        } else {
            if (photoContainer) photoContainer.style.display = 'block';
        }
    } else {
        if (noteContainer) noteContainer.style.display = 'none';
        if (photoContainer) photoContainer.style.display = 'none';
        if (bypassDiv) bypassDiv.style.display = 'none';
        if (noteInput) noteInput.value = '';
        if (valInput) {
            valInput.disabled = false;
            valInput.style.opacity = '1';
        }
    }
}

/**
 * Render titik-titik progres di bagian bawah
 */
function renderUnivProgressDots() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const container = document.getElementById('univProgressDots');
    
    // 👇 GANTI SUMBER DATA TITIK KE WADAH FILTER 👇
    const params = activeUnivFilteredParams; 
    let html = '';
    
    params.forEach((label, i) => {
        const hasVal = univCurrentInput[activeUnivArea]?.[label];
        const isActive = i === activeUnivIdx;
        let style = isActive ? `background:${config.themeColor}; transform:scale(1.3);` : (hasVal ? `background:${config.themeColor}80;` : '');
        html += `<div class="progress-dot" style="${style}" onclick="jumpToUnivStep(${i})"></div>`;
    });
    container.innerHTML = html;
}

function jumpToUnivStep(idx) {
    saveUnivStep();
    activeUnivIdx = idx;
    showUnivStep();
}

// ==========================================
// 7. UNIVERSAL PHOTO & SUBMIT ENGINE
// ==========================================

let univCurrentPhoto = null; // Foto yang sedang aktif
// Inisialisasi object untuk menyimpan foto berdasarkan area
if (typeof univParamPhotos === 'undefined') {
    window.univParamPhotos = {}; 
}

function handleUnivParamPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 1. Pengaman Ukuran Ekstrem
    if (file.size > 15 * 1024 * 1024) { 
        showCustomAlert('Ukuran file terlalu besar (>15MB).', 'error');
        event.target.value = '';
        return;
    }

    if (typeof showTemporaryToast === 'function') {
        showTemporaryToast('🔄 Memproses foto...', 'info');
    } else {
        showCustomAlert('🔄 Memproses foto...', 'info');
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const originalDataUrl = e.target.result;
        
        try {
            // Kompresi gambar
            const result = await compressImage(originalDataUrl, { 
                maxWidth: 1200, 
                maxHeight: 1200, 
                quality: 0.6, 
                type: 'image/jpeg' 
            });
            
            univCurrentPhoto = result.dataUrl;
            
            if (!univParamPhotos[activeUnivArea]) univParamPhotos[activeUnivArea] = {};
            
            const config = LOGSHEET_CONFIG[activeLogsheetType];
            const fullLabel = config.areas[activeUnivArea][activeUnivIdx];
            
            // 👇 PENGAMAN MEMORI LOKAL PENUH 👇
            try {
                univParamPhotos[activeUnivArea][fullLabel] = univCurrentPhoto;
                localStorage.setItem(config.photoKey, JSON.stringify(univParamPhotos));
            } catch (storageError) {
                console.warn("[Memori Penuh] Kapasitas lokal habis.");
                delete univParamPhotos[activeUnivArea][fullLabel];
                
                if (typeof showTemporaryToast === 'function') {
                    showTemporaryToast('⚠️ Memori HP penuh! Sinkronisasi atau kirim draf ini sekarang.', 'error', 4000);
                }
                return; // Hentikan proses
            }

            // 👇 RENDER UI (Tampilkan Thumbnail) 👇
            const preview = document.getElementById('univParamPhotoPreview');
            const badge = document.getElementById('univParamPhotoBadge');
            
            if (preview) {
                preview.innerHTML = `
                    <div style="position: relative; width: 100%; height: 100%;">
                        <img src="${result.dataUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
                        <div style="position: absolute; top: 8px; right: 8px; background: ${config.themeColor}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600;">
                            ${result.compressedSize}KB ↓${result.reduction}%
                        </div>
                    </div>`;
            }
            
            if (badge) {
                badge.textContent = `✓ ${result.compressedSize}KB`;
                badge.style.backgroundColor = config.themeColor;
                badge.style.color = 'white';
            }
            
            if (typeof closeAlert === 'function') closeAlert();
            
        } catch (error) {
            console.error('Kompresi gagal:', error);
            showCustomAlert('Gagal memproses foto. Coba foto lain.', 'error');
        }
    };
    
    // Mulai pembacaan file
    reader.readAsDataURL(file);
    event.target.value = '';
}

// Menampilkan foto saat pindah parameter (ditambahkan ke dalam showUnivStep nanti)
/**
 * LANGKAH 4: Menampilkan foto saat pindah parameter (Sinkron dengan Satpam & Validasi)
 */
function loadUnivParamPhotoForCurrentStep() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    
    // 👇 PERBAIKAN 1: Gunakan wadah alat yang sudah difilter (SATPAM) 👇
    const fullLabel = activeUnivFilteredParams[activeUnivIdx];
    if (!fullLabel) return; // Pengaman anti-crash
    
    // Coba load dari LocalStorage dulu jika univParamPhotos kosong
    if (Object.keys(univParamPhotos).length === 0) {
        const saved = localStorage.getItem(config.photoKey);
        if (saved) univParamPhotos = JSON.parse(saved);
    }

    univCurrentPhoto = univParamPhotos[activeUnivArea]?.[fullLabel] || null;
    
    const preview = document.getElementById('univParamPhotoPreview');
    const badge = document.getElementById('univParamPhotoBadge');
    
    // 👇 PERBAIKAN 2: Cek apakah saat ini alat sedang diset ERROR/Abnormal 👇
    const savedValue = (univCurrentInput[activeUnivArea] && univCurrentInput[activeUnivArea][fullLabel]) || '';
    const isErrorState = ['ERROR', 'MAINTENANCE', 'NOT_INSTALLED', 'OFF'].includes(savedValue.split('\n')[0]);

    if (univCurrentPhoto === 'UPLOADED_BACKGROUND') {
        // Tampilan khusus jika foto sudah aman di server
        if (preview) {
            preview.innerHTML = `
                <div class="photo-placeholder" style="text-align: center; color: #10b981;">
                    <div style="font-size: 40px; margin-bottom: 8px;">☁️</div>
                    <div style="font-weight: 700;">Foto Tersimpan di Server</div>
                    <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 4px;">Memori HP telah dilegakan</div>
                </div>`;
        }
        if (badge) {
            badge.textContent = '✓ TERKIRIM';
            badge.style.backgroundColor = '#10b981';
            badge.style.color = 'white';
            badge.style.border = 'none';
        }
    } 
    else if (univCurrentPhoto) {
        // Tampilan normal jika foto masih berupa Base64 (belum terkirim)
        if (preview) preview.innerHTML = `<img src="${univCurrentPhoto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
        if (badge) {
            badge.textContent = '✓ ADA (DRAF)';
            badge.style.backgroundColor = config.themeColor;
            badge.style.color = 'white';
            badge.style.border = 'none';
        }
    } 
    else {
        // Tampilan jika belum ada foto
        if (preview) {
            preview.innerHTML = `
                <div class="photo-placeholder" style="text-align: center; color: #64748b;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px;">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <div>Belum ada foto</div>
                </div>`;
        }
        if (badge) {
            // 👇 LOGIKA BADGE PINTAR (Wajib vs Opsional) 👇
            if (isErrorState) {
                badge.textContent = '⚠️ WAJIB BUKTI';
                badge.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; 
                badge.style.color = '#ef4444'; 
                badge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            } else {
                badge.textContent = 'OPSIONAL';
                badge.style.backgroundColor = 'rgba(148, 163, 184, 0.15)';
                badge.style.color = '#94a3b8';
                badge.style.border = 'none';
            }
        }
    }
}

/**
 * MENGIRIM DATA KE GOOGLE SHEET SECARA UNIVERSAL (VERSI KILAT SILUMAN)
 */
async function submitUniversalLogsheet() {
    if (!requireAuth()) return;
    
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    
    // 👇 1. KUMPULKAN DATA DENGAN MESIN CUCI REGEX 👇
    let allParameters = {};
    Object.entries(univCurrentInput).forEach(([areaNameLengkap, params]) => {
       if (areaNameLengkap === '_savedAt' || typeof params !== 'object') return;
        Object.entries(params).forEach(([paramNameLengkap, value]) => {
            const paramNameBersih = paramNameLengkap.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();
            allParameters[paramNameBersih] = value;
        });
    });
    
    let pendingPhotos = {}; 
    let totalPhotoCount = 0;

    Object.entries(univParamPhotos).forEach(([areaNameLengkap, areaPhotos]) => {
        Object.entries(areaPhotos).forEach(([paramNameLengkap, photoData]) => {
            if (photoData) {
                totalPhotoCount++;
                const areaNameBersih = areaNameLengkap.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();
                const paramNameBersih = paramNameLengkap.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();

                if (photoData !== 'UPLOADED_BACKGROUND') {
                    pendingPhotos[`${areaNameBersih}__${paramNameBersih}`] = photoData;
                }
            }
        });
    });
    
    const finalData = {
        type: config.submitType,
        Operator: currentUser ? currentUser.name : 'Unknown',
        OperatorId: currentUser ? currentUser.username : 'Unknown',
        Group: currentUser ? (currentUser.group || '-') : '-',
        StatusPabrik: window.currentStatusPabrik || 'OPERASI',
        photoCount: totalPhotoCount, 
        targetFileId: config.spreadsheetId,
        ...allParameters
    };

    // Siapkan paket komplit untuk dikirim/disimpan
    const dataLaporanAkhir = { ...finalData, type: 'SYNC_LAPORAN_AKHIR', targetArea: config.submitType };
    const savedOfflineData = { ...finalData, photos: pendingPhotos };

    // 👇 2. UI INSTAN: 0 DETIK LOADING 👇
    // Munculkan notifikasi sukses tanpa memblokir layar!
    showCustomAlert('✓ Logsheet sedang dikirim di latar belakang!', 'success');
    if (typeof showTemporaryToast === 'function') {
        showTemporaryToast('🔄 Upload Siluman berjalan...', 'info');
    }
    
    // Langsung bersihkan RAM detik itu juga
    univCurrentInput = {};
    univParamPhotos = {};
    localStorage.removeItem(config.draftKey);
    localStorage.removeItem(config.photoKey);
    if (window.activeDrafts) delete window.activeDrafts[activeLogsheetType];
    if (window.activePhotos) delete window.activePhotos[activeLogsheetType];
    
    // Langsung pindah ke Menu Utama (Home)
    setTimeout(() => navigateTo('homeScreen'), 500);

    // 👇 3. MESIN TEMBAK SILUMAN BERSAMAAN (PROMISE.ALL) 👇
    if (!navigator.onLine) {
        simpanLogsheetOffline(config, savedOfflineData, dataLaporanAkhir);
        return; // Berhenti kalau offline
    }

    try {
        let armadaTembakan = [];

        // A. Peluru Teks Utama
        armadaTembakan.push(fetch(GAS_URL, { method: 'POST', body: JSON.stringify(finalData) }).then(r => r.json()));
        
        // B. Peluru Laporan Akhir (Handover)
        armadaTembakan.push(fetch(GAS_URL, { method: 'POST', body: JSON.stringify(dataLaporanAkhir) }).then(r => r.json()));

        // C. Peluru Foto-foto (Dikirim serentak)
        Object.entries(pendingPhotos).forEach(([key, photoData]) => {
            const photoPayload = {
                type: 'LOGSHEET_PHOTO',
                parentType: config.submitType,
                Operator: currentUser ? currentUser.name : 'Unknown',
                photoKey: key,
                photo: photoData,
                timestamp: new Date().toISOString(),
                targetFileId: config.spreadsheetId
            };
            armadaTembakan.push(fetch(GAS_URL, { method: 'POST', body: JSON.stringify(photoPayload) }).then(r => r.json()));
        });

        // 🔥 DOR! TEMBAKKAN SEMUANYA BERSAMAAN 🔥
        const hasilTembakan = await Promise.all(armadaTembakan);
        
        // Evaluasi kalau ada 1 saja peluru yang meleset/ditolak server
        const adaYangGagal = hasilTembakan.some(res => !res.success);
        if (adaYangGagal) throw new Error("Server menolak sebagian paket data");
        
        console.log("✅ [Logsheet] Upload Siluman Selesai 100%!");
        if (typeof showTemporaryToast === 'function') {
            showTemporaryToast('✅ Logsheet & Foto sukses mendarat!', 'success');
        }

    } catch (error) {
        console.warn('⚠️ [Logsheet] Sinyal putus saat upload siluman. Dialihkan ke Offline.', error);
        simpanLogsheetOffline(config, savedOfflineData, dataLaporanAkhir);
    }
}

// 👇 TAMBAHKAN FUNGSI HELPER INI PERSIS DI BAWAHNYA 👇
// Fungsi ini memuat perlindungan "Memori HP Penuh" dari kodingan lamamu
function simpanLogsheetOffline(config, offlineDataUtama, dataLaporanAkhir) {
    // 1. Simpan Utama beserta Fotonya
    let queue = [];
    try {
        queue = JSON.parse(localStorage.getItem(config.offlineKey) || '[]');
    } catch(e) { queue = []; }

    queue.push(offlineDataUtama);

    try {
        localStorage.setItem(config.offlineKey, JSON.stringify(queue));
        
        // Jika Logsheet Utama sukses tersimpan, baru kita simpan Suntikan Laporan Akhirnya
        let pendingLaporan = JSON.parse(localStorage.getItem('offline_laporan_akhir') || '[]');
        pendingLaporan.push(dataLaporanAkhir);
        localStorage.setItem('offline_laporan_akhir', JSON.stringify(pendingLaporan));

        if (typeof showTemporaryToast === 'function') {
            showTemporaryToast('⚠️ Sinyal lemah! Logsheet diamankan di antrean offline.', 'warning', 4500);
        } else {
            showCustomAlert('Sinyal lemah! Data disimpan aman di memori HP.', 'warning');
        }
        
        if (typeof checkOfflineData === 'function') checkOfflineData();

    } catch(storageError) {
        // PERLINDUNGAN JIKA MEMORI HP OPERATOR PENUH 100%
        console.error("Gagal simpan offline:", storageError);
        queue.pop(); // Buang data yang bikin penuh
        localStorage.setItem(config.offlineKey, JSON.stringify(queue)); // Kembalikan ke state awal
        showCustomAlert('MEMORI HP PENUH! Tidak bisa menyimpan offline. Hapus cache HP atau cari sinyal Wi-Fi untuk mengirim!', 'error');
    }
}
// =====================================================================
// DYNAMIC GROUPED LOGSHEET ENGINE (Untuk STG, Asam Sulfat, dll)
// =====================================================================

function openGroupedLogsheet() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    
    // 👇 AMBIL STATUS PABRIK DARI MEMORI GLOBAL 👇
    const statusPabrik = window.currentStatusPabrik || 'OPERASI';

    document.getElementById('panelGroupTitle').textContent = config.title;
    document.getElementById('panelGroupUser').textContent = (currentUser && currentUser.name) ? currentUser.name : 'Operator';

    // Gunakan state global agar konsisten dengan Universal
    univCurrentInput = window.activeDrafts[activeLogsheetType] || {};

    const listContainer = document.getElementById('panelGroupList');
    let html = '';
    const warnaBg = statusPabrik === 'OPERASI' ? '#27ae60' : '#e74c3c';
    html += `
        <div style="background: ${warnaBg}; color: white; padding: 12px; text-align: center; font-weight: bold; position: sticky; top: 60px; z-index: 99; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ⚠️ KONDISI PABRIK: ${statusPabrik}
        </div>
    `;
    let globalTotalParams = 0;
    let globalFilledParams = 0;

    // 👇 LOGIKA WAKTU (Taruh di luar loop agar aplikasi tidak lemot) 👇
    const jamSekarang = new Date().getHours();
    const isWaktuLaporan = (jamSekarang >= 13 && jamSekarang < 15) || 
                           (jamSekarang >= 21 && jamSekarang < 23) || 
                           (jamSekarang >= 5 && jamSekarang < 7);

    Object.entries(config.groups).forEach(([groupName, subAreas]) => {
        let groupTotalParams = 0;
        let groupFilledParams = 0;

        subAreas.forEach(subAreaLengkap => {
            // 👇 SATPAM LAPIS 1: Cek KTP Area 👇
            const isAreaOperasi = subAreaLengkap.includes('[OPERASI]');
            const isAreaStop = subAreaLengkap.includes('[STOP]');
            const isAreaAll = subAreaLengkap.includes('[ALL]'); // 👈 Tambahan Cek Area ALL
            const isAreaLaporan = subAreaLengkap.toUpperCase().includes('[LAPORAN]');
           
            if (statusPabrik === 'STOP' && isAreaOperasi) return; // Area mati, lewati!
            if (statusPabrik === 'OPERASI' && isAreaStop) return; // Area khusus stop, lewati!
            if (isAreaLaporan && !isWaktuLaporan) return;
            const paramsListRaw = config.areas[subAreaLengkap] || [];
            
            // 👇 SATPAM LAPIS 2: Cek KTP Parameter 👇
            const parameterLolosFilter = paramsListRaw.filter(fullLabel => {
                const isParamAll = fullLabel.includes('[ALL]');
                const isParamStop = fullLabel.includes('[STOP]');
                const isParamLaporan = fullLabel.toUpperCase().includes('[LAPORAN]'); // 👈 Deteksi Tag Laporan

                // Aturan 1: Filter Operasi/Stop
                if (statusPabrik === 'OPERASI' && isParamStop) return false;
                if (statusPabrik === 'STOP' && !isAreaStop && !isAreaAll && !isParamAll && !isParamStop) return false; // 👈 Pengecekan !isAreaAll dimasukkan

                // 👇 Aturan 2: Filter Waktu Laporan Akhir Shift 👇
                if (isParamLaporan && !isWaktuLaporan) return false;

                return true;
            });

            // HITUNG PROGRESS BERDASARKAN ALAT YANG LOLOS FILTER SAJA!
            groupTotalParams += parameterLolosFilter.length;
            
            parameterLolosFilter.forEach(param => {
                // Cek di currentDraft menggunakan nama asli
                if (univCurrentInput[subAreaLengkap] && univCurrentInput[subAreaLengkap][param] && univCurrentInput[subAreaLengkap][param].toString().trim() !== '') {
                    groupFilledParams++;
                }
            });
        });

        // Anti Kartu Kosong: Jika setelah difilter alatnya 0, jangan gambar grupnya
        if (groupTotalParams === 0 && subAreas.length > 0) return;

        globalTotalParams += groupTotalParams;
        globalFilledParams += groupFilledParams;

        const isComplete = groupFilledParams === groupTotalParams && groupTotalParams > 0;
        const percent = groupTotalParams === 0 ? 0 : Math.round((groupFilledParams / groupTotalParams) * 100);

        html += `
            <div class="premium-area-card" onclick="openGroupedSubAreas('${groupName}')" style="--theme-color: ${config.themeColor};">
                <div class="premium-area-header">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div class="premium-icon-box" style="background: ${config.themeColor}25; color: ${config.themeColor}; border: 1px solid ${config.themeColor}40;">
                            ${isComplete ? '✅' : '⚡'}
                        </div>
                        <div class="premium-area-info">
                            <h3 class="premium-area-title" style="font-size: 0.95rem;">${groupName}</h3>
                            <p class="premium-area-subtitle">${groupFilledParams} / ${groupTotalParams} Diisi</p>
                        </div>
                    </div>
                    <div style="padding: 4px 12px; background: ${isComplete ? '#10b981' : 'rgba(15, 23, 42, 0.6)'}; color: ${isComplete ? 'white' : '#e2e8f0'}; border-radius: 20px; font-size: 0.8rem; font-weight: 800;">
                        ${percent}%
                    </div>
                </div>
                <div class="premium-progress-bar-bg">
                    <div class="premium-progress-fill" style="width: ${percent}%; background: ${isComplete ? '#10b981' : config.themeColor};"></div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    const submitBtn = document.getElementById('panelSubmitBtn');
    if (submitBtn) {
        submitBtn.style.display = globalFilledParams > 0 ? 'block' : 'none';
        submitBtn.style.background = `linear-gradient(135deg, ${config.themeColor}, color-mix(in srgb, ${config.themeColor} 70%, black))`;
    }

    navigateTo('panelSTGGroupScreen');
}
function openGroupedSubAreas(groupName) {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    document.getElementById('panelSTGHeaderTitle').textContent = groupName;

    const subAreas = config.groups[groupName];
    const container = document.getElementById('panelSTGContent');
    let html = '';

    // 👇 AMBIL STATUS PABRIK DARI MEMORI GLOBAL 👇
    const statusPabrik = window.currentStatusPabrik || 'OPERASI';

    // 👇 LOGIKA WAKTU (Taruh di luar loop agar ringan) 👇
    const jamSekarang = new Date().getHours();
    const isWaktuLaporan = (jamSekarang >= 13 && jamSekarang < 15) || 
                           (jamSekarang >= 21 && jamSekarang < 23) || 
                           (jamSekarang >= 5 && jamSekarang < 7);

    subAreas.forEach(subAreaNameLengkap => {
        // 👇 1. PENGAMAN AREA PANEL 👇
        const isAreaOperasi = subAreaNameLengkap.toUpperCase().includes('[OPERASI]');
        const isAreaStop = subAreaNameLengkap.toUpperCase().includes('[STOP]');
        const isAreaAll = subAreaNameLengkap.toUpperCase().includes('[ALL]'); 
        const isAreaLaporan = subAreaNameLengkap.toUpperCase().includes('[LAPORAN]');
        const isAreaJam00 = subAreaNameLengkap.toUpperCase().includes('[JAM00]');
        const isAreaJam06 = subAreaNameLengkap.toUpperCase().includes('[JAM06]');
        
        if (isAreaLaporan && !isWaktuLaporan) return;
        if (statusPabrik === 'STOP' && isAreaOperasi) return;
        if (statusPabrik === 'OPERASI' && isAreaStop) return;
        
        if (isAreaJam00 && jamSekarang !== 0) return;
        if (isAreaJam06 && jamSekarang !== 6) return;

        const paramsListRaw = config.areas[subAreaNameLengkap] || [];
        
        // 👇 2. FILTER ALAT PANEL 👇
        const paramsList = paramsListRaw.filter(fullLabel => {
            const isParamAll = fullLabel.toUpperCase().includes('[ALL]');
            const isParamStop = fullLabel.toUpperCase().includes('[STOP]');
            const isParamLaporan = fullLabel.toUpperCase().includes('[LAPORAN]'); 
            const isParamJam00 = fullLabel.toUpperCase().includes('[JAM00]');
            const isParamJam06 = fullLabel.toUpperCase().includes('[JAM06]');

            if (statusPabrik === 'OPERASI' && isParamStop) return false;
            if (statusPabrik === 'STOP' && !isAreaStop && !isAreaAll && !isParamAll && !isParamStop) return false;
            if (isParamLaporan && !isWaktuLaporan) return false;
            
            if (isParamJam00 && jamSekarang !== 0) return false;
            if (isParamJam06 && jamSekarang !== 6) return false;

            return true;
        });

        if (paramsList.length === 0) return; // Area kosong, jangan digambar

        // Bersihkan Nama Area untuk Layar
        const subAreaNameBersih = subAreaNameLengkap.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();

        html += `
        <details data-area="${subAreaNameLengkap}" class="form-card glass" style="margin-bottom: 16px; padding: 16px; background: rgba(30, 41, 59, 0.7); border: 1px solid ${config.themeColor}40;">
            <summary style="font-size: 1rem; font-weight: 700; color: ${config.themeColor}; cursor: pointer; outline: none; list-style-position: inside;">
                ${subAreaNameBersih}
            </summary>
            <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
        `;
        
        paramsList.forEach(fullLabel => {
            // Bersihkan Nama Alat untuk Layar
            const fullLabelBersih = fullLabel.replace(/\[ALL\]|\[OPERASI\]|\[STOP\]|\[LAPORAN\]|\[JAM00\]|\[JAM06\]/gi, '').trim();
            const nameOnly = fullLabelBersih.split(' (')[0];
            const unitMatch = fullLabelBersih.match(/\(([^)]+)\)/);
            const unit = unitMatch ? unitMatch[1] : '';
            
            const savedValue = (univCurrentInput[subAreaNameLengkap] && univCurrentInput[subAreaNameLengkap][fullLabel]) || '';
            const isErrorState = savedValue.toString().startsWith("ERROR");
            const noteText = isErrorState ? savedValue.split('\n')[1] || '' : '';

            let lastDataVal = univLastData[fullLabel] || univLastData[fullLabelBersih] || univLastData[nameOnly] || '';
            if (typeof lastDataVal === 'object' && lastDataVal !== null) {
                lastDataVal = lastDataVal.value || '-'; 
            }
            const lastTime = univLastData._lastTime || '--:--';
            
            html += `
                <div class="form-field" style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 0.85rem; color: #f8fafc; margin-bottom: 6px; font-weight: 600;">
                        ${nameOnly}
                    </label>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        
                        <small class="live-update-panel" data-label="${fullLabel}" data-bersih="${fullLabelBersih}" data-name="${nameOnly}" style="color: #94a3b8; transition: all 0.3s ease-in-out; display: inline-block;">
                            🕒 Sblm (${lastTime}): <strong style="color: ${config.themeColor};">${lastDataVal || '-'}</strong>
                        </small>
                        <button type="button" 
                                onclick="setGroupedError('${subAreaNameLengkap}', '${fullLabel}', this)" 
                                data-active="${isErrorState}"
                                style="padding: 4px 10px; font-size: 0.7rem; background: ${isErrorState ? '#ef4444' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid rgba(239, 68, 68, 0.4); color: ${isErrorState ? 'white' : '#f87171'}; border-radius: 6px; cursor: pointer; font-weight: 700;">
                            ⚠️ ERROR
                        </button>
                    </div>
            `;

            let isDropdown = false;
            let dropdownOptions = [];
            for (const [key, rules] of Object.entries(INPUT_TYPES)) {
                rules.patterns.forEach(pattern => {
                    if (fullLabel.includes(pattern)) {
                        isDropdown = true;
                        dropdownOptions = rules.options[pattern];
                    }
                });
            }

            html += `<div style="display: flex; align-items: center; background: rgba(15, 23, 42, 0.6); border: 2px solid rgba(148, 163, 184, 0.2); border-radius: 12px; overflow: hidden; opacity: ${isErrorState ? '0.3' : '1'};">`;

            if (isDropdown) {
                html += `<select ${isErrorState ? 'disabled' : ''} onchange="saveGroupedInput('${subAreaNameLengkap}', '${fullLabel}', this.value)" style="flex: 1; padding: 14px; background: transparent; border: none; color: white; font-size: 1rem; outline: none;">
                            <option value="">Pilih...</option>`;
                dropdownOptions.forEach(opt => {
                    html += `<option value="${opt}" ${savedValue === opt ? 'selected' : ''}>${opt}</option>`;
                });
                html += `</select>`;
            } else {
                html += `<input type="text" inputmode="decimal" ${isErrorState ? 'disabled' : ''} placeholder="0.00" value="${isErrorState ? '' : savedValue}" oninput="saveGroupedInput('${subAreaNameLengkap}', '${fullLabel}', this.value)" style="flex: 1; padding: 14px; background: transparent; border: none; color: white; font-size: 1.1rem; font-weight: 700; outline: none;">`;
            }

            html += `<div style="padding: 0 12px; background: rgba(255,255,255,0.05); color: ${config.themeColor}; font-weight: 700; font-size: 0.85rem; border-left: 2px solid rgba(148, 163, 184, 0.2); min-height: 48px; display: flex; align-items: center; justify-content: center; min-width: 60px;">${unit || '--'}</div></div>`;

            html += `
                <div class="grouped-note-container" style="display: ${isErrorState ? 'block' : 'none'}; margin-top: 10px;">
                    <input type="text" 
                           class="grouped-note-input" 
                           placeholder="Keterangan masalah/kerusakan..." 
                           value="${noteText}"
                           oninput="updateGroupedNote('${subAreaNameLengkap}', '${fullLabel}', this.value)"
                           style="width: 100%; padding: 12px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; color: #fca5a5; font-size: 0.9rem; outline: none;">
                </div>
            `;
            
            html += `</div>`;
        });
        
        html += `</div></details>`;
    });

    container.innerHTML = html;
    navigateTo('panelSTGScreen');
}

function saveGroupedInput(subAreaName, fullLabel, value) {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    
    if (!univCurrentInput[subAreaName]) {
        univCurrentInput[subAreaName] = {};
    }
    
    // PERBAIKAN 1: Gunakan parameter 'value', bukan 'valueToSave'
    if (value.trim() !== '') {
        univCurrentInput[subAreaName][fullLabel] = value;
    } else {
        // PERBAIKAN 2: Gunakan 'subAreaName', bukan 'activeUnivArea'
        delete univCurrentInput[subAreaName][fullLabel];
    }
    
    // UPDATE STATE GLOBAL JUGA
    window.activeDrafts[activeLogsheetType] = univCurrentInput;
    
    localStorage.setItem(config.draftKey, JSON.stringify(univCurrentInput));

    // =========================================================
    // FITUR BARU: AUTO-COLLAPSE (TUTUP OTOMATIS) DIPERBAIKI
    // =========================================================
    // PERBAIKAN 3: Logika ini harus berada DI DALAM fungsi saveGroupedInput
    const paramsList = config.areas[subAreaName];

    // 1. CEK PINTAR: Pastikan TIDAK ADA parameter yang terlewat (kosong) di atasnya
    const isAllFilled = paramsList.every(param =>
        univCurrentInput[subAreaName] &&
        univCurrentInput[subAreaName][param] &&
        univCurrentInput[subAreaName][param].toString().trim() !== ''
    );

    // 2. Hanya pindah otomatis JIKA mengisi baris terakhir DAN semua data di grup ini sudah lengkap
    if (fullLabel === paramsList[paramsList.length - 1] && isAllFilled && value.trim() !== '') {
        
        // 3. WAKTU JEDA DIPERLAMBAT (2000 = 2 detik)
        setTimeout(() => {
            // Ambil semua kotak grup (<details>) di layar saat ini
            const allDetails = document.querySelectorAll('#panelSTGContent details');
            let currentIndex = -1;

            // 👇 UBAH CARA PENCARIAN MENJADI LEBIH AKURAT 👇
            allDetails.forEach((detail, index) => {
                if (detail.getAttribute('data-area') === subAreaName) {
                    currentIndex = index;
                }
            });
            // Eksekusi Tutup & Buka Otomatis
            if (currentIndex !== -1) {
                // Tutup grup yang sudah selesai ini
                allDetails[currentIndex].removeAttribute('open');

                // Buka grup selanjutnya (jika masih ada di bawahnya)
                const nextDetail = allDetails[currentIndex + 1];
                if (nextDetail) {
                    nextDetail.setAttribute('open', '');
                    
                    // Gulir layar otomatis (Auto-Scroll) ke grup baru
                    nextDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Fokuskan kursor ke isian pertama di grup baru
                    const nextInput = nextDetail.querySelector('input, select');
                    if (nextInput) {
                        setTimeout(() => nextInput.focus(), 300);
                    }
                }
            }
        }, 2000); 
    }
}

/**
 * Fungsi Pintasan ERROR dengan Toggle Saklar & Input Teks
 */
function setGroupedError(subArea, label, btnElement) {
    const container = btnElement.closest('.form-field');
    
    // 1. Cari dulu input angkanya (Tukar urutannya ke atas)
    const mainInput = container.querySelector('input:not(.grouped-note-input), select');
    
    // 2. Ambil langsung bungkusnya (parentElement) agar tidak salah target div
    const mainWrapper = mainInput.parentElement; 
    
    const noteContainer = container.querySelector('.grouped-note-container');
    const noteInput = container.querySelector('.grouped-note-input');
    
    // Cek status saklar saat ini
    const isNowError = btnElement.getAttribute('data-active') === 'true';
    
    if (!isNowError) {
        // AKTIFKAN MODE ERROR
        btnElement.setAttribute('data-active', 'true');
        btnElement.style.background = "#ef4444";
        btnElement.style.color = "white";
        
        mainInput.value = ""; 
        mainInput.disabled = true;
        mainWrapper.style.opacity = "0.3"; // <--- Sekarang yang buram 100% benar kotak inputnya
        
        noteContainer.style.display = "block";
        saveGroupedInput(subArea, label, "ERROR"); // Simpan status awal
        setTimeout(() => noteInput.focus(), 150);
    } else {
        // MATIKAN MODE ERROR (KEMBALI NORMAL)
        btnElement.setAttribute('data-active', 'false');
        btnElement.style.background = "rgba(239, 68, 68, 0.1)";
        btnElement.style.color = "#f87171";
        
        mainInput.disabled = false;
        mainWrapper.style.opacity = "1";
        
        noteContainer.style.display = "none";
        noteInput.value = "";
        saveGroupedInput(subArea, label, ""); // Kosongkan data
        setTimeout(() => mainInput.focus(), 150);
    }
}
/**
 * Helper untuk menggabungkan kata "ERROR" dengan catatan teks
 */
function updateGroupedNote(subArea, label, noteValue) {
    saveGroupedInput(subArea, label, "ERROR\n" + noteValue);
}
/**
 * FUNGSI BARU: Mengirim foto di latar belakang tanpa mengganggu operator
 */
async function uploadPhotoInBackground(areaName, paramLabel, base64Data) {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const shortName = paramLabel.split(' (')[0]; 
    
    // 1. Tampilkan Notifikasi Toast (UBAH KE showTemporaryToast)
    showTemporaryToast(`⬆️ Mengirim foto ${shortName}...`, 'info'); // Muncul sekejap lalu hilang
    
    const isStillOnScreen = () => {
        return activeUnivArea === areaName && config.areas[activeUnivArea][activeUnivIdx] === paramLabel;
    };

    if (isStillOnScreen()) {
        const badge = document.getElementById('univParamPhotoBadge');
        if (badge) {
            badge.textContent = '⏳ MENGIRIM...';
            badge.style.backgroundColor = '#f59e0b'; 
        }
    }

    try {
        const photoPayload = {
            type: 'LOGSHEET_PHOTO',
            parentType: config.submitType,
            Operator: currentUser ? currentUser.name : 'Unknown',
            photoKey: `${areaName}__${paramLabel}`,
            photo: base64Data,
            timestamp: new Date().toISOString(),
            targetFileId: config.spreadsheetId
        };

        // Kirim ke Server GAS
        const response = await fetch(GAS_URL, {
            method: 'POST', 
            // Hapus mode: 'no-cors' dan headers
            body: JSON.stringify(photoPayload)
        });
        
        const res = await response.json();
        if (!res.success) throw new Error("Gagal upload background");

        if (univParamPhotos[areaName] && univParamPhotos[areaName][paramLabel]) {
            univParamPhotos[areaName][paramLabel] = 'UPLOADED_BACKGROUND';
            localStorage.setItem(config.photoKey, JSON.stringify(univParamPhotos)); 
        }

        // 2. Notifikasi Sukses (UBAH KE showTemporaryToast)
        showTemporaryToast(`✅ Foto ${shortName} aman!`, 'success'); // Muncul sekejap lalu hilang

        if (isStillOnScreen()) {
            const badge = document.getElementById('univParamPhotoBadge');
            if (badge) {
                badge.textContent = '✓ TERKIRIM';
                badge.style.backgroundColor = '#10b981'; 
            }
            loadUnivParamPhotoForCurrentStep();
        }

    } catch (error) {
        console.error('Background upload gagal:', error);
        
        // 3. Notifikasi Peringatan (UBAH KE showTemporaryToast)
        showTemporaryToast(`📶 Sinyal lemah. Foto ${shortName} ditunda.`, 'warning', 3500); // Tampil sedikit lebih lama (3.5 detik)
        
        if (isStillOnScreen()) {
            const badge = document.getElementById('univParamPhotoBadge');
            if (badge) {
                badge.textContent = '⚠️ TERTUNDA';
                badge.style.backgroundColor = '#ef4444'; 
            }
        }
    }
}
// ==========================================
// SYSTEM CHECKLIST RUTINAN (FRONTEND)
// ==========================================

async function loadRoutineChecklist() {
    // 👇 1. PAGAR ANTI-GAGAL (RACE CONDITION FIX) 👇
    if (typeof currentUser === 'undefined' || !currentUser || !currentUser.department) {
        console.warn("⏳ Data user belum siap. PWA menunggu 1 detik...");
        setTimeout(loadRoutineChecklist, 1000); 
        return; 
    }

    const container = document.getElementById('jobListContainer');
    const dateEl = document.getElementById('jobDate');
    
    if (!container) return;
    
    const today = new Date();
    const hariIni = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(today);
    if (dateEl) {
        dateEl.textContent = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(today);
    }
    
    container.innerHTML = `
        <div class="job-loading">
            <div class="spinner"></div>
            <span>Memuat data rutinan...</span>
        </div>`;
    
    try {
        const jamSekarang = today.getHours(); 
        
        let currentShift = 'malam'; // Default malam (23.00 - 06.59)
        if (jamSekarang >= 7 && jamSekarang < 15) {
            currentShift = 'pagi';
        } else if (jamSekarang >= 15 && jamSekarang < 23) {
            currentShift = 'sore';
        }

        let currentUnit = 'ALL';
        let dept = String(currentUser.department).toUpperCase();
            
        if (dept.includes('UTILITAS') || dept.includes('UTIL')) {
            currentUnit = 'UTILITAS';
        } else if (dept.includes('MELTER') || dept.includes('BELERANG')) {
            currentUnit = 'MELTER';
        } else if (dept.includes('SULFAT') || dept.includes('SA')) {
            currentUnit = 'SA';
        } else {
            currentUnit = dept; 
        }
        
        console.log(`🔍 [DEBUG PWA] Mengirim Request -> Unit: ${currentUnit} | Shift: ${currentShift}`);

        const url = `${GAS_URL}?action=getDailyRoutine&day=${hariIni}&unit=${encodeURIComponent(currentUnit)}&shift=${currentShift}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.tasks && result.tasks.length > 0) {
            
            const todayString = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const memoryKey = 'completed_routines_' + todayString;
            const completedTasks = JSON.parse(localStorage.getItem(memoryKey) || '[]');
            
            const pendingTasks = result.tasks.filter(t => !completedTasks.includes(t.tugas));

            if (pendingTasks.length > 0) {
                const uniquePositions = [...new Set(pendingTasks.map(t => t.posisi))].filter(p => p !== 'ALL' && p !== '');

                let html = `
                    <div style="display: flex; gap: 8px; margin-bottom: 15px; justify-content: center; overflow-x: auto; padding-bottom: 5px;">
                        <button onclick="filterRutinan('ALL', this)" class="btn-filter-rutin active" style="padding: 6px 16px; border-radius: 20px; border: none; background: #3b82f6; color: white; cursor: pointer; font-size: 0.8rem; font-weight: bold; white-space: nowrap;">Semua Tugas</button>
                `;

                const warnaTombol = ['#8b5cf6', '#10b981', '#f59e0b', '#ec4899']; 
                uniquePositions.forEach((pos, idx) => {
                    let color = warnaTombol[idx % warnaTombol.length];
                    html += `<button onclick="filterRutinan('${pos}', this)" class="btn-filter-rutin" style="padding: 6px 16px; border-radius: 20px; border: 1px solid ${color}; background: white; color: ${color}; cursor: pointer; font-size: 0.8rem; font-weight: bold; white-space: nowrap;" data-color="${color}">${pos}</button>`;
                });

                html += `</div><div id="rutinanListWrap">`;

                // 👇 2. RENDER KARTU TUGAS PREMIUM 👇
                html += pendingTasks.map((t, index) => {
                    let namaTugasAsli = t.tugas;
                    let ekstraHTML = '';
                    let hasDropdown = false;
                    let hasFoto = false;
                    let dropdownId = `dd_rutin_${index}`;
                    let fotoId = `foto_rutin_${index}`;

                    // EKSTRAK DROPDOWN
                    const matchDD = namaTugasAsli.match(/\[([^FOTO].*?)\]/);
                    if (matchDD && !matchDD[1].includes('FOTO')) {
                        hasDropdown = true;
                        const optionsArray = matchDD[1].split(',').map(opt => opt.trim());
                        namaTugasAsli = namaTugasAsli.replace(matchDD[0], '').trim(); 

                        ekstraHTML += `
                            <div style="margin-top: 12px;" onclick="event.stopPropagation()">
                                <select id="${dropdownId}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(15, 23, 42, 0.6); color: white; font-size: 0.85rem; outline: none; appearance: none;">
                                    <option value="" disabled selected style="color: #94a3b8;">-- Pilih Status --</option>
                                    ${optionsArray.map(opt => `<option value="${opt}" style="background: #1e293b; color: white;">${opt}</option>`).join('')}
                                </select>
                            </div>
                        `;
                    }

                    // 👇 UBAH KOTAK FOTO MENJADI PREMIUM 👇
                    if (namaTugasAsli.includes('[FOTO]')) {
                        hasFoto = true;
                        namaTugasAsli = namaTugasAsli.replace('[FOTO]', '').trim();
                        
                        ekstraHTML += `
                            <div class="job-upload-box" onclick="event.stopPropagation()">
                                <div class="job-upload-warning">
                                    <span>📸</span> Wajib Upload Bukti Foto!
                                </div>
                                <label class="btn-custom-upload" for="${fotoId}">
                                    Pilih File
                                </label>
                                <input type="file" id="${fotoId}" class="hidden-file-input" accept="image/*" capture="environment">
                            </div>
                        `;
                    }
                    // 👆 ========================================== 👆

                    const safeTugas = namaTugasAsli.replace(/'/g, "\\'"); 
                    const safeArea = t.area.replace(/'/g, "\\'"); // 👈 Data ASLI tetap disimpan untuk dikirim!
                    const safePosisi = (t.posisi || 'ALL').replace(/'/g, "\\'");
                    
                    // 👇 MESIN PENCUCI NAMA AREA (Hanya Untuk Tampilan) 👇
                    let areaBersih = t.area.replace(/LOGSHEET_/gi, '').replace(/_/g, ' ').trim();
                    // 👆 ============================================== 👆

                    const paramDropdown = hasDropdown ? `'${dropdownId}'` : `null`;
                    const paramFoto = hasFoto ? `'${fotoId}'` : `null`;
                    
                    // KARTU UTAMA PREMIUM
                    return `
                        <div class="premium-job-card" id="routine_card_${index}" data-posisi="${safePosisi}" onclick="completeTask(this, '${safeTugas}', '${safeArea}', ${paramDropdown}, ${paramFoto})">
                            <div class="job-header-flex">
                                <div class="job-title-group">
                                    <h3>${namaTugasAsli}</h3>
                                    <span class="job-area-badge">📍 Area: ${areaBersih}</span>
                                </div>
                                <div class="check-icon" style="font-size: 1.5rem; opacity: 0.5;">🔘</div>
                            </div>
                            ${ekstraHTML}
                        </div>
                    `;
                }).join('');
                
                html += `</div>`;
                container.innerHTML = html;
            } else {
                container.innerHTML = `<div style="text-align:center; color:#10b981; font-style:italic; padding:20px; font-weight:bold;">🎉 Semua tugas rutin Shift ${currentShift.toUpperCase()} selesai!</div>`;
            }

        } else {
            container.innerHTML = `<div style="text-align:center; color:#94a3b8; font-style:italic; padding:20px;">🎉 Tidak ada jadwal rutinan untuk Shift ${currentShift.toUpperCase()}.</div>`;
        }
    } catch (error) {
        console.error("Gagal memuat tugas rutin:", error);
        container.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">Koneksi terputus. Gagal memuat tugas.</div>`;
    }
}

//===================================================//
async function completeTask(element, tugasName, targetArea, dropdownId, fotoId) {
    if (!currentUser || !currentUser.name) {
        if (typeof showTemporaryToast === 'function') showTemporaryToast('⚠️ Silakan login terlebih dahulu.', 'warning');
        return;
    }

    let finalTugasName = tugasName;
    let fotoBase64 = null; 
    let mimeType = '';
    let fileName = '';

    // 1. VALIDASI DROPDOWN
    if (dropdownId) {
        const ddElement = document.getElementById(dropdownId);
        if (ddElement && ddElement.value === "") {
            ddElement.style.border = '2px solid #ef4444';
            setTimeout(() => { ddElement.style.border = '1px solid #cbd5e1'; }, 1000);
            if (typeof showTemporaryToast === 'function') showTemporaryToast('⚠️ Wajib pilih status dari dropdown!', 'error');
            return; 
        }
        if (ddElement && ddElement.value !== "") finalTugasName = `${tugasName} (${ddElement.value})`;
    }

    // 2. VALIDASI WAJIB FOTO
    if (fotoId) {
        const fileInput = document.getElementById(fotoId);
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            fileInput.parentElement.style.background = '#fecaca';
            setTimeout(() => { fileInput.parentElement.style.background = '#fff1f2'; }, 1000);
            if (typeof showTemporaryToast === 'function') showTemporaryToast('📸 Bukti foto wajib dilampirkan!', 'error');
            return; 
        }
        
        const file = fileInput.files[0];
        if (typeof showTemporaryToast === 'function') showTemporaryToast('⏳ Mengompres foto...', 'info');
        
        const tempImageUrl = URL.createObjectURL(file);
        
        try {
            const result = await compressImage(tempImageUrl, {
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.7, 
                type: 'image/jpeg'
            });
            
            URL.revokeObjectURL(tempImageUrl);
            
            fotoBase64 = result.dataUrl.split(',')[1];
            mimeType = 'image/jpeg';
            fileName = file.name;
            
        } catch (err) {
            URL.revokeObjectURL(tempImageUrl);
            if (typeof showTemporaryToast === 'function') showTemporaryToast('❌ Gagal memproses foto!', 'error');
            console.error("Error Kompresi:", err);
            return; 
        }
        
        finalTugasName = `📸 ${finalTugasName}`; 
    }

    element.onclick = null; 
    const icon = element.querySelector('.check-icon');
    if (icon) icon.innerHTML = '✅';

    const payload = {
        type: 'CHECKLIST_ROUTINE',
        tugas: finalTugasName, 
        targetArea: targetArea,
        Operator: currentUser.name,
        photoBase64: fotoBase64,     
        photoMimeType: mimeType,     
        photoName: fileName,         
        Jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    // 👇 JURUS 2: INSTANT UI UPDATE (Tanpa Nunggu Server) 👇
    
    // 1. Langsung hilangkan kartu dari layar saat itu juga!
    element.classList.add('completed');
    element.style.display = 'none'; 

    // 2. Cek apakah ini tugas terakhir?
    const sisaTugas = document.querySelectorAll('.premium-job-card:not([style*="display: none"])').length;
    if (sisaTugas === 0) {
        const jamSekarang = new Date().getHours();
        let currentShift = 'MALAM';
        if (jamSekarang >= 7 && jamSekarang < 15) currentShift = 'PAGI';
        else if (jamSekarang >= 15 && jamSekarang < 23) currentShift = 'SORE';

        const container = document.getElementById('jobListContainer');
        if (container) {
            container.innerHTML = `<div style="text-align:center; color:#10b981; font-style:italic; padding:20px; font-weight:bold; animation: fadeIn 0.5s ease-in-out;">🎉 Semua tugas rutin Shift ${currentShift} selesai!</div>`;
        }
    }

    // 3. Catat di memori HP agar tidak muncul lagi kalau di-refresh
    const today = new Date();
    const todayString = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const memoryKey = 'completed_routines_' + todayString;
    
    let completedTasks = JSON.parse(localStorage.getItem(memoryKey) || '[]');
    if (!completedTasks.includes(tugasName)) {
        completedTasks.push(tugasName);
        localStorage.setItem(memoryKey, JSON.stringify(completedTasks)); 
    }

    if (typeof showTemporaryToast === 'function') showTemporaryToast('✅ Tugas Selesai!', 'success');

    // 👇 4. TEMBAKAN SILUMAN KE SERVER (FIRE & FORGET) 👇
    // Perhatikan: Tidak ada kata "await" di sini!
    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
        if (!res.success) throw new Error("Server menolak");
        console.log("✅ Background upload rutinan sukses!");
    })
    .catch(error => {
        console.warn('⚠️ Gagal mengirim rutinan (Sinyal), masuk ke antrean offline.');
        
        // Simpan ke antrean offline dengan nama awalan "offline_" agar otomatis terdeteksi Badge Merah
        let pendingRutinan = JSON.parse(localStorage.getItem('offline_rutinan') || '[]');
        pendingRutinan.push(payload);
        localStorage.setItem('offline_rutinan', JSON.stringify(pendingRutinan));
        
        // Panggil fungsi bawaanmu untuk mengupdate angka di Badge Merah PWA
        if (typeof checkOfflineData === 'function') checkOfflineData();
    });
    // 👆 ============================================================== 👆
}
// ==========================================
// FUNGSI FILTER RUTINAN (DINAMIS)
// ==========================================
window.filterRutinan = function(kategori, btnElement) {
    // 1. Reset warna semua tombol
    document.querySelectorAll('.btn-filter-rutin').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = btn.getAttribute('data-color') || '#3b82f6';
        if (btn.textContent === 'Semua Tugas') {
            btn.style.border = '1px solid #3b82f6';
            btn.style.color = '#3b82f6';
        }
        btn.classList.remove('active');
    });
    
    // 2. Warnai tombol yang sedang diklik
    btnElement.style.background = btnElement.getAttribute('data-color') || '#3b82f6';
    btnElement.style.color = 'white';
    btnElement.classList.add('active');

    // 3. Tampilkan/Sembunyikan Kartu Tugas sesuai posisi
    const semuaKartu = document.querySelectorAll('.premium-job-card');

    semuaKartu.forEach(kartu => {
        const pos = kartu.getAttribute('data-posisi');
        if (kategori === 'ALL') {
            kartu.style.display = 'flex';
        } else {
            // Tampilkan jika posisinya sama, atau jika tugas itu milik ALL (umum)
            if (pos === kategori || pos === 'ALL') {
                kartu.style.display = 'flex';
            } else {
                kartu.style.display = 'none';
            }
        }
    });
};
