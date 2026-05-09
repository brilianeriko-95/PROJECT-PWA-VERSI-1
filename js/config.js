/* ============================================
   TURBINE LOGSHEET PRO - CONFIGURATION
   ============================================ */

/* ============================================
   TURBINE LOGSHEET PRO - CONFIGURATION (V 2.8.5)
   ============================================ */

// 1. APP CONFIGURATION
const APP_VERSION = '3.0.5';
const APP_NAME = 'PROJECT LOGSHEET';

const AUTH_CONFIG = {
    SESSION_KEY: 'turbine_session',
    USER_KEY: 'turbine_user',
    USERS_CACHE_KEY: 'turbine_users_cache',
    SESSION_DURATION: 8 * 60 * 60 * 1000,
    REMEMBER_ME_DURATION: 30 * 24 * 60 * 60 * 1000
};

// 👇 TAMBAHKAN LANGKAH 1 DI SINI (LEMARI TEMA GLOBAL) 👇
const UNIT_THEMES = {
    'SA': { 
        color: '#10b981', // Hijau Asam Sulfat
        bgGradient: 'linear-gradient(135deg, #064e3b, #0f172a)',
        logo: 'assets/logo-sa.png',
        title: 'ASAM SULFAT LOGSHEET'
    },
    'UBB': { 
        color: '#f59e0b', // Oranye Batu Bara
        bgGradient: 'linear-gradient(135deg, #78350f, #0f172a)',
        logo: 'assets/logo-ubb.png',
        title: 'Batu Bara Logsheet'
    },
    'UTILITAS': { 
        color: '#3b82f6', // Biru Utilitas
        bgGradient: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
        logo: 'assets/logo-utilitas.png',
        title: 'UTILITAS LOGSHEET'
    },
    'DEFAULT': {
        color: '#64748b', // Abu-abu Netral
        bgGradient: 'linear-gradient(135deg, #334155, #0f172a)',
        logo: 'assets/logo-petrokop.png',
        title: 'Logsheet Digital'
    }
};
// 👆 ================================================== 👆

// 2. BACKEND & USER SETUP
const GAS_URL = "https://script.google.com/macros/s/AKfycbxFbP8T1LeG8vzLp6JRNwW1MQ0dY5GX38v7jmHDoD0d929j7t7qM363uTTvk7FtX3Ci/exec";

const OFFLINE_USERS = {
    // Ubah ke MANAJEMEN agar Admin otomatis bisa melihat seluruh menu (SA & SU)
    'admin': { password: 'admin123', role: 'admin', name: 'Administrator', department: 'MANAJEMEN' },
    'utilitas3b': { password: 'pgresik2024', role: 'operator', name: 'Unit Utilitas 3B', department: 'UNIT UTILITAS 3B' }
};

// Field configuration untuk Balancing
const BALANCING_FIELDS = [
    'balancingDate', 'balancingTime',
    'loadMW', 'eksporMW',
    'plnMW', 'ubbMW', 'pieMW', 'tg65MW', 'tg66MW', 'gtgMW',
    'ss6500MW', 'ss2000Via', 'activePowerMW', 'reactivePowerMVAR', 
    'currentS', 'voltageV', 'hvs65l02MW', 'hvs65l02Current', 'total3BMW',
    'fq1105',
    'stgSteam', 'pa2Steam', 'puri2Steam', 'melterSA2', 
    'ejectorSteam', 'glandSealSteam', 'deaeratorSteam', 
    'dumpCondenser', 'pcv6105',
    'pi6122', 'ti6112', 'ti6146', 'ti6126', 
    'axialDisplacement', 'vi6102', 'te6134',
    'ctSuFan', 'ctSuPompa', 'ctSaFan', 'ctSaPompa',
    'kegiatanShift'
];

// ============================================
// 2. DATA STRUKTUR AREA
// ============================================

