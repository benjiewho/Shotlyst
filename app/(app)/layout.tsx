import { ConvexAuthGuard } from "@/components/auth/convex-auth-guard";
import { AppLayoutClient } from "@/components/app-layout-client";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthGuard>
      <AppLayoutClient>{children}</AppLayoutClient>
    </ConvexAuthGuard>
  );
}
