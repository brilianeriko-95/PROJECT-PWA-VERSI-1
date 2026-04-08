/* ============================================
   TURBINE LOGSHEET PRO - GLOBAL STATE
   ============================================ */

// ============================================
// 1. GENERAL LOGSHEET STATE (TURBINE)
// ============================================
let lastData = {};
let currentInput = {};
let activeArea = "";
let activeIdx = 0;
let totalParams = 0;
let currentInputType = 'text';

// ============================================
// 2. AUTHENTICATION & USER STATE
// ============================================
let currentUser = null;
let isAuthenticated = false;
let usersCache = null;

// ============================================
// 3. UI, SYSTEM & NETWORK STATE
// ============================================
let autoCloseTimer = null;
let uploadProgressInterval = null;
let currentUploadController = null;

// ============================================
// 4. TPM (TOTAL PRODUCTIVE MAINTENANCE) STATE
// ============================================
let activeTPMArea = '';
let currentTPMPhoto = null;
let currentTPMStatus = '';

// ============================================
// 5. BALANCING STATE
// ============================================
let currentShift = 3;
let balancingAutoSaveInterval = null;

// ============================================
// 6. PWA (PROGRESSIVE WEB APP) STATE
// ============================================
let deferredPrompt = null;
let installBannerShown = false;

// ============================================
// 7. COOLING TOWER (CT) LOGSHEET STATE
// ============================================
let lastDataCT = {};
let currentInputCT = {};
let activeAreaCT = "";
let activeIdxCT = 0;
let totalParamsCT = 0;
let currentInputTypeCT = 'text';

// ============================================
// 8. 1300 LOGSHEET STATE
// ============================================
let currentInput1300 = {};
let activeArea1300 = null;
let activeIdx1300 = 0;
let currentInputType1300 = 'text';
let lastData1300 = {};

// ============================================
// 9. 1100 LOGSHEET STATE
// ============================================
let activeArea1100 = null;
let activeIdx1100 = 0;
let currentInput1100 = {};
let param1100Photos = {};
let current1100ParamPhoto = null;
let lastData1100 = {};

// ============================================
// 10. PHOTO VALIDATION STATE (TURBINE & CT)
// ============================================
// Foto untuk parameter Turbine
let currentParamPhoto = null;  // Foto yang sedang aktif diambil
let paramPhotos = {};          // Format: { areaName: { paramName: photoData } }

// Foto untuk parameter CT
let currentCTParamPhoto = null; // Foto CT yang sedang aktif diambil
let ctParamPhotos = {};        // Format: { areaName: { paramName: photoData } }

// Untuk foto
let paramPhotos1300 = {};
let currentParamPhoto1300 = null;
