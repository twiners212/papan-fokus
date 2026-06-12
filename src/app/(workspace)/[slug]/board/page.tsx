import { BoardView } from "@/components/board/board-view";
import { getBoardDataAction } from "@/actions/board-actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const { slug } = await params;
  let initialData;
  try {
    initialData = await getBoardDataAction(slug);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Workspace not found") {
      initialData = null;
    } else {
      throw error;
    }
  }

  if (!initialData) {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 overflow-hidden">
      <BoardView initialData={initialData} currentUserId={session.user.id} />
    </div>
  );
}
