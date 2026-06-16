import { useEffect, useState } from 'react';
import { Shield, Check, X, MapPin } from 'lucide-react';
import { api } from '../../lib/api';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  scan_latitude: number | null;
  scan_longitude: number | null;
  order_latitude: number | null;
  order_longitude: number | null;
  ip_address: string | null;
  table_number: number | null;
}

interface Props {
  venueId: string;
  staffId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function SecurityAlerts({ venueId, staffId }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadAlerts();
  }, [venueId]);

  async function loadAlerts() {
    const data = await api<{ alerts: Alert[] }>(
      `/staff/venues/${venueId}/security-alerts?status=pending`
    );
    setAlerts(data.alerts);
  }

  async function reviewAlert(alertId: string, status: 'approved' | 'blocked' | 'dismissed') {
    await api(`/staff/security-alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewedBy: staffId }),
    });
    loadAlerts();
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-bold">Security Alerts</h1>
        {alerts.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No pending security alerts</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {alerts.map((alert) => (
            <div key={alert.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_COLORS[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{alert.alert_type.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(alert.created_at).toLocaleTimeString()}
                </span>
              </div>

              <p className="font-medium mb-2">{alert.description}</p>

              <div className="text-sm text-gray-500 space-y-1 mb-4">
                {alert.table_number && <p>Table: {alert.table_number}</p>}
                {alert.ip_address && <p>IP: {alert.ip_address}</p>}
                {alert.scan_latitude && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Scan: {alert.scan_latitude.toFixed(5)}, {alert.scan_longitude?.toFixed(5)}
                  </p>
                )}
                {alert.order_latitude && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Order: {alert.order_latitude.toFixed(5)}, {alert.order_longitude?.toFixed(5)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => reviewAlert(alert.id, 'approved')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => reviewAlert(alert.id, 'blocked')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                >
                  <X className="w-4 h-4" /> Block
                </button>
                <button
                  onClick={() => reviewAlert(alert.id, 'dismissed')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
