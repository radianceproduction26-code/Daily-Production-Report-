// Radiance Polymers - Digital Production Reporting System
// Main Application Orchestrator
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProductionConsole from './components/ProductionConsole';
import HourEntryModal from './components/HourEntryModal';
import MouldChangeModal from './components/MouldChangeModal';
import MaterialModal from './components/MaterialModal';
import CounterModal from './components/CounterModal';
import ShiftSummaryDrawer from './components/ShiftSummaryDrawer';
import ShiftSetupModal from './components/ShiftSetupModal';
import DashboardView from './components/DashboardView';
import ReportsView from './components/ReportsView';
import AdminMastersView from './components/AdminMastersView';
import AuditLogViewer from './components/AuditLogViewer';
import SystemHealthDashboard from './components/SystemHealthDashboard';
import TrialGoLiveDashboard from './components/TrialGoLiveDashboard';
import SetupWizardModal from './components/SetupWizardModal';
import MockShiftValidationModal from './components/MockShiftValidationModal';
import TrialBanner from './components/TrialBanner';
import SettingsView from './components/SettingsView';
import DataUploadCenter from './components/DataUploadCenter';
import PartMasterView from './components/PartMasterView';
import MasterSheetView from './components/MasterSheetView';
import PasswordAuthModal from './components/PasswordAuthModal';
import { checkPilotReadiness } from './services/dataUploadService';
import {
  pushShiftReportToCloud,
  fetchShiftReportsFromCloud,
  subscribeToShiftReports
} from './services/cloudSyncService';
import { I18nProvider } from './i18n/I18nContext';

import {
  initializeStorage,
  getActiveReport,
  saveActiveReport,
  getShiftReports,
  saveShiftReports,
  getMachines,
  saveMachines,
  getMoulds,
  saveMoulds,
  getParts,
  saveParts,
  getMachinePartMappings,
  saveMachinePartMappings,
  getRejectionCodes,
  saveRejectionCodes,
  getDowntimeCodes,
  saveDowntimeCodes,
  getMaterials,
  saveMaterials,
  getSystemSettings,
  saveSystemSettings,
  createNewShiftReport,
  executeMouldChange,
  addDynamicRejectionCode,
  addDynamicDowntimeCode
} from './services/storageService';
import { USERS, SHIFT_HOURS_DEFINITIONS } from './data/seedData';
import { recordAuditLog } from './services/auditService';

