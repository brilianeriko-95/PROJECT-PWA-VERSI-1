/* ============================================
   TURBINE LOGSHEET PRO - LOGSHEET & CT MODULE
   ============================================ */

// ============================================
// UNIVERSAL FETCH LAST DATA MODULE (INSTANT LOAD)
// ============================================

// Variabel global untuk menyimpan data shift sebelumnya
let univLastData = {};

function fetchUniversalLastData(type) {
    // 1. JALUR KILAT: Langsung ambil dari memori HP (Cache) dalam 0.1 detik
    const cachedLastData = localStorage.getItem('last_data_' + type);
    if (cachedLastData) {
        univLastData = JSON.parse(cachedLastData);
    } else {
        univLastData = {}; // Kosongkan jika baru pertama kali buka
    }
    
    // 2. Langsung buka layar Logsheet TANPA LOADING!
    openUniversalLogsheet(type);
    
    // 3. CURI START: Diam-diam minta data terbaru ke server untuk shift berikutnya
    silentFetchLastData(type);
}

// Mesin pekerja di latar belakang (Background Worker)
function silentFetchLastData(type) {
    const callbackName = 'jsonp_silent_' + type + '_' + Date.now();
    
    window[callbackName] = (data) => {
        if (data.success) {
            // Simpan hasil tarikan terbaru ke memori HP
            localStorage.setItem('last_data_' + type, JSON.stringify(data.data));
            console.log(`[Background Sync] Data riwayat ${type} berhasil diperbarui.`);
        }
        cleanupJSONP(callbackName);
    };

    // =======================================================================
    // AUTO-PILOT ROUTING (PENGGANTI IF-ELSE MANUAL)
    // =======================================================================
    let actionParam = '';
    if (type === 'TURBINE') {
        // Pengecualian khusus Turbine lama karena format nama sheet di backend berbeda
        actionParam = '&action=getLastTurbine'; 
    } else {
        // AUTO-PILOT untuk semua menu: CT, 1300, 1100_1200, PANEL_STG, GENSET, dll.
        actionParam = '&action=getLast' + type; 
    }
    // =======================================================================
    
    const script = document.createElement('script');
    script.src = `${GAS_URL}?callback=${callbackName}${actionParam}`;
    
    // === TAMBAHAN VARIABEL TIMEOUT AGAR TIDAK ERROR (Lihat Bug 2) ===
    const timeout = setTimeout(() => {
        cleanupJSONP(callbackName);
        console.warn(`[Background Sync] Timeout saat menarik data ${type}.`);
    }, 15000);
    // ================================================================

    script.onerror = () => {
        clearTimeout(timeout);
        cleanupJSONP(callbackName);
        // Hapus alert error di sini, karena background sync harus diam-diam!
        console.warn(`[Background Sync] Gagal menarik data ${type}.`);
    };
    
    document.body.appendChild(script);
} // <--- ✅ PINDAHKAN KURUNG KURAWAL PENUTUP KE SINI!

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
function openUniversalLogsheet(type) {
    const config = LOGSHEET_CONFIG[type];
    
    if (!config) {
        console.error("Wah, tipe logsheet " + type + " tidak ditemukan di config!");
        return;
    }

    // 1. Set tipe logsheet yang sedang aktif
    activeLogsheetType = type;
   
    // === INTERCEPT UNTUK SEMUA LOGSHEET BERBASIS GRUP/FOLDER ===
    if (config.groups) {
        openGroupedLogsheet();
        return; 
    }
    // 2. Ubah Judul & Info User di Header
    document.getElementById('univHeaderTitle').textContent = config.title;
    document.getElementById('univAreaListUser').textContent = (currentUser && currentUser.name) ? currentUser.name : 'Operator';

    // 3. Ambil Draf dari LocalStorage (Agar aman saat offline/refresh)
    const savedDraft = localStorage.getItem(config.draftKey);
    if (savedDraft) {
        univCurrentInput = JSON.parse(savedDraft);
    } else {
        univCurrentInput = {}; // Mulai kosong jika tidak ada draf
    }

    // 4. Render Daftar Area & Progress-nya
    renderUniversalAreaList();

    // 5. Tampilkan Layar
    navigateTo('universalAreaListScreen');
}

