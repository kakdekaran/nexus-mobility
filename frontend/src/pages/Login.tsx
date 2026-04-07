import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, getDefaultRouteForRole, normalizeRole, setSession } from '../services/session';

const API_BASE = `${API_BASE_URL}/auth`;

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  // Proactive Session Detection: Redirect if already authenticated via inheritance
  useEffect(() => {
    const token = sessionStorage.getItem('nexus_token') || localStorage.getItem('nexus_token');
    if (token) {
      const role = sessionStorage.getItem('role') || localStorage.getItem('role');
      if (role) {
        const normalizedRole = normalizeRole(role);
        navigate(getDefaultRouteForRole(normalizedRole));
      }
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'User'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (isRegister) {
        await axios.post(`${API_BASE}/register`, {
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          role: formData.role
        });
        setNotice("Account created successfully. You can now login.");
        setIsRegister(false);
      } else {
        const response = await axios.post(`${API_BASE}/login`, {
          username: formData.email,
          password: formData.password
        });

        const { access_token, user } = response.data;
        setSession({ 
          access_token, 
          role: user.role, 
          name: user.full_name,
          user_id: user.id 
        });
        
        // Immediate redirection: bypass context delay
        const normalizedRole = normalizeRole(user.role);
        navigate(getDefaultRouteForRole(normalizedRole));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication sequence failed. Check secure telemetry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black font-body">
      {/* Background: Metropolitan Telemetry Canvas (HD) */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen scale-110"
        >
          <source 
            src="https://assets.mixkit.co/videos/preview/mixkit-night-city-traffic-from-above-41864-large.mp4" 
            type="video/mp4" 
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-primary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,188,212,0.1)_0%,transparent_70%)]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 container mx-auto h-screen flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo & Identity */}
          <div className="text-center mb-10 space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 backdrop-blur-xl mb-4 group shadow-[0_0_30px_rgba(0,188,212,0.2)]">
              <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">
                traffic
              </span>
            </div>
            <h1 className="text-4xl font-headline font-black text-white uppercase tracking-[-0.05em] leading-none antialiased">
              NEXUS <span className="text-primary italic">MOBILITY</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] opacity-60">
              Municipal Grid Command • v4.0 PRO
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl p-10 relative overflow-hidden group">
            {/* Subtle light effect */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-tertiary/10 rounded-full blur-[80px]" />

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <AnimatePresence mode="wait">
                {isRegister && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-bold"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Assigned Role</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold appearance-none cursor-pointer"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                      >
                        <option value="User" className="bg-slate-900">Citizen Terminal</option>
                        <option value="Analyst" className="bg-slate-900">Systems Analyst</option>
                        <option value="Admin" className="bg-slate-900">Grand Administrator</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Identifier</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-bold"
                    placeholder="admin@nexus.gov"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">
                    alternate_email
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Security Key</label>
                <div className="relative">
                  <input 
                    type="password" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-bold"
                    placeholder="**********"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xl">
                    lock
                  </span>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-error/10 border border-error/20 rounded-2xl flex gap-3 items-center"
                >
                  <span className="material-symbols-outlined text-error text-xl">error</span>
                  <p className="text-[11px] font-bold text-error tracking-tight">{error}</p>
                </motion.div>
              )}

              {notice && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex gap-3 items-center"
                >
                  <span className="material-symbols-outlined text-primary text-xl">info</span>
                  <p className="text-[11px] font-bold text-primary tracking-tight">{notice}</p>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-black font-black uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-[0_4px_30px_rgba(0,188,212,0.3)] hover:shadow-[0_8px_40px_rgba(0,188,212,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale relative overflow-hidden"
              >
                <span className="relative z-10 italic">
                  {loading ? "Decrypting..." : isRegister ? "Initialize Access" : "Secure Launch"}
                </span>
                {loading && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="absolute inset-0 bg-white/20 z-0"
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </button>
            </form>

            <div className="mt-8 text-center relative z-10">
              <button 
                onClick={() => { setIsRegister(!isRegister); setError(null); setNotice(null); }}
                className="text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
              >
                {isRegister ? "Already part of the grid? Authenticate" : "New municipal node? Request Access"}
              </button>
            </div>
          </div>

          {/* Footer Stats Summary */}
          <div className="mt-12 flex justify-between items-center text-white/40 font-bold px-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[16px] text-white">99.9%</p>
                <p className="text-[8px] uppercase tracking-widest">Uptime</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <p className="text-[16px] text-white">4.2ms</p>
                <p className="text-[8px] uppercase tracking-widest">Latency</p>
              </div>
            </div>
            <p className="text-[8px] uppercase tracking-[0.3em] font-black">Secure Nexus Tunnel • AES-256</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
