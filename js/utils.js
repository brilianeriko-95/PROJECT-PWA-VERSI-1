/* ============================================
   TURBINE LOGSHEET PRO - FRONTEND UTILITIES
   FILE: js/utils.js (UI Helpers & Modifiers)
   ============================================ */

// ============================================
// 1. CUSTOM ALERTS & TOASTS
// ============================================

function showCustomAlert(message, type = 'info') {
    const alertBox = document.getElementById('customAlert');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const iconWrapper = document.getElementById('alertIconWrapper');

    if (!alertBox || !alertMessage) {
        alert(message); // Fallback bawaan browser jika UI belum siap
        return;
    }

    alertMessage.textContent = message;
    
    // Ganti warna & icon berdasarkan tipe notifikasi
    if (type === 'success') {
        alertTitle.textContent = 'Berhasil';
        alertTitle.style.color = '#f8fafc';
        if (iconWrapper) {
            iconWrapper.innerHTML = `
                <svg viewBox="0 0 52 52" style="stroke: #10b981; stroke-width: 3; fill: none; width: 100%; height: 100%;">
                    <circle cx="26" cy="26" r="25"/>
                    <path d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>`;
        }
    } else if (type === 'error') {
        alertTitle.textContent = 'Gagal';
        alertTitle.style.color = '#ef4444';
        if (iconWrapper) {
            iconWrapper.innerHTML = `<div style="color: #ef4444; font-size: 40px; line-height: 1.2;">⚠️</div>`;
        }
    } else if (type === 'warning') {
        alertTitle.textContent = 'Perhatian';
        alertTitle.style.color = '#f59e0b';
        if (iconWrapper) {
            iconWrapper.innerHTML = `<div style="color: #f59e0b; font-size: 40px; line-height: 1.2;">⚠️</div>`;
        }
    } else {
        alertTitle.textContent = 'Informasi';
        alertTitle.style.color = '#3b82f6';
        if (iconWrapper) {
            iconWrapper.innerHTML = `<div style="color: #3b82f6; font-size: 40px; line-height: 1.2;">ℹ️</div>`;
        }
    }

    alertBox.classList.remove('hidden');
}

function closeAlert() {
    const alertBox = document.getElementById('customAlert');
    if (alertBox) alertBox.classList.add('hidden');
}

// Alias untuk showCustomAlert
function showToast(message, type) {
    showCustomAlert(message, type); 
}

// ============================================
// 2. UPLOAD PROGRESS OVERLAY (LOADING SCREEN)
// ============================================

function showUploadProgress(initialText = 'Mengirim...') {
    const overlay = document.getElementById('uploadProgressOverlay');
    const textEl = document.getElementById('uploadProgressText');
    const percentEl = document.getElementById('uploadProgressPercent');
    
    // Support dua kemungkinan ID dari versi HTML lama/baru
    const ringFill = document.getElementById('progressRingFill') || document.getElementById('uploadProgressRing');
    const cancelBtn = document.getElementById('cancelUploadBtn');
    
    if (overlay) overlay.classList.remove('hidden');
    if (textEl) textEl.textContent = initialText;
    if (percentEl) percentEl.textContent = '0%';
    if (ringFill) ringFill.style.strokeDashoffset = '339.292'; // Reset animasi ring
    if (cancelBtn) cancelBtn.style.display = 'block';

    // Reset status steps (1. Menyiapkan, 2. Mengirim, 3. Selesai)
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
        el.style.opacity = '0.4';
    });
    
    const step1 = document.getElementById('step1');
    if (step1) {
        step1.classList.add('active');
        step1.style.opacity = '1';
    }

    // Animasi Progress Bar Palsu (untuk UX visual agar tidak kaku saat nunggu respon Google)
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
        fakeProgress += Math.random() * 15;
        if (fakeProgress > 90) fakeProgress = 90; // Mentok di 90% sampai server benar-benar merespon
        
        if (percentEl) percentEl.textContent = Math.round(fakeProgress) + '%';
        if (ringFill) {
            const offset = 339.292 - (fakeProgress / 100) * 339.292;
            ringFill.style.strokeDashoffset = offset;
        }
    }, 500);

    // Kembalikan objek fungsi agar tpm.js dan logsheet.js bisa mengontrol animasi ini
    return {
        updateText: (text) => {
            if (textEl) textEl.textContent = text;
            const step2 = document.getElementById('step2');
            if (step2) {
                step2.classList.add('active');
                step2.style.opacity = '1';
            }
        },
        complete: () => {
            clearInterval(progressInterval);
            if (percentEl) percentEl.textContent = '100%';
            if (ringFill) ringFill.style.strokeDashoffset = '0';
            if (cancelBtn) cancelBtn.style.display = 'none';
            
            const step3 = document.getElementById('step3');
            if (step3) {
                step3.classList.add('active');
                step3.style.opacity = '1';
            }
            
            // Tutup overlay otomatis setelah 1 detik
            setTimeout(() => {
                if (overlay) overlay.classList.add('hidden');
            }, 1000);
        },
        error: () => {
            clearInterval(progressInterval);
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (overlay) overlay.classList.add('hidden');
        }
    };
}

