import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Shield, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { api, setSessionToken, getDeviceFingerprint } from '../../lib/api';
import { requestGeolocation, isGeolocationError } from '../../lib/geolocation';
import { VENUE_HERO } from '../../lib/menu-images';

type Status = 'idle' | 'requesting' | 'success' | 'denied' | 'unavailable' | 'error';

export default function TablePage() {
  const { venueSlug, tableNumber } = useParams<{ venueSlug: string; tableNumber: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [venueName, setVenueName] = useState('');

  useEffect(() => {
    sessionStorage.setItem('venueSlug', venueSlug!);
    sessionStorage.setItem('tableNumber', tableNumber!);
    api<{ name: string }>(`/venues/${venueSlug}`).then((v) => setVenueName(v.name)).catch(() => {});
  }, [venueSlug, tableNumber]);

  async function startSession() {
    setStatus('requesting');
    setError('');

    let latitude: number;
    let longitude: number;
    let accuracy: number | undefined;

    try {
      const position = await requestGeolocation();
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      accuracy = position.coords.accuracy;
    } catch (err: unknown) {
      if (isGeolocationError(err)) {
        setError(err.message);
        setStatus(err.kind === 'PERMISSION_DENIED' ? 'denied' : 'unavailable');
        if (err.kind === 'PERMISSION_DENIED') {
          await api(`/venues/${venueSlug}/tables/${tableNumber}/session`, {
            method: 'POST',
            body: JSON.stringify({ gpsDenied: true }),
          }).catch(() => {});
        }
        return;
      }
      setStatus('error');
      setError('Could not read your location. Please try again.');
      return;
    }

    try {
      const result = await api<{
        token: string;
        venue: { name: string };
        table: { number: number; label: string | null };
      }>(`/venues/${venueSlug}/tables/${tableNumber}/session`, {
        method: 'POST',
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy,
          deviceFingerprint: getDeviceFingerprint(),
        }),
      });

      setSessionToken(result.token);
      setVenueName(result.venue.name);
      setStatus('success');
      setTimeout(() => {
        navigate(`/venue/${venueSlug}/table/${tableNumber}/menu`);
      }, 900);
    } catch (err: unknown) {
      const apiErr = err as { error?: string; message?: string };
      if (apiErr.error === 'GPS_REQUIRED') {
        setStatus('error');
        setError('The server did not receive your location. Please refresh and try again.');
        return;
      }
      setStatus('error');
      setError(apiErr.message || 'Something went wrong. Please try again.');
    }
  }

  const showRetry = status === 'denied' || status === 'unavailable' || status === 'error';

  return (
    <div className="min-h-screen bg-surface-dark text-white flex flex-col">
      <div className="relative h-56 overflow-hidden shrink-0">
        <img src={VENUE_HERO} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-dark" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-8 pb-10">
        <div className="max-w-sm w-full">
          {venueName && (
            <p className="text-brand-300 text-sm font-medium text-center mb-1">{venueName}</p>
          )}
          <h1 className="font-display text-3xl font-bold text-center mb-1">
            Table {tableNumber}
          </h1>
          <p className="text-gray-400 text-center text-sm mb-10">
            Ready to order? We just need to verify you're here.
          </p>

          <div className="card bg-white/5 border-white/10 backdrop-blur-sm p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brand-600/20 rounded-2xl flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <p className="font-medium mb-1">Location check</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  We need your GPS to confirm you're at the venue. This keeps orders secure and prevents remote spoofing.
                </p>
              </div>
            </div>
          </div>

          {status === 'idle' && (
            <button onClick={startSession} className="btn-primary w-full flex items-center justify-center gap-2">
              Enable Location & View Menu
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {status === 'requesting' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="w-10 h-10 animate-spin text-brand-400" />
              <p className="text-gray-400 text-sm text-center">
                Getting your location…<br />
                <span className="text-gray-500 text-xs">This may take a few seconds on desktop</span>
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 bg-ocean-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-ocean-500" />
              </div>
              <p className="text-brand-300 font-medium">Verified! Opening menu...</p>
            </div>
          )}

          {showRetry && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl text-sm leading-relaxed flex gap-3 ${
                status === 'denied'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
              }`}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
              <button onClick={startSession} className="btn-primary w-full">
                Try Again
              </button>
            </div>
          )}

          {import.meta.env.DEV && (
            <p className="text-xs text-gray-600 mt-4 text-center">
              Dev mode: mock GPS auto-used if location unavailable
            </p>
          )}

          <p className="text-xs text-gray-600 mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Secured by TableOrder
          </p>
        </div>
      </div>
    </div>
  );
}