/**
 * Fungsi untuk merender daftar kotak Area secara otomatis (PREMIUM UI)
 */
function renderUniversalAreaList() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const listContainer = document.getElementById('univAreaList');
    if (!listContainer) return;
    
    let html = '';
    let totalParams = 0;
    let filledParams = 0;

    Object.entries(config.areas).forEach(([areaName, paramsList]) => {
        let areaFilled = 0;
        const areaTotal = paramsList.length;
        totalParams += areaTotal;

        paramsList.forEach(fullLabel => {
            if (univCurrentInput[areaName] && 
                univCurrentInput[areaName][fullLabel] !== undefined && 
                univCurrentInput[areaName][fullLabel] !== '') {
                areaFilled++;
                filledParams++;
            }
        });

        const isComplete = areaFilled === areaTotal && areaTotal > 0;
        const progressPercent = areaTotal === 0 ? 0 : Math.round((areaFilled / areaTotal) * 100);
        
        // Cek apakah ada status abnormal (Alat Rusak / Belum Ada)
        const hasAbnormal = paramsList.some(fullLabel => {
            const val = (univCurrentInput[areaName] && univCurrentInput[areaName][fullLabel]) || '';
            const firstLine = val.split('\n')[0];
            return ['ERROR', 'MAINTENANCE', 'NOT_INSTALLED', 'OFF'].includes(firstLine);
        });

        // Atur status visual (Ikon & Warna Premium)
        let statusIcon = '📝';
        let iconBg = `${config.themeColor}25`; // Transparansi 25%
        let iconColor = config.themeColor;
        let ringColor = `${config.themeColor}40`;
        let themeColor = config.themeColor;

        if (isComplete) {
            statusIcon = '✅';
            iconBg = 'rgba(16, 185, 129, 0.15)'; // Hijau Emerald
            iconColor = '#10b981';
            ringColor = 'rgba(16, 185, 129, 0.3)';
            themeColor = '#10b981';
        } else if (areaFilled > 0) {
            statusIcon = '⏳';
        }

        if (hasAbnormal) {
            iconBg = 'rgba(239, 68, 68, 0.15)'; // Merah
            iconColor = '#ef4444';
            ringColor = 'rgba(239, 68, 68, 0.3)';
            themeColor = '#ef4444';
        }

        // HTML KARTU PREMIUM
        html += `
            <div class="premium-area-card" onclick="openUnivAreaInput('${areaName}')" style="--theme-color: ${themeColor};">
                ${hasAbnormal ? '<div class="abnormal-pulse" style="position:absolute; top:16px; right:16px; width:12px; height:12px; background:#ef4444; border-radius:50%;"></div>' : ''}
                
                <div class="premium-area-header">
                    <div style="display: flex; align-items: center; flex: 1;">
                        <div class="premium-icon-box" style="background: ${iconBg}; color: ${iconColor}; border: 1px solid ${ringColor};">
                            ${statusIcon}
                        </div>
                        <div class="premium-area-info">
                            <h3 class="premium-area-title">${areaName}</h3>
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

    // Update Bar Progress Keseluruhan
    const overallPercent = totalParams === 0 ? 0 : Math.round((filledParams / totalParams) * 100);
    const overallPercentEl = document.getElementById('univOverallPercent');
    const overallProgressBarEl = document.getElementById('univOverallProgressBar');
    const progressTextEl = document.getElementById('univProgressText');
    
    if (overallPercentEl) overallPercentEl.textContent = `${overallPercent}%`;
    if (overallProgressBarEl) {
        overallProgressBarEl.style.width = `${overallPercent}%`;
        overallProgressBarEl.style.backgroundColor = config.themeColor;
        overallProgressBarEl.style.boxShadow = `0 0 12px ${config.themeColor}80`; // Tambahan glow pada bar utama
    }
    if (progressTextEl) progressTextEl.textContent = `${overallPercent}% Selesai`;

    // Tombol Submit
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
// ==========================================
// 6. UNIVERSAL INPUT ENGINE (CORE LOGIC)
// ==========================================

let activeUnivArea = null;
let activeUnivIdx = 0;

/**
 * Memulai pengisian parameter untuk area yang dipilih
 */
function openUnivAreaInput(areaName) {
    activeUnivArea = areaName;
    activeUnivIdx = 0;
    
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    
    // Sinkronisasi warna tema ke elemen UI
    const stepBadge = document.getElementById('univStepBadge');
    if (stepBadge) {
        stepBadge.style.color = config.themeColor;
        stepBadge.style.backgroundColor = `${config.themeColor}15`; // Transparansi 15%
        stepBadge.style.borderColor = `${config.themeColor}40`;
    }
    
    const submitBtnStep = document.getElementById('univBtnSubmitStep');
    if (submitBtnStep) {
        submitBtnStep.style.backgroundColor = config.themeColor;
        submitBtnStep.style.boxShadow = `0 4px 16px ${config.themeColor}40`;
    }

    const currentAreaNameEl = document.getElementById('univCurrentAreaName');
    if (currentAreaNameEl) {
        currentAreaNameEl.textContent = areaName;
        currentAreaNameEl.style.color = config.themeColor;
    }

    navigateTo('univParamScreen');
    showUnivStep();
}

/**
 * Menampilkan parameter aktif berdasarkan index
 */
function showUnivStep() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const paramsList = config.areas[activeUnivArea];
    const fullLabel = paramsList[activeUnivIdx];
    const total = paramsList.length;
    
    // Update Header & Counter
    document.getElementById('univStepInfo').textContent = `Step ${activeUnivIdx + 1}/${total}`;
    document.getElementById('univAreaProgress').textContent = `${activeUnivIdx + 1}/${total}`;
    
    // Parsing Nama Parameter dan Satuan
    const nameOnly = fullLabel.split(' (')[0];
    const unitMatch = fullLabel.match(/\(([^)]+)\)/);
    
    document.getElementById('univLabelInput').textContent = nameOnly;
    // --- TAMBAHAN UNTUK MENAMPILKAN LAST DATA ---
    // Cari data sebelumnya untuk parameter ini
    const lastValue = univLastData[fullLabel] || univLastData[nameOnly]; 
    const lastTime = univLastData._lastTime || '--:--'; // Ambil jam update terakhir
    
    // Kita buat/update elemen teks kecil di bawah nama parameter
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
    
    // Tampilkan nilainya beserta jam ditarik
    if (lastValue && lastValue !== '') {
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

    // Ambil data dari draft (univCurrentInput)
    let savedValue = (univCurrentInput[activeUnivArea] && univCurrentInput[activeUnivArea][fullLabel]) || '';
    
    // Jika data berupa status abnormal (ERROR/NOT_INSTALLED), jangan tampilkan di text input
    let displayValue = savedValue;
    if (['ERROR', 'NOT_INSTALLED'].includes(savedValue.split('\n')[0])) {
        displayValue = ''; 
    }

    // Render Input Field (Otomatis deteksi Select atau Text)
    const inputContainer = document.getElementById('univInputFieldContainer');
    const inputType = detectInputType(fullLabel); 

    if (inputType.type === 'select') {
        let optionsHtml = `<option value="" disabled ${!displayValue ? 'selected' : ''}>Pilih Status...</option>`;
        inputType.options.forEach(opt => {
            optionsHtml += `<option value="${opt}" ${displayValue === opt ? 'selected' : ''}>${opt}</option>`;
        });
        inputContainer.innerHTML = `<select id="univValInput" class="status-select" style="width:100%; border:none; background:transparent; color:white; font-size:1.4rem; font-weight:700;">${optionsHtml}</select>`;
    } else {
        inputContainer.innerHTML = `<input type="text" id="univValInput" inputmode="decimal" placeholder="0.00" value="${displayValue}" autocomplete="off" style="width:100%; border:none; background:transparent; color:white; font-size:1.6rem; font-weight:700; outline:none;">`;
    }

    // Load Status Abnormal (Checkbox)
    loadUnivAbnormalStatus(fullLabel);
    renderUnivProgressDots();
   // (Masukkan ke dalam fungsi showUnivStep() yang ada di JS Anda)
    loadUnivParamPhotoForCurrentStep();
   
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
    const paramsList = config.areas[activeUnivArea];
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
    
    // Simpan ke LocalStorage sesuai logsheet yang aktif
    localStorage.setItem(config.draftKey, JSON.stringify(univCurrentInput));
}

/**
 * Navigasi ke parameter selanjutnya
 */
function nextUnivStep() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    saveUnivStep();
    
    if (activeUnivIdx < config.areas[activeUnivArea].length - 1) {
        activeUnivIdx++;
        showUnivStep();
    } else {
        showCustomAlert(`Area ${activeUnivArea} selesai!`, 'success');
        setTimeout(() => {
            renderUniversalAreaList();
            navigateTo('universalAreaListScreen');
        }, 1200);
    }
}

/**
 * Navigasi kembali
 */
function prevUnivStep(forceBack = false) {
    saveUnivStep();
    if (!forceBack && activeUnivIdx > 0) {
        activeUnivIdx--;
        showUnivStep();
    } else {
        renderUniversalAreaList();
        navigateTo('universalAreaListScreen');
    }
}

/**
 * Logika Checkbox Status Abnormal (Universal)
 */
function handleUnivStatusChange(checkbox) {
    const noteContainer = document.getElementById('univStatusNoteContainer');
    const valInput = document.getElementById('univValInput');
    
    // Matikan checkbox lain (radio-like behavior)
    document.querySelectorAll('input[name="univParamStatus"]').forEach(cb => {
        if (cb !== checkbox) cb.checked = false;
        cb.closest('.status-chip').classList.toggle('active', cb.checked);
    });

    checkbox.closest('.status-chip').classList.toggle('active', checkbox.checked);

    if (checkbox.checked) {
        noteContainer.style.display = 'block';
        if (valInput) {
            valInput.disabled = true;
            valInput.style.opacity = '0.3';
        }
    } else {
        noteContainer.style.display = 'none';
        if (valInput) {
            valInput.disabled = false;
            valInput.style.opacity = '1';
        }
    }
}

function loadUnivAbnormalStatus(fullLabel) {
    const savedValue = (univCurrentInput[activeUnivArea] && univCurrentInput[activeUnivArea][fullLabel]) || '';
    const lines = savedValue.split('\n');
    const statusPart = lines[0];
    const notePart = lines[1] || '';
    
    const checkboxes = document.querySelectorAll('input[name="univParamStatus"]');
    const noteContainer = document.getElementById('univStatusNoteContainer');
    const noteInput = document.getElementById('univStatusNote');
    const valInput = document.getElementById('univValInput');

    let foundStatus = false;
    checkboxes.forEach(cb => {
        cb.checked = (cb.value === statusPart);
        cb.closest('.status-chip').classList.toggle('active', cb.checked);
        if (cb.checked) foundStatus = true;
    });

    if (foundStatus) {
        noteContainer.style.display = 'block';
        noteInput.value = notePart;
        if (valInput) {
            valInput.disabled = true;
            valInput.style.opacity = '0.3';
        }
    } else {
        noteContainer.style.display = 'none';
        noteInput.value = '';
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
    const params = config.areas[activeUnivArea];
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
    
    if (file.size > 10 * 1024 * 1024) {
        showCustomAlert('Ukuran file terlalu besar (>10MB).', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const originalDataUrl = e.target.result;
        showCustomAlert('🔄 Mengkompresi foto...', 'info');
        
        try {
            const result = await compressImage(originalDataUrl, { maxWidth: 1600, maxHeight: 1600, quality: 0.75, type: 'image/jpeg' });
            
            univCurrentPhoto = result.dataUrl;
            if (!univParamPhotos[activeUnivArea]) univParamPhotos[activeUnivArea] = {};
            const config = LOGSHEET_CONFIG[activeLogsheetType];
            const fullLabel = config.areas[activeUnivArea][activeUnivIdx];
            
            univParamPhotos[activeUnivArea][fullLabel] = univCurrentPhoto;
            
            // Simpan draft foto
            localStorage.setItem(config.photoKey, JSON.stringify(univParamPhotos));
            
            // Render UI
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
            showCustomAlert(`✓ Foto berhasil dikompresi: ${result.compressedSize}KB`, 'success');
            
        } catch (error) {
            console.error('Kompresi gagal:', error);
            showCustomAlert('Gagal memproses foto', 'error');
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

// Menampilkan foto saat pindah parameter (ditambahkan ke dalam showUnivStep nanti)
function loadUnivParamPhotoForCurrentStep() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const fullLabel = config.areas[activeUnivArea][activeUnivIdx];
    
    // Coba load dari LocalStorage dulu jika univParamPhotos kosong
    if (Object.keys(univParamPhotos).length === 0) {
        const saved = localStorage.getItem(config.photoKey);
        if (saved) univParamPhotos = JSON.parse(saved);
    }

    univCurrentPhoto = univParamPhotos[activeUnivArea]?.[fullLabel] || null;
    
    const preview = document.getElementById('univParamPhotoPreview');
    const badge = document.getElementById('univParamPhotoBadge');
    
    if (univCurrentPhoto) {
        if (preview) preview.innerHTML = `<img src="${univCurrentPhoto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
        if (badge) {
            badge.textContent = '✓ ADA';
            badge.style.backgroundColor = config.themeColor;
            badge.style.color = 'white';
        }
    } else {
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
            badge.textContent = 'OPSIONAL';
            badge.style.backgroundColor = 'rgba(148, 163, 184, 0.15)';
            badge.style.color = '#94a3b8';
        }
    }
}

