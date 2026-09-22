import { getProfile } from "@/lib/public-data";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ChatWidget } from "@/components/chatbot/ChatWidget";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile().catch(() => null);
  const name = profile?.name ?? "Luc";

  return (
    <>
      <AnalyticsTracker />
      <SiteHeader name={name} />
      <main className="flex-1">{children}</main>
      <SiteFooter name={name} />
      <ChatWidget assistantName={`Assistant de ${name}`} />
    </>
  );
}
