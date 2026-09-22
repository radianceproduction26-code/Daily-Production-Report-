// Radiance Polymers - Data Upload Center Component
// Simple, non-ERP 5-card master data setup in < 5 minutes
import React, { useState } from 'react';
import {
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Database,
  Layers,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RotateCcw
} from 'lucide-react';
import {
  downloadTemplate,
  parseExcelFile,
  exportAllMasterDataBackup,
  checkPilotReadiness
} from '../services/dataUploadService';

export default function DataUploadCenter({
  machines = [],
  parts = [],
  mappings = [],
  rejectionCodes = [],
  downtimeCodes = [],
  usersList = [],
  onUpdateMachines,
  onUpdateParts,
  onUpdateMappings,
  onUpdateRejectionCodes,
  onUpdateDowntimeCodes
}) {
  const [uploadResults, setUploadResults] = useState({});
  const [lastUploadDate, setLastUploadDate] = useState(() => {
    return localStorage.getItem('rp_last_master_upload_date') || new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  });

  const readiness = checkPilotReadiness({ machines, parts, mappings, usersList });

  const recordUploadTimestamp = () => {
    const nowStr = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setLastUploadDate(nowStr);
    localStorage.setItem('rp_last_master_upload_date', nowStr);
  };

  const handleFileUpload = (e, type, updateFn, existingData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target.result;
      const parseResult = parseExcelFile(buffer, type);

      if (!parseResult.success) {
        alert(`Upload Failed: ${parseResult.error}`);
        e.target.value = '';
        return;
      }

      const confirmReplace = window.confirm(
        `Replace Existing Data?\n\nFound: ${parseResult.imported} valid rows, ${parseResult.rejected} rejected rows.\n\nClick OK (YES) to delete old master and import new master.\nClick Cancel (NO) to abort upload.`
      );

      if (!confirmReplace) {
        setUploadResults(prev => ({
          ...prev,
          [type]: { status: 'CANCELLED', message: 'Upload cancelled by user.' }
        }));
        e.target.value = '';
        return;
      }

      updateFn(parseResult.data);
      recordUploadTimestamp();

      setUploadResults(prev => ({
        ...prev,
        [type]: {
          status: 'SUCCESS',
          imported: parseResult.imported,
          rejected: parseResult.rejected,
          errors: parseResult.errors
        }
      }));

      e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

  const cards = [
    {
      id: 'machine',
      title: 'Machine Master',
      subtitle: 'Defines machine code, model, tonnage, and station',
      count: machines.length,
      isMandatory: true,
      data: machines,
      onUpdate: onUpdateMachines
    },
    {
      id: 'part',
      title: 'Part Master',
      subtitle: 'Defines part code, cycle time, cavities, and material grade',
      count: parts.length,
      isMandatory: true,
      data: parts,
      onUpdate: onUpdateParts
    },
    {
      id: 'mapping',
      title: 'Machine-Part Mapping',
      subtitle: 'Maps which parts and moulds are approved to run on which machines',
      count: mappings.length,
      isMandatory: true,
      data: mappings,
      onUpdate: onUpdateMappings
    },
    {
      id: 'rejection',
      title: 'Rejection Master',
      subtitle: 'Standard shop-floor defect codes (A through Q) and descriptions',
      count: rejectionCodes.length,
      isMandatory: false,
      data: rejectionCodes,
      onUpdate: onUpdateRejectionCodes
    },
    {
      id: 'downtime',
      title: 'Downtime Master',
      subtitle: 'Standard stoppage codes (DT-401 through DT-409) categorized',
      count: downtimeCodes.length,
      isMandatory: false,
      data: downtimeCodes,
      onUpdate: onUpdateDowntimeCodes
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-md)' }}>
      
      {/* Header & Export Card */}
      <div className="card" style={{ padding: 'var(--gap-md)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={24} color="var(--clr-primary)" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)', margin: 0 }}>
                Data Upload Center
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', margin: '2px 0 0 0' }}>
                Master data setup in under 5 minutes
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => exportAllMasterDataBackup({ machines, parts, mappings, rejectionCodes, downtimeCodes })}
          >
            <Download size={14} />
            <span>Download All Masters</span>
          </button>
        </div>

        {/* Live Counters Metric Bar - Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
          <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--clr-text3)' }}>MACHINES</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)' }}>{machines.length}</div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--clr-text3)' }}>PARTS</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)' }}>{parts.length}</div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--clr-text3)' }}>MAPPINGS</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)' }}>{mappings.length}</div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--clr-text3)' }}>REJECTIONS</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)' }}>{rejectionCodes.length}</div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface2)', border: '1px solid var(--clr-border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--clr-text3)' }}>DOWNTIME</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--clr-text)' }}>{downtimeCodes.length}</div>
          </div>
        </div>
      </div>

      {/* Pilot Readiness Status Banner */}
      {readiness.isReady ? (
        <div className="alert alert-success">
          <CheckCircle2 size={20} color="var(--clr-success)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>READY FOR PRODUCTION</div>
            <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
              MC03 configured, verified supervisors active, and mapped parts ready.
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-error">
          <AlertTriangle size={20} color="var(--clr-error)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>REQUIRED MASTER DATA NOT UPLOADED</div>
            <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
              Missing: {readiness.missing.join(', ')}. Upload mandatory masters to start shifts.
            </div>
          </div>
        </div>
      )}

      {/* The 5 Simple Upload Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {cards.map((card, idx) => {
          const isUploaded = card.count > 0;
          const result = uploadResults[card.id];

          return (
            <div
              key={card.id}
              className="card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: card.isMandatory ? 'var(--clr-primary)' : 'var(--clr-text3)' }}>
                    CARD {idx + 1} • {card.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
                  </span>
                  <span className={`badge ${isUploaded ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                    {isUploaded ? `Uploaded (${card.count})` : 'Not Uploaded'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--clr-text)', margin: '0 0 4px 0' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', margin: 0, minHeight: '32px' }}>
                  {card.subtitle}
                </p>

                {result && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: '0.75rem',
                    background: result.status === 'SUCCESS' ? 'var(--clr-success-lt)' : 'var(--clr-error-lt)',
                    color: result.status === 'SUCCESS' ? 'var(--clr-success-dark)' : 'var(--clr-error-dark)'
                  }}>
                    {result.status === 'SUCCESS' ? (
                      <div><strong>SUCCESS:</strong> Imported {result.imported} rows</div>
                    ) : (
                      <div>{result.message}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--clr-border)' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => downloadTemplate(card.id)}
                  style={{ minHeight: '44px', padding: '0 8px', fontSize: '0.78rem' }}
                >
                  <Download size={13} />
                  <span>Template</span>
                </button>

                <label
                  className="btn btn-primary btn-sm"
                  style={{ minHeight: '44px', padding: '0 8px', fontSize: '0.78rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <UploadCloud size={14} />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, card.id, card.onUpdate, card.data)}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
