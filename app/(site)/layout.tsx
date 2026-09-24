import { getProfile, getPublicChatbotConfig } from "@/lib/public-data";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ChatWidget } from "@/components/chatbot/ChatWidget";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, chatbot] = await Promise.all([
    getProfile().catch(() => null),
    getPublicChatbotConfig().catch(() => null),
  ]);
  const name = profile?.name ?? "Luc";

  return (
    <>
      <AnalyticsTracker />
      <SiteHeader name={name} />
      <main className="flex-1">{children}</main>
      <SiteFooter name={name} />
      {/* Widget masqué quand le chatbot est désactivé dans /admin/ai —
          sinon le visiteur verrait un assistant qui ne peut pas répondre. */}
      {(!chatbot || chatbot.enabled) && (
        <ChatWidget
          assistantName={chatbot?.assistantName ?? `Assistant de ${name}`}
          greeting={chatbot?.greeting}
        />
      )}
    </>
  );
}
