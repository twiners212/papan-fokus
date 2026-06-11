import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { joinWorkspaceViaLinkAction } from "@/actions/invite-actions";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = params.token as string;

  if (!token) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#e5e2e1] flex flex-col items-center justify-center p-4">
        <div className="bg-[#1c1b1c]/80 backdrop-blur-sm border border-[#3f3f46] p-8 rounded-xl max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Tautan Tidak Valid</h1>
          <p className="text-[#a1a1aa] mb-8 leading-relaxed">Tautan undangan tidak lengkap, salah, atau token tidak ditemukan.</p>
          <a href="/dashboard" className="bg-[#c8c5ca] text-[#303033] px-6 py-2.5 rounded-lg font-semibold inline-block hover:bg-[#e4e1e6] transition-colors shadow-lg">
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // Redirect to login with callbackUrl
    const callbackUrl = encodeURIComponent(`/invite?token=${token}`);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  // Attempt to join
  const result = await joinWorkspaceViaLinkAction(token);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#e5e2e1] flex flex-col items-center justify-center p-4">
        <div className="bg-[#1c1b1c]/80 backdrop-blur-sm border border-[#3f3f46] p-8 rounded-xl max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[#e5e2e1] mb-2">Gagal Bergabung</h1>
          <p className="text-[#a1a1aa] mb-8 leading-relaxed">{result.error}</p>
          <a href="/dashboard" className="bg-[#3f3f46] text-[#e5e2e1] px-6 py-2.5 rounded-lg font-semibold inline-block hover:bg-[#4f4f56] transition-colors border border-[#52525b]">
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Success, redirect to the board
  if ('data' in result && result.data) {
    redirect(`/${result.data.slug}/board`);
  } else {
    redirect('/dashboard');
  }
}
