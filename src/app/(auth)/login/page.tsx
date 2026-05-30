"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      const result = await apiPost<{
        user: { id: string; name: string; email: string; role: string; emailVerified: boolean };
        tokens: { accessToken: string; refreshToken: string; expiresIn: number };
      }>("/api/auth/login", { email, password });

      localStorage.setItem("access_token", result.tokens.accessToken);
      localStorage.setItem("refresh_token", result.tokens.refreshToken);
      localStorage.setItem("auth_user", JSON.stringify(result.user));

      if (result.user.role === "ADMIN" || result.user.role === "SUPER_ADMIN") {
        router.push("/admin/users");
      } else {
        router.push("/documents");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900">Akademik Format</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Hesabınıza giriş yapın</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label-text">E-posta</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="ornek@universite.edu.tr"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="label-text">Şifre</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Hesabınız yok mu?{" "}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Kayıt Ol
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
