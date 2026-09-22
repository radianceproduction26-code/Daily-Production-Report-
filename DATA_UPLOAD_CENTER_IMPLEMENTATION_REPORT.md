# DATA UPLOAD CENTER IMPLEMENTATION REPORT
**Radiance Polymers – Production Reporting System v1.0.0**  
**Phase 13A – Simple Data Upload Center**  
**Date:** 17 September 2026  
**Target Environment:** MC03 Pilot Production Cell • Android Industrial Tablet & Desktop

---

## 1. Executive Summary

Phase 13A establishes a streamlined, non-ERP **Data Upload Center** designed for non-technical plant supervisors, production managers, and plant administrators. 

Master data setup for a fresh plant installation or pilot trial has been reduced to **under 5 minutes** across 5 simple cards:
1. **Machine Master** (Mandatory)
2. **Part Master** (Mandatory)
3. **Machine-Part Mapping** (Mandatory)
4. **Rejection Master** (Optional – 17 defaults provided)
5. **Downtime Master** (Optional – 19 defaults provided)

---

## 2. Navigation & Access Control

- **Navigation Item**: `DATA UPLOAD CENTER` added to the top navigation bar.
- **Access Rule**: Restricted strictly to users with role `admin` or `production_manager`.
- **Shop Floor Isolation**: Machine operators and general floor supervisors on daily shifts only see `Active Shifts`, `Reports`, `Masters`, and `Settings`, preventing accidental modifications during active production runs.

---

## 3. Master Data Summary Header

Positioned at the top of the Data Upload Center:
- **Live Counters**:
  - **Machines**: Real-time count of active injection moulding machines.
  - **Parts**: Real-time count of customer parts.
  - **Mappings**: Real-time count of machine-part compatibility rules.
  - **Rejection Reasons**: Real-time count of defect classification codes.
  - **Downtime Reasons**: Real-time count of stoppage categories.
  - **Last Upload Date**: Timestamp formatted as `DD/MM/YYYY HH:MM`.
- **One-Click Backup**:
  - `[DOWNLOAD ALL MASTER DATA]`: Instantly compiles all 5 active masters into a single multi-sheet Excel workbook (`Radiance_All_Master_Data_Backup_YYYY-MM-DD.xlsx`).

---

## 4. MC03 Pilot Readiness Gating

The system automatically audits data integrity and displays a prominent readiness banner:

### 🟢 READY FOR PRODUCTION
Triggered when:
1. Machine `MC03` exists in Machine Master.
2. Pilot Supervisors (`Mr. Lokesh` and `Mr. Akshay`) are verified.
3. At least 1 part is mapped to `MC03` and exists in Part Master (`F53200000A`, `5036677`, `5012394`).

### 🔴 REQUIRED MASTER DATA NOT UPLOADED
Triggered when any mandatory master (Machine, Part, Mapping) is missing.
- **Shift Start Interlock**:
  - The `[START NEW SHIFT]` button in `ProductionConsole` displays `START SHIFT (LOCKED)`.
  - Clicking any shift creation trigger raises an immediate alert listing the exact missing master datasets.

---

## 5. Template Specifications & Validation Schemas

Each card provides a dedicated `[Download Template]` button generating pre-formatted `.xlsx` workbooks with sample reference data:

| Master | Mandatory Columns | Sample Reference Values |
| :--- | :--- | :--- |
| **Machine Master** | `Machine Number`, `Machine Name`, `Make / Model`, `Capacity (Tons)`, `Hourly Cost Rate`, `Status` | `MC03`, `Milacron 450T`, `Milacron Magna T-450`, `450`, `1750.0`, `active` |
| **Part Master** | `Part Number`, `Part Name`, `Customer`, `Raw Material Grade`, `Part Weight (g)`, `Standard Cycle Time (s)`, `Cavity Count`, `Status` | `F53200000A`, `Front Bezel Enclosure`, `Schneider Electric`, `PP Copolymer 575P`, `42.5`, `20.0`, `2`, `active` |
| **Machine-Part Mapping**| `Machine Code`, `Part Code`, `Mould Number`, `Approved To Run` | `MC03`, `F53200000A`, `MLD-F53200000A`, `YES` |
| **Rejection Master** | `Rejection Code`, `Description`, `Category` | `A`, `Start Up`, `Process Defect` |
| **Downtime Master** | `Downtime Code`, `Category`, `Description` | `DT-101`, `Machine Related`, `Hydraulic Failure` |

---

## 6. Import Logic & Data Replacement Flow

When an Excel workbook is dropped or selected:
1. **Structure Validation**: Verifies header columns and data types using `SheetJS (xlsx)`.
2. **Import Accounting**:
   - `Imported`: Valid rows conforming to schema.
   - `Rejected`: Empty rows or rows missing primary keys (e.g., missing Machine Number).
3. **Replacement Rule**:
   - Prompts the user:
     ```
     Replace Existing Data?
     
     Found: X valid rows, Y rejected rows.
     
     Click OK (YES) to delete old master and import new master.
     Click Cancel (NO) to abort upload.
     ```
   - **YES**: Atomically purges old records for that entity, inserts validated rows, persists to `localStorage`, and logs to audit trail.
   - **NO**: Cancels the file input with zero state alteration.
4. **Visual Feedback**:
   - Displays: `Status: SUCCESS • Imported: X | Rejected: Y`.

---

## 7. 5-Minute Fresh Installation Workflow

```
[1. Open App]
     │
     ▼
[2. Log in as Plant Admin / Production Manager]
     │
     ▼
[3. Open "Data Upload Center"]
     │
     ▼
[4. Download Templates for Machine, Part, Mapping]
     │
     ▼
[5. Upload Machine Master] ───────► (Imported: 1, Rejected: 0)
     │
     ▼
[6. Upload Part Master] ──────────► (Imported: 3, Rejected: 0)
     │
     ▼
[7. Upload Mapping] ──────────────► (Imported: 3, Rejected: 0)
     │
     ▼
[8. Verify Banner] ───────────────► 🟢 READY FOR PRODUCTION
     │
     ▼
[9. Return to Console] ───────────► Shift Start Unlocked (< 5 Minutes)
```

---

## 8. Automated Verification Results

- **Test Suite**: [`test-data-upload-center.mjs`](file:///d:/Sohail%20Pathan/sohail%20pendrive/nexora%20growth/Application%20Data/Production%20Report%20App/test-data-upload-center.mjs)
- **Result**: **9 / 9 Tests Passed (100% Accuracy)**
- **Regression Suite**:
  - `test-validations.mjs`: **41 / 41 Passed**
  - `test-live-trial-activation.mjs`: **33 / 33 Passed**
  - `test-mc03-dry-run.mjs`: **12 / 12 Stages Passed**
- **Production Bundle**: `vite build` succeeded with **0 errors**.

---
*Report certified by Antigravity Autonomous Agent for Radiance Polymers Pvt. Ltd.*
