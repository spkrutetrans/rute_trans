import { supabase } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 bg-blue-50">
          {children}
        </main>
      </div>
    </div>
  );
}
