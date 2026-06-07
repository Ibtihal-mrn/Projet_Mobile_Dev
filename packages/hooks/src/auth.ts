import { useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ORPCUtils } from "./orpc-types";

type AuthUser = {
  name?: string | null;
  email?: string | null;
};

export type AuthHookDeps = {
  orpc: ORPCUtils;
  authClient: {
    useSession: () => { data: { user?: AuthUser } | null; isPending: boolean };
    signOut: (args: {
      fetchOptions?: {
        onSuccess?: () => Promise<void> | void;
      };
    }) => Promise<unknown>;
  };
  queryClient: QueryClient;
};

export function useAuth({ authClient, queryClient }: AuthHookDeps) {
  const { data: session, isPending } = authClient.useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    try {
      setLogoutError(null);
      setIsSigningOut(true);

      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            queryClient.clear();
          },
        },
      });
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "La déconnexion a échoué.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }
  return {
    session,
    isPending,
    showSignIn,
    setShowSignIn,
    logoutError,
    isSigningOut,
    handleSignOut,
  };
}
