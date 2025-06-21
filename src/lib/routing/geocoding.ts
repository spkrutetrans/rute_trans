import { createClient } from "@/lib/supabase/client";

// Definisi Interface yang Lebih Robust
export interface Coordinate {
  lon: number;
  lat: number;
}

export interface LocationResult extends Coordinate {
  display_name: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface OSRMRouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: {
    coordinates: [number, number][]; // [lon, lat] pairs
  };
  waypoints?: {
    distance: number;
    name: string;
    location: [number, number];
  }[];
}

interface CachedLocation {
  alamat: string;
  latitude: number;
  longitude: number;
  display_name: string;
  address_details?: Record<string, any>;
  last_updated: string;
}

interface CachedRoute {
  asal: string;
  tujuan: string;
  jarak_km: number;
  waktu_jam: number;
  polyline?: string;
  last_updated: string;
}

// Konstanta Konfigurasi
const API_CONFIG = {
  NOMINATIM_URL: process.env.NEXT_PUBLIC_NOMINATIM_URL || "https://nominatim.openstreetmap.org",
  OSRM_URL: process.env.NEXT_PUBLIC_OSRM_URL || "https://router.project-osrm.org",
  RATE_LIMIT_DELAY: 1000, // 1 detik delay antara request
  MAX_RETRIES: 2,
  EARTH_RADIUS_KM: 6371,
  AVERAGE_SPEED_KPH: 40,
};

// Utility Functions
const isValidCoordinate = (coord: Coordinate): boolean => {
  return (
    coord &&
    typeof coord.lat === 'number' && 
    typeof coord.lon === 'number' &&
    Math.abs(coord.lat) <= 90 &&
    Math.abs(coord.lon) <= 180
  );
};

const formatCoordinate = (coord: Coordinate): string => {
  return `${coord.lon.toFixed(6)},${coord.lat.toFixed(6)}`;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi Cache dengan Error Handling Lebih Baik
export const getCachedLocation = async (
  alamat: string
): Promise<CachedLocation | null> => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("lokasi_cache")
      .select("*")
      .eq("alamat", alamat)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting cached location:", error);
    return null;
  }
};

export const cacheLocation = async (
  alamat: string,
  lat: number,
  lon: number,
  display_name: string,
  address_details?: Record<string, any>
): Promise<void> => {
  const supabase = createClient();
  try {
    const { error } = await supabase.from("lokasi_cache").upsert({
      alamat,
      latitude: lat,
      longitude: lon,
      display_name,
      address_details,
      last_updated: new Date().toISOString(),
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error caching location:", error);
    throw new Error("Gagal menyimpan lokasi ke cache");
  }
};

export const getCachedRoute = async (
  asal: string,
  tujuan: string
): Promise<CachedRoute | null> => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("rute_cache")
      .select("*")
      .eq("asal", asal)
      .eq("tujuan", tujuan)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting cached route:", error);
    return null;
  }
};

export const cacheRoute = async (
  asal: string,
  tujuan: string,
  jarak_km: number,
  waktu_jam: number,
  polyline?: string
): Promise<void> => {
  const supabase = createClient();
  try {
    const { error } = await supabase.from("rute_cache").upsert({
      asal,
      tujuan,
      jarak_km,
      waktu_jam,
      polyline,
      last_updated: new Date().toISOString(),
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error caching route:", error);
    throw new Error("Gagal menyimpan rute ke cache");
  }
};

// Fungsi Utama dengan Retry Mechanism
export const geocodeAddress = async (
  address: string,
  retryCount = 0
): Promise<LocationResult> => {
  try {
    await delay(API_CONFIG.RATE_LIMIT_DELAY);

    const url = new URL(`${API_CONFIG.NOMINATIM_URL}/search`);
    url.searchParams.append('q', address);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'ShippingOptimizer/1.0 (contact@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error("Alamat tidak ditemukan");
    }

    const result = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name,
      address: data[0].address
    };

    return result;
  } catch (error) {
    if (retryCount < API_CONFIG.MAX_RETRIES) {
      console.warn(`Retrying geocode (attempt ${retryCount + 1})...`);
      return geocodeAddress(address, retryCount + 1);
    }
    console.error("Geocoding error:", error);
    throw new Error("Gagal mendapatkan koordinat alamat");
  }
};

