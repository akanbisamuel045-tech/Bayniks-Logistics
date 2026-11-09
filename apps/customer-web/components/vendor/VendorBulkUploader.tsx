'use client';

import React, { useState, useRef } from 'react';
import { VendorCsvRow } from '@logistics/shared-types';

export interface VendorBulkUploaderProps {
  onRowsValidated: (rows: VendorCsvRow[]) => void;
  isLoading?: boolean;
}

interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

const SAMPLE_CSV_CONTENT = `batchGroupKey,recipientName,recipientPhone,dropoffAddress,dropoffLandmark,packageDescription,packageSize
RUN-1,Amaka Obi,08012345678,14 Allen Avenue Ikeja,Opposite Slot,Silk Dress,small
RUN-1,Chidi Eze,08098765432,Admiralty Way Lekki Phase 1,Near Ebeano Supermarket,Designer Shoes,medium
RUN-1,Babajide Sanwo,09033334444,Broad Street Marina Lagos,Opposite CMS Bookshop,Legal Documents,small
RUN-1,Folake Coker,08033221100,Bode Thomas Street Surulere,Near Adeniran Ogunsanya Mall,Fashion Box,medium
RUN-1,Emeka Okonkwo,08123456789,Bourdillon Road Ikoyi,Beside Federal High Court,Corporate Hamper,large
RUN-1,Titi Alabi,08188889999,Maryland Mall Anthony Village,Inside Maryland Mall,Perfume Set,small`;

const DEMO_ROWS: VendorCsvRow[] = [
  {
    batchGroupKey: 'RUN-1',
    recipientName: 'Amaka Obi',
    recipientPhone: '+2348012345678',
    dropoffAddress: '14 Allen Avenue, Ikeja, Lagos',
    dropoffLandmark: 'Opposite Slot Ikeja',
    packageDescription: 'Silk Dress',
    packageSize: 'small',
    lat: 6.5933,
    lng: 3.3421,
  },
  {
    batchGroupKey: 'RUN-1',
    recipientName: 'Chidi Eze',
    recipientPhone: '+2348098765432',
    dropoffAddress: 'Admiralty Way, Lekki Phase 1, Lagos',
    dropoffLandmark: 'Near Ebeano Supermarket',
    packageDescription: 'Designer Shoes',
    packageSize: 'medium',
    lat: 6.4474,
    lng: 3.4723,
  },
  {
    batchGroupKey: 'RUN-1',
    recipientName: 'Babajide Sanwo',
    recipientPhone: '+2349033334444',
    dropoffAddress: 'Broad Street, Marina, Lagos Island',
    dropoffLandmark: 'Opposite CMS Bookshop',
    packageDescription: 'Legal Documents',
    packageSize: 'small',
    lat: 6.4500,
    lng: 3.3900,
  },
  {
    batchGroupKey: 'RUN-1',
    recipientName: 'Folake Coker',
    recipientPhone: '+2348033221100',
    dropoffAddress: 'Bode Thomas Street, Surulere, Lagos',
    dropoffLandmark: 'Near Adeniran Ogunsanya Mall',
    packageDescription: 'Fashion Box',
    packageSize: 'medium',
    lat: 6.4969,
    lng: 3.3615,
  },
  {
    batchGroupKey: 'RUN-1',
    recipientName: 'Emeka Okonkwo',
    recipientPhone: '+2348123456789',
    dropoffAddress: 'Bourdillon Road, Ikoyi, Lagos',
    dropoffLandmark: 'Beside Federal High Court',
    packageDescription: 'Corporate Hamper',
    packageSize: 'large',
    lat: 6.4520,
    lng: 3.4350,
  },
  {
    batchGroupKey: 'RUN-1',
    recipientName: 'Titi Alabi',
    recipientPhone: '+2348188889999',
    dropoffAddress: 'Maryland Mall, Anthony Village, Lagos',
    dropoffLandmark: 'Inside Maryland Mall Food Court',
    packageDescription: 'Perfume Set',
    packageSize: 'small',
    lat: 6.5722,
    lng: 3.3678,
  },
];

