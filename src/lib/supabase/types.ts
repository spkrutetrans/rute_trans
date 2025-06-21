export type Pengiriman = {
  id: string;
  created_at: string;
  lokasi_asal: string;
  lokasi_tujuan: string;
  jenis_barang: string;
  berat_barang: number;
  rute_terpilih: {
    asal: string;
    tujuan: string;
    jarak: number;
    waktu: number;
    biaya: number;
    tingkat_kemacetan: string;
    titik_singgah: string[];
    skor: number;
  };
  waktu_pengiriman: string;
  jenis_kendaraan: string;
  status: "direncanakan" | "dalam_proses" | "selesai";
};

export type Kendaraan = {
  id: string;
  jenis: string;
  kapasitas: number;
  konsumsi_bbm: number;
  biaya_per_km: number;
};