export const getOSRMRoute = async (
  start: Coordinate,
  end: Coordinate,
  retryCount = 0
): Promise<OSRMRouteResult> => {
  try {
    if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
      throw new Error('Koordinat tidak valid');
    }

    const startStr = formatCoordinate(start);
    const endStr = formatCoordinate(end);
    
    const url = `${API_CONFIG.OSRM_URL}/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok") {
      throw new Error(data.message || "Gagal menghitung rute");
    }

    const result: OSRMRouteResult = {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
      waypoints: data.waypoints?.map((wp: any) => ({
        distance: wp.distance,
        name: wp.name,
        location: wp.location
      }))
    };

    return result;
  } catch (error) {
    if (retryCount < API_CONFIG.MAX_RETRIES) {
      console.warn(`Retrying OSRM route (attempt ${retryCount + 1})...`);
      return getOSRMRoute(start, end, retryCount + 1);
    }
    console.error("OSRM error:", error);
    throw new Error("Gagal menghitung jarak rute");
  }
};

export const calculateEuclideanDistance = (
  point1: Coordinate,
  point2: Coordinate
): { distance: number; duration: number } => {
  if (!isValidCoordinate(point1)) throw new Error('Koordinat awal tidak valid');
  if (!isValidCoordinate(point2)) throw new Error('Koordinat tujuan tidak valid');

  const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
  const dLon = (point2.lon - point1.lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * (Math.PI / 180)) *
    Math.cos(point2.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = API_CONFIG.EARTH_RADIUS_KM * c; // Distance in km

  // Estimate duration (assuming average speed)
  const duration = (distance / API_CONFIG.AVERAGE_SPEED_KPH) * 3600; // Convert to seconds

  return {
    distance: distance * 1000, // Convert to meters to match OSRM
    duration,
  };
};

// Fungsi dengan Fallback Mechanism
export const getOrGeocodeLocation = async (
  address: string
): Promise<LocationResult> => {
  try {
    // Coba dari cache dulu
    const cachedLocation = await getCachedLocation(address);
    if (cachedLocation) {
      return {
        lat: cachedLocation.latitude,
        lon: cachedLocation.longitude,
        display_name: cachedLocation.display_name,
        address: cachedLocation.address_details
      };
    }

    // Jika tidak ada di cache, geocode
    const location = await geocodeAddress(address);
    
    // Simpan ke cache
    await cacheLocation(
      address,
      location.lat,
      location.lon,
      location.display_name,
      location.address
    );
    
    return location;
  } catch (error) {
    console.error("Error in getOrGeocodeLocation:", error);
    
    // Fallback: Coba cari kota besar jika alamat spesifik gagal
    if (error.message.includes('tidak ditemukan')) {
      const cityMatch = address.match(/([^,]+),\s*([^,]+)$/);
      if (cityMatch) {
        console.log('Mencoba geocode dengan nama kota saja...');
        return getOrGeocodeLocation(cityMatch[0]);
      }
    }
    
    throw error;
  }
};

export const getOrCalculateRoute = async (
  start: Coordinate | string,
  end: Coordinate | string
): Promise<OSRMRouteResult> => {
  try {
    // Dapatkan koordinat
    const startCoord =
      typeof start === "string" ? await getOrGeocodeLocation(start) : start;
    const endCoord =
      typeof end === "string" ? await getOrGeocodeLocation(end) : end;

    // Validasi koordinat
    if (!isValidCoordinate(startCoord)) throw new Error('Koordinat awal tidak valid');
    if (!isValidCoordinate(endCoord)) throw new Error('Koordinat tujuan tidak valid');

    // Jika kedua alamat berupa string, cek cache
    if (typeof start === "string" && typeof end === "string") {
      const cachedRoute = await getCachedRoute(start, end);
      if (cachedRoute) {
        return {
          distance: cachedRoute.jarak_km * 1000,
          duration: cachedRoute.waktu_jam * 3600,
          geometry: {
            coordinates: cachedRoute.polyline 
              ? decodePolyline(cachedRoute.polyline)
              : []
          },
        };
      }
    }

    // Hitung rute dari OSRM
    let route: OSRMRouteResult;
    try {
      route = await getOSRMRoute(startCoord, endCoord);
    } catch (osrmError) {
      console.error('OSRM failed, falling back to Euclidean distance:', osrmError);
      const fallback = calculateEuclideanDistance(startCoord, endCoord);
      route = {
        distance: fallback.distance,
        duration: fallback.duration,
        geometry: {
          coordinates: [
            [startCoord.lon, startCoord.lat],
            [endCoord.lon, endCoord.lat]
          ]
        }
      };
    }

    // Jika kedua alamat berupa string, simpan ke cache
    if (typeof start === "string" && typeof end === "string") {
      await cacheRoute(
        start,
        end,
        route.distance / 1000,
        route.duration / 3600,
        encodePolyline(route.geometry.coordinates)
      );
    }

    return route;
  } catch (error) {
    console.error("Error in getOrCalculateRoute:", error);
    throw error;
  }
};

// Helper untuk polyline (opsional)
const encodePolyline = (coordinates: [number, number][]): string => {
  // Implementasi encoding polyline
  // ...
  return '';
};

const decodePolyline = (polyline: string): [number, number][] => {
  // Implementasi decoding polyline
  // ...
  return [];
};

// Fungsi untuk mendapatkan beberapa alternatif rute
export const getRouteAlternatives = async (
  origin: string | Coordinate,
  destination: string | Coordinate,
  alternatives = 2
): Promise<OSRMRouteResult[]> => {
  try {
    const start = typeof origin === 'string' 
      ? await getOrGeocodeLocation(origin) 
      : origin;
    const end = typeof destination === 'string'
      ? await getOrGeocodeLocation(destination)
      : destination;

    if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
      throw new Error('Koordinat tidak valid');
    }

    const startStr = formatCoordinate(start);
    const endStr = formatCoordinate(end);
    
    const url = `${API_CONFIG.OSRM_URL}/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson&alternatives=${alternatives}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok") {
      throw new Error(data.message || "Gagal menghitung rute alternatif");
    }

    return data.routes.map((route: any) => ({
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry
    }));
  } catch (error) {
    console.error("Error getting route alternatives:", error);
    // Fallback ke rute utama saja
    const mainRoute = await getOrCalculateRoute(origin, destination);
    return [mainRoute];
  }
};