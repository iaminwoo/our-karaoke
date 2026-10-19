import { Suspense } from "react";

import { EditSongPageContent } from "@/components/EditSongPageContent";

function EditSongFallback() {
  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-center text-sm text-zinc-600">
      불러오는 중...
    </main>
  );
}

export default function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditSongFallback />}>
      <EditSongPageContent params={params} />
    </Suspense>
  );
}
