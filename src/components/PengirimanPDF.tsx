import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

// Styles untuk PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1 solid #eeeeee",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontSize: 12,
    fontWeight: "bold",
  },
  value: {
    fontSize: 12,
    flex: 1,
  },
  table: {
    width: "100%",
    marginTop: 10,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#dddddd",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f2f2f2",
    fontWeight: "bold",
  },
  tableCell: {
    padding: 5,
    fontSize: 10,
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#dddddd",
  },
  col1: { width: "20%" },
  col2: { width: "20%" },
  col3: { width: "20%" },
  col4: { width: "20%" },
  col5: { width: "20%" },
});

// Tipe data untuk PDF
interface RutePDF {
  asal: string;
  tujuan: string;
  jarak: number;
  waktu: number;
  biaya: number;
  tingkat_kemacetan: "rendah" | "sedang" | "tinggi";
  titik_singgah: string[];
  skor: number;
}

interface Props {
  data: {
    lokasiAsal: string;
    lokasiTujuan: string;
    jenisBarang: string;
    beratBarang: number;
    waktuPengiriman: string;
    jenisKendaraan: string;
    ruteTerpilih: RutePDF;
    status?: "direncanakan" | "dalam_perjalanan" | "selesai" | "dibatalkan"; // Status dibuat optional
  };
}

// Komponen PDF
export const PengirimanPDF = ({ data }: Props) => {
  // Format status untuk ditampilkan
  const formatStatus = (status?: string) => {
    if (!status) return "Direncanakan"; // Nilai default jika status tidak ada

    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Format tanggal
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Hitung waktu sampai
  const waktuSampai = new Date(
    new Date(data.waktuPengiriman).getTime() + data.ruteTerpilih.waktu * 3600000
  ).toLocaleString("id-ID");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Shipping Optimizer</Text>
          <Text style={styles.subtitle}>Detail Pengiriman</Text>
        </View>

        {/* Informasi Pengiriman */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pengiriman</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tanggal</Text>
            <Text style={styles.value}>{formatDate(data.waktuPengiriman)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jenis Barang</Text>
            <Text style={styles.value}>{data.jenisBarang}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Berat Barang</Text>
            <Text style={styles.value}>{data.beratBarang} kg</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jenis Kendaraan</Text>
            <Text style={styles.value}>{data.jenisKendaraan}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status Pengiriman</Text>
            <Text style={styles.value}>{formatStatus(data.status)}</Text>
          </View>
        </View>

        {/* Detail Rute */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rute Terpilih</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Asal</Text>
            <Text style={styles.value}>{data.ruteTerpilih.asal}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tujuan</Text>
            <Text style={styles.value}>{data.ruteTerpilih.tujuan}</Text>
          </View>

          {/* Tabel Detail Rute */}
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.col1]}>Jarak (km)</Text>
              <Text style={[styles.tableCell, styles.col2]}>Waktu (jam)</Text>
              <Text style={[styles.tableCell, styles.col3]}>Biaya (Rp)</Text>
              <Text style={[styles.tableCell, styles.col4]}>Kemacetan</Text>
              <Text style={[styles.tableCell, styles.col5]}>Skor</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1]}>
                {data.ruteTerpilih.jarak}
              </Text>
              <Text style={[styles.tableCell, styles.col2]}>
                {data.ruteTerpilih.waktu.toFixed(1)}
              </Text>
              <Text style={[styles.tableCell, styles.col3]}>
                {data.ruteTerpilih.biaya.toLocaleString()}
              </Text>
              <Text style={[styles.tableCell, styles.col4]}>
                {data.ruteTerpilih.tingkat_kemacetan}
              </Text>
              <Text style={[styles.tableCell, styles.col5]}>
                {data.ruteTerpilih.skor.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Titik Singgah */}
        {data.ruteTerpilih.titik_singgah &&
          data.ruteTerpilih.titik_singgah.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Titik Singgah</Text>
              {data.ruteTerpilih.titik_singgah.map((titik, index) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.value}>
                    {index + 1}. {titik}
                  </Text>
                </View>
              ))}
            </View>
          )}

        {/* Estimasi Waktu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimasi Waktu</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Waktu Mulai</Text>
            <Text style={styles.value}>{formatDate(data.waktuPengiriman)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estimasi Sampai</Text>
            <Text style={styles.value}>{waktuSampai}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};