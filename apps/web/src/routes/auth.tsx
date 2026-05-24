import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@my-app/hooks";
import { authClient } from "@/lib/auth-client";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const {
    session,
    isPending,
    showSignIn,
    setShowSignIn,
    logoutError,
    isSigningOut,
    handleSignOut,
  } = useAuth({ orpc, authClient, queryClient });

  if (isPending) {
    return (
      <div className="p-6">
        <div className="flex min-h-[40vh] items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-base text-foreground">Chargement du compte...</p>
        </div>
      </div>
    );
  }

  if (session?.user) {
    const avatarSeed = session.user.name || session.user.email || "User";
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarSeed)}&background=0f766e&color=ffffff&size=256&bold=true&format=png`;

    return (
      <div className="p-6">
        <div className="flex flex-col gap-4 pb-8">
          <h1 className="text-3xl font-semibold text-foreground">Mon compte</h1>
          <p className="text-sm text-muted-foreground">
            Tu es connecté(e) et peux créer tes recettes depuis l'application mobile.
          </p>

          {logoutError ? <p className="text-sm text-red-500">{logoutError}</p> : null}

          <div className="flex items-center gap-4 rounded-lg bg-secondary p-4">
            <img src={avatarUrl} alt="Avatar utilisateur" className="h-16 w-16 rounded-full bg-background" />

            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">{session.user.name ?? "Utilisateur"}</p>
              <p className="text-sm text-foreground">{session.user.email ?? "Email indisponible"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="self-start rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {isSigningOut ? "Déconnexion..." : "Se déconnecter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 pb-8">
        <h1 className="text-3xl font-semibold text-foreground">Identification</h1>
        <p className="text-sm text-muted-foreground">
          Connecte-toi ou crée un compte pour publier et gérer tes recettes.
        </p>

        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        )}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowSignIn((previous) => !previous)}
            className="text-sm font-medium text-foreground underline"
          >
              {showSignIn
                ? "Pas encore de compte ? Crée-en un"
                : "Déjà un compte ? Connecte-toi"}
          </button>
        </div>
      </div>
    </div>
  );
}
