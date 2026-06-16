import { useEffect, useState, useCallback } from 'react';
import {
  QrCode, Plus, Trash2, Loader2, Download, Copy, Check, X, Info,
} from 'lucide-react';
import { api } from '../../lib/api';

interface Table {
  id: string;
  tableNumber: number;
  label: string | null;
  activeOrders: number;
  orderUrl: string;
}

interface QrData {
  dataUrl: string;
  orderUrl: string;
  tableNumber: number;
  tableId: string;
}

interface Props {
  venueId: string;
  staffId: string;
  staffRole: string;
}

export default function TableManagement({ venueId, staffId, staffRole }: Props) {
  const canEdit = staffRole === 'manager' || staffRole === 'owner';
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [label, setLabel] = useState('');
  const [qrModal, setQrModal] = useState<QrData | null>(null);
  const [qrLoading, setQrLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTables = useCallback(async () => {
    const data = await api<{ tables: Table[] }>(`/staff/venues/${venueId}/tables`);
    setTables(data.tables);
    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    loadTables().catch(() => setError('Failed to load tables'));
  }, [loadTables]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api(`/staff/venues/${venueId}/tables`, {
        method: 'POST',
        body: JSON.stringify({
          staffId,
          tableNumber: tableNumber ? parseInt(tableNumber, 10) : undefined,
          label: label.trim() || undefined,
        }),
      });
      setTableNumber('');
      setLabel('');
      await loadTables();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; error?: string };
      setError(apiErr.message || apiErr.error || 'Failed to add table');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(table: Table) {
    if (table.activeOrders > 0) {
      setError('Cannot delete a table with active orders');
      return;
    }
    if (!confirm(`Delete Table ${table.tableNumber}${table.label ? ` (${table.label})` : ''}?`)) return;

    setError('');
    try {
      await api(`/staff/venues/${venueId}/tables/${table.id}?staffId=${staffId}`, {
        method: 'DELETE',
      });
      await loadTables();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; error?: string };
      setError(apiErr.message || apiErr.error || 'Failed to delete table');
    }
  }

  async function showQr(table: Table) {
    setQrLoading(table.id);
    setCopied(false);
    try {
      const data = await api<Omit<QrData, 'tableId'>>(`/staff/venues/${venueId}/tables/${table.id}/qr`);
      setQrModal({ ...data, tableId: table.id });
    } catch {
      setError('Failed to generate QR code');
    } finally {
      setQrLoading(null);
    }
  }

  function downloadQr() {
    if (!qrModal) return;
    const link = document.createElement('a');
    link.href = `/api/staff/venues/${venueId}/tables/${qrModal.tableId}/qr?download=1`;
    link.download = `table-${qrModal.tableNumber}-qr.png`;
    link.click();
  }

  async function copyLink() {
    if (!qrModal) return;
    await navigator.clipboard.writeText(qrModal.orderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading tables…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <QrCode className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold">Table Management</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Manage tables and generate QR codes for customer ordering
      </p>

      {!canEdit && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-2">
          <Info className="w-5 h-5 shrink-0" />
          Only managers can add or delete tables. You can still view and download QR codes.
        </div>
      )}

      {canEdit && (
        <form onSubmit={handleAdd} className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-600" /> Add table
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Table number</label>
              <input
                type="number"
                min={1}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Auto"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Label (optional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Terrace 3"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-5 text-sm flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add table
          </button>
        </form>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {tables.map((table) => (
          <div key={table.id} className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-brand-700">{table.tableNumber}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                Table {table.tableNumber}
                {table.label && <span className="text-gray-500 font-normal"> · {table.label}</span>}
              </p>
              <p className="text-xs text-gray-400 truncate">{table.orderUrl}</p>
              {table.activeOrders > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">{table.activeOrders} active order(s)</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => showQr(table)}
                disabled={qrLoading === table.id}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                {qrLoading === table.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                QR
              </button>
              {canEdit && (
                <button
                  onClick={() => handleDelete(table)}
                  disabled={table.activeOrders > 0}
                  title={table.activeOrders > 0 ? 'Has active orders' : 'Delete table'}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {tables.length === 0 && (
          <p className="text-center text-gray-400 py-8">No tables yet. Add your first table above.</p>
        )}
      </div>

      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setQrModal(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <button
              onClick={() => setQrModal(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg mb-1">Table {qrModal.tableNumber}</h3>
            <p className="text-sm text-gray-500 mb-4">Scan to order</p>
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex justify-center mb-4">
              <img src={qrModal.dataUrl} alt={`QR code for table ${qrModal.tableNumber}`} className="w-56 h-56" />
            </div>
            <p className="text-xs text-gray-400 break-all mb-4">{qrModal.orderUrl}</p>
            <div className="flex gap-2">
              <button onClick={downloadQr} className="btn-primary flex-1 !py-2.5 text-sm flex items-center justify-center gap-1.5">
                <Download className="w-4 h-4" /> Download PNG
              </button>
              <button
                onClick={copyLink}
                className="btn-secondary flex-1 !py-2.5 text-sm flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