/**
 * MENGIRIM DATA KE GOOGLE SHEET SECARA UNIVERSAL
 */
async function submitUniversalLogsheet() {
    if (!requireAuth()) return;
    
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    const progress = showUploadProgress(`Mengirim ${config.title} & Foto...`);
    progress.updateText('Mengumpulkan data...');
    currentUploadController = new AbortController();
    
    // Gabungkan parameter dari semua area
    let allParameters = {};
    Object.entries(univCurrentInput).forEach(([areaName, params]) => {
        Object.entries(params).forEach(([paramName, value]) => {
            allParameters[paramName] = value;
        });
    });
    
    // Kumpulkan foto dari semua area
    let allPhotos = {};
    Object.entries(univParamPhotos).forEach(([areaName, areaPhotos]) => {
        Object.entries(areaPhotos).forEach(([paramName, photoData]) => {
            if (photoData) {
                allPhotos[`${areaName}__${paramName}`] = photoData;
            }
        });
    });
    
    const finalData = {
        type: config.submitType, // Dari Config (Misal: LOGSHEET_1300)
        Operator: currentUser ? currentUser.name : 'Unknown',
        OperatorId: currentUser ? currentUser.username : 'Unknown',
        photoCount: Object.keys(allPhotos).length,
        ...allParameters
    };
    
    // 1. Upload Foto Secara Paralel Berurutan
    if (Object.keys(allPhotos).length > 0) {
        progress.updateText(`Mengirim ${Object.keys(allPhotos).length} foto...`);
        for (const [key, photoData] of Object.entries(allPhotos)) {
            try {
                const photoPayload = {
                    type: 'LOGSHEET_PHOTO',
                    parentType: config.submitType,
                    Operator: currentUser ? currentUser.name : 'Unknown',
                    photoKey: key,
                    photo: photoData,
                    timestamp: new Date().toISOString()
                };
                await fetch(GAS_URL, {
                    method: 'POST', mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(photoPayload),
                    signal: currentUploadController.signal
                });
                await new Promise(resolve => setTimeout(resolve, 200)); // Delay agar Google Apps Script tidak error
            } catch (error) { console.warn('Error upload foto:', error); }
        }
    }
    
    // 2. Upload Data Teks
    progress.updateText('Mengirim data parameter utama...');
    try {
        await fetch(GAS_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
            signal: currentUploadController.signal
        });
        
        progress.complete();
        showCustomAlert('✓ Data Logsheet berhasil dikirim ke server!', 'success');
        
        // Bersihkan data draf karena sudah selesai dikirim
        univCurrentInput = {};
        univParamPhotos = {};
        localStorage.removeItem(config.draftKey);
        localStorage.removeItem(config.photoKey);
        
        // Kembali ke Menu Utama
        setTimeout(() => navigateTo('homeScreen'), 1500);
        
    } catch (error) {
        progress.error();
        // Simpan sebagai draf offline jika internet terputus
        let offlineData = JSON.parse(localStorage.getItem(config.offlineKey) || '[]');
        offlineData.push({...finalData, photos: allPhotos});
        localStorage.setItem(config.offlineKey, JSON.stringify(offlineData));
        setTimeout(() => showCustomAlert('Gagal mengirim. Data disimpan sementara ke memori lokal.', 'error'), 500);
    }
}