// Struktur Area Turbine Logsheet
const AREAS = {
    "Steam Inlet Turbine": [
        "MPS Inlet 30-TP-6101 PI-6114 (kg/cm2)", 
        "MPS Inlet 30-TP-6101 TI-6153 (°C)", 
        "MPS Inlet 30-TP-6101 PI-6116 (kg/cm2)", 
        "LPS Extrac 30-TP-6101 PI-6123 (kg/cm2)", 
        "Gland Steam TI-6156 (°C) [ALL]", 
        "MPS Inlet 30-TP-6101 PI-6108 (Kg/cm2)", 
        "Exhaust Steam PI-6111 (kg/cm2)", 
        "Gland Steam PI-6118 (Kg/cm2) [ALL]"
    ],
    "Low Pressure Steam": [
        "LPS from U-6101 PI-6104 (kg/cm2)", 
        "LPS from U-6101 TI-6102 (°C)", 
        "LPS Header PI-6106 (Kg/cm2) [ALL]", 
        "LPS Header TI-6107 (°C) [ALL]"
    ],
    "Lube Oil [ALL]": [
        "Lube Oil 30-TK-6102 LI-6104 (%)", 
        "Lube Oil 30-TK-6102 TI-6125 (°C)", 
        "Lube Oil 30-C-6101 (On/Off)", 
        "Lube Oil 30-EH-6102 (On/Off)", 
        "Lube Oil Cartridge FI-6143 (%)", 
        "Lube Oil Cartridge PI-6148 (mmH2O)", 
        "Lube Oil Cartridge PI-6149 (mmH2O)", 
        "Lube Oil PI-6145 (kg/cm2)", 
        "Lube Oil E-6104 (A/B)", 
        "Lube Oil TI-6127 (°C)", 
        "Lube Oil FIL-6101 (A/B)", 
        "Lube Oil PDI-6146 (Kg/cm2)", 
        "Lube Oil PI-6143 (Kg/cm2)", 
        "Lube Oil TI-6144 (°C)", 
        "Lube Oil TI-6146 (°C)", 
        "Lube Oil TI-6145 (°C)", 
        "Lube Oil FG-6144 (%)", 
        "Lube Oil FG-6146 (%)", 
        "Lube Oil TI-6121 (°C)", 
        "Lube Oil TI-6116 (°C)", 
        "Lube Oil FG-6121 (%)", 
        "Lube Oil FG-6116 (%)"
    ],
    "Control Oil ": [
        "Control Oil 30-TK-6103 LI-6106 (%) [ALL]", 
        "Control Oil 30-TK-6103 TI-6128 (°C) [ALL]", 
        "Control Oil P-6106 (A/B)", 
        "Control Oil FIL-6103 (A/B)", 
        "Control Oil PI-6152 (Bar)"
    ],
    "Shaft Line [STOP]": [
        "Jacking Oil 30-P-6105 PI-6158 (Bar)", 
        "Jacking Oil 30-P-6105 PI-6161 (Bar)", 
        "Electrical Turning Gear U-6103 (Remote/Running/Stop)", 
        "EH-6101 (ON/OFF)"
    ],
    "Condenser 30-E-6102": [
        "LG-6102 (%) [ALL]", 
        "30-P-6101 (A/B) [ALL]", 
        "30-P-6101 Suction (kg/cm2) [ALL]", 
        "30-P-6101 Discharge (kg/cm2) [ALL]", 
        "30-P-6101 Load (Ampere) [ALL]"
    ],
    "Ejector ": [
        "J-6101 PI-6126 A (Kg/cm2) [ALL]", 
        "J-6101 PI-6127 B (Kg/cm2) [ALL]", 
        "J-6102 PI-6128 A (Kg/cm2) [ALL]", 
        "J-6102 PI-6129 B (Kg/cm2) [ALL]", 
        "J-6104 PI-6131 (Kg/cm2) [ALL]", 
        "J-6104 PI-6138 (Kg/cm2) [ALL]", 
        "PI-6172 (kg/cm2) [ALL]", 
        "LPS Extrac 30-TP-6101 TI-6155 (°C)", 
        "from U-6102 TI-6104 (°C)"
    ],
    "Generator Cooling Water [OPERASI]": [
        "Air Cooler PI-6124 A (Kg/cm2)", 
        "Air Cooler PI-6124 B (Kg/cm2)", 
        "Air Cooler TI-6113 A (°C)", 
        "Air Cooler TI-6113 B (°C)", 
        "Air Cooler PI-6125 A (Kg/cm2)", 
        "Air Cooler PI-6125 B (Kg/cm2)", 
        "Air Cooler TI-6114 A (°C)", 
        "Air Cooler TI-6114 B (°C)"
    ],
    "Condenser Cooling Water [OPERASI]": [
        "Condenser PI-6135 A (Kg/cm2)", 
        "Condenser PI-6135 B (Kg/cm2)", 
        "Condenser TI-6118 A (°C)", 
        "Condenser TI-6118 B (°C)", 
        "Condenser PI-6136 A (Kg/cm2)", 
        "Condenser PI-6136 B (Kg/cm2)", 
        "Condenser TI-6119 A (°C)", 
        "Condenser TI-6119 B (°C)"
    ],
    "BFW System [ALL]": [
        "Condensate Tank TK-6201 (%)", 
        "Condensate Tank TI-6216 (°C)", 
        "P-6202 (A/B)", 
        "P-6202 Suction (kg/cm2)", 
        "P-6202 Discharge (kg/cm2)", 
        "P-6202 Load (Ampere)", 
        "Deaerator LI-6202 (%)", 
        "Deaerator TI-6201 (°C)", 
        "30-P-6201 (A/B)", 
        "30-P-6201 Suction (kg/cm2)", 
        "30-P-6201 Discharge (kg/cm2)", 
        "30-P-6201 Load (Ampere)", 
        "30-C-6202 A (ON/OFF)", 
        "30-C-6202 A (Ampere)", 
        "30-C-6202 B (ON/OFF)", 
        "30-C-6202 B (Ampere)", 
        "30-C-6202 PCV-6216 (%)", 
        "30-C-6202 PI-6107 (kg/cm2)", 
        "Condensate Drum 30-D-6201 LI-6209 (%)", 
        "Condensate Drum 30-D-6201 PI-6218 (kg/cm2)", 
        "Condensate Drum 30-D-6201 TI-6215 (°C)"
    ],
    "Chemical Dosing": [
        "30-TK-6205 LI-6204 (%) [ALL]", 
        "30-TK-6205 30-P-6205 (A/B)", 
        "30-TK-6205 Disch (kg/cm2)", 
        "30-TK-6205 Stroke (%)", 
        "30-TK-6206 LI-6206 (%) [ALL]", 
        "30-TK-6206 30-P-6206 (A/B)", 
        "30-TK-6206 Disch (kg/cm2)", 
        "30-TK-6206 Stroke (%)", 
        "30-TK-6207 LI-6208 (%) [ALL]", 
        "30-TK-6207 30-P-6207 (A/B)", 
        "30-TK-6207 Disch (kg/cm2)", 
        "30-TK-6207 Stroke (%)"
    ]
};

