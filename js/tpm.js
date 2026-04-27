/* ============================================
   TURBINE LOGSHEET PRO - TPM MODULE
   ============================================ */

// ============================================
// 0. FITUR BARU: FILTER & RENDER AREA DINAMIS
// ============================================

function renderTPMAreas() {
    const container = document.getElementById('tpmAreaListContainer');
    if (!container) return;

    const userUnit = currentUser ? currentUser.department.toUpperCase() : '';
    const userRole = currentUser ? currentUser.role : 'operator';
    
    let areasToShow = [];

    // LOGIKA FILTER:
    if (userRole === 'admin' || userRole === 'supervisor' || userRole === 'avp' || userUnit.includes('MANAJEMEN')) {
        // Admin & SPV melihat gabungan ketiganya
        areasToShow = [
            ...(TPM_CONFIG_MASTER['MELTER'] || []),
            ...(TPM_CONFIG_MASTER['SULFAT'] || []),
            ...(TPM_CONFIG_MASTER['UTILITAS'] || [])
        ];
    } else {
        // Pemisahan berdasarkan Departemen User
        if (userUnit.includes('1000') || userUnit.includes('MELTER')) {
            areasToShow = TPM_CONFIG_MASTER['MELTER'] || [];
        } else if (userUnit.includes('SULFAT') || userUnit.includes('SA')) {
            areasToShow = TPM_CONFIG_MASTER['SULFAT'] || [];
        } else {
            areasToShow = TPM_CONFIG_MASTER['UTILITAS'] || [];
        }
    }

    let html = '';
    areasToShow.forEach(area => {
        html += `
        <div class="list-item" onclick="openTPMArea('${area.name}')">
            <div class="item-icon" style="background: ${area.color}20; border: 1px solid ${area.color}50; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">
                ${area.icon}
            </div>
            <div class="item-content">
                <h4>${area.name}</h4>
                <p>Maintenance & Pengecekan</p>
            </div>
            <svg class="item-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================
// 1. UI & INITIALIZATION
// ============================================

// Gunakan variabel yang sudah dideklarasikan di state.js (Hapus kata 'let' agar tidak error)
activeTPMArea = '';
currentTPMPhoto = null;
currentTPMStatus = '';

function updateTPMUserInfo() {
    const tpmHeaderUser = document.getElementById('tpmHeaderUser');
    const tpmInputUser = document.getElementById('tpmInputUser');
    
    if (tpmHeaderUser) tpmHeaderUser.textContent = currentUser?.name || 'Operator';
    if (tpmInputUser) tpmInputUser.textContent = currentUser?.name || 'Operator';
}

function openTPMArea(areaName) {
    if (!requireAuth()) return;
    
    activeTPMArea = areaName;
    currentTPMPhoto = null;
    currentTPMStatus = '';
    
    resetTPMForm();
    
    const title = document.getElementById('tpmInputTitle');
    if (title) title.textContent = areaName;
    
    updateTPMUserInfo();
    navigateTo('tpmInputScreen');
}

function resetTPMForm() {
    const preview = document.getElementById('tpmPhotoPreview');
    const photoSection = document.getElementById('tpmPhotoSection');
    
    if (preview) {
        preview.innerHTML = `
            <div class="photo-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Ambil Foto</span>
            </div>
        `;
    }
    
    if (photoSection) photoSection.classList.remove('has-photo');
    
    const notes = document.getElementById('tpmNotes');
    const action = document.getElementById('tpmAction');
    if (notes) notes.value = '';
    if (action) action.value = '';
    
    resetTPMStatusButtons();
}

function resetTPMStatusButtons() {
    ['btnNormal', 'btnAbnormal', 'btnOff'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.className = 'status-btn';
    });
}

function selectTPMStatus(status) {
    currentTPMStatus = status;
    resetTPMStatusButtons();
    
    const buttonMap = {
        'normal': { id: 'btnNormal', class: 'active-normal' },
        'abnormal': { id: 'btnAbnormal', class: 'active-abnormal' },
        'off': { id: 'btnOff', class: 'active-off' }
    };
    
    const selected = buttonMap[status];
    if (selected) {
        const btn = document.getElementById(selected.id);
        if (btn) btn.classList.add(selected.class);
    }
    
    if ((status === 'abnormal' || status === 'off') && !currentTPMPhoto) {
        setTimeout(() => {
            showCustomAlert('⚠️ Kondisi abnormal/off wajib didokumentasikan dengan foto!', 'warning');
        }, 100);
    }
}

// ============================================
// 2. PHOTO HANDLING & COMPRESSION (ANTI-CRASH)
// ============================================

function handleTPMPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Pengaman Ukuran Ekstrem
    if (file.size > 15 * 1024 * 1024) {
        showCustomAlert('Ukuran file terlalu besar (>15MB). Pilih foto lain.', 'error');
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showCustomAlert('File harus berupa gambar.', 'error');
        event.target.value = '';
        return;
    }

    if (typeof showTemporaryToast === 'function') {
        showTemporaryToast('🔄 Memproses foto TPM...', 'info');
    }

    // 👇 PENGAMAN RAM: Gunakan ObjectURL agar HP tidak ngos-ngosan 👇
    const imageUrl = URL.createObjectURL(file);
    
    setTimeout(async () => {
        try {
            const result = await compressImage(imageUrl, {
                maxWidth: 1200, // Disamakan dengan logsheet agar ringan
                maxHeight: 1200,
                quality: 0.6,   // Kualitas 60% sudah cukup jelas untuk laporan
                type: 'image/jpeg'
            });
            
            // Bebaskan RAM
            URL.revokeObjectURL(imageUrl);
            
            currentTPMPhoto = result.dataUrl; 
            
            const preview = document.getElementById('tpmPhotoPreview');
            const photoSection = document.getElementById('tpmPhotoSection');
            
            if (preview) {
                preview.innerHTML = `
                    <div style="position: relative; width: 100%; height: 100%;">
                        <img src="${currentTPMPhoto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" alt="TPM Photo">
                        <div style="position: absolute; top: 8px; right: 8px; background: rgba(16, 185, 129, 0.9); color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; backdrop-filter: blur(4px);">
                            ${result.compressedSize}KB ↓${result.reduction}%
                        </div>
                    </div>
                `;
            }
            if (photoSection) photoSection.classList.add('has-photo');
            
            if (typeof closeAlert === 'function') closeAlert();
            
        } catch (error) {
            URL.revokeObjectURL(imageUrl);
            console.error('Kompresi TPM gagal:', error);
            showCustomAlert('Gagal memproses foto TPM. Coba lagi.', 'error');
        }
    }, 50);
    
    event.target.value = '';
}

// ============================================
// 3. SUBMIT DATA TO SERVER (FIRE & FORGET SAKTI)
// ============================================

async function submitTPMData() {
    if (!requireAuth()) return;
    
    const notes = document.getElementById('tpmNotes')?.value.trim() || '';
    const action = document.getElementById('tpmAction')?.value || '';
    
    if (!currentTPMStatus) {
        showCustomAlert('Pilih status kondisi!', 'error');
        return;
    }
    if (!currentTPMPhoto) {
        showCustomAlert('Ambil foto dokumentasi!', 'error');
        return;
    }
    
    // Tampilkan notifikasi kecil TANPA memblokir layar
    if (typeof showTemporaryToast === 'function') {
        showTemporaryToast('✅ Menyiapkan Laporan TPM...', 'info');
    }
    
    // 1. Bungkus datanya
    const tpmData = {
        type: 'TPM',
        area: activeTPMArea,
        status: currentTPMStatus,
        action: action,
        notes: notes,
        photo: currentTPMPhoto, 
        user: currentUser?.name || 'Unknown',
        unit: currentUser?.department || 'UNIT_UNKNOWN',
        timestamp: new Date().toISOString(),
        targetFileId: TPM_SPREADSHEET_ID
    };
    
    // 👇 2. SULAP INSTAN: BERSIHKAN & PINDAH LAYAR DETIK INI JUGA! 👇
    currentTPMPhoto = null;
    currentTPMStatus = '';
    resetTPMForm();
    navigateTo('tpmScreen'); // Langsung lempar operator balik ke menu utama TPM!
    
    if (typeof showTemporaryToast === 'function') {
        showTemporaryToast('☁️ TPM dikirim di latar belakang...', 'success');
    }
    
    // 👇 3. MESIN SILUMAN LATAR BELAKANG (Tanpa 'await') 👇
    fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(tpmData)
    })
    .then(response => response.json())
    .then(res => {
        if (!res.success) throw new Error("Server menolak data");
        console.log('✅ Background upload TPM sukses mendarat!');
        
        // 👇 NOTIFIKASI HIJAU SUSULAN SUDAH DITAMBAHKAN DI SINI 👇
        if (typeof showTemporaryToast === 'function') {
            showTemporaryToast('✅ Data TPM & Foto sukses mendarat!', 'success');
        }
        // 👆 ================================================== 👆
    })
    .catch(error => {
        console.warn('⚠️ Gagal kirim TPM (Sinyal Lemah):', error);

        const offlineKey = 'offline_tpm';
        let queue = [];
        try {
            queue = JSON.parse(localStorage.getItem(offlineKey) || '[]');
        } catch(e) { queue = []; }

        // PERBAIKAN: Masukkan paket data UTUH tanpa dipisah/dihapus fotonya
        queue.push(tpmData);

        try {
            localStorage.setItem(offlineKey, JSON.stringify(queue));
            if (typeof checkOfflineData === 'function') checkOfflineData(); 
            if (typeof showTemporaryToast === 'function') {
                showTemporaryToast('📶 Sinyal hilang. TPM masuk antrean Offline.', 'warning', 4000);
            }
        } catch (storageError) {
            console.error("Gagal simpan offline:", storageError);
            queue.pop(); 
            localStorage.setItem(offlineKey, JSON.stringify(queue)); 
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('MEMORI HP PENUH! TPM gagal tersimpan.', 'error');
            }
        }
    });
}
