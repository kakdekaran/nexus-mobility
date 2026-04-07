import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { LoadingSpinner, ErrorAlert } from '../components/UI';
import LiveMonitor from '../modules/nexus/LiveMonitor';
import IntelligencePanel from '../modules/analytics/IntelligencePanel';
import BroadcastConsole from '../components/Admin/BroadcastConsole';
import { getCurrentRole } from '../services/session';

interface DashboardStats {
  avg_traffic_index: number;
  avg_aqi: number;
  active_alerts: number;
  peak_hour: string;
  active_vehicles: number;
  network_health: string;
  velocity: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState("Delhi");

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get(`/analytics/dashboard-stats?city=${activeCity}`),
        api.get(`/analytics/alerts?city=${activeCity}`)
      ]);
      
      const trafficIndex = Math.round(statsRes.data.avg_traffic_index || 0);
      const alertCount = statsRes.data.active_alerts || 0;
      
      setStats({
        avg_traffic_index: trafficIndex,
        avg_aqi: Math.round(statsRes.data.avg_aqi || 0),
        active_alerts: alertCount,
        peak_hour: statsRes.data.peak_hour || 'N/A',
        active_vehicles: Math.floor(8000 + (trafficIndex * 120)),
        network_health: `${Math.max(65, Math.min(98, 100 - (alertCount * 3)))}%`,
        velocity: `${Math.max(15, Math.round(75 - (trafficIndex * 0.4)))} km/h`
      });
      
      setAlerts(alertsRes.data.length || 0);
      setError(null);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError("Unable to fetch data. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeCity]);

  if (loading) return <LoadingSpinner label="Loading Dashboard..." />;
  if (error && !stats) return <ErrorAlert message={error} />;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-6 md:p-8 min-h-0 flex flex-col font-body"
    >
      {/* Header with City Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-headline text-white uppercase tracking-tighter antialiased">
            Traffic Command Center
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <p className="text-[10px] text-green-400 font-black uppercase tracking-[0.2em]">
              {activeCity} • Live Feed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <select 
              value={activeCity} 
              onChange={(e) => setActiveCity(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold uppercase tracking-wider text-white outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer hover:border-primary/30 transition-all backdrop-blur-md"
            >
              <option className="bg-slate-900">Delhi</option>
              <option className="bg-slate-900">Mumbai</option>
              <option className="bg-slate-900">Bangalore</option>
              <option className="bg-slate-900">Chennai</option>
              <option className="bg-slate-900">Hyderabad</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors text-sm">
              expand_more
            </span>
          </div>
          
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            title="Refresh data"
            className={`w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary hover:bg-primary/20 transition-all ${refreshing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          >
            <span className={`material-symbols-outlined text-lg ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Live Monitor - Takes more space */}
        <div className="lg:col-span-8 h-full min-h-[400px]">
          <LiveMonitor city={activeCity} stats={stats} />
        </div>
        
        {/* Intelligence Panel - Sidebar */}
        <div className="lg:col-span-4 h-full overflow-y-auto custom-scrollbar pr-2 space-y-6">
          {(getCurrentRole() === 'Admin' || getCurrentRole() === 'Analyst') && (
            <BroadcastConsole />
          )}
          <IntelligencePanel 
            stats={stats} 
            alerts={alerts} 
            city={activeCity}
            onRefresh={() => fetchDashboardData(true)} 
          />
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
