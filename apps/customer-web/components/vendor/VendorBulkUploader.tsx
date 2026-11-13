'use client';

import React, { useState, useRef } from 'react';
import { VendorCsvRow } from '@logistics/shared-types';
import { BarChart2, Download, Zap, FileSpreadsheet, AlertTriangle, Building, X } from 'lucide-react';

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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-bayniks-orange" />
            <span>Bulk Multi-Stop Dispatch Workstation</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Upload CSV with mandatory landmarks for street deliveries. Motorcycle fleet limit: max 5 stops per bike run.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 hover:text-slate-900 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemoBatch}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-bayniks-orange hover:bg-bayniks-orangeDark shadow-bolt-glow transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Load 6-Stop Demo Batch</span>
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
            ? 'border-bayniks-orange bg-orange-50 scale-[1.01]'
            : 'border-slate-300 hover:border-bayniks-orange bg-white shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-bayniks-orange">
          <FileSpreadsheet className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-bold text-slate-900">
          {fileName ? `File Selected: ${fileName}` : 'Drag & drop your CSV file here, or click to browse'}
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
          Expected headers: <code className="text-bayniks-orange font-mono font-bold">batchGroupKey, recipientName, recipientPhone, dropoffAddress, dropoffLandmark</code>
        </p>

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-bayniks-orange font-mono font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-bayniks-orange animate-ping" />
            Parsing rows & resolving Nigerian street coordinates...
          </div>
        )}
      </div>

      {/* Error Alert Banner */}
      {errors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.length} Formatting Error{errors.length > 1 ? 's' : ''} Detected in CSV:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] font-mono text-rose-700 max-h-32 overflow-y-auto">
            {errors.map((err, idx) => (
              <li key={idx}>
                Row {err.rowNumber} [{err.field}]: {err.message}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-600 font-medium">
            Tip: In Lagos, dispatch riders cannot pinpoint addresses without a known landmark (e.g., &ldquo;Opposite Slot&rdquo;, &ldquo;Beside Zenith Bank&rdquo;).
          </p>
        </div>
      )}

      {/* Validated Rows Table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">Batch Orders Manifest</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                {rows.length} Valid Stop{rows.length > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono font-medium">
              Auto-grouped into {Math.ceil(rows.length / 5)} motorcycle run{Math.ceil(rows.length / 5) > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100 font-sans">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-bayniks-orange font-bold">
                      {row.batchGroupKey}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.recipientName}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold">
                        <svg className="w-3.5 h-2.5 rounded-xs overflow-hidden" viewBox="0 0 6 4" aria-hidden="true"><rect width="2" height="4" fill="#008751"/><rect x="2" width="2" height="4" fill="#FFFFFF"/><rect x="4" width="2" height="4" fill="#008751"/></svg>
                        <span>{row.recipientPhone}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-[180px] truncate" title={row.dropoffAddress}>
                      {row.dropoffAddress}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
                        <Building className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>{row.dropoffLandmark}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[120px] truncate">
                      {row.packageDescription}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        title="Remove stop"
                        disabled={isLoading}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
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

