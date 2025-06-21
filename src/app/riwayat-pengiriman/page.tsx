"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type RuteTerpilih = {
  jarak: number;
  waktu: number;
  biaya: number;
  tingkat_kemacetan: string;
  titik_singgah: string[];
  skor: number;
};

type RiwayatPengiriman = {
  id: string;
  pengiriman_id: string;
  status: "selesai" | "dibatalkan";
  created_at: string;
  updated_at: string;
  selesai_pada: string;
  pengiriman: {
    id: string;
    created_at: string;
    user_id: string;
    lokasi_asal: string;
    lokasi_tujuan: string;
    jenis_barang: string;
    berat_barang: number;
    waktu_pengiriman: string;
    jenis_kendaraan: string;
    current_status: string;
    rute_terpilih: RuteTerpilih;
  };
};

type ChartData = {
  bulan: string;
  jumlah: number;
  totalBiaya: number;
  totalJarak: number;
};

export default function RiwayatPengiriman() {
  const supabase = createClient();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riwayatList, setRiwayatList] = useState<RiwayatPengiriman[]>([]);
  const [filterBulan, setFilterBulan] = useState<string>("");

  // Ambil data riwayat
  useEffect(() => {
    const fetchRiwayat = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("proses_pengiriman")
          .select(
            `
            *,
            pengiriman: pengiriman_id (
              *,
              rute_terpilih
            )
          `
          )
          .in("status", ["selesai", "dibatalkan"])
          .order("selesai_pada", { ascending: false });

        if (filterBulan) {
          const [tahun, bulan] = filterBulan.split("-").map(Number);
          const startDate = new Date(tahun, bulan - 1, 1).toISOString();
          const endDate = new Date(tahun, bulan, 0).toISOString();

          query = query
            .gte("selesai_pada", startDate)
            .lte("selesai_pada", endDate);
        }

        const { data, error } = await query;

        if (error) throw new Error(`Gagal memuat riwayat: ${error.message}`);
        setRiwayatList(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        console.error("Error fetchRiwayat:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRiwayat();
  }, [user, filterBulan]);

  // Format data untuk chart
  const formatDataChart = (): ChartData[] => {
    const dataByMonth: Record<string, ChartData> = {};

    riwayatList.forEach((item) => {
      if (!item.selesai_pada) return;

      const date = new Date(item.selesai_pada);
      const monthYear = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!dataByMonth[monthYear]) {
        dataByMonth[monthYear] = {
          bulan: new Date(
            date.getFullYear(),
            date.getMonth(),
            1
          ).toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          }),
          jumlah: 0,
          totalBiaya: 0,
          totalJarak: 0,
        };
      }

      dataByMonth[monthYear].jumlah += 1;
      dataByMonth[monthYear].totalBiaya += item.pengiriman.rute_terpilih.biaya;
      dataByMonth[monthYear].totalJarak += item.pengiriman.rute_terpilih.jarak;
    });

    // Urutkan dari terbaru ke terlama
    return Object.values(dataByMonth).sort((a, b) => {
      const [aMonth, aYear] = a.bulan.split(" ");
      const [bMonth, bYear] = b.bulan.split(" ");
      const months = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];

      // Bandingkan tahun dulu, baru bulan
      return (
        Number(bYear) - Number(aYear) ||
        months.indexOf(bMonth) - months.indexOf(aMonth)
      );
    });
  };

  // Format tanggal
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Hitung statistik
  const hitungStatistik = () => {
    if (riwayatList.length === 0) return null;

    const total = {
      jarak: 0,
      biaya: 0,
      waktu: 0,
      jumlah: riwayatList.length,
    };

    riwayatList.forEach((item) => {
      total.jarak += item.pengiriman.rute_terpilih.jarak;
      total.biaya += item.pengiriman.rute_terpilih.biaya;
      total.waktu += item.pengiriman.rute_terpilih.waktu;
    });

    return {
      rataJarak: total.jarak / total.jumlah,
      rataBiaya: total.biaya / total.jumlah,
      rataWaktu: total.waktu / total.jumlah,
      total: total.jumlah,
    };
  };

  const statistik = hitungStatistik();

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Riwayat Pengiriman</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter Bulan */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Bulan
            </label>
            <input
              type="month"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Analisis Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grafik Statistik */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Statistik per Bulan</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formatDataChart()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "Total Biaya (Rp)") {
                      return [
                        `Rp ${Number(value).toLocaleString("id-ID")}`,
                        name,
                      ];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="jumlah" fill="#8884d8" name="Jumlah Pengiriman" />
                <Bar
                  dataKey="totalBiaya"
                  fill="#82ca9d"
                  name="Total Biaya (Rp)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rata-rata Pengiriman */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Rata-rata Pengiriman</h2>
          {statistik ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Rata-rata Jarak</p>
                <p className="text-2xl font-bold">
                  {statistik.rataJarak.toFixed(2)} km
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Rata-rata Biaya</p>
                <p className="text-2xl font-bold">
                  Rp{" "}
                  {statistik.rataBiaya
                    .toFixed(0)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Rata-rata Waktu</p>
                <p className="text-2xl font-bold">
                  {statistik.rataWaktu.toFixed(2)} jam
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Pengiriman</p>
                <p className="text-2xl font-bold">{statistik.total}</p>
              </div>
            </div>
          ) : (
            <p>Tidak ada data</p>
          )}
        </div>
      </div>

      {/* Tabel Riwayat */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Memuat data riwayat...</p>
        </div>
      ) : riwayatList.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p>Tidak ada riwayat pengiriman</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rute
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mulai
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selesai
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jarak
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biaya
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {riwayatList.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {item.pengiriman.lokasi_asal} →{" "}
                      {item.pengiriman.lokasi_tujuan}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.pengiriman.jenis_kendaraan}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {item.pengiriman.jenis_barang}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.pengiriman.berat_barang} kg
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.pengiriman.waktu_pengiriman)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.selesai_pada ? formatDate(item.selesai_pada) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === "selesai"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.pengiriman.rute_terpilih.jarak} km
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Rp{" "}
                    {item.pengiriman.rute_terpilih.biaya.toLocaleString(
                      "id-ID"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}