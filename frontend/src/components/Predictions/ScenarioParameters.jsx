import { useState, useEffect } from 'react';
import api from '../../services/api';

const ScenarioParameters = ({ onPredict, isLoading }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("09:00");
  const [city, setCity] = useState("Delhi");
  const [location, setLocation] = useState("");
  const [locations, setLocations] = useState([]);
  const [weather, setWeather] = useState("clear");
  const [isHoliday, setIsHoliday] = useState(false);
  const [isEvent, setIsEvent] = useState(false);

  const cities = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Hyderabad", "Pune"];
  const weatherOptions = ["Clear", "Rainy", "Foggy", "Stormy"];

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get(`/predictions/locations?city=${city}`);
        const locs = res.data.locations;
        setLocations(locs);
        if (locs.length > 0) setLocation(locs[0]);
      } catch (err) {
        console.error("Failed to fetch locations", err);
        setLocations([]);
      }
    };
    fetchLocations();
  }, [city]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict({
      city,
      location,
      time,
      date,
      weather,
      is_holiday: isHoliday,
      is_event: isEvent
    });
  };

  return (
    <section className="lg:col-span-4 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-8 space-y-10 font-body border border-on-surface/5 shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar">
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

        {/* Location Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface uppercase tracking-widest">Target Location</label>
          <div className="relative group">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-on-surface/5 text-on-surface border border-on-surface/5 rounded-2xl py-4 px-5 focus:bg-on-surface/10 focus:border-primary/50 text-sm font-black tracking-widest transition-all outline-none appearance-none"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc} className="bg-surface-container text-on-surface">
                  {loc}
                </option>
              ))}
              {locations.length === 0 && (
                <option value="" disabled className="bg-surface-container text-on-surface opacity-50">
                  Loading locations...
                </option>
              )}
            </select>
            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-on-surface pointer-events-none group-focus-within:text-primary transition-colors">location_on</span>
          </div>
        </div>

        {/* Date Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface uppercase tracking-widest">Target Date</label>
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-on-surface/5 text-on-surface border border-on-surface/5 rounded-2xl py-4 px-5 focus:bg-on-surface/10 focus:border-primary/50 text-sm font-black tracking-widest outline-none transition-all"
          />
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

        {/* Weather Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface uppercase tracking-widest">Weather Condition</label>
          <div className="grid grid-cols-2 gap-2">
            {weatherOptions.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeather(w.toLowerCase())}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  weather === w.toLowerCase()
                    ? 'bg-tertiary text-on-tertiary border-tertiary shadow-lg shadow-tertiary/20' 
                    : 'bg-on-surface/5 text-on-surface border-on-surface/5 hover:bg-on-surface/10'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-on-surface uppercase tracking-widest">Special Factors</label>
          <div className="flex flex-col gap-3">
            <button 
              type="button"
              onClick={() => setIsHoliday(!isHoliday)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                isHoliday ? 'bg-secondary/10 border-secondary/50' : 'bg-on-surface/5 border-on-surface/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-xl ${isHoliday ? 'text-secondary' : 'text-on-surface opacity-40'}`}>
                  {isHoliday ? 'event_available' : 'event_busy'}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest">Public Holiday</span>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${isHoliday ? 'bg-secondary animate-pulse' : 'bg-on-surface/20'}`}></div>
            </button>

            <button 
              type="button"
              onClick={() => setIsEvent(!isEvent)}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                isEvent ? 'bg-primary/10 border-primary/50' : 'bg-on-surface/5 border-on-surface/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-xl ${isEvent ? 'text-primary' : 'text-on-surface opacity-40'}`}>
                  {isEvent ? 'campaign' : 'notifications_off'}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest">Special Event</span>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${isEvent ? 'bg-primary animate-pulse' : 'bg-on-surface/20'}`}></div>
            </button>
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