// =====================================================================
// DYNAMIC GROUPED LOGSHEET ENGINE (Untuk STG, Asam Sulfat, dll)
// =====================================================================

function openGroupedLogsheet() {
    const config = LOGSHEET_CONFIG[activeLogsheetType];
    
    document.getElementById('panelGroupTitle').textContent = config.title;
    document.getElementById('panelGroupUser').textContent = (currentUser && currentUser.name) ? currentUser.name : 'Operator';

    const savedDraft = localStorage.getItem(config.draftKey);
    univCurrentInput = savedDraft ? JSON.parse(savedDraft) : {};

    const listContainer = document.getElementById('panelGroupList');
    let html = '';
    let globalTotalParams = 0;
    let globalFilledParams = 0;

    Object.entries(config.groups).forEach(([groupName, subAreas]) => {
        let groupTotalParams = 0;
        let groupFilledParams = 0;

        subAreas.forEach(subArea => {
            const params = config.areas[subArea] || [];
            groupTotalParams += params.length;
            
            params.forEach(param => {
                if (univCurrentInput[subArea] && univCurrentInput[subArea][param] && univCurrentInput[subArea][param].toString().trim() !== '') {
                    groupFilledParams++;
                }
            });
        });

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
        // Warna tombol menyesuaikan config theme
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

    subAreas.forEach(subAreaName => {
        const paramsList = config.areas[subAreaName] || [];
        
        html += `
        <details class="form-card glass" style="margin-bottom: 16px; padding: 16px; background: rgba(30, 41, 59, 0.7); border: 1px solid ${config.themeColor}40;">
            <summary style="font-size: 1rem; font-weight: 700; color: ${config.themeColor}; cursor: pointer; outline: none; list-style-position: inside;">
                ${subAreaName}
            </summary>
            <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
        `;
        
        paramsList.forEach(fullLabel => {
            const nameOnly = fullLabel.split(' (')[0];
            const unitMatch = fullLabel.match(/\(([^)]+)\)/);
            const unit = unitMatch ? unitMatch[1] : '';
            
            const savedValue = (univCurrentInput[subAreaName] && univCurrentInput[subAreaName][fullLabel]) || '';
            
            let lastDataVal = univLastData[fullLabel] || univLastData[nameOnly] || '';
            if (typeof lastDataVal === 'object' && lastDataVal !== null) {
                lastDataVal = lastDataVal.value || '-'; 
            }
            const lastTime = univLastData._lastTime || '--:--';
            
            let lastDataHtml = lastDataVal ? `<small style="color: #94a3b8; display: block; margin-bottom: 6px;">🕒 Sblm (${lastTime}): <strong style="color: ${config.themeColor};">${lastDataVal}</strong></small>` : '';

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

            html += `
                <div class="form-field" style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 0.85rem; color: #f8fafc; margin-bottom: 4px; font-weight: 600;">
                        ${nameOnly} <span style="color: ${config.themeColor};">${unit ? `(${unit})` : ''}</span>
                    </label>
                    ${lastDataHtml}
            `;

            if (isDropdown) {
                html += `<select onchange="saveGroupedInput('${subAreaName}', '${fullLabel}', this.value)" style="width: 100%; padding: 14px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 10px; color: white; font-size: 1rem; outline: none;">
                            <option value="">Pilih status...</option>`;
                dropdownOptions.forEach(opt => {
                    const selected = savedValue === opt ? 'selected' : '';
                    html += `<option value="${opt}" ${selected}>${opt}</option>`;
                });
                html += `</select></div>`;
            } else {
                html += `<input type="number" step="any" placeholder="0.00" value="${savedValue}" oninput="saveGroupedInput('${subAreaName}', '${fullLabel}', this.value)" style="width: 100%; padding: 14px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 10px; color: white; font-size: 1rem; outline: none;"></div>`;
            }
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
    
    if (value.trim() !== '') {
        univCurrentInput[subAreaName][fullLabel] = value;
    } else {
        delete univCurrentInput[subAreaName][fullLabel];
    }
    
    localStorage.setItem(config.draftKey, JSON.stringify(univCurrentInput));
}


