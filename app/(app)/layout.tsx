import { ConvexAuthGuard } from "@/components/auth/convex-auth-guard";
import { AppLayoutClient } from "@/components/app-layout-client";
import { ConnectionBanner } from "@/components/connection-banner";

const hasConvex =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string" &&
  process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthGuard>
      {hasConvex && <ConnectionBanner />}
      <AppLayoutClient>{children}</AppLayoutClient>
    </ConvexAuthGuard>
  );
}
