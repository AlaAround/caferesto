import { useEffect, useState } from 'react';
import { MapPin, Navigation, Save, Loader2, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { requestGeolocation, isGeolocationError } from '../../lib/geolocation';

interface Props {
  venueId: string;
  staffId: string;
  staffRole: string;
}

interface VenueLocation {
  name: string;
  latitude: number;
  longitude: number;
  proximityRadiusMeters: number;
}

export default function VenueLocationSettings({ venueId, staffId, staffRole }: Props) {
  const canEdit = staffRole === 'manager' || staffRole === 'owner';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [venueName, setVenueName] = useState('');

  useEffect(() => {
    api<VenueLocation>(`/staff/venues/${venueId}/location`)
      .then((data) => {
        setVenueName(data.name);
        setLatitude(String(data.latitude));
        setLongitude(String(data.longitude));
        setRadius(String(data.proximityRadiusMeters));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load venue location');
        setLoading(false);
      });
  }, [venueId]);

  async function useCurrentLocation() {
    setLocating(true);
    setError('');
    try {
      const position = await requestGeolocation();
      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
    } catch (err: unknown) {
      setError(isGeolocationError(err) ? err.message : 'Could not get your location');
    } finally {
      setLocating(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseInt(radius, 10);

    if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(rad)) {
      setError('Please enter valid numbers');
      setSaving(false);
      return;
    }

    try {
      const updated = await api<VenueLocation>(`/staff/venues/${venueId}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          proximityRadiusMeters: rad,
          staffId,
        }),
      });
      setLatitude(String(updated.latitude));
      setLongitude(String(updated.longitude));
      setRadius(String(updated.proximityRadiusMeters));
      setSuccess('Venue location updated. Customers must re-scan QR codes to start new sessions.');
    } catch (err: unknown) {
      const apiErr = err as { message?: string; error?: string };
      setError(apiErr.message || apiErr.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-2">
        <MapPin className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold">Venue Location</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        {venueName} — GPS coordinates used for customer proximity checks
      </p>

      {!canEdit && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-2">
          <Info className="w-5 h-5 shrink-0" />
          Only managers can edit location settings. Contact your manager to make changes.
        </div>
      )}

      <form onSubmit={handleSave} className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="36.806500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="10.181500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Proximity radius (metres)
          </label>
          <input
            type="number"
            min={10}
            max={5000}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Customers must be within this distance to place orders (10–5000m)
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-brand-200 text-brand-700 rounded-xl hover:bg-brand-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Use my current location
          </button>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
        )}

        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save location
          </button>
        )}
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-500 space-y-1">
        <p className="font-medium text-gray-700">How it works</p>
        <p>When a customer scans a QR code, their GPS is compared to these coordinates.</p>
        <p>After changing the location, existing customer sessions may fail — they need to re-scan.</p>
      </div>
    </div>
  );
}
