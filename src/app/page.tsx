import { isLocalMode } from "@/lib/local-mode";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (isLocalMode()) {
    const { LocalWorkspace } = await import("@/components/local-workspace");
    return <LocalWorkspace />;
  }
  const { default: CloudHome } = await import("@/components/cloud-home");
  return <CloudHome />;
}