export default function App() {
  // 1. Initialize local storage & check first-time setup
  useEffect(() => {
    initializeStorage();
    const isSetupCompleted = localStorage.getItem('first_time_setup_completed') === 'true';
    const storedMachines = getMachines();
    const storedParts = getParts();
    if (!isSetupCompleted && (!storedMachines || storedMachines.length === 0 || !storedParts || storedParts.length === 0)) {
      setIsSetupWizardOpen(true);
    }
  }, []);

  // 2. Application Core State
  const [currentUser, setCurrentUser] = useState(USERS[0]); // Default: Operator Rajesh Kumar
  const [activeTab, setActiveTab] = useState('console'); // 'console', 'analytics', 'reports', 'admin', 'audit'

  // Master Data State
  const [machines, setMachines] = useState(getMachines());
  const [moulds, setMoulds] = useState(getMoulds());
  const [parts, setParts] = useState(getParts());
  const [mappings, setMappings] = useState(getMachinePartMappings());
  const [rejectionCodes, setRejectionCodes] = useState(getRejectionCodes());
  const [downtimeCodes, setDowntimeCodes] = useState(getDowntimeCodes());
  const [materials, setMaterials] = useState(getMaterials());
  const [settings, setSettings] = useState(getSystemSettings());

  // Shift Reports State
  const [reports, setReports] = useState(getShiftReports());
  const [activeReport, setActiveReport] = useState(getActiveReport());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState(null);

  // Cloud Sync: Fetch on startup & setup Realtime subscription
  const handleRefreshCloud = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await fetchShiftReportsFromCloud();
      if (res && res.success && res.reports) {
        setReports(res.reports);
        const active = getActiveReport();
        if (active) setActiveReport(active);
      }
      setLastCloudSyncTime(new Date().toISOString());
    } catch (e) {
      console.warn('Cloud refresh warning:', e);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  useEffect(() => {
    // Initial fetch from cloud database
    handleRefreshCloud();

    // Subscribe to live Postgres changes on shift_reports_sync
    const unsubscribe = subscribeToShiftReports((payload) => {
      try {
        console.log('Realtime shift reports sync notification received:', payload);
        const currentReports = getShiftReports();
        if (payload?.new?.full_data) {
          const incoming = payload.new.full_data;
          const idx = currentReports.findIndex(r => r.id === incoming.id);
          if (idx >= 0) {
            currentReports[idx] = incoming;
          } else {
            currentReports.unshift(incoming);
          }
          saveShiftReports(currentReports);
          setReports([...currentReports]);
        } else {
          handleRefreshCloud();
        }
      } catch (err) {
        console.warn('Realtime payload handling error:', err);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 3. Modals and Drawers Visibility
  const [hourModalState, setHourModalState] = useState({
    isOpen: false,
    hourDef: null,
    existingEntry: null,
    session: null
  });

  const [isMouldChangeModalOpen, setIsMouldChangeModalOpen] = useState(false);
  const [mouldChangeHourIndex, setMouldChangeHourIndex] = useState(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [isSummaryDrawerOpen, setIsSummaryDrawerOpen] = useState(false);
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [isMockValidationOpen, setIsMockValidationOpen] = useState(false);

  // Supervisor PIN Protection ('2026') for non-Shifts tabs
  const [isSupervisorUnlocked, setIsSupervisorUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('rp_supervisor_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const handleTabChange = (targetTab) => {
    if (targetTab === 'console') {
      setActiveTab('console');
      return;
    }

    if (isSupervisorUnlocked) {
      setActiveTab(targetTab);
    } else {
      setPendingTab(targetTab);
      setPasswordModalOpen(true);
    }
  };

  const handleUnlockSupervisor = () => {
    try {
      sessionStorage.setItem('rp_supervisor_unlocked', 'true');
    } catch (e) {}
    setIsSupervisorUnlocked(true);
    setPasswordModalOpen(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleLockSupervisor = () => {
    try {
      sessionStorage.removeItem('rp_supervisor_unlocked');
    } catch (e) {}
    setIsSupervisorUnlocked(false);
    setActiveTab('console');
  };

  const handleOpenMouldChangeModal = (hourIndex = null) => {
    setMouldChangeHourIndex(hourIndex);
    setIsMouldChangeModalOpen(true);
  };

  // Sync state helper: saves locally and pushes to Supabase Cloud + Webhook
  const syncReportUpdates = (updatedReport) => {
    setActiveReport(updatedReport);
    saveActiveReport(updatedReport);
    setReports(getShiftReports());
    // Auto-push to Supabase cloud and Google Sheet webhook
    pushShiftReportToCloud(updatedReport).catch(err => {
      console.warn('Background cloud sync push notice:', err);
    });
  };

  // Get active session helper
  const getActiveSession = () => {
    if (!activeReport || !activeReport.mouldSessions) return null;
    return activeReport.mouldSessions[activeReport.mouldSessions.length - 1] || activeReport.mouldSessions[0];
  };

  // --- HANDLERS ---

  // 1. Save Hourly Entry
  const handleSaveHourlyEntry = (payload, existingEntry, editReason, overrideSessionId = null) => {
    if (!activeReport) return;

    const targetSessionId = overrideSessionId || hourModalState.session?.id || getActiveSession()?.id;
    const updatedSessions = activeReport.mouldSessions.map(session => {
      if (session.id === targetSessionId) {
        const entries = [...(session.entries || [])];
        const existingIdx = entries.findIndex(e => e.hourIndex === payload.hourIndex);
        if (existingIdx >= 0) {
          entries[existingIdx] = payload;
        } else {
          entries.push(payload);
          entries.sort((a, b) => a.hourIndex - b.hourIndex);
        }
        return { ...session, entries };
      }
      return session;
    });

    const updatedReport = {
      ...activeReport,
      mouldSessions: updatedSessions
    };

    // Log to Audit Trail
    recordAuditLog({
      action: existingEntry ? 'HOURLY_ENTRY_UPDATED' : 'HOURLY_ENTRY_SAVED',
      tableName: 'hourly_production_entries',
      recordId: payload.id,
      user: currentUser,
      oldValue: existingEntry,
      newValue: payload,
      reason: editReason || `Logged H${payload.hourIndex} (${payload.hourInterval}) output`
    });

    syncReportUpdates(updatedReport);
  };

  // 3. Save Materials Consumption
  const handleSaveMaterials = (updatedMaterials) => {
    if (!activeReport) return;
    const activeSession = getActiveSession();
    if (!activeSession) return;

    const updatedSessions = activeReport.mouldSessions.map(session => {
      if (session.id === activeSession.id) {
        return { ...session, materials: updatedMaterials };
      }
      return session;
    });

    const updatedReport = {
      ...activeReport,
      mouldSessions: updatedSessions
    };

    recordAuditLog({
      action: 'MATERIALS_SAVED',
      tableName: 'material_consumption',
      recordId: activeSession.id,
      user: currentUser,
      oldValue: activeSession.materials,
      newValue: updatedMaterials,
      reason: `Saved materials consumption for Session ${activeSession.sessionSequence}`
    });

    syncReportUpdates(updatedReport);
  };

  // 4. Save Machine Counters
  const handleSaveCounters = ({ startCounter, endCounter }) => {
    if (!activeReport) return;
    const activeSession = getActiveSession();
    if (!activeSession) return;

    const updatedSessions = activeReport.mouldSessions.map(session => {
      if (session.id === activeSession.id) {
        return { ...session, startCounter, endCounter };
      }
      return session;
    });

    const updatedReport = {
      ...activeReport,
      mouldSessions: updatedSessions
    };

    recordAuditLog({
      action: 'COUNTERS_UPDATED',
      tableName: 'machine_counter',
      recordId: activeSession.id,
      user: currentUser,
      oldValue: { startCounter: activeSession.startCounter, endCounter: activeSession.endCounter },
      newValue: { startCounter, endCounter },
      reason: `Updated start/end counters for Session ${activeSession.sessionSequence}`
    });

    syncReportUpdates(updatedReport);
  };

  // 4b. Execute Mould / Tool Change
  const handleExecuteMouldChange = ({
    endCounter,
    endReason,
    newPart,
    newMould,
    operator_name,
    operatorName,
    effectiveHourIndex
  }) => {
    if (!activeReport) return;
    const activeSession = getActiveSession();
    if (!activeSession) return;

    try {
      const { updatedReport, newSession } = executeMouldChange({
        reportId: activeReport.id,
        currentSessionId: activeSession.id,
        endCounter,
        endReason,
        newPart,
        newMould,
        operator_name,
        operatorName,
        effectiveHourIndex
      });

      recordAuditLog({
        action: 'MOULD_CHANGED',
        tableName: 'shift_mould_sessions',
        recordId: newSession.id,
        user: currentUser,
        oldValue: {
          sessionSequence: activeSession.sessionSequence,
          partNumber: activeSession.partNumber,
          mouldNumber: activeSession.mouldNumber,
          endCounter
        },
        newValue: {
          sessionSequence: newSession.sessionSequence,
          partNumber: newSession.partNumber,
          mouldNumber: newSession.mouldNumber,
          startCounter: newSession.startCounter,
          startHour: newSession.startHour
        },
        reason: `Mould/Part changed to ${newSession.partNumber} (${newSession.partName}) at Hour ${newSession.startHour}`
      });

      syncReportUpdates(updatedReport);
      setHourModalState(prev => prev.isOpen ? { ...prev, session: newSession } : prev);
      setIsMouldChangeModalOpen(false);
      return { updatedReport, newSession };
    } catch (err) {
      console.error('Failed to execute mould change:', err);
      alert('Error changing mould: ' + (err.message || err));
      return null;
    }
  };

  // 5. Submit Shift Report (Operator)
  const handleSubmitReport = (reportId) => {
    const updated = {
      ...activeReport,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };

    recordAuditLog({
      action: 'REPORT_SUBMITTED',
      tableName: 'shift_reports',
      recordId: reportId,
      user: currentUser,
      oldValue: { status: activeReport.status },
      newValue: { status: 'submitted' },
      reason: 'Shift completed and submitted for supervisor review'
    });

    syncReportUpdates(updated);
  };

  // 6. Approve Shift Report (Supervisor)
  const handleApproveReport = (reportId, notes, selectedSupervisor) => {
    const supervisorSigner = selectedSupervisor || currentUser.fullName || 'Mr. Lokesh';
    const updated = {
      ...activeReport,
      status: 'approved',
      supervisorId: currentUser.id || 'sup-floor',
      supervisorName: supervisorSigner,
      supervisorNotes: notes,
      approvedAt: new Date().toISOString()
    };

    recordAuditLog({
      action: 'REPORT_APPROVED',
      tableName: 'shift_reports',
      recordId: reportId,
      user: { ...currentUser, fullName: supervisorSigner },
      oldValue: { status: activeReport.status },
      newValue: { status: 'approved', supervisorNotes: notes, supervisorName: supervisorSigner },
      reason: `Supervisor inspection completed and approved by ${supervisorSigner}`
    });

    syncReportUpdates(updated);
  };

  // 7. Unlock Report (Production Manager)
  const handleUnlockReport = (reportId, reason) => {
    const updated = {
      ...activeReport,
      status: 'unlocked',
      supervisorNotes: (activeReport.supervisorNotes ? activeReport.supervisorNotes + '\n' : '') + `[UNLOCKED by ${currentUser.fullName}]: ${reason}`
    };

    recordAuditLog({
      action: 'REPORT_UNLOCKED',
      tableName: 'shift_reports',
      recordId: reportId,
      user: currentUser,
      oldValue: { status: 'approved' },
      newValue: { status: 'unlocked' },
      reason: reason
    });

    syncReportUpdates(updated);
  };

  // 8. Create New Shift Report
  const handleCreateNewShift = (shiftData) => {
    const newReport = createNewShiftReport(shiftData);
    setReports(getShiftReports());
    setActiveReport(newReport);
    setActiveTab('console');

    const opName = newReport.operator_name || shiftData.operator_name || 'Floor Operator';
    recordAuditLog({
      action: 'SHIFT_INITIALIZED',
      tableName: 'shift_reports',
      recordId: newReport.id,
      user: currentUser,
      oldValue: null,
      newValue: {
        machine: shiftData.machine.machineNumber,
        shift: shiftData.shift,
        operator_name: opName
      },
      reason: `Initialized new shift report for ${shiftData.machine.machineNumber} with Operator ${opName}`
    });

    // Auto-open Hour 1 entry immediately for fast supervisor workflow (< 15s entry)
    if (newReport && newReport.mouldSessions && newReport.mouldSessions.length > 0) {
      setHourModalState({
        isOpen: true,
        hourDef: SHIFT_HOURS_DEFINITIONS[0],
        existingEntry: null,
        session: newReport.mouldSessions[0]
      });
    }
  };

  // Dynamic Master Code Creators (Supervisor / Manager / Admin)
  const handleAddDynamicRejection = (description) => {
    try {
      const created = addDynamicRejectionCode({ description, user: currentUser });
      setRejectionCodes(getRejectionCodes());
      return created;
    } catch (err) {
      alert(err.message);
      return null;
    }
  };

  const handleAddDynamicDowntime = (description, category) => {
    try {
      const created = addDynamicDowntimeCode({ description, category, user: currentUser });
      setDowntimeCodes(getDowntimeCodes());
      return created;
    } catch (err) {
      alert(err.message);
      return null;
    }
  };

  // 9. Admin Updates
  const handleUpdateMachines = (m) => { setMachines(m); saveMachines(m); };
  const handleUpdateMoulds = (m) => { setMoulds(m); saveMoulds(m); };
  const handleUpdateParts = (p) => { setParts(p); saveParts(p); };
  const handleUpdateMappings = (m) => { setMappings(m); saveMachinePartMappings(m); };
  const handleUpdateRejectionCodes = (c) => { setRejectionCodes(c); saveRejectionCodes(c); };
  const handleUpdateDowntimeCodes = (d) => { setDowntimeCodes(d); saveDowntimeCodes(d); };
  const handleUpdateSettings = (s) => { setSettings(s); saveSystemSettings(s); };

  const pilotReadiness = checkPilotReadiness({ machines, parts, mappings, usersList: USERS });

  const handleOpenNewShiftModal = () => {
    if (!pilotReadiness.isReady) {
      alert(`🔴 REQUIRED MASTER DATA NOT UPLOADED\n\nCannot start shift until mandatory master data is uploaded:\n- ${pilotReadiness.missing.join('\n- ')}\n\nPlease navigate to Data Upload Center to complete setup.`);
      return;
    }
    setIsNewShiftModalOpen(true);
  };

  const handleUpdateUserLanguage = (newLang) => {
    setCurrentUser(prev => ({
      ...prev,
      preferredLanguage: newLang
    }));
  };

  return (
    <I18nProvider currentUser={currentUser} onUpdateUserProfileLanguage={handleUpdateUserLanguage}>
      <div className="app-container">
        {/* 1. Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        onSwitchUser={(user) => setCurrentUser(user)}
        usersList={USERS}
        activeReport={activeReport}
        onOpenNewShiftModal={handleOpenNewShiftModal}
        onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
        isSupervisorUnlocked={isSupervisorUnlocked}
        onLockSupervisor={handleLockSupervisor}
      />


      {/* 2. Main Viewport */}
      <main className="main-viewport">
        {activeTab === 'console' && (
          <ProductionConsole
            activeReport={activeReport}
            onOpenHourModal={(hourDef, existingEntry, session) => {
              setHourModalState({
                isOpen: true,
                hourDef,
                existingEntry,
                session
              });
            }}
            onOpenMouldChangeModal={handleOpenMouldChangeModal}
            onOpenMaterialModal={() => setIsMaterialModalOpen(true)}
            onOpenCounterModal={() => setIsCounterModalOpen(true)}
            onOpenSummaryDrawer={() => setIsSummaryDrawerOpen(true)}
            currentUser={currentUser}
            onOpenNewShiftModal={handleOpenNewShiftModal}
            pilotReadiness={pilotReadiness}
          />
        )}

        {activeTab === 'mastersheet' && (
          <MasterSheetView
            reports={reports}
            onSelectReportForViewing={(rep) => {
              setActiveReport(rep);
              setActiveTab('console');
            }}
            onRefreshCloud={handleRefreshCloud}
            isSyncing={isCloudSyncing}
            lastSyncTime={lastCloudSyncTime}
          />
        )}

        {(activeTab === 'dashboard' || activeTab === 'reports' || activeTab === 'analytics') && (
          <DashboardView
            reports={reports}
            machines={machines}
            rejectionCodes={rejectionCodes}
            downtimeCodes={downtimeCodes}
            currentUser={currentUser}
            onSelectReportForViewing={(rep) => {
              setActiveReport(rep);
              setActiveTab('console');
            }}
            initialSubTab={activeTab === 'reports' ? 'reports' : 'oee'}
            onRefreshCloud={handleRefreshCloud}
            isSyncing={isCloudSyncing}
          />
        )}

        {(activeTab === 'part-master' || activeTab === 'admin' || activeTab === 'upload-center') && (
          <PartMasterView
            parts={parts}
            machines={machines}
            mappings={mappings}
            currentUser={currentUser}
            onRefreshData={() => {
              const freshParts = getParts();
              const freshMachines = getMachines();
              const freshMappings = getMachinePartMappings();
              setParts(freshParts);
              setMachines(freshMachines);
              setMappings(freshMappings);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            machines={machines}
            moulds={moulds}
            parts={parts}
            usersList={USERS}
            reports={reports}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
            onOpenMockValidation={() => setIsMockValidationOpen(true)}
            currentUser={currentUser}
            rejectionCodes={rejectionCodes}
            downtimeCodes={downtimeCodes}
          />
        )}


        {activeTab === 'audit' && (
          <AuditLogViewer />
        )}

        {activeTab === 'health' && (
          <SystemHealthDashboard />
        )}

        {activeTab === 'trial' && (
          <TrialGoLiveDashboard
            machines={machines}
            moulds={moulds}
            parts={parts}
            usersList={USERS}
            reports={reports}
            systemSettings={settings}
            onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
            onOpenMockValidation={() => setIsMockValidationOpen(true)}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* 3. Global Modals & Dialogs */}

      {/* Hourly Entry Modal */}
      {hourModalState.isOpen && (
        <HourEntryModal
          isOpen={hourModalState.isOpen}
          onClose={() => setHourModalState({ isOpen: false, hourDef: null, existingEntry: null, session: null })}
          hourDef={hourModalState.hourDef}
          existingEntry={hourModalState.existingEntry}
          activeSession={hourModalState.session || getActiveSession()}
          rejectionCodes={rejectionCodes}
          downtimeCodes={downtimeCodes}
          onSave={handleSaveHourlyEntry}
          currentUser={currentUser}
          onAddDynamicRejection={handleAddDynamicRejection}
          onAddDynamicDowntime={handleAddDynamicDowntime}
          partsList={parts}
          mouldsList={moulds}
          onExecuteMouldChange={handleExecuteMouldChange}
          activeReport={activeReport}
        />
      )}

      {/* Mould Change Wizard Modal */}
      {isMouldChangeModalOpen && (
        <MouldChangeModal
          isOpen={isMouldChangeModalOpen}
          onClose={() => setIsMouldChangeModalOpen(false)}
          activeSession={getActiveSession()}
          mouldsList={moulds}
          partsList={parts}
          onExecuteMouldChange={handleExecuteMouldChange}
          initialHourIndex={mouldChangeHourIndex}
        />
      )}

      {/* Material Consumption Modal */}
      {isMaterialModalOpen && (
        <MaterialModal
          isOpen={isMaterialModalOpen}
          onClose={() => setIsMaterialModalOpen(false)}
          activeSession={getActiveSession()}
          materialsList={materials}
          onSaveMaterials={handleSaveMaterials}
        />
      )}

      {/* Machine Counters Modal */}
      {isCounterModalOpen && (
        <CounterModal
          isOpen={isCounterModalOpen}
          onClose={() => setIsCounterModalOpen(false)}
          activeSession={getActiveSession()}
          onSaveCounters={handleSaveCounters}
          tolerancePercent={settings.shotCounterTolerancePercent}
        />
      )}

      {/* Shift Summary & Signoff Drawer */}
      {isSummaryDrawerOpen && (
        <ShiftSummaryDrawer
          isOpen={isSummaryDrawerOpen}
          onClose={() => setIsSummaryDrawerOpen(false)}
          activeReport={activeReport}
          currentUser={currentUser}
          onSubmitReport={handleSubmitReport}
          onApproveReport={handleApproveReport}
          onUnlockReport={handleUnlockReport}
          systemSettings={settings}
        />
      )}

      {/* New Shift Setup Modal */}
      {isNewShiftModalOpen && (
        <ShiftSetupModal
          isOpen={isNewShiftModalOpen}
          onClose={() => setIsNewShiftModalOpen(false)}
          machinesList={machines}
          mouldsList={moulds}
          partsList={parts}
          currentUser={currentUser}
          onCreateShift={handleCreateNewShift}
        />
      )}

      {/* Data Initialization Setup Wizard */}
      {isSetupWizardOpen && (
        <SetupWizardModal
          isOpen={isSetupWizardOpen}
          onClose={() => setIsSetupWizardOpen(false)}
          machines={machines}
          onUpdateMachines={handleUpdateMachines}
          parts={parts}
          onUpdateParts={handleUpdateParts}
          mappings={mappings}
          onUpdateMappings={handleUpdateMappings}
          rejectionCodes={rejectionCodes}
          onUpdateRejectionCodes={handleUpdateRejectionCodes}
          downtimeCodes={downtimeCodes}
          onUpdateDowntimeCodes={handleUpdateDowntimeCodes}
          usersList={USERS}
          onCompleteWizard={() => setActiveTab('console')}
        />
      )}

      {/* Mock Shift Validation Guided Workflow */}
      {isMockValidationOpen && (
        <MockShiftValidationModal
          isOpen={isMockValidationOpen}
          onClose={() => setIsMockValidationOpen(false)}
        />
      )}

      {/* Supervisor PIN Protection Modal ('2026') */}
      <PasswordAuthModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingTab(null);
        }}
        onSuccess={handleUnlockSupervisor}
        targetTabName={
          pendingTab === 'mastersheet' ? 'Master Sheet' :
          pendingTab === 'dashboard' ? 'Dashboard' :
          pendingTab === 'part-master' ? 'Part Master' :
          pendingTab === 'settings' ? 'Settings' :
          pendingTab || 'this section'
        }
      />
    </div>
    </I18nProvider>
  );
}
