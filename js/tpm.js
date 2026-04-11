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
    // Karena Admin sekarang departemennya "MANAJEMEN", logika ini sudah sangat aman
    if (userRole === 'admin' || userRole === 'supervisor' || userRole === 'avp' || userUnit.includes('MANAJEMEN')) {
        areasToShow = [
            ...(TPM_CONFIG_MASTER['UTILITAS'] || []), 
            ...(TPM_CONFIG_MASTER['SULFAT'] || [])
        ];
    } else {
        if (userUnit.includes('SULFAT') || userUnit.includes('SA')) {
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
// 2. PHOTO HANDLING & COMPRESSION
// ============================================

async function handleTPMPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showCustomAlert('Ukuran file terlalu besar (>10MB). Pilih foto lain.', 'error');
        event.target.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showCustomAlert('File harus berupa gambar.', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const originalDataUrl = e.target.result;
        showCustomAlert('🔄 Mengkompresi foto TPM...', 'info');
        
        try {
            const result = await compressImage(originalDataUrl, {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.8,
                type: 'image/jpeg'
            });
            
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
            
            showCustomAlert(`✓ Foto TPM dikompresi: ${result.originalSize}KB → ${result.compressedSize}KB`, 'success');
            
        } catch (error) {
            console.error('Kompresi TPM gagal:', error);
            currentTPMPhoto = originalDataUrl;
            
            const preview = document.getElementById('tpmPhotoPreview');
            const photoSection = document.getElementById('tpmPhotoSection');
            
            if (preview) {
                preview.innerHTML = `<img src="${currentTPMPhoto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" alt="TPM Photo">`;
            }
            if (photoSection) photoSection.classList.add('has-photo');
            showCustomAlert('⚠️ Foto disimpan tanpa kompresi', 'warning');
        }
    };
    reader.onerror = function() { showCustomAlert('Gagal membaca file foto.', 'error'); };
    reader.readAsDataURL(file);
    event.target.value = '';
}

// ============================================
// 3. SUBMIT DATA TO SERVER
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
    
    const progress = showUploadProgress('Mengupload TPM...');
    
    const tpmData = {
        type: 'TPM',
        area: activeTPMArea,
        status: currentTPMStatus,
        action: action,
        notes: notes,
        photo: currentTPMPhoto, // Dikirim langsung jika online
        user: currentUser?.name || 'Unknown',
        unit: currentUser?.department || 'UNIT_UNKNOWN',
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tpmData)
        });
        
        progress.complete();
        showCustomAlert('✓ Data TPM berhasil disimpan!', 'success');
        
        currentTPMPhoto = null;
        currentTPMStatus = '';
        setTimeout(() => navigateTo('tpmScreen'), 1500);
        
    } catch (error) {
        console.error('TPM Submit Error:', error);
        progress.error();

        // 👇 PERBAIKAN 2: Mencegah Payload Ganda saat Offline Sync 👇
        const offlineData = { ...tpmData };
        delete offlineData.photo; // Hapus base64 dari text body agar sync aman!

        const offlineKey = 'offline_tpm';
        let queue = JSON.parse(localStorage.getItem(offlineKey) || '[]');

        queue.push({
            ...offlineData, // Body tanpa base64 foto
            photos: { "TPM_PHOTO": currentTPMPhoto } // Foto ditaruh di keranjang terpisah
        });

        localStorage.setItem(offlineKey, JSON.stringify(queue));
        
        checkOfflineData(); 
        showCustomAlert('Gagal upload. Laporan TPM disimpan offline.', 'warning');
    }
}