function cancelUpload() {
    // Fungsi untuk membatalkan proses fetch (request ke server)
    if (typeof currentUploadController !== 'undefined' && currentUploadController) {
        currentUploadController.abort();
        showCustomAlert('Proses pengiriman dibatalkan oleh operator.', 'warning');
    }
    const overlay = document.getElementById('uploadProgressOverlay');
    if (overlay) overlay.classList.add('hidden');
}

// ============================================
// 3. IMAGE COMPRESSION (CLIENT-SIDE) - ✅ FUNGSI PENTING ANTI MEMORI PENUH
// ============================================

function compressImage(imageUrl, options = {}) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
            const maxWidth = options.maxWidth || 1200;
            const maxHeight = options.maxHeight || 1200;
            let width = img.width;
            let height = img.height;

            // Hitung rasio aspek baru
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            // Gunakan canvas untuk menggambar ulang gambar dengan ukuran lebih kecil
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Ekspor ke format JPEG dengan kualitas kompresi (0.1 - 1.0)
            const quality = options.quality || 0.6; // 60% sangat aman untuk memori HP
            const type = options.type || 'image/jpeg';
            const compressedDataUrl = canvas.toDataURL(type, quality);

            // Kalkulasi ukuran (Aman dari error Blob URL)
            const compressedSize = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
            const originalSize = Math.round((width * height * 3) / 1024 / 1024); // Perkiraan kasar
            
            let reduction = 0;
            if (originalSize > compressedSize) {
                reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
                if (reduction > 99) reduction = 99;
            }

            resolve({
                dataUrl: compressedDataUrl,
                originalSize: originalSize,
                compressedSize: compressedSize,
                reduction: reduction
            });
        };
        
        img.onerror = (err) => reject(new Error("File gambar rusak atau tidak terbaca"));
        
        // Mulai memuat gambar dari URL
        img.src = imageUrl;
    });
}

// ============================================
// 4. JSONP CLEANUP HELPER
// ============================================

function cleanupJSONP(callbackName) {
    if (window[callbackName]) {
        delete window[callbackName];
    }
    // Hapus tag <script> sisa request agar DOM tidak kotor
    const scripts = document.querySelectorAll(`script[src*="${callbackName}"]`);
    scripts.forEach(script => script.remove());
}

// ============================================
// 5. MENU NAVIGATION HELPERS
// ============================================

/**
 * Membuka atau menutup popup menu utama
 */
function toggleBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden');
    }
}

/**
 * Menutup popup menu utama
 */
function closeBranchMenuPopup() {
    const overlay = document.getElementById('branchMenuPopupOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

/**
 * Fungsi Navigasi Global
 * Digunakan untuk berpindah antar layar (screen)
 */
function navigateTo(screenId) {
    // 1. SAPU BERSIH: Sembunyikan semua screen dan matikan inline style
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.style.display = 'none'; // 👈 INI OBATNYA (Mencegah layar bertumpuk)
    });

    // 2. TAMPILKAN TARGET: Nyalakan hanya layar yang dituju
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        // Gunakan flex untuk login, sisanya block
        if (screenId === 'loginScreen') {
            targetScreen.style.display = 'flex';
        } else {
            targetScreen.style.display = 'block';
        }
        
        targetScreen.classList.add('active');
        
        // Scroll ke atas secara otomatis
        window.scrollTo(0, 0);
        
        // Logika khusus jika ke layar Logsheet (Update nama user)
        if (screenId === 'logsheetSelectScreen' && typeof currentUser !== 'undefined' && currentUser) {
            const userEl = document.getElementById('logsheetSelectUser');
            if (userEl) userEl.textContent = currentUser.name || currentUser.username;
        }

        // 👇 PEMANGGILAN CHECKLIST RUTIN 👇
        if (screenId === 'homeScreen') {
            if (typeof loadRoutineChecklist === 'function') {
                loadRoutineChecklist();
            }
        }
        
    } else { // <--- Pastikan else langsung menyambung dengan penutup blok if(targetScreen)
        console.error(`Layar dengan ID "${screenId}" tidak ditemukan!`);
    }
}
// ============================================
// 6. SMART SHIFT DETECTOR (ROSTER 28 HARI)
// ============================================

// Tanggal Patokan: 1 April 2026 (Dari Gambar Jadwal)
const SHIFT_ANCHOR_DATE = new Date('2026-04-01T00:00:00');