// Struktur Area CT Logsheet
const AREAS_CT = {
    "BASIN SA": [
        "D-6511 LEVEL BASIN (Meter) [ALL]",
        "D-6511 BLOWDOWN (%) [ALL]",
        "D-6511 PH BASIN [ALL]", 
        "D-6511 TRASSAR (A/M) [ALL]", 
        "TK-6511 LEVEL ACID (%) [ALL]", 
        "FIL-6511 (A/B) [ALL]", 
        "30-P-6511 A PRESS (kg/cm2) [ALL]", 
        "30-P-6511 B PRESS (kg/cm2) [ALL]", 
        "30-P-6511 C PRESS (kg/cm2) [ALL]", 
        "MT-6511 A (RUN/STOP)", 
        "MT-6511 B (RUN/STOP)", 
        "MT-6511 C (RUN/STOP)", 
        "MT-6511 D (RUN/STOP)"
    ], 
    "BASIN SU": [
        "D-6521 LEVEL BASIN (Meter) [ALL]",
        "D-6521 BLOWDOWN (%) [ALL]",
        "D-6521 PH BASIN [ALL]", 
        "D-6521 TRASSAR (A/M) [ALL]", 
        "TK-6521 LEVEL ACID (%) [ALL]", 
        "FIL-6521 (A/B)", 
        "30-P-6521 A PRESS (kg/cm2) [ALL]", 
        "30-P-6521 B PRESS (kg/cm2) [ALL]", 
        "30-P-6521 C PRESS (kg/cm2) [ALL]", 
        "MT-6521 A (RUN/STOP)", 
        "MT-6521 B (RUN/STOP)", 
        "MT-6521 C (RUN/STOP)", 
        "MT-6521 D (RUN/STOP)"
    ],
   "COMPRESSOR [ALL]": [
                  "C-6701 A (RUN/STOP)",
                  "C-6701 A PRESSURE (kg/cm2)",
                  "C-6701 A TEMP (°C)[LAPORAN]",
                  "C-6701 A FLOW (m3/h)[LAPORAN]",
                  "C-6701 B (RUN/STOP)",
                  "C-6701 B PRESSURE (kg/cm2)",
                  "C-6701 B TEMP (°C)[LAPORAN]",
                  "C-6701 B FLOW (m3/h)[LAPORAN]",
                  "C-6702 A (RUN/STOP)",
                  "C-6702 A PRESSURE (kg/cm2)",
                  "C-6702 A TEMP(°C)[LAPORAN]",
                  "C-6702 A FLOW (m3/h)[LAPORAN]",
                  "C-6702 B (RUN/STOP)", 
                  "C-6702 B PRESSURE (kg/cm2)",
                  "C-6702 B TEMP (°C)[LAPORAN]",
                  "C-6702 B FLOW (m3/h)[LAPORAN]"
      ],
   "OLI GEARBOX SA [LAPORAN][ALL]": ["MT-6511 A (Cm)",
                      "MT-6511 B (Cm)", 
                      "MT-6511 C (Cm)", 
                      "MT-6511 D (Cm)"],
   "OLI GEARBOX SU [ALL][LAPORAN]": ["MT-6521 A (Cm)",
                      "MT-6521 B (Cm)",
                      "MT-6521 C (Cm)",
                      "MT-6521 D (Cm)"]
};
// Data Area 1300
const AREAS_1300 = {
  "DRYING AIR": [
    "30-T-1301 AIR INLET PI-1007-1 (mmAq)",
    "30-T-1301 AIR INLET FILTER PP-1008-1 (mmAq)",
    "30-T-1301 AIR OUT FILTER PP-1008-2 (mmAq)",
    "30-T-1301 CIRC PUMP LOAD (Ampere)",
    "30-T-1301 PUMP DISCHARGE PI-1004-1 (Kg/cm2)",
    "30-T-1301 PUMP DISCHARGE TI-1302-1 (°C)",
    "30-T-1301 ACID OUT PI-1004-9 (Kg/cm2)",
    "30-T-1301 CW INLET PI-1005-2 (Kg/cm2)",
    "30-T-1301 CW OUTLET PI-1008-7 (Kg/cm2)",
    "30-T-1301 CW OUTLET TI-1301-2 (°C)"
  ],

  "1st SO3 ABSORBER": [
    "30-T-1302 GAS IN FILTER PP-1008-19 (mmAq)",
    "30-T-1302 GAS OUT FILTER PP-1008-20 (mmAq)",
    "30-T-1302 CIRC PUMP LOAD (Ampere)",             
    "30-T-1302 DISCHARGE ACID PI-1004-2 (Kg/cm2)",
    "30-T-1302 DISCHARGE ACID TI-1302-2 (°C)",
    "30-T-1302 ACID OUT PI-1004-4 (Kg/cm2)",
    "30-T-1302 CW INLET PP-1008-11 (Kg/cm2)",
    "30-T-1302 CW OUTLET PI-1006-8 (Kg/cm2)",
    "30-T-1302 CW OUTLET TI-1301-3 (°C)"
  ],

  "2nd SO3 ABSORBER": [
    "30-T-1303 GAS IN FILTER PP-1008-27 (mmAq)",
    "30-T-1303 GAS OUT FILTER PP-1008-28 (mmAq)",
    "30-T-1303 CIRC PUMP LOAD (Ampere)",           
    "30-T-1303 DISCHARGE PI-1004-5 (Kg/cm2)",
    "30-T-1303 DISCHARGE TI-1302-3 (°C)",
    "30-T-1303 ACID OUT PI-1006-5 (Kg/cm2)",
    "30-T-1303 CW INLET PI-1006-9 (Kg/cm2)",
    "30-T-1303 CW OUTLET PI-1006-4 (Kg/cm2)",
    "30-T-1303 CW OUTLET TI-1304-4 (°C)"
  ],

  "PRODUCT COOLER": [
    "30-E-1304 ACID OUT PI-1004-7 (Kg/cm2)",
    "30-E-1304 ACID OUTLET TI-1001-9 (°C)",
    "30-E-1304 CW INLET PI-1006-10 (Kg/cm2)",
    "30-E-1304 CW OUTLET PI-1006-11 (Kg/cm2)",
    "30-E-1304 CW OUTLET TI-1301-5 (°C)"
  ],

  "FLOW PRODUCT": [
    "FLOW FI-1304 (Ton/jam)",
    "TOTALIZER FIQ-1304 (Ton)"
  ],

  "CW HEADER": [
    "TEMP INLET TI-1301-6 (°C)",
    "TEMP OUTLET TI-1301-1 (°C)",
    "PH OUTLET AT-1103"
  ],

  "BLOWER MC-C-1302": [
    "MC-C-1302 LOAD (Ampere)",                 // <-- DIPERBARUI
    "30-C-1302 SUCTION HV-1302-1 (%)",
    "30-C-1302 GUIDE VANE HV-1302-2 (%)",
    "30-C-1302 POINTER 1302 (%)",                     // <-- DIPERBARUI
    "30-C-1302 VENTING HCV-1304 (%)",
    "30-C-1302 PT-1304 (%)"
  ],

  "BLOWER MC-C-1301": [
    "MC-C-1301 LOAD (Ampere)",                 // <-- DIPERBARUI
    "30-C-1301 SUCTION HV-1301-1 (%)",
    "30-C-1301 GUIDE VANE HV-1301-2 (%)",
    "30-C-1301 POINTER 1301 (%)",                     // <-- DIPERBARUI
    "30-C-1301 VENTING HCV-1303 (%)",
    "30-C-1301 DISCHARGE HV-1301 (%)",
    "30-C-1301 PT-1301 (Kg/cm2)",
    "30-C-1301 PT-1303 (Kg/cm2)"
  ],

  "LUBE OIL SYSTEM": [
    "PRESSURE PI-1331 (Kg/cm2)",
    "PRESSURE PI-1332 (Kg/cm2)",
    "PRESSURE PI-133-A (Kg/cm2)",
    "PRESSURE PI-133-B (Kg/cm2)",
    "PRESSURE PI-133-C (Kg/cm2)",
    "TEMP TI-1337 (°C)",
    "TEMP TI-1338 (°C)",
    "FLOW FI-1337 (m3/h)",
    "FLOW FI-1338 (m3/h)",
    "FLOW FI-1341 (m3/h)",
    "FLOW FI-1342 (m3/h)",
    "PRESSURE PIT-1340 (Kg/cm2)",
    "LEVEL TANK (%)"
  ]
};
// Data Parameter Area 1100 & 1200 \\==FLOW FI-1103 (T/h) "TOTALIZER FQ-1103 (Ton)",
const AREAS_1100 = {
  "MOLTEN SULPHUR SYSTEM": [
     "VALVE HCV-1101 (%)",
    "INLET PI-1001-5 (Kg/cm2)",
    "PUMP B-1102 A/B/C/D/E (%)",
    "LP STEAM JACKET TI-1001-16 (°C)"
  ],
  "FURNACE AIR SYSTEM": [
    "DRY AIR INLET PI-1007-2 (Kg/cm2)",
    "DAMPER G-2 (%)",
    "PRIMARY AIR PP-1008-4 (Kg/cm2)",
    "DAMPER G-3 (%)",
    "SECONDARY AIR PP-1008-3 (mmH2O)"
  ],
  "FURNACE GAS OUTLET": [
    "GAS OUTLET PI-1107-3 (mmH2O)"
  ],
  "BLOWER 30-C-1101": [
    "30-C-1101 SUCTION PI-1006-15 (Kg/cm2)",
    "30-C-1101 DISCHARGE PI-1006-13 (Kg/cm2)"
  ],
  "WASTE HEAT BOILER (WHB)": [
    "30-B-1104 HV-1111 S-3 (%)",
    "30-B-1104 JUG DAMPER HV-1110 (mm)",
    "30-B-1104 GAS INLET PI-1107-4 (mmH2O)",
    "30-B-1104 GAS OUTLET PI-1007-4 (mmH2O)",
    "30-B-1104 STEAM DRUM PI-1102-4 (Kg/cm2)",
    "30-B-1104 SATURATED STEAM TI-1002-3 (°C)",
    "30-B-1104 LEVEL GLASS LG-1103-1/2 (%)",
    "30-B-1104 LCV-1102 (%)"
  ],
  "DRUM & VESSEL": [
    "30-D-1101 PRESSURE PI-1002-5 (Kg/cm2)",
    "30-D-1101 LEVEL LI-1110 (%)",
    "30-D-1102 TEMP TI-1003-6 (°C)"
  ],
  "HEAT EXCHANGER (PREHEATER)": [
    "30-E-1103 PI-1006-22 (Kg/cm2)",
    "30-E-1103 DP CW-1108 (Kg/cm2)",
    "30-P-1103 DISCHARGE PI-1006-12 (Kg/cm2)"
  ],
    "MPS HEATER 30-E-1102": [
    "30-E-1102 HCV-1102 (%)",
    "30-E-1102 TCV-1103 (%)",
    "30-E-1102 MPS OUTLET TI-1110 (°C)",
    "30-E-1102 MPS OUTLET PI-1002 (Kg/cm2)",
    "30-E-1102 PCV-1103 (%)",
    "30-E-1102 GAS IN PI-1006-5 (mmH2O)",
    "30-E-1102 GAS OUT PI-1007-5 (mmH2O)"
  ],
  "LP STEAM HEADER": [
    "PI-1002-3 (Kg/cm2)",
    "TI-1002-4 (°C)"
  ],
  "LPS 7 KG SYSTEM": [
    "PI-1107 (Kg/cm2)",
    "TI-1111 (°C)",
    "PI-1106 (Kg/cm2)",
    "TI-1112 (°C)"
  ],
  "CONVERTER INLET (30-R-1201)": [
    "30-R-1201 DAMPER G-5 (%)",
    "30-R-1201 GAS IN PP-1008-9 (mmH2O)"
  ],
  "BED I": [
    "GAS IN PI-1007-6B (mmHg)",
    "GAS OUT PI-1007-6A (mmHg)",
    "∆P BED-I (mmHg)"
  ],
  "BED II": [
    "GAS IN PI-1007-6D (mmHg)",
    "GAS OUT PI-1007-6C (mmHg)",
    "∆P BED-II (mmHg)"
  ],
  "BED III": [
    "GAS IN PI-1007-6F (mmHg)",
    "GAS OUT PI-1007-6E (mmHg)",
    "∆P BED-III (mmHg)"
  ],
  "BED IV": [
    "GAS IN PI-1007-6H (mmHg)",
    "GAS OUT PI-1007-6G (mmHg)",
    "∆P BED-IV (mmHg)"
  ],
  "INTERPASS HEAT EXCHANGER": [
    "30-E-1202 IN TUBE PI-1008-14 (mmH2O)",
    "30-E-1202 OUT TUBE PI-1008-16 (mmH2O)",
    "30-E-1201 IN TUBE PI-1008-18 (mmH2O)",
    "30-E-1201 OUT TUBE PI-1008-21 (mmH2O)"
  ],
  "GAS COOLER & ECONOMIZER": [
    "30-E-1203 GAS OUT PI-1007-7 (mmH2O)",
    "DAMPER G-10 (%)",
    "30-E-1204 GAS IN PP-1008-26 (mmH2O)",
    "30-E-1204 GAS OUT PI-1007-11 (mmH2O)",
    "DAMPER G-11 (%)"
  ],
  "SHELL SIDE CONTROL": [
    "30-E-1201 IN SHELL PI-1008-22 (mmH2O)",
    "30-E-1201 OUT SHELL PP-1008-23 (mmH2O)",
    "HCV-1201 (%)",
    "30-E-1202 OUT SHELL PP-1007-9 (mmH2O)",
    "HCV-1202 (%)"
  ],
  "BFW SYSTEM": [
    "BFW IN 30-E-1204 TI-1114 (°C)",
    "BFW IN 30-E-1203 TI-1116 (°C)",
    "BFW OUT 30-E-1203 TI-1115 (°C)",
    "BFW OUT 30-E-1204 TI-1117 (°C)"
  ]
};

