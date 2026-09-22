"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

const initialState: LoginState = { error: null };

/**
 * Formulaire branché sur la Server Action login() :
 * - la protection brute-force (Redis) et la vérification bcrypt
 *   s'exécutent côté serveur ;
 * - useActionState gère l'état d'erreur sans état global.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-lg border border-line bg-elevated p-7">
      <Field label="Email" htmlFor="login-email">
        <Input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@exemple.com"
        />
      </Field>
      <Field label="Mot de passe" htmlFor="login-password">
        <Input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>

      {state.error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="text-center text-xs text-faint">
        5 tentatives maximum par tranche de 5 minutes.
      </p>
    </form>
  );
}
