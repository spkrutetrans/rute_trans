-- Table Kendaraan
CREATE TABLE kendaraan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jenis TEXT NOT NULL,
  kapasitas INTEGER NOT NULL,
  konsumsi_bbm NUMERIC NOT NULL,
  biaya_per_km NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table Pengiriman
CREATE TABLE pengiriman (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lokasi_asal TEXT NOT NULL,
  lokasi_tujuan TEXT NOT NULL,
  jenis_barang TEXT NOT NULL,
  berat_barang NUMERIC NOT NULL,
  rute_terpilih JSONB NOT NULL,
  waktu_pengiriman TIMESTAMP NOT NULL,
  jenis_kendaraan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'direncanakan',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sample data Kendaraan
INSERT INTO kendaraan (jenis, kapasitas, konsumsi_bbm, biaya_per_km)
VALUES 
  ('Truk Kecil', 2000, 5, 10000),
  ('Truk Sedang', 5000, 8, 15000),
  ('Truk Besar', 10000, 12, 20000);