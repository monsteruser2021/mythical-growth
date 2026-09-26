"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AlertCircle, Eye, EyeOff, Layers3, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { auth } from "@/lib/firebase";

function getSignInError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "El correo electrónico o la contraseña no son correctos.";
    case "auth/too-many-requests":
      return "Se han realizado demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "No hay conexión con el servicio. Comprueba tu red e inténtalo de nuevo.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (signInError) {
      setError(getSignInError(signInError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-[#3b0764] via-[#1a052e] to-[#121212] px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-2xl border border-purple-500/20 bg-black/40 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-purple-400/25 bg-purple-500/10 text-purple-200">
            <Layers3 aria-hidden="true" className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Mythical Growth Enterprise
          </h1>
          <p className="mt-2 text-sm leading-6 text-purple-100/70">
            Accede a tu espacio de trabajo corporativo.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                autoComplete="username"
                className="h-12 w-full rounded-lg border border-white/10 bg-black/25 pl-10 pr-3 text-sm text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@empresa.com"
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-lg border border-white/10 bg-black/25 pl-10 pr-12 text-sm text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Introduce tu contraseña"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed"
                disabled={loading}
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              aria-live="polite"
              className="flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3.5 py-3 text-sm leading-5 text-rose-200"
              role="alert"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Iniciando sesión…
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Acceso exclusivo para usuarios autorizados.
        </p>
      </section>
    </main>
  );
}