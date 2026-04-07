import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import GlassCard from '../../shared/components/GlassCard';

interface IntelligencePanelProps {
  stats?: {
    avg_traffic_index: number;
    avg_aqi: number;
    active_alerts: number;
    peak_hour: string;
    network_health: string;
    velocity: string;
  } | null;
  alerts?: number;
  city?: string;
  onRefresh?: () => void;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  color: 'error' | 'warning' | 'success';
}

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ 
  stats, 
  alerts = 0, 
  city = 'Delhi',
  onRefresh 
}) => {
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const alertsList: Alert[] = [];
    
    if (alerts > 5) {
      alertsList.push({
        id: '1',
        title: 'Critical Congestion',
        message: `${alerts} intersections reporting severe traffic load.`,
        color: 'error',
      });
    } else if (alerts > 0) {
      alertsList.push({
        id: '1',
        title: 'Traffic Alert',
        message: `${alerts} locations experiencing moderate congestion.`,
        color: 'warning',
      });
    } else {
      alertsList.push({
        id: '1',
        title: 'All Clear',
        message: 'All monitored zones operating within normal parameters.',
        color: 'success',
      });
    }
    
    setLocalAlerts(alertsList);
  }, [alerts]);

  const handleClearAlerts = async () => {
    setClearing(true);
    try {
      await api.post('/analytics/clear-alerts');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Clear alerts error:', err);
    } finally {
      setClearing(false);
    }
  };

  const trafficStatus = stats ? 
    (stats.avg_traffic_index > 80 ? 'Critical' : 
     stats.avg_traffic_index > 50 ? 'Moderate' : 'Light') : 'Unknown';
  
  const aqiStatus = stats?.avg_aqi ? 
    (stats.avg_aqi > 200 ? 'Poor' : 
     stats.avg_aqi > 100 ? 'Moderate' : 'Good') : 'Unknown';

  return (
    <div className="flex flex-col gap-4">
      {/* System Status Card */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight">System Status</h4>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide mt-1">{city} Network</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-xl">monitoring</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Traffic Load</p>
              <p className="text-xl font-black text-white">{stats?.avg_traffic_index || 0}%</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
              (stats?.avg_traffic_index || 0) > 80 ? 'bg-error/20 text-error' :
              (stats?.avg_traffic_index || 0) > 50 ? 'bg-yellow-500/20 text-yellow-500' :
              'bg-green-500/20 text-green-500'
            }`}>
              {trafficStatus}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Air Quality</p>
              <p className="text-xl font-black text-white">{stats?.avg_aqi || 0}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
              (stats?.avg_aqi || 0) > 200 ? 'bg-error/20 text-error' :
              (stats?.avg_aqi || 0) > 100 ? 'bg-yellow-500/20 text-yellow-500' :
              'bg-green-500/20 text-green-500'
            }`}>
              {aqiStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Avg Speed</p>
              <p className="text-lg font-black text-tertiary">{stats?.velocity || '—'}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Peak Hour</p>
              <p className="text-lg font-black text-primary">{stats?.peak_hour || '—'}</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Alerts Card */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-black text-white uppercase tracking-tight">Active Alerts</h4>
          {alerts > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="text-xs font-black text-error">{alerts}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {localAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-3 rounded-xl border-l-4 ${
                alert.color === 'error' ? 'bg-error/10 border-error' :
                alert.color === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                'bg-green-500/10 border-green-500'
              }`}
            >
              <p className={`text-[10px] font-black uppercase mb-1 ${
                alert.color === 'error' ? 'text-error' :
                alert.color === 'warning' ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {alert.title}
              </p>
              <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                {alert.message}
              </p>
            </div>
          ))}

          {alerts > 0 && (
            <button
              onClick={handleClearAlerts}
              disabled={clearing}
              className="w-full py-2.5 bg-white/5 hover:bg-error/20 hover:text-error rounded-xl text-[10px] font-black uppercase tracking-wide transition-all text-slate-400 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All Alerts'}
            </button>
          )}
        </div>
      </GlassCard>

      {/* Network Health */}
      <GlassCard className="p-5">
        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-4">Network Health</h4>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase">System Status</p>
              <p className="text-xs font-black text-green-500">{stats?.network_health || '—'}</p>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-primary transition-all duration-500"
                style={{ width: stats?.network_health || '0%' }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/5 rounded-lg">
              <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Online</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <span className="material-symbols-outlined text-primary text-base">sensors</span>
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Active</p>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <span className="material-symbols-outlined text-tertiary text-base">sync</span>
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Synced</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default IntelligencePanel;
