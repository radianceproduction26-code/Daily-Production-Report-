// Radiance Polymers - First Time Setup Wizard Modal
// 5-step guided onboarding wizard for plant master data initialization
import React, { useState } from 'react';
import {
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Database,
  HelpCircle,
  ShieldCheck,
  Building,
  Check,
  FileSpreadsheet,
  AlertOctagon,
  Clock,
  UserCheck
} from 'lucide-react';
import {
  downloadUnifiedPartMasterTemplate,
  downloadRejectionMasterTemplate,
  downloadDowntimeMasterTemplate,
  parseUnifiedPartMasterExcel,
  parseRejectionMasterExcel,
  parseDowntimeMasterExcel
} from '../services/dataUploadService';
import {
  saveUnifiedMasterData,
  saveRejectionCodes,
  saveDowntimeCodes,
  getSupervisors
} from '../services/storageService';

export default function SetupWizardModal({
  isOpen,
  onClose,
  machines = [],
  onUpdateMachines,
  parts = [],
  onUpdateParts,
  mappings = [],
  onUpdateMappings,
  rejectionCodes = [],
  onUpdateRejectionCodes,
  downtimeCodes = [],
  onUpdateDowntimeCodes,
  usersList = [],
  onCompleteWizard
}) {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState(1);

  // Upload States
  const [partUploadStatus, setPartUploadStatus] = useState(parts.length > 0 ? 'Uploaded' : 'Pending');
  const [partUploadError, setPartUploadError] = useState(null);
  const [partUploadSummary, setPartUploadSummary] = useState(null);

  const [rejectionUploadStatus, setRejectionUploadStatus] = useState(rejectionCodes.length > 0 ? 'Uploaded' : 'Pending');
  const [rejectionUploadError, setRejectionUploadError] = useState(null);
  const [rejectionUploadSummary, setRejectionUploadSummary] = useState(null);

  const [downtimeUploadStatus, setDowntimeUploadStatus] = useState(downtimeCodes.length > 0 ? 'Uploaded' : 'Pending');
  const [downtimeUploadError, setDowntimeUploadError] = useState(null);
  const [downtimeUploadSummary, setDowntimeUploadSummary] = useState(null);

  // Template Download Feedback State
  const [downloadFeedback, setDownloadFeedback] = useState(null);

  const handleDownloadPart = async () => {
    const res = await downloadUnifiedPartMasterTemplate();
    if (res?.success) {
      setDownloadFeedback({
        filename: res.filename || 'Radiance_Part_Master_Template.xlsx',
        location: res.location || 'Downloads/Radiance_Part_Master_Template.xlsx'
      });
    }
  };

  const handleDownloadRejection = async () => {
    const res = await downloadRejectionMasterTemplate();
    if (res?.success) {
      setDownloadFeedback({
        filename: res.filename || 'Radiance_Rejection_Master_Template.xlsx',
        location: res.location || 'Downloads/Radiance_Rejection_Master_Template.xlsx'
      });
    }
  };

  const handleDownloadDowntime = async () => {
    const res = await downloadDowntimeMasterTemplate();
    if (res?.success) {
      setDownloadFeedback({
        filename: res.filename || 'Radiance_Downtime_Master_Template.xlsx',
        location: res.location || 'Downloads/Radiance_Downtime_Master_Template.xlsx'
      });
    }
  };

  // Supervisors check
  const supervisors = getSupervisors();

  // Step 4 Validation Checks
  const isPartMasterLoaded = parts.length > 0;
  const isRejectionMasterLoaded = rejectionCodes.length > 0;
  const isDowntimeMasterLoaded = downtimeCodes.length > 0;
  const isSupervisorsAvailable = supervisors.length >= 2;
  const isReadyForProduction = isPartMasterLoaded && isRejectionMasterLoaded && isDowntimeMasterLoaded && isSupervisorsAvailable;

  const validationChecks = [
    {
      label: 'Part Master Loaded',
      passed: isPartMasterLoaded,
      detail: isPartMasterLoaded
        ? `${parts.length} Parts • ${machines.length} Machines • ${mappings.length} Mappings`
        : 'Pending Part Master Excel upload'
    },
    {
      label: 'Rejection Master Loaded',
      passed: isRejectionMasterLoaded,
      detail: isRejectionMasterLoaded
        ? `${rejectionCodes.length} Rejection defect codes registered`
        : 'Pending Rejection Master Excel upload'
    },
    {
      label: 'Downtime Master Loaded',
      passed: isDowntimeMasterLoaded,
      detail: isDowntimeMasterLoaded
        ? `${downtimeCodes.length} Downtime reason codes registered`
        : 'Pending Downtime Master Excel upload'
    },
    {
      label: 'Supervisors Available',
      passed: isSupervisorsAvailable,
      detail: 'Mr. Lokesh & Mr. Akshay active for floor signoff'
    },
    {
      label: 'Ready For Production',
      passed: isReadyForProduction,
      detail: isReadyForProduction ? 'All mandatory pre-trial checks verified' : 'Complete missing masters before proceeding'
    }
  ];

  // Handlers for Upload
  const handlePartFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const res = parseUnifiedPartMasterExcel(buffer);

      if (res.success && res.partsCount > 0) {
        if (onUpdateParts) onUpdateParts(res.parts);
        if (onUpdateMachines) onUpdateMachines(res.machines);
        if (onUpdateMappings) onUpdateMappings(res.mappings);

        saveUnifiedMasterData({
          parts: res.parts,
          machines: res.machines,
          mappings: res.mappings
        });

        setPartUploadStatus('Uploaded');
        setPartUploadError(null);
        setPartUploadSummary({
          parts: res.partsCount,
          machines: res.machinesCount,
          mappings: res.mappingsCount
        });
      } else {
        setPartUploadStatus('Validation Error');
        setPartUploadError(res.error || (res.errors && res.errors[0]) || 'Failed to parse Part Master Excel.');
      }
    } catch (err) {
      setPartUploadStatus('Validation Error');
      setPartUploadError(`Upload error: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleRejectionFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const res = parseRejectionMasterExcel(buffer);

      if (res.success && res.codes?.length > 0) {
        if (onUpdateRejectionCodes) onUpdateRejectionCodes(res.codes);
        saveRejectionCodes(res.codes);

        setRejectionUploadStatus('Uploaded');
        setRejectionUploadError(null);
        setRejectionUploadSummary(`${res.codes.length} rejection reasons loaded`);
      } else {
        setRejectionUploadStatus('Validation Error');
        setRejectionUploadError(res.error || 'Failed to parse Rejection Master Excel.');
      }
    } catch (err) {
      setRejectionUploadStatus('Validation Error');
      setRejectionUploadError(`Upload error: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleDowntimeFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const res = parseDowntimeMasterExcel(buffer);

      if (res.success && res.codes?.length > 0) {
        if (onUpdateDowntimeCodes) onUpdateDowntimeCodes(res.codes);
        saveDowntimeCodes(res.codes);

        setDowntimeUploadStatus('Uploaded');
        setDowntimeUploadError(null);
        setDowntimeUploadSummary(`${res.codes.length} downtime reasons loaded`);
      } else {
        setDowntimeUploadStatus('Validation Error');
        setDowntimeUploadError(res.error || 'Failed to parse Downtime Master Excel.');
      }
    } catch (err) {
      setDowntimeUploadStatus('Validation Error');
      setDowntimeUploadError(`Upload error: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleComplete = () => {
    localStorage.setItem('first_time_setup_completed', 'true');
    if (onCompleteWizard) onCompleteWizard();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--clr-primary)', letterSpacing: '0.5px' }}>
              FIRST TIME SETUP
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0 }}>
              Step {currentStep} of 5
            </h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} title="Close Setup Wizard">
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', background: 'var(--bg-surface2)', padding: '8px 16px', borderBottom: '1px solid var(--clr-border)', WebkitOverflowScrolling: 'touch' }}>
          {['1. Welcome', '2. Templates', '3. Upload', '4. Validate', '5. Ready'].map((stepName, i) => {
            const stepNum = i + 1;
            const isDone = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <div
                key={stepNum}
                style={{
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  fontWeight: isCurrent ? 800 : 600,
                  color: isCurrent ? 'var(--clr-primary)' : isDone ? 'var(--clr-success)' : 'var(--clr-text4)',
                  padding: '4px 10px',
                  whiteSpace: 'nowrap',
                  borderRadius: 'var(--r-full)',
                  background: isCurrent ? 'var(--clr-primary-lt)' : 'transparent'
                }}
              >
                {isDone ? '✓ ' : ''}{stepName}
              </div>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* STEP 1: WELCOME */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div style={{ padding: '16px 8px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--clr-primary-lt)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-primary)', marginBottom: '12px' }}>
                  <Building size={28} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-text)', margin: '0 0 6px 0' }}>
                  Radiance Production Setup
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--clr-text3)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                  Configure your plant master data for the MC03 pilot trial in a few simple steps.
                </p>
              </div>

              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface2)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--clr-primary)', textTransform: 'uppercase' }}>
                  What You'll Need:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--clr-text)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--clr-primary)' }} />
                  <span><strong>Part Master</strong> (13 columns auto-generating Parts, Machines, and Mappings)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--clr-text)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--clr-success)' }} />
                  <span><strong>Rejection Master</strong> (Standard defects: Burn Mark, Flash, etc.)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--clr-text)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--clr-warning)' }} />
                  <span><strong>Downtime Master</strong> (Breakdown, Mould Cleaning, etc.)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DOWNLOAD TEMPLATES */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--clr-text)', margin: '0 0 4px 0' }}>
                  Download Templates
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text3)', margin: 0, lineHeight: 1.4 }}>
                  Download official pre-formatted Excel templates for your plant data.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 1. Part Master Template */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadPart}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Download size={18} />
                  <span>Download Part Master Template (.xlsx)</span>
                </button>

                {/* 2. Rejection Master Template */}
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleDownloadRejection}
                  style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}
                >
                  <Download size={18} />
                  <span>Download Rejection Master Template (.xlsx)</span>
                </button>

                {/* 3. Downtime Master Template */}
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleDownloadDowntime}
                  style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}
                >
                  <Download size={18} />
                  <span>Download Downtime Master Template (.xlsx)</span>
                </button>
              </div>

              {/* Download Feedback Banner */}
              {downloadFeedback && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--clr-success-lt)',
                    border: '1px solid var(--clr-success)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <CheckCircle2 size={20} color="var(--clr-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--clr-success-dark)' }}>
                      Template downloaded successfully
                    </div>
                    <div style={{ fontSize: '0.80rem', color: 'var(--clr-text)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      Location: {downloadFeedback.location}
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: '12px', background: 'var(--bg-surface2)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--clr-text3)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Part Master Columns (13 Total)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--clr-text2)', lineHeight: 1.6 }}>
                  Part Number • Part Name • Customer Name • Machine Number • Machine Name • Machine Make • Machine Tonnage • Material Grade • Part Weight • Runner Weight • Cycle Time • Cavity Count • Status
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: UPLOAD TEMPLATES */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--clr-text)', margin: '0 0 4px 0' }}>
                  Upload Templates
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text3)', margin: 0 }}>
                  Upload your completed Excel sheets to initialize plant masters.
                </p>
              </div>

              {/* 1. Part Master Upload */}
              <div
                className="card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  border: partUploadStatus === 'Uploaded' ? '2px solid var(--clr-success)' : '1px dashed var(--clr-border-dark)',
                  background: partUploadStatus === 'Uploaded' ? 'var(--clr-success-lt)' : 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--clr-text)' }}>
                      1. Part Master (13-Col)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: partUploadStatus === 'Uploaded' ? 'var(--clr-success-dark)' : 'var(--clr-text3)' }}>
                      {partUploadStatus === 'Uploaded' ? '✓ Parts, machines, and mappings loaded' : 'Pending upload'}
                    </div>
                  </div>

                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                    <UploadCloud size={15} />
                    <span>{partUploadStatus === 'Uploaded' ? 'Re-upload' : 'Upload Part Excel'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={handlePartFileUpload}
                    />
                  </label>
                </div>
                {partUploadSummary && (
                  <div style={{ fontSize: '11px', color: 'var(--clr-success-dark)', fontWeight: 600 }}>
                    Loaded: {partUploadSummary.parts} Parts, {partUploadSummary.machines} Machines, {partUploadSummary.mappings} Mappings.
                  </div>
                )}
                {partUploadError && (
                  <div style={{ fontSize: '11px', color: 'var(--clr-error)', fontWeight: 600 }}>
                    {partUploadError}
                  </div>
                )}
              </div>

              {/* 2. Rejection Master Upload */}
              <div
                className="card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  border: rejectionUploadStatus === 'Uploaded' ? '2px solid var(--clr-success)' : '1px dashed var(--clr-border-dark)',
                  background: rejectionUploadStatus === 'Uploaded' ? 'var(--clr-success-lt)' : 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--clr-text)' }}>
                      2. Rejection Master
                    </div>
                    <div style={{ fontSize: '0.75rem', color: rejectionUploadStatus === 'Uploaded' ? 'var(--clr-success-dark)' : 'var(--clr-text3)' }}>
                      {rejectionUploadStatus === 'Uploaded' ? `✓ ${rejectionCodes.length} Defect codes active` : 'Default seed ready or upload Excel'}
                    </div>
                  </div>

                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}>
                    <UploadCloud size={15} />
                    <span>{rejectionUploadStatus === 'Uploaded' ? 'Re-upload' : 'Upload Rejection Excel'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={handleRejectionFileUpload}
                    />
                  </label>
                </div>
                {rejectionUploadSummary && (
                  <div style={{ fontSize: '11px', color: 'var(--clr-success-dark)', fontWeight: 600 }}>
                    {rejectionUploadSummary}
                  </div>
                )}
                {rejectionUploadError && (
                  <div style={{ fontSize: '11px', color: 'var(--clr-error)', fontWeight: 600 }}>
                    {rejectionUploadError}
                  </div>
                )}
              </div>

              {/* 3. Downtime Master Upload */}
              <div
                className="card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  border: downtimeUploadStatus === 'Uploaded' ? '2px solid var(--clr-success)' : '1px dashed var(--clr-border-dark)',
                  background: downtimeUploadStatus === 'Uploaded' ? 'var(--clr-success-lt)' : 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--clr-text)' }}>
                      3. Downtime Master
                    </div>
                    <div style={{ fontSize: '0.75rem', color: downtimeUploadStatus === 'Uploaded' ? 'var(--clr-success-dark)' : 'var(--clr-text3)' }}>
                      {downtimeUploadStatus === 'Uploaded' ? `✓ ${downtimeCodes.length} Downtime codes active` : 'Default seed ready or upload Excel'}
                    </div>
                  </div>

                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, borderColor: 'var(--clr-primary)', color: 'var(--clr-primary)' }}>
                    <UploadCloud size={15} />
                    <span>{downtimeUploadStatus === 'Uploaded' ? 'Re-upload' : 'Upload Downtime Excel'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={handleDowntimeFileUpload}
                    />
                  </label>
                </div>
                {downtimeUploadSummary && (
                  <div style={{ fontSize: '11px', color: 'var(--clr-success-dark)', fontWeight: 600 }}>
                    {downtimeUploadSummary}
                  </div>
                )}
                {downtimeUploadError && (
                  <div style={{ fontSize: '11px', color: 'var(--clr-error)', fontWeight: 600 }}>
                    {downtimeUploadError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: DATA VALIDATION */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--clr-text)', margin: '0 0 4px 0' }}>
                  Validation Checklist
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--clr-text3)', margin: 0 }}>
                  Verifying all mandatory pre-trial masters and operational prerequisites.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {validationChecks.map((item, idx) => (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${item.passed ? 'var(--clr-success)' : 'var(--clr-error)'}`
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                        {item.passed ? '✓ ' : '✗ '}{item.label}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--clr-text3)' }}>
                        {item.detail}
                      </div>
                    </div>
                    <span className={`badge-tag ${item.passed ? 'approved' : 'warning'}`}>
                      {item.passed ? 'PASSED' : 'MISSING'}
                    </span>
                  </div>
                ))}
              </div>

              {!isReadyForProduction && (
                <div style={{ padding: '10px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', fontSize: '12px', fontWeight: 600 }}>
                  {!isPartMasterLoaded && '• Part Master Excel is missing. Return to Step 3 and upload it.\n'}
                  {!isRejectionMasterLoaded && '• Rejection Master is missing.\n'}
                  {!isDowntimeMasterLoaded && '• Downtime Master is missing.\n'}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: READY FOR PRODUCTION */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div style={{ padding: '16px 8px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--clr-success-lt)', border: '2px solid var(--clr-success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-success)', marginBottom: '12px' }}>
                  <ShieldCheck size={30} />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--clr-success-dark)' }}>
                  READY FOR PRODUCTION
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text3)', maxWidth: '400px', margin: '4px auto 0 auto' }}>
                  All master data verified. Machines, parts, rejection reasons, downtime reasons, and supervisors are cleared for production reporting.
                </p>
              </div>

              <div className="card" style={{ padding: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--clr-text3)', textTransform: 'uppercase' }}>Parts</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-primary)' }}>{parts.length}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--clr-text3)', textTransform: 'uppercase' }}>Machines</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-success)' }}>{machines.length}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--clr-text3)', textTransform: 'uppercase' }}>Mappings</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-purple)' }}>{mappings.length}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--clr-text3)', textTransform: 'uppercase' }}>Defects</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-error)' }}>{rejectionCodes.length}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--clr-text3)', textTransform: 'uppercase' }}>Downtimes</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-warning)' }}>{downtimeCodes.length}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--clr-text3)', textTransform: 'uppercase' }}>Supervisors</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-primary)' }}>{supervisors.length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer / Actions */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--clr-border)', paddingTop: '12px' }}>
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep(prev => prev - 1)}
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={currentStep === 4 && !isReadyForProduction}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleComplete}
            >
              <CheckCircle2 size={16} />
              <span>Launch Production Console</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