const AREAS_1000 = {

  "AGITATOR (M-1001 / M-1002 / M-1005 / M-1004)": [
    "30-M-1001 A/C (RUN/STOP)",
    "30-M-1001 B/D (RUN/STOP)",
    "30-M-1002 A/C (RUN/STOP)",
    "30-M-1002 B/D (RUN/STOP)",
    "30-M-1005 A/C (RUN/STOP)",
    "30-M-1005 B/D (RUN/STOP)",
    "30-M-1004 A/B (RUN/STOP)"
  ],

  "TANK & VESSEL TEMPERATURE": [
    "30-D-1002 A/C TI-1003-1 (°C)",
    "30-D-1002 B/D TI-1003-2 (°C)",
    "30-D-1005 A/C TI-1003-3 (°C)",
    "30-D-1005 B/D TI-1003-4 (°C)",
    "30-D-1006 A/B TI-1003-7 (°C)",
    "30-D-1004 A/B TI-1003-5 (°C)",
    "30-D-1007 TI-1003-8 (°C)"
  ],

  "TANK & VESSEL LEVEL": [
    "30-D-1003 A/C LI-1005-1 (cm)",
    "30-D-1003 B/D LI-1005-2 (cm)",
    "30-D-1005 A/C LI-1005-4 (cm)",
    "30-D-1005 B/D LI-1005-5 (cm)",
    "30-D-1006 A/B LI-1005-6 (cm)",
    "30-D-1004 A/B LI-1005-3 (cm)"
  ],

  "PUMP 30-P-1002": [
    "30-P-1002 A/C (RUN/STOP)",
    "30-P-1002 A/C PI-1001-7 (Kg/cm2)",
    "30-P-1002 B/D (RUN/STOP)",
    "30-P-1002 B/D PI-1001-8 (Kg/cm2)"
  ],

  "FILTER 30-FIL-1001": [
    "30-FIL-1001 A STATUS (FILTRASI/STANDBY)",
    "30-FIL-1001 A INLET PI-1001-A (Kg/cm2)",
    "30-FIL-1001 A OUTLET PI-1002-A (Kg/cm2)",
    "30-FIL-1001 B STATUS (FILTRASI/STANDBY)",
    "30-FIL-1001 B INLET PI-1001-B (Kg/cm2)",
    "30-FIL-1001 B OUTLET PI-1002-B (Kg/cm2)"
  ],

  "STORAGE TANK 30-TK-1001": [
    "30-TK-1001 TI-1001-1 (°C)",
    "30-TK-1001 TI-1001-2 (°C)",
    "30-TK-1001 LI-1004 (mm)"
  ],

  "CONTROL VALVE SYSTEM": [
    "30-D-1006 A/B LCV-1003 (%)"
  ],

  "PUMP 30-P-1004": [
    "30-P-1004 A/C (Ampere)",
    "30-P-1004 A/C PI-1001-1 (Kg/cm2)",
    "30-P-1004 B/D (Ampere)",
    "30-P-1004 B/D PI-1001-2 (Kg/cm2)"
  ],

  "PUMP 30-P-1001": [
    "30-P-1001 A/B PI-1001-6 (Kg/cm2)",
    "30-P-1001 A/B (Ampere)"
  ],

  "PUMP 30-P-1005": [
    "30-P-1005 A/B (RUN/STOP)",
    "30-P-1005 A PI-1003-6 (Kg/cm2)",
    "30-P-1005 B PI-1003-67 (Kg/cm2)"
  ]
  };

