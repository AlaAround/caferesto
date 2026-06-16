export class GeolocationError extends Error {
  readonly kind: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

  constructor(message: string, kind: GeolocationError['kind']) {
    super(message);
    this.name = 'GeolocationError';
    this.kind = kind;
  }
}

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function mapNativeError(err: GeolocationPositionError): GeolocationError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new GeolocationError(
        'Location permission was denied. Allow location access for this site in your browser settings, then refresh the page.',
        'PERMISSION_DENIED'
      );
    case err.TIMEOUT:
      return new GeolocationError(
        'Location request timed out. On Windows, enable Settings → Privacy & security → Location, then try again.',
        'TIMEOUT'
      );
    default:
      return new GeolocationError(
        'Unable to determine your location. Enable device location services and ensure you have a network connection, then try again.',
        'POSITION_UNAVAILABLE'
      );
  }
}

function getDevMockCoords(): { latitude: number; longitude: number; accuracy: number } {
  const lat = parseFloat(import.meta.env.VITE_DEV_MOCK_LAT ?? '36.8065');
  const lon = parseFloat(import.meta.env.VITE_DEV_MOCK_LON ?? '10.1815');
  return { latitude: lat, longitude: lon, accuracy: 20 };
}

function devMockPosition(): GeolocationPosition {
  const coords = getDevMockCoords();
  return {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return this;
      },
    },
    timestamp: Date.now(),
    toJSON() {
      return { coords: this.coords, timestamp: this.timestamp };
    },
  };
}

function shouldForceDevMock(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_FORCE_MOCK_GPS === 'true';
}

function shouldFallbackDevMock(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_GPS !== 'false';
}

/**
 * Request GPS coordinates with a high-accuracy attempt first, then a
 * network/WiFi fallback (works on desktops without a GPS chip).
 */
export async function requestGeolocation(): Promise<GeolocationPosition> {
  if (shouldForceDevMock()) {
    console.warn('[TableOrder] Using forced dev mock GPS:', getDevMockCoords());
    return devMockPosition();
  }

  if (!navigator.geolocation) {
    throw new GeolocationError(
      'Geolocation is not supported by your browser.',
      'UNSUPPORTED'
    );
  }

  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'denied') {
        throw new GeolocationError(
          'Location permission is blocked for this site. Click the lock icon in your address bar, allow Location, then refresh.',
          'PERMISSION_DENIED'
        );
      }
    } catch (e) {
      if (e instanceof GeolocationError) throw e;
    }
  }

  try {
    return await getPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  } catch (firstErr) {
    const code = (firstErr as GeolocationPositionError).code;

    if (code === 1) {
      throw mapNativeError(firstErr as GeolocationPositionError);
    }

    try {
      return await getPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 120000,
      });
    } catch (secondErr) {
      const secondCode = (secondErr as GeolocationPositionError).code;
      if (secondCode === 1) {
        throw mapNativeError(secondErr as GeolocationPositionError);
      }

      if (shouldFallbackDevMock()) {
        console.warn('[TableOrder] Using dev mock GPS coordinates');
        return devMockPosition();
      }

      throw mapNativeError(secondErr as GeolocationPositionError);
    }
  }
}

export function isGeolocationError(err: unknown): err is GeolocationError {
  return err instanceof GeolocationError;
}
