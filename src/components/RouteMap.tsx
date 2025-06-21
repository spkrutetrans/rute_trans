"use client";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RouteMapProps {
  asal?: { lat: number; lon: number; name: string };
  tujuan?: { lat: number; lon: number; name: string };
  ruteKoordinat?: [number, number][];
}

const isValidCoordinate = (coord?: { lat: number; lon: number }): boolean => {
  if (!coord) return false;
  return (
    !isNaN(coord.lat) &&
    !isNaN(coord.lon) &&
    Math.abs(coord.lat) <= 90 &&
    Math.abs(coord.lon) <= 180
  );
};

export default function RouteMap({
  asal,
  tujuan,
  ruteKoordinat = [],
}: RouteMapProps) {
  // Validasi koordinat sebelum render peta
  if (
    !asal ||
    !tujuan ||
    !isValidCoordinate(asal) ||
    !isValidCoordinate(tujuan)
  ) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-red-500">
          {!asal || !tujuan
            ? "Data lokasi belum lengkap"
            : "Koordinat tidak valid"}
        </p>
      </div>
    );
  }

  // Filter koordinat rute yang valid
  const validRuteKoordinat = ruteKoordinat.filter(([lat, lon]) =>
    isValidCoordinate({ lat, lon })
  );

  // Hitung titik tengah hanya jika koordinat valid
  const centerLat = (asal.lat + tujuan.lat) / 2;
  const centerLng = (asal.lon + tujuan.lon) / 2;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={13}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <Marker position={[asal.lat, asal.lon]} icon={defaultIcon}>
        <Popup>{asal.name}</Popup>
      </Marker>

      <Marker position={[tujuan.lat, tujuan.lon]} icon={defaultIcon}>
        <Popup>{tujuan.name}</Popup>
      </Marker>

      {validRuteKoordinat.length > 0 && (
        <Polyline
          positions={validRuteKoordinat}
          color="blue"
          weight={5}
          opacity={0.7}
        />
      )}
    </MapContainer>
  );
}