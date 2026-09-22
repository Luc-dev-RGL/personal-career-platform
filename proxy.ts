import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (middleware) — premier filtre des routes /admin.
 *
 * Rôle : bloquer immédiatement tout accès sans cookie de session
 * (filtrage UX + réduction de la surface d'attaque avant rendu).
 *
 * ⚠️ Le middleware tourne en environnement Edge : il n'a PAS accès
 * à la base de données. L'autorité de sécurité reste donc la
 * vérification serveur complète (session en base + rôle admin)
 * effectuée dans chaque page et chaque route API via
 * getSession()/requireAdmin() — défense en profondeur.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get("pcp_session")?.value;

  if (!token) {
    // Réponses JSON pour les API (pas de redirection HTML)
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
