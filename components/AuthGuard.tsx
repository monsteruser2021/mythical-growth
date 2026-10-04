"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

const AuthContext = createContext<User | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setChecking(false);
        setAuthError(false);
      },
      () => {
        setChecking(false);
        setAuthError(true);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (checking || authError) return;

    if (!user && pathname !== "/login") {
      router.replace("/login");
    } else if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [authError, checking, pathname, router, user]);

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <div className="max-w-md text-center">
          <ShieldAlert aria-hidden="true" className="mx-auto mb-4 size-10 text-purple-400" />
          <h1 className="text-xl font-semibold">No se pudo verificar la sesión</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Comprueba tu conexión e inténtalo de nuevo.
          </p>
          <button
            className="mt-6 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  if (checking || (pathname === "/login" && user) || (pathname !== "/login" && !user)) {
    return (
      <main
        aria-label="Verificando acceso"
        className="flex min-h-screen items-center justify-center bg-slate-950 text-purple-300"
      >
        <LoaderCircle aria-hidden="true" className="size-7 animate-spin" />
      </main>
    );
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}