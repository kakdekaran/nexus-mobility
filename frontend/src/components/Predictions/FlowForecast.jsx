import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../../services/api';

const FlowForecast = ({ city = 'Delhi' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/predictions/forecast?city=${city}`);
        setData(res.data);
      } catch (err) {
        console.error('Forecast error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [city]);

  if (loading) {
    return (
      <div className="bg-on-surface/5 backdrop-blur-xl rounded-[2rem] p-8 h-[350px] flex items-center justify-center animate-pulse border border-on-surface/5">
        <span className="text-[10px] font-black text-on-surface uppercase tracking-[0.3em] opacity-40">Calculating Future Flow...</span>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-8 space-y-6 border border-on-surface/5 shadow-2xl font-body h-full">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h5 className="text-lg font-black text-on-surface uppercase tracking-tight">Next 6 Hours</h5>
          <p className="text-[9px] text-on-surface font-black uppercase tracking-widest opacity-40">Predictive Congestion Trend</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-[9px] font-black rounded-full border border-primary/20 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
          Live Projection
        </div>
      </div>
      
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCongestion" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="5%" stopColor="#94ccff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#94ccff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis 
              dataKey="hour" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'white', fontSize: 10, fontWeight: 900, opacity: 0.4 }} 
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e2022', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}
              itemStyle={{ color: '#94ccff', fontSize: '14px', fontWeight: '900' }}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />
            <Area 
              type="monotone" 
              dataKey="congestion" 
              stroke="#94ccff" 
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCongestion)"
              dot={{ fill: '#94ccff', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: '#1e2022', strokeWidth: 3, fill: '#94ccff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="p-4 bg-on-surface/5 rounded-2xl border border-on-surface/5">
        <p className="text-[10px] text-on-surface font-black uppercase tracking-widest leading-relaxed opacity-60">
          Projections suggest <b>{data.length > 0 && Math.max(...data.map(d => d.congestion)) > 70 ? 'Significant Surge' : 'Stable Flow'}</b> in the upcoming window. Plan departures accordingly to minimize metropolitan transit overhead.
        </p>
      </div>
    </div>
  );
};

export default FlowForecast;
