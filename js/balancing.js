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
    
    // 👇 1. TAMPILKAN DATA INSTAN DARI CACHE MEMORI HP (0 Detik!)
    loadCachedBalancingData();
    
    // 👇 2. TARIK DATA DRAF YANG BELUM DIKIRIM (Menimpa cache riwayat)
    loadBalancingDraft();

    // 👇 3. SINKRONISASI DIAM-DIAM DI BACKGROUND (Tanpa Loading)
    silentFetchBalancingData();
    
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
        const colors = ['linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 'linear-gradient(135deg, #10b981 0%, #059669 100%)'];
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
        timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
}

// ============================================
// 2. DRAFT & AUTO-SAVE MANAGEMENT (UNIVERSAL)
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
        
        // Simpan ke RAM dan LocalStorage
        if (!window.activeDrafts) window.activeDrafts = {};
        window.activeDrafts['BALANCING'] = draftData;
        localStorage.setItem(config.draftKey, JSON.stringify(draftData));
        
        updateDraftStatusIndicator();
    } catch (e) {
        console.error('Error saving balancing draft:', e);
    }
}

function loadBalancingDraft() {
    try {
        const config = LOGSHEET_CONFIG['BALANCING'];
        // Cek draf di RAM dulu (window.activeDrafts), jika tidak ada cek LocalStorage
        const draftData = (window.activeDrafts && window.activeDrafts['BALANCING']) || 
                          JSON.parse(localStorage.getItem(config.draftKey));
        
        if (!draftData) return false;
        
        BALANCING_FIELDS.forEach(fieldId => {
            if (fieldId === 'balancingDate' || fieldId === 'balancingTime') return; 
            const element = document.getElementById(fieldId);
            if (element && draftData[fieldId]) {
                element.value = draftData[fieldId];
            }
        });
        
        const eksporEl = document.getElementById('eksporMW');
        if (eksporEl && eksporEl.value) handleEksporInput(eksporEl);
        calculateLPBalance();
        return true;
    } catch (e) {
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
    const config = LOGSHEET_CONFIG['BALANCING'];
    if (indicator) {
        const hasDraft = localStorage.getItem(config.draftKey) !== null;
        indicator.style.display = hasDraft ? 'flex' : 'none';
    }
}

function setupBalancingAutoSave() {
    if (window.balancingAutoSaveInterval) clearInterval(window.balancingAutoSaveInterval);
    window.balancingAutoSaveInterval = setInterval(() => {
        if (hasBalancingData()) saveBalancingDraft();
    }, 15000);
}

function hasBalancingData() {
    const fields = ['loadMW', 'fq1105', 'stgSteam'];
    return fields.some(id => {
        const el = document.getElementById(id);
        return el && el.value.trim() !== '';
    });
}

// ============================================
// 3. SMART CACHE & SERVER DATA SYNC
// ============================================

// Fungsi 1: Menyuntikkan data ke layar (Bisa dipanggil dari Cache atau Server)
function applyBalancingDataToUI(lastData) {
    const mapping = {
        'loadMW': 'Load_MW', 'eksporMW': 'Ekspor_Impor_MW', 'plnMW': 'PLN_MW',
        'ubbMW': 'UBB_MW', 'pieMW': 'PIE_MW', 'tg65MW': 'TG65_MW', 'tg66MW': 'TG66_MW',
        'gtgMW': 'GTG_MW', 'ss6500MW': 'SS6500_MW', 'ss2000Via': 'SS2000_Via',
        'activePowerMW': 'Active_Power_MW', 'reactivePowerMVAR': 'Reactive_Power_MVAR',
        'currentS': 'Current_S_A', 'voltageV': 'Voltage_V', 'hvs65l02MW': 'HVS65_L02_MW',
        'hvs65l02Current': 'HVS65_L02_Current_A', 'total3BMW': 'Total_3B_MW',
        'fq1105': 'Produksi_Steam_SA_t/h', 'stgSteam': 'STG_Steam_t/h',
        'pa2Steam': 'PA2_Steam_t/h', 'puri2Steam': 'Puri2_Steam_t/h',
        'melterSA2': 'Melter_SA2_t/h', 'ejectorSteam': 'Ejector_t/h',
        'glandSealSteam': 'Gland_Seal_t/h', 'deaeratorSteam': 'Deaerator_t/h',
        'dumpCondenser': 'Dump_Condenser_t/h', 'pcv6105': 'PCV6105_t/h',
        'pi6122': 'PI6122_kg/cm2', 'ti6112': 'TI6112_C', 'ti6146': 'TI6146_C',
        'ti6126': 'TI6126_C', 'axialDisplacement': 'Axial_Displacement_mm',
        'vi6102': 'VI6102_μm', 'te6134': 'TE6134_C', 'ctSuFan': 'CT_SU_Fan',
        'ctSuPompa': 'CT_SU_Pompa', 'ctSaFan': 'CT_SA_Fan', 'ctSaPompa': 'CT_SA_Pompa',
        'kegiatanShift': 'Kegiatan_Shift'
    };
    
    Object.entries(mapping).forEach(([htmlId, apiKey]) => {
        const el = document.getElementById(htmlId);
        // HANYA ISI kalau kotak input masih kosong (Jangan rusak ketikan draf operator)
        if (el && lastData[apiKey] !== undefined && (!el.value || el.value.trim() === '')) {
            el.value = (typeof lastData[apiKey] === 'object') ? (lastData[apiKey].value || lastData[apiKey].text || '') : lastData[apiKey];
        }
    });

    const eksporEl = document.getElementById('eksporMW');
    if (eksporEl && eksporEl.value) handleEksporInput(eksporEl);
    calculateLPBalance();
}

// Fungsi 2: Tarik dari memori lokal (Super Cepat)
function loadCachedBalancingData() {
    try {
        const cached = localStorage.getItem('last_balancing_data');
        if (cached) {
            applyBalancingDataToUI(JSON.parse(cached));
        }
    } catch(e) {
        console.warn('Cache balancing kosong.');
    }
}

// Fungsi 3: Tarik dari server diam-diam
function silentFetchBalancingData(isManual = false) {
    if (isManual) {
        if (typeof showTemporaryToast === 'function') showTemporaryToast('🔄 Sinkronisasi...', 'info');
    }

    const callbackName = 'jsonp_balancing_' + Date.now();
    window[callbackName] = (result) => {
        if (result.success && result.data) {
            // 1. Simpan ke Cache HP untuk bekal buka aplikasi berikutnya
            localStorage.setItem('last_balancing_data', JSON.stringify(result.data));
            
            // 2. Suntikkan ke layar UI
            applyBalancingDataToUI(result.data);
            
            if (isManual && typeof showTemporaryToast === 'function') {
                showTemporaryToast('✓ Riwayat balancing diperbarui', 'success');
            }
        }
        if (typeof cleanupJSONP === 'function') cleanupJSONP(callbackName);
    };
    
    const config = LOGSHEET_CONFIG['BALANCING'];
    const fileId = config ? config.spreadsheetId : '';
    
    const script = document.createElement('script');
    script.src = `${GAS_URL}?action=getLastBalancing&callback=${callbackName}&targetFileId=${fileId}&t=${Date.now()}`;
    document.body.appendChild(script);
}

// ============================================
// 4. CALCULATIONS & UI
// ============================================

function handleEksporInput(input) {
    if (!input) return;
    const val = parseFloat(input.value);
    const label = document.getElementById('eksporLabel');
    
    if (val < 0) {
        if (label) { label.textContent = 'Ekspor (MW)'; label.style.color = '#10b981'; }
        input.style.borderColor = '#10b981';
    } else if (val > 0) {
        if (label) { label.textContent = 'Impor (MW)'; label.style.color = '#f59e0b'; }
        input.style.borderColor = '#f59e0b';
    }
}

function calculateLPBalance() {
    const prod = parseFloat(document.getElementById('fq1105')?.value) || 0;
    const konsumsiIds = ['stgSteam', 'pa2Steam', 'puri2Steam', 'deaeratorSteam', 'dumpCondenser', 'pcv6105', 'melterSA2', 'ejectorSteam', 'glandSealSteam'];
    let totalCons = 0;
    konsumsiIds.forEach(id => totalCons += parseFloat(document.getElementById(id)?.value) || 0);
    
    const balance = prod - totalCons;
    
    // 1. Update Nilai Angka (Selalu Positif/Absolute)
    const display = document.getElementById('lpBalanceValue');
    if (display) display.value = Math.abs(balance).toFixed(1);
    
    // 2. Tentukan Teks dan Warna
    // Jika balance < 0 maka IMPOR (Kurang Steam), jika > 0 maka EKSPOR (Lebih Steam)
    const isImport = balance < 0;
    const statusText = isImport ? 'LPS Impor dari SU 3A (t/h)' : 'LPS Ekspor ke SU 3A (t/h)';
    const statusColor = isImport ? '#ef4444' : '#10b981'; // Merah untuk Impor, Hijau untuk Ekspor
    
    // 3. Update Label Utama
    const statusLabel = document.getElementById('lpBalanceLabel');
    if (statusLabel) {
        statusLabel.textContent = statusText;
        statusLabel.style.color = statusColor;
    }
    
    // 👇 TAMBAHAN: Update elemen "Posisi" jika ada ID 'lpBalanceStatus' di HTML 👇
    const statusBadge = document.getElementById('lpBalanceStatus'); 
    if (statusBadge) {
        statusBadge.textContent = isImport ? 'Posisi: IMPOR' : 'Posisi: EKSPOR';
        statusBadge.style.backgroundColor = statusColor + '20'; // Warna transparan 20%
        statusBadge.style.color = statusColor;
    }
    // 👆 ================================================================= 👆
    
    const totalDisplay = document.getElementById('totalKonsumsiSteam');
    if (totalDisplay) totalDisplay.textContent = totalCons.toFixed(1) + ' t/h';
    
    return balance;
}
function startRealtimeClock() {
    if (window.realtimeClockInterval) clearInterval(window.realtimeClockInterval);
    updateBalancingDateTime();
    window.realtimeClockInterval = setInterval(() => {
        const timeInput = document.getElementById('balancingTime');
        if (timeInput && document.activeElement !== timeInput) {
            const now = new Date();
            timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
    }, 10000);
}

function getEksporImporValue() {
    return parseFloat(document.getElementById('eksporMW')?.value) || 0;
}

function resetBalancingForm() {
    if (!confirm('Yakin reset form?')) return;
    clearBalancingDraft();
    BALANCING_FIELDS.forEach(fieldId => {
        if (fieldId !== 'balancingDate' && fieldId !== 'balancingTime') {
            const element = document.getElementById(fieldId);
            if (element) element.value = '';
        }
    });
    calculateLPBalance();
    showCustomAlert('Form dibersihkan.', 'success');
}

// ============================================
// 5. SUBMIT & WHATSAPP
// ============================================

function formatWhatsAppMessage(data) {
    const formatNum = (num, maxDecimals = 2) => {
        if (num === undefined || num === null || num === '' || isNaN(num)) return '-';
        const parsed = parseFloat(num);
        if (parsed === 0) return '0';
        return parsed.toLocaleString('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: maxDecimals
        });
    };
    
    const formatInt = (num) => {
        if (num === undefined || num === null || num === '' || isNaN(num)) return '-';
        return parseInt(num).toLocaleString('id-ID');
    };
    
    const now = new Date();
    const fallbackDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tglRaw = data.Tanggal || fallbackDate;
    
    const tglParts = tglRaw.split('-');
    const bulanIndo = {
        '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
        '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
        '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
    };
    
    const tglIndo = tglParts.length === 3 ? `${tglParts[2]} ${bulanIndo[tglParts[1]]} ${tglParts[0]}` : tglRaw;
    const jamSafe = data.Jam || '--:--';
    
    let message = `*Update STG 17,5 MW*\n`;
    message += `Tgl: ${tglIndo}\n`;
    message += `Jam: ${jamSafe}\n\n`;
    
    message += `*Output Power STG 17,5*\n`;
    message += `⠂ Load = ${formatNum(data.Load_MW)} MW\n`;
    message += `⠂ ${data.Ekspor_Impor_Status || 'Ekspor/Impor'} = ${formatNum(Math.abs(data.Ekspor_Impor_MW), 3)} MW\n\n`;
    
    message += `*Balance Power SCADA*\n`;
    message += `⠂ PLN = ${formatNum(data.PLN_MW)} MW\n`;
    message += `⠂ UBB = ${formatNum(data.UBB_MW)} MW\n`;
    message += `⠂ PIE = ${formatNum(data.PIE_MW)} MW\n`;
    message += `⠂ TG-65 = ${formatNum(data.TG65_MW)} MW\n`;
    message += `⠂ TG-66 = ${formatNum(data.TG66_MW)} MW\n`;
    message += `⠂ GTG = ${formatNum(data.GTG_MW)} MW\n\n`;
    
    message += `*Konsumsi Power 3B*\n`;
    message += `● SS-6500 (TR-Main 01) = ${formatNum(data.SS6500_MW, 3)} MW\n`;
    message += `● SS-2000 *Via ${data.SS2000_Via}*\n`;
    message += `  ⠂ Active power = ${formatNum(data.Active_Power_MW, 3)} MW\n`;
    message += `  ⠂ Reactive power = ${formatNum(data.Reactive_Power_MVAR, 3)} MVAR\n`;
    message += `  ⠂ Current S = ${formatNum(data.Current_S_A, 1)} A\n`;
    message += `  ⠂ Voltage = ${formatInt(data.Voltage_V)} V\n`;
    message += `  ⠂ (HVS65 L02) = ${formatNum(data.HVS65_L02_MW, 3)} MW (${formatInt(data.HVS65_L02_Current_A)} A)\n`;
    message += `● Total 3B = ${formatNum(data.Total_3B_MW, 3)} MW\n\n`;
    
    message += `*Produksi Steam SA*\n`;
    message += `⠂ FQ-1105 = ${formatNum(data['Produksi_Steam_SA_t/h'], 1)} t/h\n\n`;
    
    message += `*Konsumsi Steam 3B*\n`;
    message += `⠂ STG 17,5 = ${formatNum(data['STG_Steam_t/h'], 1)} t/h\n`;
    message += `⠂ PA2 = ${formatNum(data['PA2_Steam_t/h'], 1)} t/h\n`;
    message += `⠂ Puri2 = ${formatNum(data['Puri2_Steam_t/h'], 1)} t/h\n`;
    message += `⠂ Melter SA2 = ${formatNum(data['Melter_SA2_t/h'], 1)} t/h\n`;
    message += `⠂ Ejector = ${formatNum(data['Ejector_t/h'], 1)} t/h\n`;
    message += `⠂ Gland Seal = ${formatNum(data['Gland_Seal_t/h'], 1)} t/h\n`;
    message += `⠂ Deaerator = ${formatNum(data['Deaerator_t/h'], 1)} t/h\n`;
    message += `⠂ Dump Condenser = ${formatNum(data['Dump_Condenser_t/h'], 1)} t/h\n`;
    message += `⠂ PCV-6105 = ${formatNum(data['PCV6105_t/h'], 1)} t/h\n`;
    message += `*⠂ Total Konsumsi* = ${formatNum(data['Total_Konsumsi_Steam_t/h'], 1)} t/h\n\n`;
    
    message += `*${data.LPS_Balance_Status}* = ${formatNum(data['LPS_Balance_t/h'], 1)} t/h\n\n`;
    
    message += `*Monitoring*\n`;
    message += `⠂ Steam Extraction PI-6122 = ${formatNum(data['PI6122_kg/cm2'], 2)} kg/cm² & TI-6112 = ${formatNum(data['TI6112_C'], 1)} °C\n`;
    message += `⠂ Temp. Cooling Air Inlet (TI-6146/47) = ${formatNum(data['TI6146_C'], 2)} °C\n`;
    message += `⠂ Temp. Lube Oil (TI-6126) = ${formatNum(data['TI6126_C'], 2)} °C\n`;
    message += `⠂ Axial Displacement = ${formatNum(data['Axial_Displacement_mm'], 2)} mm (High : 0,6 mm)\n`;
    message += `⠂ Vibrasi VI-6102 = ${formatNum(data['VI6102_μm'], 2)} μm (High : 85 μm)\n`;
    message += `⠂ Temp. Journal Bearing TE-6134 = ${formatNum(data['TE6134_C'], 1)} °C (High : 115 °C)\n`;
    message += `⠂ CT SU = Fan : ${formatInt(data['CT_SU_Fan'])} & Pompa : ${formatInt(data['CT_SU_Pompa'])}\n`;
    message += `⠂ CT SA = Fan : ${formatInt(data['CT_SA_Fan'])} & Pompa : ${formatInt(data['CT_SA_Pompa'])}\n\n`;
    
    message += `*Kegiatan Shift ${data.Shift || currentShift}*\n`;
    message += data.Kegiatan_Shift || '-';
    
    return message;
}

async function submitBalancingData() {
    if (!requireAuth()) return;
    
    if (!document.getElementById('balancingDate').value || !document.getElementById('balancingTime').value) {
        updateBalancingDateTime();
    }
    
    const requiredFields = ['loadMW', 'fq1105', 'stgSteam'];
    for (let id of requiredFields) {
        const el = document.getElementById(id);
        if (!el || !el.value) {
            showCustomAlert(`Field ${id} wajib diisi!`, 'error');
            if (el) el.focus();
            return;
        }
    }
    
    const progress = showUploadProgress('Mengirim Data Balancing...');
    currentUploadController = new AbortController();
    
    const eksporValue = getEksporImporValue();
    const lpBalance = calculateLPBalance();
    const config = LOGSHEET_CONFIG['BALANCING'];
    
    // GANTI BAGIAN INI DENGAN MAPPING EKSPLISIT AGAR WHATSAPP TIDAK 'UNDEFINED'
    const balancingData = {
        type: config.submitType,
        Operator: currentUser ? currentUser.name : 'Unknown',
        Timestamp: new Date().toISOString(),
        Tanggal: document.getElementById('balancingDate')?.value || '',
        Jam: document.getElementById('balancingTime')?.value || '',
        Shift: currentShift,
        targetFileId: config.spreadsheetId,
        
        // Output Power
        'Load_MW': parseFloat(document.getElementById('loadMW')?.value) || 0,
        'Ekspor_Impor_MW': eksporValue,
        'Ekspor_Impor_Status': eksporValue > 0 ? 'Impor' : (eksporValue < 0 ? 'Ekspor' : 'Netral'),
        
        // Balance Power SCADA
        'PLN_MW': parseFloat(document.getElementById('plnMW')?.value) || 0,
        'UBB_MW': parseFloat(document.getElementById('ubbMW')?.value) || 0,
        'PIE_MW': parseFloat(document.getElementById('pieMW')?.value) || 0,
        'TG65_MW': parseFloat(document.getElementById('tg65MW')?.value) || 0,
        'TG66_MW': parseFloat(document.getElementById('tg66MW')?.value) || 0,
        'GTG_MW': parseFloat(document.getElementById('gtgMW')?.value) || 0,
        
        // Konsumsi Power 3B
        'SS6500_MW': parseFloat(document.getElementById('ss6500MW')?.value) || 0,
        'SS2000_Via': document.getElementById('ss2000Via')?.value || 'TR-Main01', // <--- PENYELAMAT UNDEFINED
        'Active_Power_MW': parseFloat(document.getElementById('activePowerMW')?.value) || 0,
        'Reactive_Power_MVAR': parseFloat(document.getElementById('reactivePowerMVAR')?.value) || 0,
        'Current_S_A': parseFloat(document.getElementById('currentS')?.value) || 0,
        'Voltage_V': parseFloat(document.getElementById('voltageV')?.value) || 0,
        'HVS65_L02_MW': parseFloat(document.getElementById('hvs65l02MW')?.value) || 0,
        'HVS65_L02_Current_A': parseFloat(document.getElementById('hvs65l02Current')?.value) || 0,
        'Total_3B_MW': parseFloat(document.getElementById('total3BMW')?.value) || 0,
        
        // Steam Section
        'Produksi_Steam_SA_t/h': parseFloat(document.getElementById('fq1105')?.value) || 0,
        'STG_Steam_t/h': parseFloat(document.getElementById('stgSteam')?.value) || 0,
        'PA2_Steam_t/h': parseFloat(document.getElementById('pa2Steam')?.value) || 0,
        'Puri2_Steam_t/h': parseFloat(document.getElementById('puri2Steam')?.value) || 0,
        'Melter_SA2_t/h': parseFloat(document.getElementById('melterSA2')?.value) || 0,
        'Ejector_t/h': parseFloat(document.getElementById('ejectorSteam')?.value) || 0,
        'Gland_Seal_t/h': parseFloat(document.getElementById('glandSealSteam')?.value) || 0,
        'Deaerator_t/h': parseFloat(document.getElementById('deaeratorSteam')?.value) || 0,
        'Dump_Condenser_t/h': parseFloat(document.getElementById('dumpCondenser')?.value) || 0,
        'PCV6105_t/h': parseFloat(document.getElementById('pcv6105')?.value) || 0,
        'Total_Konsumsi_Steam_t/h': parseFloat(document.getElementById('totalKonsumsiSteam')?.textContent) || 0,
        
        // LPS Balance
        'LPS_Balance_t/h': Math.abs(lpBalance),
        'LPS_Balance_Status': lpBalance < 0 ? 'Impor dari 3A' : 'Ekspor ke 3A',
        
        // Monitoring
        'PI6122_kg/cm2': parseFloat(document.getElementById('pi6122')?.value) || 0,
        'TI6112_C': parseFloat(document.getElementById('ti6112')?.value) || 0,
        'TI6146_C': parseFloat(document.getElementById('ti6146')?.value) || 0,
        'TI6126_C': parseFloat(document.getElementById('ti6126')?.value) || 0,
        'Axial_Displacement_mm': parseFloat(document.getElementById('axialDisplacement')?.value) || 0,
        'VI6102_μm': parseFloat(document.getElementById('vi6102')?.value) || 0,
        'TE6134_C': parseFloat(document.getElementById('te6134')?.value) || 0,
        'CT_SU_Fan': parseInt(document.getElementById('ctSuFan')?.value) || 0,
        'CT_SU_Pompa': parseInt(document.getElementById('ctSuPompa')?.value) || 0,
        'CT_SA_Fan': parseInt(document.getElementById('ctSaFan')?.value) || 0,
        'CT_SA_Pompa': parseInt(document.getElementById('ctSaPompa')?.value) || 0,
        
        'Kegiatan_Shift': document.getElementById('kegiatanShift')?.value || '-'
    };
    
    BALANCING_FIELDS.forEach(field => {
        if (balancingData[field] === undefined) {
             const el = document.getElementById(field);
             if (el) balancingData[field] = el.value;
        }
    });

    try {
        progress.updateText('Menghitung ulang balance...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        progress.updateText('Mengirim ke server...');
        
        try {
            // --- PERBAIKAN 1: Hapus mode: 'no-cors' agar bisa membaca respon server ---
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(balancingData),
                signal: currentUploadController.signal
            });
            
            // --- PERBAIKAN 2: Tangkap dan validasi balasan dari server ---
            const res = await response.json();
            if (!res.success) {
                throw new Error("Server menolak data balancing");
            }
            
            progress.complete();
            showCustomAlert('✓ Data Balancing berhasil dikirim!', 'success');
            
            // Simpan ke riwayat lokal
            let balancingHistory = JSON.parse(localStorage.getItem('balancing_history') || '[]');
            balancingHistory.push({
                ...balancingData,
                submittedAt: new Date().toISOString()
            });
            localStorage.setItem('balancing_history', JSON.stringify(balancingHistory));
            
            setTimeout(() => {
                const waMessage = encodeURIComponent(formatWhatsAppMessage(balancingData));
                
                // 1. Bersihkan draf dulu sebelum pindah
                clearBalancingDraft(); 
                
                // 2. Langsung paksa layar PWA melompat ke aplikasi WhatsApp!
                window.location.href = `https://wa.me/6281382160345?text=${waMessage}`;
                
            }, 500);
            
        } catch (error) {
            console.error('Balancing Submit Error:', error);
            progress.error();

            const offlineKey = 'offline_balancing';
            let queue = [];
            try {
                queue = JSON.parse(localStorage.getItem(offlineKey) || '[]');
            } catch(e) { queue = []; }

            queue.push({
                ...balancingData,
                photos: {} 
            });

            try {
                localStorage.setItem(offlineKey, JSON.stringify(queue));
                if (typeof checkOfflineData === 'function') checkOfflineData(); 
                showCustomAlert('Sinyal lemah! Data balancing disimpan offline.', 'warning');
                setTimeout(() => navigateTo('homeScreen'), 1500);
            } catch (storageError) {
                console.error("Gagal simpan offline:", storageError);
                queue.pop();
                localStorage.setItem(offlineKey, JSON.stringify(queue));
                showCustomAlert('MEMORI HP PENUH! Tidak bisa menyimpan offline!', 'error');
            }
        }
    } catch (outerError) {
        // 👇 INI ADALAH PENUTUP UNTUK TRY DI BARIS 511 👇
        console.error('Fatal Error:', outerError);
        if (progress) progress.error();
    }
} // <--- PENUTUP FUNGSI submitBalancingData