// ==========================================
// 6 AREA PANEL STG 17,5
// ==========================================
const AREAS_PANEL_STG175 = {
  "STEAM SYSTEM MAIN": [
    "PT-6107 (kg/cm2)",
    "FT-6102 (kg/h)",
    "PCV-6107 (A/M)",
    "TRIP VALVE INLET TI-6109 (°C)",
    "TRIP VALVE INLET PI-6113 (kg/cm2)",
    "GOVERNOR INLET TI-6154 (°C)",
    "GOVERNOR METAL TI-6110 (°C)",
    "NOZZLE OUTLET TI-6111 (°C)",
    "PI-6115 (kg/cm2)"
  ],
  "GLAND STEAM SYSTEM": [
    "PV-6118 (%)",
    "PI-6117 (kg/cm2)",
    "TI-6149 (°C)"
  ],
  "STEAM EXTRACTION": [
    "PI-6122 (kg/cm2)",
    "PI-6120 (kg/cm2)",
    "TT-6112 (°C)",
    "FT-6101 (kg/h)"
  ],
  "MAIN CONDENSER": [
    "LEVEL LI-6101 (%)",
    "PI-6110 (kg/cm2)",
    "PI-6112 (kg/cm2)",
    "PUMP MP-6101 (A/B)",
    "PI-6134 (kg/cm2)",
    "TI-6115 (°C)",
    "TI-6116 (°C)"
  ],
  "LUBE OIL SYSTEM": [
    "30-TK-6102 LEVEL (%)",
    "30-EH-6102 (ON/AUTO)",
    "30-TK-6102 PDI-6144 (kg/cm2)",
    "30-TK-6102 TEMP TIT-6124 (°C)",
    "30-E-6104 COOLER (A/B)",
    "30-P-6103 (ON/AUTO)",
    "30-P-6104 (ON/AUTO)",
    "TEMP TI-6126 (°C)",
    "PDI-6146 (kg/cm2)",
    "FILTER FIL-6101 (A/B)",
    "PI-6141 (kg/cm2)"
  ],
  "HP OIL SYSTEM": [
    "MP-6106 (A/B)",
    "PI-6153 (kg/cm2)",
    "ZC-6106 (%)",
    "ZC-6107 (%)"
  ],
  "SHAFT LINE LUBE OIL": [
    "UM-6103 (ON/AUTO)",
    "P-6105 A (ON/AUTO)",
    "P-6105 B (ON/AUTO)"
  ],
  "SYNCHRONIZATION & EXCITATION": [
    "SPEED (RPM)",
    "ACTIVE POWER (MW)",
    "REACTIVE POWER (MVAR)",
    "VOLTAGE (V)",
    "FREQUENCY (Hz)",
    "CURRENT (A)",
    "POWER FACTOR (COSϕ)",
    "EXCITATION VOLTAGE (V)",
    "EXCITATION CURRENT (A)",
    "AVR (A/B)"
  ],
  "TURBINE BEARING TEMPERATURE": [
    "THRUST NDE TE-6131 A (°C)",
    "THRUST NDE TE-6131 B (°C)",
    "THRUST NDE TE-6132 A (°C)",
    "THRUST NDE TE-6132 B (°C)",
    "JOURNAL NDE TE-6133 A (°C)",
    "JOURNAL NDE TE-6133 B (°C)",
    "JOURNAL DE TE-6134 A (°C)",
    "JOURNAL DE TE-6134 B (°C)"
  ],
  "GEARBOX TEMPERATURE": [
    "HIGH SPEED DE TE-6135 A (°C)",
    "HIGH SPEED DE TE-6135 B (°C)",
    "HIGH SPEED NDE TE-6140 A (°C)",
    "HIGH SPEED NDE TE-6140 B (°C)",
    "WHEEL DE TE-6139 A (°C)",
    "WHEEL DE TE-6139 B (°C)",
    "WHEEL NDE TE-6138 A (°C)",
    "WHEEL NDE TE-6138 B (°C)",
    "LOW SPEED TE-6136 A (°C)",
    "LOW SPEED TE-6136 B (°C)",
    "LOW SPEED TE-6137 A (°C)",
    "LOW SPEED TE-6137 B (°C)"
  ],
  "GENERATOR TEMPERATURE": [
    "BEARING DE TE-6141 A (°C)",
    "BEARING DE TE-6141 B (°C)",
    "BEARING NDE TE-6145 A (°C)",
    "BEARING NDE TE-6145 B (°C)",
    "COOLING AIR INLET DE TE-6146 A (°C)",
    "COOLING AIR INLET DE TE-6146 B (°C)",
    "COOLING AIR INLET NDE TE-6147 A (°C)",
    "COOLING AIR INLET NDE TE-6147 B (°C)",
    "COOLING AIR OUTLET TE-6148 A (°C)",
    "COOLING AIR OUTLET TE-6148 B (°C)",
    "STATOR U TE-6142 A (°C)",
    "STATOR U TE-6142 B (°C)",
    "STATOR V TE-6143 A (°C)",
    "STATOR V TE-6143 B (°C)",
    "STATOR W TE-6144 A (°C)",
    "STATOR W TE-6144 B (°C)"
  ],
  "VIBRATION SYSTEM": [
    "THRUST ZE-6108 (mm)",
    "TURBINE NDE VI-6101 X (µm)",
    "TURBINE NDE VI-6101 Y (µm)",
    "TURBINE DE VI-6102 X (µm)",
    "TURBINE DE VI-6102 Y (µm)",
    "GB HIGH SPEED DE VI-6103 X (µm)",
    "GB HIGH SPEED DE VI-6103 Y (µm)",
    "GB HIGH SPEED NDE VI-6106 X (µm)",
    "GB HIGH SPEED NDE VI-6106 Y (µm)",
    "GB LOW SPEED NDE VI-6104 X (µm)",
    "GB LOW SPEED NDE VI-6104 Y (µm)",
    "GB LOW SPEED DE VI-6105 X (µm)",
    "GB LOW SPEED DE VI-6105 Y (µm)",
    "GENERATOR DE VI-6107 X (µm)",
    "GENERATOR DE VI-6107 Y (µm)",
    "GENERATOR NDE VI-6108 X (µm)",
    "GENERATOR NDE VI-6108 Y (µm)"
  ],
  "TEMP & PRESS REDUCING": [
    "30-U-6101 MPS PIC-6102 (kg/cm2)",
    "30-U-6101 ZI-6102 (%)",
    "30-U-6101 LPS LETDOWN PI-6103",
    "30-U-6101 TICA-6101 (°C)",
    "30-U-6101 ZI-6101 (%)",
    "30-U-6102 TICA-6103 (°C)",
    "30-U-6102 ZI-6103 (%)",
    "PCV-6105 (%)",
    "PICA-6105 (kg/cm2)",
    "TIA-6108 (°C)",
    "INSTRUMENT AIR (kg/cm2)",
    "PI-6172 (kg/cm2)"
  ],
  "STEAM CONDENSATE RECOVERY SYSTEM": [
    "30-TK-6201 LCV-6211 (%)",
    "30-TK-6201 LICA-6211 (A/M)",
    "30-TK-6201 LICA-6211 (%)",
    "30-P-6202 A (Amp/Standby)",
    "30-P-6202 B (Amp/Standby)",
    "30-D-6201 LICA-6209 (A/M)",
    "30-D-6201 LICA-6209 (%)",
    "30-D-6201 TIC-6213 (A/M)",
    "30-D-6201 TIC-6213 (°C)",
    "30-E-6202 PICA-6216 (A/M)",
    "30-E-6202 PICA-6216 (kg/cm2)",
    "30-E-6202 PCV-6216 (%)",
    "SC-C-6202 A/B (A/M)",
    "SC-C-6202 A/B (%)",
    "SC-C-6202 A/B (ON/OFF)"
  ],
  "DEAERATION & WATER FEEDING SYSTEM": [
    "30-U-6201 STEAM PI-6202 (kg/cm2)",
    "30-U-6201 STEAM FI-6201 (kg/h)",
    "30-U-6201 STEAM PCV-6201 (%)",
    "30-U-6201 STEAM PICA-6201 (A/M)",
    "30-U-6201 STEAM PICA-6201 (kg/cm2)",
    "30-U-6201 BFW PI-6203 (kg/cm2)",
    "30-U-6201 BFW FI-6202 (m3/h)",
    "30-U-6201 BFW LCV-6201 (%)",
    "30-U-6201 BFW TIA-6205 (°C)",
    "30-U-6201 BFW LICA-6201 A (A/M)",
    "30-U-6201 BFW LICA-6201 A (%)",
    "30-U-6201 BFW LISA-6201 B (%)",
    "P-6201 A (Amp/Standby)",
    "P-6201 B (Amp/Standby)"
  ],
  "BFW PUMP COOLING & SEALING": [
    "TISA-6206 (°C)",
    "TISA-6207 (°C)",
    "TISA-6208 (°C)",
    "TISA-6209 (°C)",
    "TISA-6210 (°C)",
    "PIA-6207 A/B (kg/cm2)",
    "PISA-6210 (kg/cm2)"
  ],
  "SS-1000": [
    "SCADA/UBB Power (kW)",
    "TR-MAIN01 Winding Temp (°C)",
    "TR-MAIN01 Oil Temp (°C)",
    "TR-EMERGENCY01 Power (kW)",
    "TR-EMERGENCY02 / P-6201B Power (kW)",
    "SS-2000 Power (kW)",
    "SS-4100 Power (kW)",
    "SS-7000 Power (kW)",
    "30-C1301 Power (kW)",
    "30-C1302 Power (kW)",
    "30-P1302 Power (kW)",
    "30-P1301 Power (kW)",
    "30-P1303 Power (kW)",
    "30-P6201A Power (kW)",
    "30-TR-10 Power (kW)",
    "SS-6500 via TR-MAIN02 Power (kW)"
  ],
  "SCADA PEMBANGKIT": [
   "Power Pabrik 3B (MW)",
   "PLN (MW)",
   "UBB (MW)",
   "PIE / GGCP (MW)",
   "TG-65 (MW)",
   "TG-66 (MW)",
   "GTG (MW)"
  ]
};

