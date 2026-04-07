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
      window.location.href = getDefaultRouteForRole(normalizeRole(role));
    }
  }, []);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('User');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await axios.post(`${API_BASE}/login`, {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword
      });
      setSession(res.data);
      // Using window.location.href instead of navigate() to force a clean re-sync of auth state
      window.location.href = getDefaultRouteForRole(normalizeRole(res.data.role));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await axios.post(`${API_BASE}/register`, {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: regRole || 'User'
      });
      setIsRegister(false);
      setNotice('Registration successful. Please sign in.');
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegRole('User');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background font-body selection:bg-primary/20 selection:text-primary">
      {/* Background Map Visualization (Subtle Overlay) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
        <img 
          alt="Digital abstract map layout" 
          className="w-full h-full object-cover grayscale brightness-50" 
          src="https://images.unsplash.com/photo-1573101808447-d1bd55a6d5ae?auto=format&fit=crop&q=80&w=2600"
        />
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 overflow-hidden rounded-2xl bg-surface-container-low shadow-2xl relative z-10 border border-white/5 font-body">
        {/* Left Side: Login Identity Panel */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-slate-950/40 relative group border-r border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              <h1 className="font-headline font-black text-2xl tracking-tighter text-primary uppercase antialiased">Nexus Mobility</h1>
            </div>
            <p className="text-on-surface-variant font-headline text-3xl font-black leading-tight uppercase antialiased tracking-tighter">
              Precision traffic intelligence <br/> for the modern metropolis.
            </p>
          </div>

          <div className="space-y-8">
            <div className="p-6 rounded-xl bg-surface-container-high/50 border-l-4 border-primary shadow-xl">
              <p className="italic text-on-surface-variant mb-4 text-xs font-bold uppercase tracking-widest leading-relaxed opacity-80">
                "The Digital Cartographer allows us to visualize congestion before it even occurs, saving thousands of transit hours."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-black text-xs border border-primary/20">CP</div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tighter leading-none">Director of Logistics</p>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em] mt-1">Metro Planning Division</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-10">
              <div className="flex flex-col">
                <span className="text-primary font-headline text-2xl font-black tracking-tighter">142+</span>
                <span className="text-on-surface-variant text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Cities Unified</span>
              </div>
              <div className="w-px h-12 bg-white/5"></div>
              <div className="flex flex-col">
                <span className="text-tertiary font-headline text-2xl font-black tracking-tighter">0.8s</span>
                <span className="text-on-surface-variant text-[10px] uppercase font-black tracking-[0.2em] opacity-60">Latent Response</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="p-8 md:p-16 flex flex-col justify-center bg-surface-container-low relative">
          <AnimatePresence mode="wait">
            {!isRegister ? (
              <motion.div 
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <header className="space-y-2">
                  <h2 className="text-3xl font-headline font-black text-white tracking-tighter uppercase antialiased">Access Control</h2>
                  <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">Enter your credentials to manage city mobility logs.</p>
                </header>

                {error && (
                  <div className="bg-error/10 border border-error/20 text-error p-4 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="bg-tertiary/10 border border-tertiary/20 text-tertiary p-4 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    {notice}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-1 opacity-60" htmlFor="email">Institutional Email</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">alternate_email</span>
                        <input 
                          required
                          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm font-medium outline-none" 
                          id="email" 
                          type="email" 
                          placeholder="name@nexus-mobility.gov"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-60" htmlFor="password">Access Cipher</label>
                        <button type="button" className="text-[10px] font-black text-primary hover:text-primary-fixed-dim transition-colors uppercase tracking-widest">Forgot Password?</button>
                      </div>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-primary transition-colors">lock</span>
                        <input 
                          required
                          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm font-medium outline-none" 
                          id="password" 
                          type="password" 
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-1">
                    <input className="w-4 h-4 rounded border-none bg-surface-container-highest text-primary focus:ring-primary/40" id="remember" type="checkbox"/>
                    <label className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 cursor-pointer" htmlFor="remember">Trust this workstation for 30 days</label>
                  </div>

                  <button 
                    disabled={loading}
                    className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-black uppercase tracking-widest py-4 rounded-full flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50" 
                    type="submit"
                  >
                    {loading ? 'Initializing Interface...' : 'Initialize Session'}
                    {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                  </button>
                </form>

                <footer className="pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                  <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-40">Unregistered personnel?</p>
                  <button 
                    onClick={() => setIsRegister(true)}
                    className="text-[10px] font-black text-white hover:text-primary transition-colors flex items-center gap-2 uppercase tracking-widest group"
                  >
                    Create Operator Profile
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </button>
                </footer>
              </motion.div>
            ) : (
              <motion.div 
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <header className="space-y-2">
                  <div className="flex items-center gap-3 mb-6">
                    <button 
                      onClick={() => setIsRegister(false)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all border border-white/5"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Operator Onboarding</span>
                  </div>
                  <h2 className="text-3xl font-headline font-black text-white tracking-tighter uppercase antialiased leading-none">Create Identity</h2>
                  <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">Provision your access credentials for the analytics system.</p>
                </header>

                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-1 opacity-60" htmlFor="reg-name">Full Operator Name</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-tertiary transition-colors">badge</span>
                        <input 
                          required
                          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-tertiary/40 focus:border-tertiary/40 transition-all text-sm font-medium outline-none" 
                          id="reg-name" 
                          type="text" 
                          placeholder="Adrian Sterling"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-1 opacity-60" htmlFor="reg-email">Institutional Email</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-tertiary transition-colors">alternate_email</span>
                        <input 
                          required
                          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-tertiary/40 focus:border-tertiary/40 transition-all text-sm font-medium outline-none" 
                          id="reg-email" 
                          type="email" 
                          placeholder="a.sterling@nexus-mobility.gov"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-1 opacity-60" htmlFor="reg-role">Deployment Role</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-tertiary transition-colors">manage_accounts</span>
                        <select 
                          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white appearance-none focus:ring-2 focus:ring-tertiary/40 focus:border-tertiary/40 transition-all text-sm font-medium outline-none cursor-pointer" 
                          id="reg-role"
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value)}
                        >
                          <option value="User" className="bg-surface-dim">User</option>
                          <option value="Analyst" className="bg-surface-dim">Analyst</option>
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant pointer-events-none">expand_more</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] px-1 opacity-60" htmlFor="reg-password">Access Cipher</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg group-focus-within:text-tertiary transition-colors">lock</span>
                        <input 
                          required
                          minLength={6}
                          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:ring-2 focus:ring-tertiary/40 focus:border-tertiary/40 transition-all text-sm font-medium outline-none" 
                          id="reg-password" 
                          type="password" 
                          placeholder="Minimum 6 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 px-1">
                    <input className="mt-1 w-4 h-4 rounded border-none bg-surface-container-highest text-tertiary focus:ring-tertiary/40" id="terms" type="checkbox" required/>
                    <label className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 leading-relaxed cursor-pointer" htmlFor="terms">
                      I confirm that I am an authorized employee or contractor for the Nexus Mobility Project and agree to the <span className="text-tertiary hover:underline">Standard Security Protocols</span>.
                    </label>
                  </div>

                  <button 
                    disabled={loading}
                    className="w-full bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary font-black uppercase tracking-widest py-4 rounded-full flex items-center justify-center gap-3 shadow-2xl shadow-tertiary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50" 
                    type="submit"
                  >
                    {loading ? 'Provisioning Identity...' : 'Register Operator'}
                    {!loading && <span className="material-symbols-outlined text-lg">how_to_reg</span>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Legal/Status */}
      <div className="mt-12 flex flex-col md:flex-row gap-10 items-center justify-between w-full max-w-5xl px-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse shadow-[0_0_10px_rgba(112,216,200,0.5)]"></div>
            <span>All Systems Operational</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-sm">encrypted</span>
            <span>AES-256 Encrypted</span>
          </div>
        </div>
        <div className="flex gap-8">
          <a className="hover:text-primary transition-colors cursor-pointer" href="#">Privacy Policy</a>
          <a className="hover:text-primary transition-colors cursor-pointer" href="#">Compliance</a>
          <a className="hover:text-primary transition-colors cursor-pointer" href="#">Support</a>
        </div>
      </div>

      {/* Floating Abstract Geometry (Decorative) */}
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-tertiary/10 rounded-full blur-[140px] pointer-events-none"></div>
    </main>
  );
};

export default Login;
