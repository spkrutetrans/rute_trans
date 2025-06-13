import Link from "next/link";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function Sidebar() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-800">Shipping Optimizer</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center p-2 rounded-lg hover:bg-blue-100 text-blue-800"
        >
          Dashboard
        </Link>
        <Link
          href="/pengiriman-baru"
          className="flex items-center p-2 rounded-lg hover:bg-blue-100 text-blue-800"
        >
          Pengiriman Baru
        </Link>
        <Link
          href="/riwayat-pengiriman"
          className="flex items-center p-2 rounded-lg hover:bg-blue-100 text-blue-800"
        >
          Riwayat Pengiriman
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 rounded-lg hover:bg-red-100 text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}