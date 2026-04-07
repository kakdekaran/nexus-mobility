import { useState, useEffect } from 'react'; 
import api from '../../services/api';
import GlassCard from '../../shared/components/GlassCard';

interface Trend {
  time: string;
  congestion: number;
}

const GoldenWindow = ({ city }: { city: string }) => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await api.get(`/analytics/traffic-trends?city=${city}&time_range=24h`);
        setTrends(res.data);
      } catch (err) {
        console.error("Failed to load traffic trends");
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, [city]);

  const getGoldenWindow = () => {
    if (trends.length === 0) return null;
    // Find the minimum congestion point in the 24h cycle
    const sorted = [...trends].sort((a, b) => a.congestion - b.congestion);
    return sorted[0];
  };

  const golden = getGoldenWindow();

  if (loading) return (
    <div className="h-[200px] flex items-center justify-center bg-white/5 rounded-3xl border border-white/5 animate-pulse">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Calculating Golden Window...</p>
    </div>
  );

  return (
    <GlassCard className="p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] rounded-full"></div>
      
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="text-xl font-black font-headline text-white uppercase tracking-tighter antialiased">Golden Window</h3>
          <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1 opacity-80">Optimized Departure Advisory</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 text-primary">
          <span className="material-symbols-outlined text-2xl">schedule</span>
        </div>
      </div>

      {golden ? (
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="flex-1 p-6 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-2">Target Departure</p>
              <p className="text-3xl font-black text-white font-headline tracking-tighter">{golden.time}</p>
            </div>
            <div className="flex-1 p-6 bg-primary/10 rounded-2xl border border-primary/10">
              <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest leading-none mb-2">Congestion Minima</p>
              <p className="text-3xl font-black text-primary font-headline tracking-tighter">{Math.round(golden.congestion)}%</p>
            </div>
          </div>

          <div className="p-4 bg-tertiary/10 rounded-xl border border-tertiary/10 flex items-center gap-4">
            <span className="material-symbols-outlined text-tertiary">verified</span>
            <p className="text-xs text-tertiary font-bold tracking-tight">
              Calculated from actual {city} municipal transit logs. Estimated {100 - Math.round(golden.congestion)}% path availability.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center opacity-40">
          <p className="text-xs font-black uppercase tracking-widest">Inadequate Dataset for Prediction</p>
        </div>
      )}
    </GlassCard>
  );
};

export default GoldenWindow;
