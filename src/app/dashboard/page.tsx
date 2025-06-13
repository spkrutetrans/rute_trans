import Card from "@/components/dashboard/Card";
import BarChart from "@/components/dashboard/BarChart";
import NotificationCard from "@/components/dashboard/NotificationCard";
import Navbar from "@/components/navbar";

// Define the priority type to match NotificationCardProps
type NotificationPriority = "high" | "medium" | "low";

interface NotificationItem {
  id: number;
  message: string;
  priority: NotificationPriority;
}

export default function DashboardPage() {
  // Data dummy
  const totalPengirimanHariIni = 12;
  const totalPengirimanMingguIni = 84;

  const dataEfisiensi = [
    { name: "Senin", biaya: 4000, waktu: 240 },
    { name: "Selasa", biaya: 3000, waktu: 139 },
    { name: "Rabu", biaya: 2000, waktu: 180 },
    { name: "Kamis", biaya: 2780, waktu: 200 },
    { name: "Jumat", biaya: 1890, waktu: 150 },
  ];

  const notifikasi: NotificationItem[] = [
    { id: 1, message: "Pengiriman ke Jakarta terlambat", priority: "high" },
    {
      id: 2,
      message: "Pembaruan rute untuk pengiriman #123",
      priority: "medium",
    },
  ];

  return (
    <div className="space-y-6">
      <Navbar/>

      <h1 className="text-2xl font-bold text-blue-800">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Pengiriman Hari Ini" value={totalPengirimanHariIni} />
        <Card title="Pengiriman Minggu Ini" value={totalPengirimanMingguIni} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Grafik Efisiensi Rute</h2>
        <BarChart data={dataEfisiensi} />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Notifikasi Pengiriman</h2>
        {notifikasi.map((notif) => (
          <NotificationCard
            key={notif.id}
            message={notif.message}
            priority={notif.priority}
          />
        ))}
      </div>
    </div>
  );
}
