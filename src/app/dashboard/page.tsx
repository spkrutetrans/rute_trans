"use client";
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

const efficiencyData = [
  { name: "Senin", biaya: 120000, waktu: 8 },
  { name: "Selasa", biaya: 100000, waktu: 7 },
  { name: "Rabu", biaya: 140000, waktu: 9 },
  { name: "Kamis", biaya: 110000, waktu: 6 },
  { name: "Jumat", biaya: 90000, waktu: 5 },
];

export default function DashboardPage() {
  return (
    <div className="text-gray-800 space-y-6 md:space-y-8">
      {/* Ringkasan Statistik */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4">
          Ringkasan Statistik
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white p-3 md:p-4 rounded shadow">
            <h3 className="text-base md:text-lg font-semibold">
              Total Pengiriman Hari Ini
            </h3>
            <p className="text-xl md:text-2xl font-bold text-blue-600">28</p>
          </div>
          <div className="bg-white p-3 md:p-4 rounded shadow">
            <h3 className="text-base md:text-lg font-semibold">
              Total Pengiriman Minggu Ini
            </h3>
            <p className="text-xl md:text-2xl font-bold text-green-600">192</p>
          </div>
          {/* <div className="bg-white p-3 md:p-4 rounded shadow">
            <h3 className="text-base md:text-lg font-semibold">
              Pengiriman Mendesak
            </h3>
            <p className="text-xl md:text-2xl font-bold text-red-600">3</p>
          </div> */}
        </div>
      </section>

      {/* Grafik Efisiensi Rute */}
      <section>
        <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4">
          Grafik Efisiensi Rute
        </h2>
        <div className="bg-white p-3 md:p-4 rounded shadow h-64 md:h-72 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efficiencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="biaya"
                fill="#8884d8"
                name="Biaya (Rp)"
              />
              <Bar
                yAxisId="right"
                dataKey="waktu"
                fill="#82ca9d"
                name="Waktu (jam)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Notifikasi Pengiriman Mendesak */}
      {/* <section>
        <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-4">
          Notifikasi Pengiriman Mendesak
        </h2>
        <div className="bg-white p-3 md:p-4 rounded shadow space-y-2 md:space-y-3">
          <div className="border-l-4 border-red-500 pl-2 md:pl-3 py-1 md:py-2">
            <p className="text-xs md:text-sm">
              🚨 <strong>Pengiriman #PKG-1023</strong> ke Jakarta harus dikirim
              sebelum <strong>13:00 WIB</strong>!
            </p>
          </div>
          <div className="border-l-4 border-orange-400 pl-2 md:pl-3 py-1 md:py-2">
            <p className="text-xs md:text-sm">
              ⚠️ <strong>Pengiriman #PKG-1045</strong> mengalami kemacetan,
              pertimbangkan rute alternatif.
            </p>
          </div>
        </div>
      </section> */}
    </div>
  );
}