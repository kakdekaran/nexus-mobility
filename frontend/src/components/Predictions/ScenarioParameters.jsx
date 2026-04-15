import { useState } from 'react';

const ScenarioParameters = ({ onPredict, isLoading }) => {
  const [date, setDate] = useState("today");
  const [time, setTime] = useState("09:00");
  const [city, setCity] = useState("Delhi");

  const cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Hyderabad"];
  const dateOptions = [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'custom', label: 'Specific Date' }
  ];

  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalDate = date === 'custom' ? customDate : date;
    onPredict({
      city,
      time,
      date: finalDate
    });
  };

  return (
    <section className="lg:col-span-4 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-8 space-y-10 font-body border border-on-surface/5 shadow-2xl">
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight">Traffic Scenario</h3>
        <p className="text-[10px] text-on-surface font-black uppercase tracking-[0.2em] opacity-60">Mobility Prediction Parameters</p>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* City Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface uppercase tracking-widest">Metropolitan Sector</label>
          <div className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  city === c 
                    ? 'bg-primary text-on-surface border-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'bg-on-surface/5 text-on-surface border-on-surface/5 hover:bg-on-surface/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface uppercase tracking-widest">Prediction Date</label>
          <div className="flex gap-2">
            {dateOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDate(opt.id)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  date === opt.id 
                    ? 'bg-secondary text-on-secondary border-secondary shadow-lg shadow-secondary/20' 
                    : 'bg-on-surface/5 text-on-surface border-on-surface/5 hover:bg-on-surface/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {date === 'custom' && (
            <input 
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-on-surface/5 text-on-surface border border-on-surface/5 rounded-2xl py-3 px-5 focus:border-primary/50 text-sm font-black tracking-widest outline-none mt-2"
            />
          )}
        </div>

        {/* Input: Time */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface uppercase tracking-widest">Expected Time</label>
          <div className="relative group">
            <input 
              className="w-full bg-on-surface/5 text-on-surface border border-on-surface/5 rounded-2xl py-4 px-5 focus:bg-on-surface/10 focus:border-primary/50 text-sm font-black tracking-widest transition-all outline-none" 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-on-surface pointer-events-none group-focus-within:text-primary transition-colors">schedule</span>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 active:scale-95 transition-all hover:brightness-110 disabled:opacity-50 mt-4"
        >
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
          {isLoading ? 'ANALYZING...' : 'PREDICT TRAFFIC'}
        </button>
      </form>
    </section>
  );
};

export default ScenarioParameters;