// ==========================================
// AREA PANEL ASAM SULFAT
// ==========================================
const AREAS_PANEL_ASAM_SULFAT = {
  "SULPHUR HANDLING 30-TK-1001": [
    "30-P-1004 A/B LOAD (Amp)",
    "30-TK-1001 TI-1001-1 (°C)",
    "30-TK-1001 TI-1001-2 (°C)",
    "30-TK-1001 LI-1002 (%)",
    "30-D-1006 LICA-1003 (%)"
  ],
  "SO2 GENERATION": [
    "30-D-1006 HCV-1101 (%)",
    "30-B-1101 PI-1001-5 (kg/cm2)",
    "30-B-1102 TI-1001-3 (°C)",
    "30-B-1101 TIA-1101 A (°C)",
    "30-B-1101 TIA-1101 B (°C)",
    "30-B-1101 TIA-1101 C (°C)",
    "30-B-1101 TI-1002-10 (°C)",
    "30-B-1101 TI-1202-5 (°C)",	
    "30-B-1101 JUG DAMPER HV-1110 (mm)",
    "30-B-1101 STEAM DRUM HV-1111 (%)"
  ],
  "UTILITY DISTRIBUTION": [
    "CW HEADER PIA-1008 (kg/cm2)",	
    "INSTRUMENT AIR PIA-1009 (kg/cm2)",	
    "RCW PIA-1010 (kg/cm2)",	
    "CW OUTLET AIA-1103 (pH)"
  ],
  "STEAM SYSTEM": [
    "30-B-1104 PIA-1102 A/B (kg/cm2)",	
    "30-B-1104 LICA-1102 (%)",	
    "30-B-1104 LCV-1102 (%)",
    "30-E-1102 HCV-1102 (%)",	
    "30-E-1102 TI-1106 (°C)",
    "30-E-1102 TIA-1107 (°C)",	
    "30-E-1102 TCV-1103 (%)",
    "30-E-1102 TICA-1103 (°C)",
    "30-E-1102 PICSA-1103 (kg/cm2)",	
    "30-E-1102 PCV-1103 (%)"
  ],
  "LPS & BFW SYSTEM": [
    "30-E-1211 TIC-1104 (°C)",	
    "30-E-1212 TIC-1105 (°C)",	
    "PI-1003-5 (kg/cm2)",
    "TI-1001-4 (°C)",
    "TI-1108 (°C)",	
    "TI-1002-1 (°C)",
    "TI-1109 (°C)"
  ],
  "SO2 CONVERSION": [
    "30-R-1201 TI-1201-1 (°C)", "30-R-1201 TI-1201-2 (°C)", "30-R-1201 TI-1201-3 (°C)",
    "30-R-1201 TI-1201-4 (°C)", "30-R-1201 TI-1201-5 (°C)", "30-R-1201 TI-1201-6 (°C)",
    "30-R-1201 TI-1201-25 (°C)", "30-R-1201 TI-1201-7 (°C)", "30-R-1201 TI-1201-8 (°C)",
    "30-R-1201 TI-1201-9 (°C)", "30-R-1201 TI-1201-10 (°C)", "30-R-1201 TI-1201-11 (°C)",
    "30-R-1201 TI-1201-12 (°C)", "30-R-1201 TI-1201-26 (°C)", "30-R-1201 TI-1201-13 (°C)",
    "30-R-1201 TI-1201-14 (°C)", "30-R-1201 TI-1201-15 (°C)", "30-R-1201 TI-1201-16 (°C)",
    "30-R-1201 TI-1201-17 (°C)", "30-R-1201 TI-1201-18 (°C)", "30-R-1201 TI-1201-27 (°C)",
    "30-R-1201 TI-1201-19 (°C)", "30-R-1201 TI-1201-20 (°C)", "30-R-1201 TI-1201-21 (°C)",
    "30-R-1201 TI-1201-22 (°C)", "30-R-1201 TI-1201-23 (°C)", "30-R-1201 TI-1201-24 (°C)",
    "30-R-1201 TI-1201-28 (°C)", "30-E-1201 HCV-1201 (%)", "30-E-1202 HCV-1202 (%)",	
    "30-E-1203 TI-1002-6 (°C)", "30-E-1204 TI-1002-8 (°C)", "30-T-1302 TI-1002.7 (°C)",
    "30-T-1303 TI-1002.9 (°C)", "AIA-1301 (%)"
  ],
  "SO3 ABSORPTION": [
    "30-C-1301/2 FIQ-1301 (Nm3/jam)","30-C-1301 PI-1301 (mmH2O)", "30-C-1301/2 HV-1301/2-1 (%)", "30-C-1301/2 HV-1301/2-2 (%)",
    "30-C-1301/2 HC-1303/4 (%)", "30-C-1301/2 (Amp)", "30-C-1301/2 PI-1304/03 (mmH2O)",
    "30-C-1301/2 PI-1304 (Kg/cm2)", "30-C-1301/2 TI-1001.8 (°C)", "30-T-1301 TI-1001.7 (°C)",
    "30-T-1301 TI-1001.6 (°C)", "30-T-1301 TI-1001.5 (°C)", "30-T-1302 TI-1001.12 (°C)",
    "30-T-1302 TI-1001.11 (°C)", "30-T-1302 TI-1001.10 (°C)", "30-T-1303-TI-1001.15 (°C)",
    "30-T-1303-TI-1001.14 (°C)", "30-T-1303-TI-1001.13 (°C)", "30-D-1301 LICA-1301 (%)",	
    "30-D-1301 LCV-1301 (%)", "30-T-1302 CICA-1301 (%)", "30-T-1302 CCV-1301 (%)",	
    "30-T-1301 P-1301 (Amp)", "30-T-1302 P-1302 (Amp)", "30-T-1303 P-1303 (Amp)",	
    "30-D-1302 LICA-1302 (%)", "30-D-1302 LCV-1302 (%)", "30-T-1303 CICA-1302 (%)",	
    "30-T-1303 CCV-1302 (%)", "CEMS AIA-1303 (ppm)", "30-C-1301 HIC-1301-1 (%)",
    "30-C-1301 HIC-1301-2 (%)", "30-C-1301 HIC-1303 (%)", "30-C-1301 HV-1301 (%)"
  ],

 "FLOW METER": [
    "FICQ-1101 FLOW (Ton/Jam)","FICQ-1101 TOTAL (Ton)","30-B-1104 FLOW  FI-1102 (Ton/Jam)","30-B-1104 FIQ-1102 TOTAL (Ton)",	
    "30-B-1101 FIQ-1103 FLOW (M3/h)","30-B-1101 FIQ-1103 TOTAL (Ton)","30-E-1102 FI-1105 FLOW (m3/h)","30-E-1102 FIQ-1105 TOTAL (Ton)",	
    "FI-1302 FLOW (Ton/Jam)","FIQ-1302 TOTAL (Ton)","FI-1303 FLOW (Ton/Jam)","FIQ-1303 TOTAL (Ton)","FIQ-1304 FLOW (m3/h)","FIQ-1304 TOTAL (m3)"
],
  "AIR BLOWER 30-C-1301": [
    "30-C-1301 TIA-1336 (°C)", "30-C-1301 ∆T-1336 (°C)", "30-C-1301 PI-1333 A",	
    "30-C-1301 PI-1333 B", "30-C-1301 PI-1333 C", "30-C-1301 PT-1340",	
    "30-C-1301 TIA-1337 (°C)", "30-C-1301 TIA-1331 (°C)", "30-C-1301 TIA-1333 (°C)",	
    "30-C-1301 TIA-1334 (°C)", "30-C-1301 ZI-1334", "30-C-1301 VIA-1331 X (µm)",	
    "30-C-1301 VIA-1332 Y (µm)", "30-C-1301 VIA-1333 X (µm)", "30-C-1301 VIA-1334 Y (µm)",	
    "30-C-1301 TIA-1341 (°C)", "30-C-1301 TIA-1343 (°C)", "30-C-1301 TIA-1345 (°C)",	
    "30-C-1301 TIA-1346 (°C)", "30-C-1301 TI-1347 (°C)", "30-C-1301 TI-1348 (°C)",	
    "30-C-1301 VIA-1341 X (µm)", "30-C-1301 VIA-1342 Y (µm)", "30-C-1301 VIA-1343 Y (µm)",	
    "30-C-1301 VIA-1344 X (µm)", "30-C-1301 LOAD (Ampere)", "30-C-1301 TIA-1352 (°C)",	
    "30-C-1301 TIA-1355 (°C)", "30-C-1301 TIA-1357 U (°C)", "30-C-1301 TIA-1358 V (°C)",	
    "30-C-1301 TIA-1359 W (°C)"
  ],
  "STARTUP BLOWER C-1302": [
    "30-C-1302 TISA-1367 (°C)", "30-C-1302 TISA-1368 (°C)", "30-C-1302 TISA-1371 (°C)",	
    "30-C-1302 TISA-1372 (°C)", "30-C-1302 TISA-1373 (°C)", "30-C-1302 TISA-1364 (°C)","30-C-1302 TISA-1365 (°C)","30-C-1302 TISA-1366 (°C)"
  ]
};
// ============================================
// PENGELOMPOKAN GRUP PANEL ASAM SULFAT (WAJIB DI ATAS LOGSHEET_CONFIG)
// ============================================
const GROUPS_PANEL_ASAM_SULFAT = {
    "SULPHUR & GENERATION": ["SULPHUR HANDLING 30-TK-1001", "SO2 GENERATION"],
    "STEAM & UTILITY": ["STEAM SYSTEM", "LPS & BFW SYSTEM", "UTILITY DISTRIBUTION"],
    "CONVERSION & ABSORPTION": ["SO2 CONVERSION", "SO3 ABSORPTION","FLOW METER"],
    "BLOWER": ["AIR BLOWER 30-C-1301", "STARTUP BLOWER C-1302"]
};
const GROUPS_PANEL_STG175 = {
            "1. Steam & Condenser System": ["STEAM SYSTEM MAIN","GLAND STEAM SYSTEM","STEAM EXTRACTION","MAIN CONDENSER"],
            "2. Turbine Oil Systems": ["LUBE OIL SYSTEM","HP OIL SYSTEM","SHAFT LINE LUBE OIL"],
            "3. Temperature Monitoring": ["TURBINE BEARING TEMPERATURE","GEARBOX TEMPERATURE","GENERATOR TEMPERATURE","VIBRATION SYSTEM"],
            "4. Synchonizarion & Power": ["SYNCHRONIZATION & EXCITATION","SS-1000","SCADA PEMBANGKIT"],
            "5. PRDS & Condensate Recovery": ["TEMP & PRESS REDUCING","STEAM CONDENSATE RECOVERY SYSTEM"],
            "6. Deaerator & Electrical Load": ["DEAERATION & WATER FEEDING SYSTEM","BFW PUMP COOLING & SEALING"]
};

