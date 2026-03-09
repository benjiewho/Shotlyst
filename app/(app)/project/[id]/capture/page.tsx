"use client";

import { useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

/**
 * Capture route redirect: /project/[id]/capture and /project/[id]/capture?shot=X
 * redirect to the Planning page with ?shot= so the merged plan+capture flow is used.
 */
export default function CaptureRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const shotId = searchParams.get("shot");

  useEffect(() => {
    if (!id) return;
    const query = shotId ? `?shot=${encodeURIComponent(shotId)}` : "";
    router.replace(`/project/${id}${query}`);
  }, [id, shotId, router]);

  return (
    <div className="p-4 flex items-center justify-center min-h-[40vh]">
      <p className="text-muted-foreground text-sm">Redirecting to plan…</p>
    </div>
  );
}
