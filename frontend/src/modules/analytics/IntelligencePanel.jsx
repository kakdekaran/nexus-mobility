import { useState, useEffect } from 'react';

const IntelligencePanel = ({ stats, city }) => {
  const [insight, setInsight] = useState("Analyzing municipal telemetry...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stats) {
      setLoading(false);
      const traffic = stats.avg_traffic_index;
      
      if (traffic > 80) setInsight(`Critical congestion in ${city}. Emergency rerouting protocols recommended for arterial roads.`);
      else if (traffic > 60) setInsight(`High traffic density detected in ${city}. Automated signal optimization is currently active.`);
      else if (traffic > 40) setInsight(`Steady urban flow in ${city}. No major bottlenecks detected at this timestamp.`);
      else setInsight(`Optimal mobility in ${city}. Best time for logistics and transit operations.`);
    }
  }, [stats, city]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-on-surface uppercase tracking-[0.25em] opacity-40">Intelligence Node</h2>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-primary animate-ping"></div>
          <div className="w-1 h-1 rounded-full bg-primary animate-ping [animation-delay:0.2s]"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-on-surface/5 rounded-2xl border border-on-surface/5 space-y-1.5 transition-all hover:bg-on-surface/10">
          <p className="text-[9px] font-black text-on-surface uppercase opacity-50">Congestion Index</p>
          <p className={`text-xl font-black ${(stats?.avg_traffic_index || 0) > 60 ? 'text-error' : 'text-primary'}`}>
            {stats?.avg_traffic_index || '—'}%
          </p>
        </div>
        <div className="p-4 bg-on-surface/5 rounded-2xl border border-on-surface/5 space-y-1.5 transition-all hover:bg-on-surface/10">
          <p className="text-[9px] font-black text-on-surface uppercase opacity-50">Active Alerts</p>
          <p className={`text-xl font-black ${(stats?.active_alerts || 0) > 0 ? 'text-tertiary' : 'text-primary'}`}>
            0{stats?.active_alerts || 0}
          </p>
        </div>
      </div>

      <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-4xl text-primary">psychology</span>
        </div>
        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-3">Governance Insight</p>
        <p className="text-sm font-black text-on-surface leading-relaxed tracking-tight relative z-10">
          {loading ? "..." : insight}
        </p>
      </div>

      {/* Quick Prediction Shortcut */}
      <div className="p-5 bg-on-surface/5 rounded-[2rem] border border-on-surface/10 border-dashed flex items-center justify-between group cursor-pointer hover:border-primary/50 transition-all" 
           onClick={() => window.location.href='/predict'}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-on-surface group-hover:text-primary transition-colors">query_stats</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-on-surface uppercase tracking-widest">Predictive Lab</p>
            <p className="text-[9px] text-on-surface opacity-40 uppercase font-bold">Simulate Future Traffic</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-sm text-on-surface opacity-30 group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
      </div>
    </div>
  );
};

export default IntelligencePanel;
