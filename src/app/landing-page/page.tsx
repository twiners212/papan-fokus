import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Gauge, ArrowRight, Kanban, Sparkles, ShieldCheck, History, MousePointerClick } from "lucide-react";

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e5e2e1] selection:bg-[#c8c5ca]/30 selection:text-[#c8c5ca] font-sans relative overflow-x-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c8c5ca]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-[pulse_8s_infinite]"></div>
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-[#c8c5ca]/3 rounded-full blur-[150px] pointer-events-none -z-10 animate-[pulse_12s_infinite]"></div>

      {/* Navbar */}
      <header className="border-b border-[#201f20]/80 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#201f20] border border-[#3f3f46] flex items-center justify-center shadow-md">
              <Gauge className="text-[#c8c5ca] w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-[#e5e2e1] to-[#a1a1aa] bg-clip-text text-transparent">
              PapanFokus
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#features" className="hidden sm:inline-block text-sm text-[#a1a1aa] hover:text-[#e5e2e1] transition-colors">
              Fitur Utama
            </Link>
            <Link href="#tech" className="hidden sm:inline-block text-sm text-[#a1a1aa] hover:text-[#e5e2e1] transition-colors">
              Teknologi
            </Link>
            {session ? (
              <Link
                href="/dashboard"
                className="bg-[#c8c5ca] text-[#201f20] hover:bg-[#e4e1e6] transition-all text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-[#201f20] hover:bg-[#2c2b2c] border border-[#3f3f46] text-[#e5e2e1] transition-all text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                Masuk
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3f3f46]/50 bg-[#1c1b1c]/30 text-xs font-medium text-[#c8c5ca] mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Kolaborasi Real-Time Instan</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Kolaborasi Kanban, <br />
          <span className="text-[#c8c5ca]">Sinkronisasi Waktu Nyata</span>
        </h1>
        
        <p className="text-base md:text-xl text-[#a1a1aa] max-w-2xl leading-relaxed mb-10">
          Papan proyek minimalis berkinerja tinggi yang dirancang untuk menjaga fokus tim Anda. Pembaruan instan, tanpa tumpang tindih data.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            href="/login"
            className="w-full sm:w-auto bg-[#c8c5ca] text-[#201f20] hover:bg-[#e4e1e6] hover:-translate-y-0.5 active:translate-y-0 text-base font-semibold px-8 py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#c8c5ca]/10"
          >
            Coba Demo Gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Visual Mock Board */}
        <div className="w-full max-w-5xl rounded-xl border border-[#3f3f46] bg-[#141314]/50 p-4 shadow-2xl relative overflow-hidden backdrop-blur-sm group">
          {/* Mock board controls */}
          <div className="flex items-center justify-between border-b border-[#3f3f46]/40 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
              <span className="w-3 h-3 rounded-full bg-[#eab308]"></span>
              <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span>
              <span className="text-xs text-[#a1a1aa] ml-2 font-mono">papan-fokus-demo-board</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-6 h-6 rounded-full bg-[#3f3f46]/30 border border-[#3f3f46] flex items-center justify-center text-[10px] text-[#a1a1aa]">JD</span>
              <span className="w-6 h-6 rounded-full bg-[#3f3f46]/30 border border-[#3f3f46] flex items-center justify-center text-[10px] text-[#a1a1aa]">AS</span>
            </div>
          </div>
          
          {/* Mock board columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {/* Column 1 */}
            <div className="bg-[#201f20]/40 rounded-lg p-3 border border-[#2c2b2c]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-[#e5e2e1] uppercase tracking-wider">To Do (2)</span>
              </div>
              <div className="space-y-2">
                <div className="bg-[#1c1b1c] border border-[#3f3f46] rounded-lg p-3 shadow-sm hover:border-[#c8c5ca] transition-colors cursor-pointer">
                  <div className="text-sm font-semibold mb-1">Riset Integrasi API Calendar</div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">low</span>
                    <span className="w-5 h-5 rounded-full bg-[#c8c5ca] text-[#201f20] font-bold text-[8px] flex items-center justify-center">JD</span>
                  </div>
                </div>
                <div className="bg-[#1c1b1c] border border-[#3f3f46] rounded-lg p-3 shadow-sm hover:border-[#c8c5ca] transition-colors cursor-pointer">
                  <div className="text-sm font-semibold mb-1">Audit Aksesibilitas Light/Dark</div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">high</span>
                    <span className="w-5 h-5 rounded-full bg-[#c8c5ca] text-[#201f20] font-bold text-[8px] flex items-center justify-center">AS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="bg-[#201f20]/40 rounded-lg p-3 border border-[#2c2b2c]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-[#e5e2e1] uppercase tracking-wider">In Progress (1)</span>
              </div>
              <div className="bg-[#1c1b1c] border border-[#c8c5ca] rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#c8c5ca]"></div>
                <div className="text-sm font-semibold mb-1">Penyempurnaan Animasi Drag & Drop</div>
                <div className="text-xs text-[#a1a1aa] mt-1.5 line-clamp-1">Sedang mengoptimasi visual feedback dnd-kit</div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">high</span>
                  <span className="w-5 h-5 rounded-full bg-[#c8c5ca] text-[#201f20] font-bold text-[8px] flex items-center justify-center">AS</span>
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="bg-[#201f20]/40 rounded-lg p-3 border border-[#2c2b2c]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-[#e5e2e1] uppercase tracking-wider">Done (1)</span>
              </div>
              <div className="bg-[#1c1b1c] border border-[#3f3f46] rounded-lg p-3 shadow-sm opacity-60">
                <div className="text-sm font-semibold line-through mb-1">Setup Autentikasi Better Auth</div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">done</span>
                  <span className="w-5 h-5 rounded-full bg-[#c8c5ca] text-[#201f20] font-bold text-[8px] flex items-center justify-center">JD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-[#201f20]/80">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Semua Fitur yang Anda Butuhkan</h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto">Dirancang presisi untuk kolaborasi tim berkecepatan tinggi tanpa kompromi performa.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Card 1 */}
          <div className="bg-[#141314] border border-[#3f3f46]/60 rounded-xl p-6 hover:border-[#c8c5ca] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#201f20] border border-[#3f3f46] flex items-center justify-center mb-5 text-[#c8c5ca]">
              <Kanban className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Supabase Realtime Sync</h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Koneksi WebSocket instan menyinkronkan perpindahan kartu ke seluruh layar anggota tim secara otomatis.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#141314] border border-[#3f3f46]/60 rounded-xl p-6 hover:border-[#c8c5ca] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#201f20] border border-[#3f3f46] flex items-center justify-center mb-5 text-[#c8c5ca]">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Fractional Positioning</h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Penghitungan posisi berbasis Double Precision menjamin urutan kartu konsisten tanpa tabrakan data.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#141314] border border-[#3f3f46]/60 rounded-xl p-6 hover:border-[#c8c5ca] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#201f20] border border-[#3f3f46] flex items-center justify-center mb-5 text-[#c8c5ca]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Tenant Isolation Guard</h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Perlindungan data multi-tenant berlapis di level DAL memastikan data aman dan tidak terjadi kebocoran.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#141314] border border-[#3f3f46]/60 rounded-xl p-6 hover:border-[#c8c5ca] transition-all duration-300">
            <div className="w-10 h-10 rounded-lg bg-[#201f20] border border-[#3f3f46] flex items-center justify-center mb-5 text-[#c8c5ca]">
              <History className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white mb-2">Audit Trails & Logs</h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Merekam setiap pergerakan kartu, perubahan status, dan anggota yang bergabung untuk audit riwayat.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="bg-[#141314]/40 py-20 border-t border-[#201f20]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-10">Ditenagai Teknologi Modern</h2>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            <span className="text-[#e5e2e1] font-semibold tracking-wider hover:opacity-100 transition-opacity">NEXT.JS 15</span>
            <span className="text-[#e5e2e1] font-semibold tracking-wider hover:opacity-100 transition-opacity">BETTER AUTH</span>
            <span className="text-[#e5e2e1] font-semibold tracking-wider hover:opacity-100 transition-opacity">DRIZZLE ORM</span>
            <span className="text-[#e5e2e1] font-semibold tracking-wider hover:opacity-100 transition-opacity">SUPABASE REALTIME</span>
            <span className="text-[#e5e2e1] font-semibold tracking-wider hover:opacity-100 transition-opacity">TAILWIND CSS</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#201f20]/80 bg-[#09090b] py-8 text-center text-xs text-[#3f3f46]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} PapanFokus. Hak Cipta Dilindungi.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-[#a1a1aa] transition-colors">Syarat & Ketentuan</Link>
            <Link href="#" className="hover:text-[#a1a1aa] transition-colors">Kebijakan Privasi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
