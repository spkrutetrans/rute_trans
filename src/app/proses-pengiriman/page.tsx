"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PengirimanPDF } from "@/components/PengirimanPDF";

type TingkatKemacetan = "rendah" | "sedang" | "tinggi";

type RuteTerpilih = {
  asal: string;
  tujuan: string;
  jarak: number;
  waktu: number;
  biaya: number;
  tingkat_kemacetan: TingkatKemacetan;
  titik_singgah: string[];
  skor: number;
};

type Status = "direncanakan" | "dalam_perjalanan" | "selesai" | "dibatalkan";

type Pengiriman = {
  id: string;
  created_at: string;
  user_id: string;
  lokasi_asal: string;
  lokasi_tujuan: string;
  jenis_barang: string;
  berat_barang: number;
  rute_terpilih: RuteTerpilih;
  waktu_pengiriman: string;
  jenis_kendaraan: string;
  current_status: Status;
};

type ProsesPengiriman = {
  id: string;
  pengiriman_id: string;
  status: Status;
  created_at: string;
  updated_at: string;
  selesai_pada?: string;
  pengiriman: Pengiriman;
};

export default function ProsesPengiriman() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pengirimanList, setPengirimanList] = useState<ProsesPengiriman[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Ambil data pengiriman
  useEffect(() => {
    const fetchPengiriman = async () => {
      if (!user) return;

      setLoading(true);
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
          .not("status", "in", '("selesai","dibatalkan")')
          .order("created_at", { ascending: false });

        if (filterStatus !== "semua") {
          if (filterStatus === "aktif") {
            query = query.in("status", ["direncanakan", "dalam_perjalanan"]);
          } else {
            query = query.eq("status", filterStatus);
          }
        }

        if (searchQuery) {
          query = query.or(
            `pengiriman.lokasi_asal.ilike.%${searchQuery}%,pengiriman.lokasi_tujuan.ilike.%${searchQuery}%,pengiriman.jenis_barang.ilike.%${searchQuery}%`
          );
        }

        const { data, error } = await query;

        if (error) throw error;

        const validatedData = (data || []).map((item) => ({
          ...item,
          pengiriman: {
            ...item.pengiriman,
            rute_terpilih: {
              ...item.pengiriman.rute_terpilih,
              tingkat_kemacetan: ["rendah", "sedang", "tinggi"].includes(
                item.pengiriman.rute_terpilih.tingkat_kemacetan
              )
                ? (item.pengiriman.rute_terpilih
                    .tingkat_kemacetan as TingkatKemacetan)
                : "sedang",
            },
          },
        }));

        setPengirimanList(validatedData);
      } catch (err) {
        setError("Gagal memuat data pengiriman");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPengiriman();
  }, [user, filterStatus, searchQuery]);

  // Update status pengiriman
  const updateStatus = async (pengirimanId: string, newStatus: Status) => {
    try {
      setLoading(true);
      setError(null);

      // Data untuk update
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === "selesai" && {
          selesai_pada: new Date().toISOString(),
        }),
      };

      // 1. Update proses_pengiriman dengan select untuk verifikasi
      const { data: updatedData, error: prosesError } = await supabase
        .from("proses_pengiriman")
        .update(updates)
        .eq("pengiriman_id", pengirimanId)
        .select()
        .single();

      if (prosesError) throw prosesError;

      // 2. Update tabel pengiriman utama (tanpa selesai_pada)
      const { error: pengirimanError } = await supabase
        .from("pengiriman")
        .update({
          current_status: newStatus,
        })
        .eq("id", pengirimanId);

      if (pengirimanError) throw pengirimanError;

      // 3. Update state dan refresh data
      setPengirimanList((prev) =>
        prev.filter((item) => item.pengiriman_id !== pengirimanId)
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal update status";

      setError(errorMessage);
      console.error("Error update status:", {
        message: errorMessage,
        originalError: err,
        pengirimanId,
        newStatus,
      });
    } finally {
      setLoading(false);
    }
  };

  // Format tanggal untuk tampilan
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render status badge
  const renderStatusBadge = (status: Status) => {
    const statusClasses = {
      direncanakan: "bg-blue-100 text-blue-800",
      dalam_perjalanan: "bg-yellow-100 text-yellow-800",
      selesai: "bg-green-100 text-green-800",
      dibatalkan: "bg-red-100 text-red-800",
    };

    const statusText = status
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}`}
      >
        {statusText}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Proses Pengiriman</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">
                Aktif (Direncanakan + Dalam Perjalanan)
              </option>
              <option value="direncanakan">Direncanakan</option>
              <option value="dalam_perjalanan">Dalam Perjalanan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Pengiriman
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan lokasi atau jenis barang..."
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Memuat data pengiriman...</p>
        </div>
      ) : pengirimanList.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p>Tidak ada pengiriman yang sesuai dengan filter</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Rute
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                  Barang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pengirimanList.map((item) => (
                <tr key={item.pengiriman_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.pengiriman_id.slice(0, 6)}...
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {item.pengiriman.lokasi_asal} →{" "}
                      {item.pengiriman.lokasi_tujuan}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.pengiriman.rute_terpilih.jarak} km • Rp{" "}
                      {item.pengiriman.rute_terpilih.biaya.toLocaleString(
                        "id-ID"
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {item.pengiriman.jenis_barang}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.pengiriman.berat_barang} kg •{" "}
                      {item.pengiriman.jenis_kendaraan}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.pengiriman.waktu_pengiriman)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <PDFDownloadLink
                        document={
                          <PengirimanPDF
                            data={{
                              lokasiAsal: item.pengiriman.lokasi_asal,
                              lokasiTujuan: item.pengiriman.lokasi_tujuan,
                              jenisBarang: item.pengiriman.jenis_barang,
                              beratBarang: item.pengiriman.berat_barang,
                              waktuPengiriman: item.pengiriman.waktu_pengiriman,
                              jenisKendaraan: item.pengiriman.jenis_kendaraan,
                              ruteTerpilih: item.pengiriman.rute_terpilih,
                              status: item.status,
                            }}
                          />
                        }
                        fileName={`pengiriman_${item.pengiriman.lokasi_asal}_${
                          item.pengiriman.lokasi_tujuan
                        }_${item.pengiriman_id.slice(0, 4)}.pdf`}
                      >
                        {({ loading: pdfLoading }) => (
                          <button
                            className={`bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors ${
                              pdfLoading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            disabled={pdfLoading}
                          >
                            {pdfLoading ? "Membuat PDF..." : "Unduh PDF"}
                          </button>
                        )}
                      </PDFDownloadLink>

                      {item.status === "direncanakan" ? (
                        <button
                          onClick={() =>
                            updateStatus(item.pengiriman_id, "dalam_perjalanan")
                          }
                          disabled={loading}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Mulai Pengiriman
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            updateStatus(item.pengiriman_id, "direncanakan")
                          }
                          disabled={loading}
                          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Direncanakan
                        </button>
                      )}

                      <button
                        onClick={() =>
                          updateStatus(item.pengiriman_id, "selesai")
                        }
                        disabled={loading}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Selesai
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(item.pengiriman_id, "dibatalkan")
                        }
                        disabled={loading}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Batalkan
                      </button>
                    </div>
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
