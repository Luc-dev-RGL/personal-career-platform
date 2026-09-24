import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function ConnexionPage() {
  // Déjà connecté → dashboard
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-20">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-accent font-mono text-base font-bold text-bg">
            L
          </span>
          <h1 className="display mt-5 text-2xl font-semibold">Entrée des artistes</h1>
          <p className="label-mono mt-2">Accès réservé — session chiffrée</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
