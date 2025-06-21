"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PengirimanPDF } from "@/components/PengirimanPDF";
import RouteMap from "@/components/RouteMap";
import {
  geocodeAddress,
  getOSRMRoute,
  calculateEuclideanDistance,
} from "@/lib/routing/geocoding";
import {
  getCachedLocation,
  cacheLocation,
  getCachedRoute,
  cacheRoute,
} from "@/lib/routing/cache";

type TingkatKemacetan = "rendah" | "sedang" | "tinggi";

type Kendaraan = {
  id: string;
  jenis: string;
  kapasitas: number;
  konsumsi_bbm: number;
  biaya_per_km: number;
};

type Rute = {
  id: string;
  asal: string;
  tujuan: string;
  jarak: number;
  waktu: number;
  biaya: number;
  tingkat_kemacetan: TingkatKemacetan;
  titik_singgah: string[];
  skor: number;
  coordinates?: [number, number][];
};

type FormInput = {
  lokasiAsal: string;
  lokasiTujuan: string;
  jenisBarang: string;
  beratBarang: number;
  waktuPengiriman: string;
  jenisKendaraan: string;
  preferensi: "biaya" | "waktu" | "seimbang";
};

export default function PengirimanBaru() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();

  // State Management
  const [step, setStep] = useState<"input" | "hasil">("input");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formInput, setFormInput] = useState<FormInput>({
    lokasiAsal: "",
    lokasiTujuan: "",
    jenisBarang: "",
    beratBarang: 0,
    waktuPengiriman: "",
    jenisKendaraan: "",
    preferensi: "biaya",
  });
  const [ruteRekomendasi, setRuteRekomendasi] = useState<Rute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Rute | null>(null);
  const [kendaraanOptions, setKendaraanOptions] = useState<Kendaraan[]>([]);
  const [loadingKendaraan, setLoadingKendaraan] = useState(true);
  const [mapData, setMapData] = useState<{
    asal?: { lat: number; lon: number; name: string };
    tujuan?: { lat: number; lon: number; name: string };
  }>({});

  // Ambil data kendaraan dari Supabase
  useEffect(() => {
    const fetchKendaraan = async () => {
      setLoadingKendaraan(true);
      try {
        const { data, error } = await supabase
          .from("kendaraan")
          .select("*")
          .order("kapasitas", { ascending: true });

        if (error) throw error;
        setKendaraanOptions(data || []);
      } catch (err) {
        setError("Gagal memuat data kendaraan");
        console.error(err);
      } finally {
        setLoadingKendaraan(false);
      }
    };
    fetchKendaraan();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormInput((prev) => ({
      ...prev,
      [name]: name === "beratBarang" ? Number(value) : value,
    }));
  };

  const getTingkatKemacetan = async (
    lokasi: string,
    hari: string,
    jam: number
  ): Promise<TingkatKemacetan> => {
    try {
      const { data } = await supabase
        .from("kemacetan")
        .select("tingkat")
        .eq("lokasi", lokasi)
        .eq("hari", hari)
        .eq("jam", jam)
        .single();

      if (
        data?.tingkat === "rendah" ||
        data?.tingkat === "sedang" ||
        data?.tingkat === "tinggi"
      ) {
        return data.tingkat;
      }
      return "sedang";
    } catch (err) {
      console.error("Error mengambil data kemacetan:", err);
      return "sedang";
    }
  };

  const generateFallbackRoutes = async (
    asal: string,
    tujuan: string,
    waktu: string,
    kendaraan: Kendaraan | undefined
  ): Promise<Omit<Rute, "id" | "skor">[]> => {
    if (!kendaraan) return [];

    // Hitung jarak fallback (default 50km)
    const jarakDefault = 50;
    const waktuDefault = 1.5;

    return [
      {
        asal,
        tujuan,
        jarak: jarakDefault,
        waktu: waktuDefault,
        biaya: kendaraan.biaya_per_km * jarakDefault,
        tingkat_kemacetan: "sedang",
        titik_singgah: [],
        coordinates: [],
      },
    ];
  };

  const generateRuteAlternatif = async (
    asal: string,
    tujuan: string,
    waktu: string
  ): Promise<Omit<Rute, "id" | "skor">[]> => {
    setGeoLoading(true);
    try {
      // Cek cache rute terlebih dahulu
      const cachedRoute = await getCachedRoute(asal, tujuan);
      if (cachedRoute) {
        return [
          {
            asal,
            tujuan,
            jarak: cachedRoute.jarak_km,
            waktu: cachedRoute.waktu_jam,
            biaya: 0, // Akan dihitung ulang berdasarkan kendaraan
            tingkat_kemacetan: "sedang",
            titik_singgah: [],
            coordinates: [],
          },
        ];
      }

      // Cek cache lokasi
      const [cachedAsal, cachedTujuan] = await Promise.all([
        getCachedLocation(asal),
        getCachedLocation(tujuan),
      ]);

      let koordinatAsal, koordinatTujuan;

      if (cachedAsal) {
        koordinatAsal = cachedAsal;
      } else {
        koordinatAsal = await geocodeAddress(asal);
        await cacheLocation(
          asal,
          koordinatAsal.lat,
          koordinatAsal.lon,
          koordinatAsal.display_name
        );
      }

      if (cachedTujuan) {
        koordinatTujuan = cachedTujuan;
      } else {
        koordinatTujuan = await geocodeAddress(tujuan);
        await cacheLocation(
          tujuan,
          koordinatTujuan.lat,
          koordinatTujuan.lon,
          koordinatTujuan.display_name
        );
      }

      setMapData({
        asal: {
          lat: koordinatAsal.lat,
          lon: koordinatAsal.lon,
          name: koordinatAsal.display_name,
        },
        tujuan: {
          lat: koordinatTujuan.lat,
          lon: koordinatTujuan.lon,
          name: koordinatTujuan.display_name,
        },
      });

      const kendaraan = kendaraanOptions.find(
        (k) => k.jenis === formInput.jenisKendaraan
      );
      if (!kendaraan) return [];

      let ruteUtama;
      try {
        ruteUtama = await getOSRMRoute(
          { lon: koordinatAsal.lon, lat: koordinatAsal.lat },
          { lon: koordinatTujuan.lon, lat: koordinatTujuan.lat }
        );

        // Simpan ke cache
        await cacheRoute(
          asal,
          tujuan,
          ruteUtama.distance / 1000,
          ruteUtama.duration / 3600
        );
      } catch (osrmError) {
        console.error("Gagal dapat rute OSRM:", osrmError);
        const fallback = calculateEuclideanDistance(
          { lon: koordinatAsal.lon, lat: koordinatAsal.lat },
          { lon: koordinatTujuan.lon, lat: koordinatTujuan.lat }
        );

        ruteUtama = {
          distance: fallback.distance,
          duration: fallback.duration,
          geometry: {
            coordinates: [
              [koordinatAsal.lon, koordinatAsal.lat],
              [koordinatTujuan.lon, koordinatTujuan.lat],
            ],
          },
        };
      }

      const tanggal = new Date(waktu);
      const hari = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ][tanggal.getDay()];
      const jam = tanggal.getHours();

      const kemacetanAsal = await getTingkatKemacetan(asal, hari, jam);
      const kemacetanTujuan = await getTingkatKemacetan(tujuan, hari, jam + 2);

      const avgKemacetan: TingkatKemacetan =
        kemacetanAsal === "tinggi" || kemacetanTujuan === "tinggi"
          ? "tinggi"
          : kemacetanAsal === "sedang" || kemacetanTujuan === "sedang"
          ? "sedang"
          : "rendah";

      return [
        // Rute utama
        {
          asal: koordinatAsal.display_name,
          tujuan: koordinatTujuan.display_name,
          jarak: ruteUtama.distance / 1000,
          waktu: ruteUtama.duration / 3600,
          biaya: kendaraan.biaya_per_km * (ruteUtama.distance / 1000),
          tingkat_kemacetan: avgKemacetan,
          titik_singgah: [],
          coordinates: ruteUtama.geometry.coordinates.map(([lon, lat]) => [
            lat,
            lon,
          ]),
        },
        // Alternatif 1 (lebih panjang 20%)
        {
          asal: koordinatAsal.display_name,
          tujuan: koordinatTujuan.display_name,
          jarak: (ruteUtama.distance / 1000) * 1.2,
          waktu: (ruteUtama.duration / 3600) * 1.1,
          biaya: kendaraan.biaya_per_km * (ruteUtama.distance / 1000) * 1.2,
          tingkat_kemacetan: "sedang",
          titik_singgah: ["Pos A", "Pos B"],
        },
        // Alternatif 2 (lebih pendek 10% + biaya tol)
        {
          asal: koordinatAsal.display_name,
          tujuan: koordinatTujuan.display_name,
          jarak: (ruteUtama.distance / 1000) * 0.9,
          waktu: (ruteUtama.duration / 3600) * 0.8,
          biaya:
            kendaraan.biaya_per_km * (ruteUtama.distance / 1000) * 0.9 + 50000,
          tingkat_kemacetan: "rendah",
          titik_singgah: ["Pos C"],
        },
      ];
    } catch (err) {
      console.error("Error generate rute:", err);
      const kendaraan = kendaraanOptions.find(
        (k) => k.jenis === formInput.jenisKendaraan
      );
      return generateFallbackRoutes(asal, tujuan, waktu, kendaraan);
    } finally {
      setGeoLoading(false);
    }
  };

  const hitungSkorRute = (rute: Omit<Rute, "id" | "skor">): Rute => {
    const poinJarak = rute.jarak < 50 ? 10 : rute.jarak <= 100 ? 7 : 3;
    const poinWaktu = rute.waktu < 2 ? 10 : rute.waktu <= 4 ? 7 : 3;
    const poinKemacetan =
      rute.tingkat_kemacetan === "rendah"
        ? 10
        : rute.tingkat_kemacetan === "sedang"
        ? 7
        : 3;
    const poinBiaya = rute.biaya < 500000 ? 10 : rute.biaya <= 1000000 ? 7 : 3;

    const skorTotal =
      formInput.preferensi === "biaya"
        ? poinBiaya * 0.5 +
          poinWaktu * 0.2 +
          poinJarak * 0.2 +
          poinKemacetan * 0.1
        : formInput.preferensi === "waktu"
        ? poinWaktu * 0.5 +
          poinBiaya * 0.2 +
          poinJarak * 0.2 +
          poinKemacetan * 0.1
        : poinBiaya * 0.3 +
          poinWaktu * 0.3 +
          poinJarak * 0.2 +
          poinKemacetan * 0.2;

    return {
      ...rute,
      id: Math.random().toString(36).substring(2, 9),
      skor: parseFloat(skorTotal.toFixed(2)),
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validasi input
      if (!formInput.lokasiAsal || !formInput.lokasiTujuan) {
        throw new Error("Alamat asal dan tujuan harus diisi");
      }

      if (
        formInput.lokasiAsal.length < 3 ||
        formInput.lokasiTujuan.length < 3
      ) {
        throw new Error("Alamat terlalu pendek, minimal 3 karakter");
      }

      if (!formInput.waktuPengiriman) {
        throw new Error("Waktu pengiriman harus diisi");
      }

      if (!formInput.jenisKendaraan) {
        throw new Error("Jenis kendaraan harus dipilih");
      }

      const ruteAlternatif = await generateRuteAlternatif(
        formInput.lokasiAsal,
        formInput.lokasiTujuan,
        formInput.waktuPengiriman
      );

      if (ruteAlternatif.length === 0) {
        throw new Error("Tidak ada rute yang tersedia");
      }

      const ruteDenganSkor = ruteAlternatif.map((rute) => hitungSkorRute(rute));
      const sortedRoutes = [...ruteDenganSkor].sort((a, b) => b.skor - a.skor);

      setRuteRekomendasi(sortedRoutes);
      setSelectedRoute(sortedRoutes[0]);
      setStep("hasil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      console.error("Error detail:", {
        error: err,
        formInput,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const simpanPengiriman = async () => {
    if (!selectedRoute || !user) return;

    setLoading(true);
    try {
      const { data: pengirimanData, error: pengirimanError } = await supabase
        .from("pengiriman")
        .insert({
          user_id: user.id,
          lokasi_asal: formInput.lokasiAsal,
          lokasi_tujuan: formInput.lokasiTujuan,
          jenis_barang: formInput.jenisBarang,
          berat_barang: formInput.beratBarang,
          rute_terpilih: selectedRoute,
          waktu_pengiriman: formInput.waktuPengiriman,
          jenis_kendaraan: formInput.jenisKendaraan,
          status: "direncanakan",
          current_status: "direncanakan",
        })
        .select()
        .single();

      if (pengirimanError) throw pengirimanError;

      const { error: prosesError } = await supabase
        .from("proses_pengiriman")
        .insert({
          pengiriman_id: pengirimanData.id,
          status: "direncanakan",
        });

      if (prosesError) throw prosesError;

      router.push("/proses-pengiriman");
    } catch (err) {
      setError(
        "Gagal menyimpan data: " +
          (err instanceof Error ? err.message : "Error tidak diketahui")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Pengiriman Baru</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {step === "input" ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Form Input Pengiriman</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi Asal*
              </label>
              <input
                type="text"
                name="lokasiAsal"
                value={formInput.lokasiAsal}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Gudang Pusat"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi Tujuan*
              </label>
              <input
                type="text"
                name="lokasiTujuan"
                value={formInput.lokasiTujuan}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Toko Cabang A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Barang*
              </label>
              <input
                type="text"
                name="jenisBarang"
                value={formInput.jenisBarang}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Elektronik"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Berat Barang (kg)*
              </label>
              <input
                type="number"
                name="beratBarang"
                value={formInput.beratBarang}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Waktu Pengiriman*
              </label>
              <input
                type="datetime-local"
                name="waktuPengiriman"
                value={formInput.waktuPengiriman}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Kendaraan*
              </label>
              <select
                name="jenisKendaraan"
                value={formInput.jenisKendaraan}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingKendaraan}
              >
                <option value="">Pilih Kendaraan</option>
                {loadingKendaraan ? (
                  <option value="" disabled>
                    Memuat data kendaraan...
                  </option>
                ) : (
                  kendaraanOptions.map((k) => (
                    <option key={k.id} value={k.jenis}>
                      {k.jenis} (Kapasitas: {k.kapasitas}kg, Biaya: Rp
                      {k.biaya_per_km}/km)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferensi Optimasi
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="preferensi"
                    value="biaya"
                    checked={formInput.preferensi === "biaya"}
                    onChange={handleInputChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">Minimalkan Biaya</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="preferensi"
                    value="waktu"
                    checked={formInput.preferensi === "waktu"}
                    onChange={handleInputChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">Minimalkan Waktu</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="preferensi"
                    value="seimbang"
                    checked={formInput.preferensi === "seimbang"}
                    onChange={handleInputChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">Seimbang</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading || geoLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center transition-colors duration-200"
            >
              {loading || geoLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {geoLoading ? "Mencari rute..." : "Memproses..."}
                </>
              ) : (
                "Cari Rute Optimal"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Hasil Optimasi Rute</h2>

          <div className="mb-8">
            <h3 className="text-lg font-medium mb-3">3 Rute Terbaik</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border">Rute</th>
                    <th className="py-2 px-4 border">Jarak (km)</th>
                    <th className="py-2 px-4 border">Waktu (jam)</th>
                    <th className="py-2 px-4 border">Biaya (Rp)</th>
                    <th className="py-2 px-4 border">Kemacetan</th>
                    <th className="py-2 px-4 border">Skor</th>
                    <th className="py-2 px-4 border">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {ruteRekomendasi.map((rute, index) => (
                    <tr
                      key={rute.id}
                      className={`border-b ${
                        selectedRoute?.id === rute.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="py-2 px-4 border text-center">
                        Rute {index + 1}
                      </td>
                      <td className="py-2 px-4 border text-center">
                        {rute.jarak.toFixed(1)}
                      </td>
                      <td className="py-2 px-4 border text-center">
                        {rute.waktu.toFixed(1)}
                      </td>
                      <td className="py-2 px-4 border text-center">
                        {rute.biaya.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 border text-center capitalize">
                        {rute.tingkat_kemacetan}
                      </td>
                      <td className="py-2 px-4 border text-center font-semibold">
                        {rute.skor.toFixed(2)}
                      </td>
                      <td className="py-2 px-4 border text-center">
                        <button
                          onClick={() => setSelectedRoute(rute)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 h-96">
              {mapData.asal && mapData.tujuan ? (
                <RouteMap
                  asal={mapData.asal}
                  tujuan={mapData.tujuan}
                  ruteKoordinat={selectedRoute?.coordinates || []}
                />
              ) : (
                <div className="bg-gray-100 h-full rounded-lg flex items-center justify-center">
                  <p>Memuat peta...</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Detail Pengiriman</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="mb-3">
                  <h4 className="font-medium">Informasi Barang</h4>
                  <p>Jenis: {formInput.jenisBarang || "-"}</p>
                  <p>Berat: {formInput.beratBarang} kg</p>
                </div>

                <div className="mb-3">
                  <h4 className="font-medium">Jadwal Pengiriman</h4>
                  <p>
                    Waktu Mulai:{" "}
                    {new Date(formInput.waktuPengiriman).toLocaleString()}
                  </p>
                  <p>
                    Estimasi Sampai:{" "}
                    {selectedRoute
                      ? new Date(
                          new Date(formInput.waktuPengiriman).getTime() +
                            selectedRoute.waktu * 3600000
                        ).toLocaleString()
                      : "-"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Kendaraan</h4>
                  <p>{formInput.jenisKendaraan || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
            <button
              onClick={() => setStep("input")}
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 w-full sm:w-auto transition-colors duration-200"
            >
              Kembali
            </button>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {selectedRoute && (
                <PDFDownloadLink
                  document={
                    <PengirimanPDF
                      data={{
                        lokasiAsal: formInput.lokasiAsal,
                        lokasiTujuan: formInput.lokasiTujuan,
                        jenisBarang: formInput.jenisBarang,
                        beratBarang: formInput.beratBarang,
                        waktuPengiriman: formInput.waktuPengiriman,
                        jenisKendaraan: formInput.jenisKendaraan,
                        ruteTerpilih: selectedRoute,
                      }}
                    />
                  }
                  fileName={`pengiriman_${formInput.lokasiAsal}_${
                    formInput.lokasiTujuan
                  }_${new Date().toISOString().slice(0, 10)}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <button
                      className={`bg-yellow-500 text-white px-6 py-2 rounded hover:bg-yellow-600 w-full sm:w-auto transition-colors duration-200 ${
                        pdfLoading ? "opacity-50" : ""
                      }`}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? "Membuat PDF..." : "Export PDF"}
                    </button>
                  )}
                </PDFDownloadLink>
              )}

              <button
                onClick={simpanPengiriman}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center w-full sm:w-auto transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Pengiriman"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}