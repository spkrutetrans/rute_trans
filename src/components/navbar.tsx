import { supabase } from "@/lib/supabase/client";

export default async function Navbar() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
      <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">{user?.email}</span>
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
          {user?.email?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
