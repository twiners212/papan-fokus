import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground transition-colors duration-200">
      <DynamicSidebar />
      <main className="flex-1 ml-0 md:ml-64 h-full flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
