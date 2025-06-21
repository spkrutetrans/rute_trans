"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  HomeIcon,
  DocumentPlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

const navItems = [
  { label: "Beranda", href: "/dashboard", icon: HomeIcon },
  {
    label: "Pengiriman Baru",
    href: "/pengiriman-baru",
    icon: DocumentPlusIcon,
  },
  { label: "Proses Pengiriman", href: "/proses-pengiriman", icon: TruckIcon },
  { label: "Riwayat Pengiriman", href: "/riwayat-pengiriman", icon: ClockIcon },
  // {
  //   label: "Pengiriman Mendesak",
  //   href: "/mendesak",
  //   icon: ExclamationTriangleIcon,
  // },
  // { label: "Optimasi Rute", href: "/rute", icon: MapIcon },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 w-64 bg-white border-r z-50 h-screen flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="hidden md:block text-xl font-bold mb-6 text-gray-800">
            Menu
          </h2>

          <nav className="space-y-1">
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={onClose}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t">
          <div className="text-xs text-gray-500">Versi 1.0.0</div>
        </div>
      </aside>
    </>
  );
}