import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const SAMPLE_CSV = `date,time,city
today,8 AM,Delhi
today,9 AM,Delhi
today,12 PM,Mumbai
today,5 PM,Mumbai
today,6 PM,Delhi
today,7 PM,Bangalore
tomorrow,8 AM,Chennai
tomorrow,10 AM,Hyderabad
tomorrow,5 PM,Delhi
tomorrow,6 PM,Mumbai
`;

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resultsToCsv(predictions) {
  const header = 'date,day,time,city,congestion_percent,traffic_status,advice';
  const rows = predictions.map((p) =>
    [
      p.date_label,
      p.day,
      p.time,
      p.city,
      p.congestion,
      p.status,
      `"${p.advice}"`,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

const StatusBadge = ({ status, congestion }) => {
  const colorMap = {
    'Very High': 'bg-red-500/20 text-red-400',
    'High': 'bg-orange-500/20 text-orange-400',
    'Moderate': 'bg-yellow-500/20 text-yellow-400',
    'Low': 'bg-green-500/20 text-green-400',
    'Very Low': 'bg-emerald-500/20 text-emerald-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colorMap[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status} ({congestion?.toFixed(1)}%)
    </span>
  );
};

const InsightCard = ({ icon, label, value, sub, color = 'text-primary' }) => (
  <div className="bg-on-surface/5 rounded-2xl p-4 space-y-1">
    <div className="flex items-center gap-2">
      <span className={`material-symbols-outlined text-sm ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface opacity-50">{label}</p>
    </div>
    <p className="font-black text-xl text-on-surface">{value}</p>
    {sub && <p className="text-[10px] text-on-surface opacity-50 font-bold">{sub}</p>}
  </div>
);

const CSVUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    setError(null);
    setResult(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are accepted.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File exceeds the 10 MB size limit.');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await api.post('/predictions/upload-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResult(res.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight">
          Traffic Prediction
        </h3>
        <p className="text-sm text-on-surface opacity-70 font-medium leading-relaxed max-w-2xl">
          Upload a CSV file with <strong>date</strong>, <strong>time</strong>, and <strong>city</strong> — 
          we'll predict how much traffic there will be. See which day and time has the 
          most or least traffic!
        </p>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">How to prepare your CSV</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="font-black text-on-surface text-xs">📅 date</p>
            <p className="text-on-surface opacity-60 text-xs">today, tomorrow, 2026-04-15, 15/04/2026</p>
          </div>
          <div className="space-y-1">
            <p className="font-black text-on-surface text-xs">🕐 time</p>
            <p className="text-on-surface opacity-60 text-xs">8 AM, 5:30 PM, 17:00, 14</p>
          </div>
          <div className="space-y-1">
            <p className="font-black text-on-surface text-xs">🏙️ city</p>
            <p className="text-on-surface opacity-60 text-xs">Delhi, Mumbai, Bangalore, Chennai, Hyderabad</p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-[2rem] border-2 border-dashed transition-all p-10 flex flex-col items-center justify-center gap-3 text-center
          ${isDragging
            ? 'border-primary bg-primary/10'
            : file
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-on-surface/15 bg-on-surface/5 hover:bg-on-surface/10 hover:border-on-surface/30'
          }`}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <span className="material-symbols-outlined text-4xl text-on-surface opacity-50">
          {file ? 'task_alt' : 'upload_file'}
        </span>
        {file ? (
          <>
            <p className="text-on-surface font-black text-sm">{file.name}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-50">
              {(file.size / 1024).toFixed(1)} KB · Ready to predict
            </p>
          </>
        ) : (
          <>
            <p className="text-on-surface font-bold text-sm">Drag & drop your CSV here, or click to browse</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface opacity-40">Max 10 MB · CSV only</p>
          </>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4"
          >
            <span className="material-symbols-outlined text-red-400 text-xl mt-0.5">error</span>
            <div>
              <p className="text-red-400 font-black text-xs uppercase tracking-widest">Error</p>
              <p className="text-red-300 text-sm mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleUpload} disabled={!file || loading}
          className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 disabled:opacity-40 active:scale-95 transition-all hover:brightness-110"
        >
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            {loading ? 'hourglass_top' : 'bolt'}
          </span>
          {loading ? 'Predicting...' : 'Predict Traffic'}
        </button>

        {(file || result) && (
          <button onClick={handleReset}
            className="flex items-center gap-2 bg-on-surface/10 text-on-surface px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-on-surface/15"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            Reset
          </button>
        )}

        <button
          onClick={() => downloadBlob(SAMPLE_CSV, 'sample_traffic.csv', 'text/csv')}
          className="flex items-center gap-2 bg-on-surface/10 text-on-surface px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-on-surface/15 ml-auto"
        >
          <span className="material-symbols-outlined text-base">download</span>
          Download Sample CSV
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-10">
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="material-symbols-outlined text-4xl text-primary"
          >
            autorenew
          </motion.span>
          <p className="text-on-surface font-black text-sm uppercase tracking-widest opacity-60">
            Analyzing traffic patterns…
          </p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Insight Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InsightCard
                icon="analytics"
                label="Average Traffic"
                value={`${result.insights?.average_congestion || 0}%`}
                color="text-primary"
              />
              <InsightCard
                icon="warning"
                label="Worst Time"
                value={result.insights?.worst_time ? `${result.insights.worst_time.time}` : '—'}
                sub={result.insights?.worst_time ? `${result.insights.worst_time.date_label} · ${result.insights.worst_time.day} · ${result.insights.worst_time.city} · ${result.insights.worst_time.congestion}%` : ''}
                color="text-red-400"
              />
              <InsightCard
                icon="thumb_up"
                label="Best Time"
                value={result.insights?.best_time ? `${result.insights.best_time.time}` : '—'}
                sub={result.insights?.best_time ? `${result.insights.best_time.date_label} · ${result.insights.best_time.day} · ${result.insights.best_time.city} · ${result.insights.best_time.congestion}%` : ''}
                color="text-green-400"
              />
              <InsightCard
                icon="traffic"
                label="High Traffic Slots"
                value={result.insights?.high_traffic_count || 0}
                sub={`out of ${result.processed} total`}
                color="text-orange-400"
              />
            </div>

            {/* Summary Stats */}
            <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest text-on-surface opacity-60">
              <span>📊 {result.total_rows} rows</span>
              <span>·</span>
              <span>✅ {result.processed} predicted</span>
              {result.failed > 0 && <><span>·</span><span className="text-red-400">❌ {result.failed} errors</span></>}
              {result.predictions_truncated && <><span>·</span><span className="text-yellow-400">Showing first 500 of {result.processed}</span></>}
            </div>

            {/* Predictions Table */}
            {result.predictions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface opacity-70">
                    Predictions ({result.predictions.length}{result.predictions_truncated ? ` of ${result.processed}` : ''})
                  </h4>
                  <button
                    onClick={() => downloadBlob(resultsToCsv(result.predictions), 'traffic_predictions.csv', 'text/csv')}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    Download Results
                  </button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-on-surface/10">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-on-surface/10 text-on-surface text-[10px] uppercase tracking-widest">
                        {['Date', 'Day', 'Time', 'City', 'Traffic', 'Advice'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-black opacity-60 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.predictions.map((p, i) => (
                        <tr key={i} className={`border-t border-on-surface/5 hover:bg-on-surface/5 transition-colors ${p.peak_hour ? 'bg-orange-500/[0.03]' : ''}`}>
                          <td className="px-4 py-3 font-black text-on-surface">
                            <div>{p.date_label}</div>
                            <div className="text-[9px] opacity-40 font-bold">{p.date}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-on-surface opacity-70">{p.day}</td>
                          <td className="px-4 py-3 font-black text-on-surface">
                            {p.time}
                            {p.peak_hour && <span className="ml-1.5 text-[8px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-black uppercase">Peak</span>}
                          </td>
                          <td className="px-4 py-3 font-black text-on-surface">{p.city}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={p.status} congestion={p.congestion} />
                          </td>
                          <td className="px-4 py-3 text-on-surface opacity-60 max-w-[240px] text-[11px]" title={p.advice}>
                            {p.advice}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Error Table */}
            {result.errors.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400">
                  Errors ({result.errors.length} rows)
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-red-500/20">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-500/10 text-on-surface text-[10px] uppercase tracking-widest">
                        {['Row', 'Date', 'Time', 'City', 'Issue'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-black opacity-60 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i} className="border-t border-red-500/10">
                          <td className="px-4 py-3 font-black text-red-400">{e.row}</td>
                          <td className="px-4 py-3 text-on-surface opacity-60">{e.date || '—'}</td>
                          <td className="px-4 py-3 text-on-surface opacity-60">{e.time || '—'}</td>
                          <td className="px-4 py-3 text-on-surface opacity-60">{e.city || '—'}</td>
                          <td className="px-4 py-3 text-red-400 text-[10px]">{e.errors.join(' · ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CSVUpload;