export function VendorBulkUploader({ onRowsValidated, isLoading = false }: VendorBulkUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<VendorCsvRow[]>([]);
  const [errors, setErrors] = useState<RowValidationError[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bayniks_vendor_batch_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadDemoBatch = () => {
    setFileName('demo_lagos_6_stops.csv');
    setRows(DEMO_ROWS);
    setErrors([]);
    onRowsValidated(DEMO_ROWS);
  };

  const processCsvText = async (text: string, sourceName: string) => {
    setIsProcessing(true);
    setFileName(sourceName);
    try {
      const response = await fetch('/api/v1/vendor/parse-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: text }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse CSV file');
      }

      const data = await response.json();
      setRows(data.validRows || []);
      setErrors(data.errors || []);
      onRowsValidated(data.validRows || []);
    } catch {
      setErrors([
        {
          rowNumber: 0,
          field: 'file',
          message: 'Error communicating with parser service. Please check CSV format.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCsvText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a valid .csv file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCsvText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
    onRowsValidated(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-bayniks-cardDark p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>📊</span> Bulk Multi-Stop Dispatch Workstation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload CSV with mandatory landmarks for street deliveries. Motorcycle fleet limit: max 5 stops per bike run.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-bayniks-surfaceDark border border-slate-700 hover:text-white hover:border-bayniks-orange transition-colors flex items-center gap-1.5"
          >
            <span>📥</span> Download Sample CSV
          </button>

          <button
            type="button"
            onClick={handleLoadDemoBatch}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-bayniks-orange hover:bg-bayniks-orangeDark shadow-bolt-glow transition-all flex items-center gap-1.5"
          >
            <span>⚡</span> Load 6-Stop Demo Batch
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-bayniks-orange bg-bayniks-orange/10 scale-[1.01]'
            : 'border-slate-700/80 hover:border-bayniks-orange/60 bg-bayniks-cardDark/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-bayniks-surfaceDark border border-slate-700 flex items-center justify-center text-2xl text-bayniks-orange">
          📑
        </div>

        <h3 className="text-sm font-semibold text-white">
          {fileName ? `File Selected: ${fileName}` : 'Drag & drop your CSV file here, or click to browse'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Expected headers: <code className="text-bayniks-orange font-mono">batchGroupKey, recipientName, recipientPhone, dropoffAddress, dropoffLandmark</code>
        </p>

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-bayniks-orange font-mono animate-pulse">
            <span className="w-2 h-2 rounded-full bg-bayniks-orange animate-ping" />
            Parsing rows & resolving Nigerian street coordinates...
          </div>
        )}
      </div>

      {/* Error Alert Banner */}
      {errors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-200">
            <span>⚠️</span> {errors.length} Formatting Error{errors.length > 1 ? 's' : ''} Detected in CSV:
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] font-mono text-rose-400 max-h-32 overflow-y-auto">
            {errors.map((err, idx) => (
              <li key={idx}>
                Row {err.rowNumber} [{err.field}]: {err.message}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400">
            Tip: In Lagos, dispatch riders cannot pinpoint addresses without a known landmark (e.g., &ldquo;Opposite Slot&rdquo;, &ldquo;Beside Zenith Bank&rdquo;).
          </p>
        </div>
      )}

      {/* Validated Rows Table */}
      {rows.length > 0 && (
        <div className="bg-bayniks-cardDark rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">Batch Orders Manifest</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950 border border-emerald-800 text-emerald-400">
                {rows.length} Valid Stop{rows.length > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Auto-grouped into {Math.ceil(rows.length / 5)} motorcycle run{Math.ceil(rows.length / 5) > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bayniks-surfaceDark/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Run Key</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Phone (E.164)</th>
                  <th className="py-2.5 px-3">Dropoff Address</th>
                  <th className="py-2.5 px-3">Mandatory Landmark</th>
                  <th className="py-2.5 px-3">Parcel</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-bayniks-surfaceDark/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-bayniks-orange font-semibold">
                      {row.batchGroupKey}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white">{row.recipientName}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                        🇳🇬 {row.recipientPhone}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-[180px] truncate" title={row.dropoffAddress}>
                      {row.dropoffAddress}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/60 border border-amber-800/80 text-amber-300">
                        🏛️ {row.dropoffLandmark}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[120px] truncate">
                      {row.packageDescription}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        title="Remove stop"
                        disabled={isLoading}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