// Pola presisi 28 Hari berdasarkan pergerakan Grup A
const CYCLE_28_DAYS = [
    'PAGI', 'SORE', 'SORE', 'OFF', 'OFF', 'MALAM', 'MALAM', // Hari 1-7
    'OFF', 'PAGI', 'PAGI', 'SORE', 'SORE', 'SORE', 'OFF',   // Hari 8-14 (Ada 3 Sore Beruntun)
    'MALAM', 'MALAM', 'OFF', 'PAGI', 'PAGI', 'PAGI', 'SORE',// Hari 15-21 (Ada 3 Pagi Beruntun)
    'SORE', 'OFF', 'MALAM', 'MALAM', 'MALAM', 'OFF', 'PAGI' // Hari 22-28 (Ada 3 Malam Beruntun)
];

// Jarak putaran antar grup (dalam hitungan hari)
const GROUP_OFFSETS = {
    'A': 0,   // Patokan utama
    'C': 7,   // Terlambat 1 minggu dari A
    'D': 14,  // Terlambat 2 minggu dari A
    'B': 21   // Terlambat 3 minggu dari A
};

function getCurrentDutyGroup() {
    const now = new Date();
    const hour = now.getHours();
    
    // 1. Tentukan Jam Shift
    let currentShift = '';
    if (hour >= 7 && hour < 15) {
        currentShift = 'PAGI';
    } else if (hour >= 15 && hour < 23) {
        currentShift = 'SORE';
    } else {
        currentShift = 'MALAM';
    }

    // 2. Kalkulasi Selisih Hari 
    // (Jika Shift Malam jam 00:00 - 06:59, terhitung masih hari kemarin)
    const anchor = new Date(SHIFT_ANCHOR_DATE.getFullYear(), SHIFT_ANCHOR_DATE.getMonth(), SHIFT_ANCHOR_DATE.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (hour >= 0 && hour < 7) {
        today.setDate(today.getDate() - 1);
    }
    
    const diffTime = today.getTime() - anchor.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 3. Pencarian Grup yang Bertugas
    let dutyGroup = 'Unknown';
    let scheduleToday = {};

    ['A', 'B', 'C', 'D'].forEach(group => {
        let index = (GROUP_OFFSETS[group] + diffDays) % 28;
        if (index < 0) index = (index + 28) % 28; // Jaga-jaga jika nge-cek tanggal mundur
        
        const groupShiftToday = CYCLE_28_DAYS[index];
        scheduleToday[group] = groupShiftToday;
        
        if (groupShiftToday === currentShift) {
            dutyGroup = group;
        }
    });

    return {
        group: dutyGroup,
        shift: currentShift,
        schedule: scheduleToday
    };
}

// ====================================================================
// FUNGSI BARU: Notifikasi yang hilang otomatis (Auto-Dismiss Toast) + GETAR
// ====================================================================
function showTemporaryToast(message, type = 'info', duration = 2500) {
    // 👇 1. MESIN GETAR (HAPTIC FEEDBACK) 👇
    if ('vibrate' in navigator) {
        if (type === 'success') {
            navigator.vibrate([100, 50, 100]); // Getar 2x Cepat (Tek-Tek)
        } else if (type === 'warning') {
            navigator.vibrate([200, 100, 200]); // Getar 2x Agak Panjang
        } else if (type === 'error') {
            navigator.vibrate([300, 100, 400, 100, 500]); // Getar SOS
        } else {
            navigator.vibrate(50); // Getar Halus 1x
        }
    }
    // 👆 ================================= 👆

    const toast = document.createElement('div');
    
    toast.className = `toast-notif-kecil toast-${type}`; 
    
    // Styling INLINE (Aman dari bentrok)
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '999999'; // Pastikan di atas segalanya
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s ease-in-out';
    toast.style.fontFamily = 'sans-serif';
    toast.style.fontSize = '14px';
    toast.style.width = 'auto'; 
    toast.style.maxWidth = '300px'; 
    toast.style.pointerEvents = 'none'; 
    
    // Konten teks
    toast.innerHTML = `<span style="font-weight:bold;">${message}</span>`;

    // Warna
    if (type === 'success') {
        toast.style.backgroundColor = '#10b981'; // Hijau
        toast.style.color = '#ffffff';
    } else if (type === 'info') {
        toast.style.backgroundColor = '#3b82f6'; // Biru
        toast.style.color = '#ffffff';
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#f59e0b'; // Oranye
        toast.style.color = '#ffffff';
    } else {
        toast.style.backgroundColor = '#3b82f6';
        toast.style.color = '#ffffff';
    }

    document.body.appendChild(toast);

    // Animasi Muncul
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animasi Menghilang
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
