import React, { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

const TrafficAlerts = ({ onShowPanel }) => {
  const [alerts, setAlerts] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch alerts using the centralized api service
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/alerts');
      const data = response.data || response;
      setAlerts(Array.isArray(data) ? data : []);
      
      const unread = (Array.isArray(data) ? data : []).filter(a => !a.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/mark-read`);
      fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'text-error bg-error/10 border-error';
      case 'medium': return 'text-warning bg-warning/10 border-warning';
      case 'low': return 'text-success bg-success/10 border-success';
      default: return 'text-on-surface bg-surface-container-high border-outline';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
            setShowPanel(!showPanel);
            if (onShowPanel) onShowPanel(!showPanel);
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative ${
            showPanel ? 'bg-primary/20 text-primary' : 'text-on-surface hover:text-primary hover:bg-surface-container-high/50'
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-white text-[8px] font-black flex items-center justify-center rounded-full ring-2 ring-surface-container-low animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-14 w-80 bg-surface-container border border-on-surface/10 rounded-2xl shadow-2xl z-[100] max-h-[480px] overflow-hidden flex flex-col backdrop-blur-xl">
          <div className="bg-on-surface/5 border-b border-on-surface/5 p-4 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface">Traffic Directives</h3>
            <button onClick={() => setShowPanel(false)} className="text-on-surface/60 hover:text-on-surface">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading && alerts.length === 0 ? (
              <div className="p-8 text-center text-on-surface/40 text-[10px] font-bold uppercase tracking-widest">Synchronizing...</div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-on-surface/40">
                <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No Active Alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-on-surface/5">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 transition-colors ${alert.is_read ? 'opacity-60' : 'bg-primary/5'}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                alert.severity === 'high' ? 'bg-error' : 
                                alert.severity === 'medium' ? 'bg-warning' : 'bg-primary'
                            }`} />
                            <span className="text-[9px] font-black uppercase tracking-tighter text-on-surface">
                                {alert.alert_type} • {alert.city}
                            </span>
                        </div>
                        <p className="text-xs text-on-surface font-medium mb-1 leading-snug">{alert.message}</p>
                        <p className="text-[9px] text-on-surface/60 font-bold uppercase tracking-wide">
                          Sector: {alert.location}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!alert.is_read && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="p-1.5 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="p-1.5 hover:bg-error/20 text-error rounded-lg transition-colors"
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-on-surface/5 border-t border-on-surface/5 text-center">
            <button className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface/60 hover:text-primary transition-colors">
                View All Archives
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficAlerts;
