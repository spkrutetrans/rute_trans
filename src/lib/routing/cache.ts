import { createClient } from "@/lib/supabase/client";

export const getCachedLocation = async (alamat: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("lokasi_cache")
    .select("*")
    .eq("alamat", alamat)
    .single();
  return data;
};

export const cacheLocation = async (
  alamat: string,
  lat: number,
  lon: number,
  display_name: string
) => {
  const supabase = createClient();
  await supabase.from("lokasi_cache").upsert({
    alamat,
    latitude: lat,
    longitude: lon,
    display_name,
    last_updated: new Date().toISOString(),
  });
};

export const getCachedRoute = async (asal: string, tujuan: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("rute_cache")
    .select("*")
    .eq("asal", asal)
    .eq("tujuan", tujuan)
    .single();
  return data;
};

export const cacheRoute = async (
  asal: string,
  tujuan: string,
  jarak_km: number,
  waktu_jam: number,
  polyline?: string
) => {
  const supabase = createClient();
  await supabase.from("rute_cache").upsert({
    asal,
    tujuan,
    jarak_km,
    waktu_jam,
    polyline,
    last_updated: new Date().toISOString(),
  });
};
