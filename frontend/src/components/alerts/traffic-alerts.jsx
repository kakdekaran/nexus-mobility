// frontend/src/components/Alerts/TrafficAlerts.jsx
import React, { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

const TrafficAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch alerts
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/alerts`);
      setAlerts(response.data);
      
      // Count unread alerts
      const unread = response.data.filter(a => !a.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark alert as read
  const markAsRead = async (alertId) => {
    try {
      await axios.put(`${API_BASE}/alerts/${alertId}/mark-read`);
      fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  // Delete alert
  const deleteAlert = async (alertId) => {
    try {
      await axios.delete(`${API_BASE}/alerts/${alertId}`);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-yellow-500 bg-yellow-50';
      case 'low': return 'text-green-500 bg-green-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="relative">
      {/* Alert Bell Icon */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-surface-bright rounded-full transition"
      >
        <Bell size={24} className="text-on-surface" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Alert Panel */}
      {showPanel && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-primary text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold">Traffic Alerts</h3>
            <button onClick={() => setShowPanel(false)}>
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-center">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No alerts</div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 ${getSeverityColor(alert.severity)} border-l-4 ${
                    alert.severity === 'high' ? 'border-red-500' :
                    alert.severity === 'medium' ? 'border-yellow-500' :
                    'border-green-500'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={16} />
                        <span className="font-semibold text-sm">
                          {alert.alert_type.toUpperCase()} - {alert.city}
                        </span>
                      </div>
                      <p className="text-sm mb-1">{alert.message}</p>
                      <p className="text-xs text-gray-600">
                        📍 {alert.location}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!alert.is_read && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="p-1 hover:bg-white rounded"
                          title="Mark as read"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="p-1 hover:bg-white rounded"
                        title="Delete"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrafficAlerts;