// ============================================
// 3. MASTER CONFIGURATION (PUSAT KENDALI DRAFT & OFFLINE)
// ============================================
const LOGSHEET_CONFIG = {
    'LAPANGANTURBIN': {
        title: 'Logsheet Turbin',
        submitType: 'LOGSHEET_LAPANGANTURBIN',
        areas: AREAS,
        draftKey: 'draft_turbine',
        offlineKey: 'offline_turbine',
        photoKey: 'photos_turbine',
        themeColor: '#3b82f6',
        spreadsheetId: '1505BXCba8jQUynCvCtDpuvMveiez_RpJpYfM3LgHFn0'
    },
    'CT': {
        title: 'Logsheet Cooling Tower',
        subtitle: 'Input data operasional basin & pompa',
        areas: AREAS_CT,
        draftKey: 'draft_ct',
        offlineKey: 'offline_ct',
        photoKey: 'photos_ct',
        submitType: 'LOGSHEET_CT',
        themeColor: '#06b6d4',
        spreadsheetId: '1thBTCwTqK0Ip2_nmV9C2Cfa1iX0yoimLN5yQcNOshOU'
    },
    '1300': {
        title: 'Logsheet Area 1300',
        subtitle: 'Drying Air, Absorber & Lube Oil',
        areas: AREAS_1300,
        draftKey: 'draft_1300',
        offlineKey: 'offline_1300',
        photoKey: 'photos_1300',
        submitType: 'LOGSHEET_1300',
        themeColor: '#8b5cf6',
        spreadsheetId: '1h8MMCrye3iH4xvsFgkWk3vGYOa4rSpeGUGpe_C0VcNs'
    },
    '1100_1200': {
        title: 'Logsheet Area 1100/1200',
        subtitle: 'Sulphur, Furnace, WHB',
        areas: AREAS_1100,
        draftKey: 'draft_1100',
        offlineKey: 'offline_1100',
        photoKey: 'photos_1100',
        submitType: 'LOGSHEET_1100_1200',
        themeColor: '#eab308',
        spreadsheetId: '180JCPJ9zp-KJkUaCwVfOCBn4cBvvlG9aMd_wBvXawLQ'
    },
    '1000': {
        title: 'Logsheet Area 1000',
        subtitle: 'Pencairan Belerang & Filtrasi',
        areas: AREAS_1000,
        draftKey: 'draft_1000',
        offlineKey: 'offline_1000',
        photoKey: 'photos_1000',
        submitType: 'LOGSHEET_1000',
        themeColor: '#ef4444',
        spreadsheetId: '1YrgyD92z8z8yba1rKePH0UNa4hu03eDITwFdDp-J0QY'
    },
    'PANEL_STG': {
        title: 'Logsheet Panel STG 17.5 MW',
        submitType: 'LOGSHEET_PANEL_STG',
        draftKey: 'draft_panel_stg',
        offlineKey: 'offline_panel_stg',
        photoKey: 'photos_panel_stg',
        themeColor: '#1d6be8',
        areas: AREAS_PANEL_STG175,
        groups: GROUPS_PANEL_STG175,
        spreadsheetId: '1pp2GdxebsN5Ta2FpBsW-CSwr591BwN5GrR_jjbIKEmU'
    },
    'PANEL_ASAM_SULFAT': {
        title: 'Panel Asam Sulfat',
        submitType: 'LOGSHEET_PANEL_ASAM_SULFAT',
        draftKey: 'draft_panel_asam_sulfat',
        offlineKey: 'offline_panel_asam_sulfat',
        photoKey: 'photos_panel_asam_sulfat',
        themeColor: '#eab308',
        areas: AREAS_PANEL_ASAM_SULFAT,
        groups: GROUPS_PANEL_ASAM_SULFAT,
        spreadsheetId: '1_1Hak9fgLcGlENwDL40IvQ_qeKxPodl8irLrmjUSiPs'
    },
    'BALANCING': {
        title: 'Balancing Power & Steam',
        submitType: 'BALANCING',
        draftKey: 'draft_balancing',
        offlineKey: 'offline_balancing',
        photoKey: 'photos_balancing',
        themeColor: '#10b981',
        spreadsheetId: '1pp2GdxebsN5Ta2FpBsW-CSwr591BwN5GrR_jjbIKEmU'
    }
};
// ============================================
// 4. TPM CONFIG MASTER (STANDALONE)
// ============================================
const TPM_SPREADSHEET_ID = '14PQJVmj_-lnTJHeg7mtCD9CIR1CyiRRoaOJwsoVyjqo';
const TPM_CONFIG_MASTER = {
    'SULFAT': [
        { name: "AREA 1100 / 1200", icon: "🏭", color: "#eab308" },
        { name: "AREA 1300", icon: "⚙️", color: "#8b5cf6" }
    ],
    'UTILITAS': [
        { name: "AREA #6200", icon: "🔧", color: "#3b82f6" },
        { name: "AREA TURBIN", icon: "⚡", color: "#06b6d4" },
        { name: "COOLING TOWER", icon: "🗼", color: "#10b981" },
        { name: "AREA COMPRESSOR", icon: "🌬️", color: "#f59e0b" }
    ],
   'MELTER': [
        { name: "AREA 1000 - MELTER", icon: "🔥", color: "#ef4444" },
        { name: "AREA 1000 - FILTRASI", icon: "🧪", color: "#f87171" },
        { name: "AREA 1000 - POMPA", icon: "⚙️", color: "#dc2626" }
      ]
};

// ============================================
// KONFIGURASI INPUT KHUSUS (DROPDOWN DLL)
// ============================================
const INPUT_TYPES = {
    PUMP_STATUS: {
        patterns: [
            // Pola spesifik diletakkan di depan
            'FILTRASI/STANDBY', '(Remote/Running/Stop)', '(Running/Stop)', 
            '(ON/AUTO)', '(A/B)', '(ON/OFF)', '(On/Off)', '(A/M)', 
            'RUN/STANDBY', 'RUN/STOP', 'STATUS' 
        ],
        options: {
            '(A/B)': ['A', 'B'],
            '(ON/OFF)': ['ON', 'OFF'],
            '(ON/AUTO)': ['ON','AUTO'],
            '(On/Off)': ['On', 'Off'],
            '(Running/Stop)': ['Running', 'Stop'],
            '(Remote/Running/Stop)': ['Remote', 'Running', 'Stop'],
            '(A/M)': ['Auto', 'Manual'],
            'STATUS': ['Running', 'Stop', 'Standby'],
            'RUN/STANDBY': ['RUN', 'STANDBY'],
            'RUN/STOP': ['RUN', 'STOP'],
            'FILTRASI/STANDBY': ['FILTRASI', 'STANDBY']
        }
    }
};
