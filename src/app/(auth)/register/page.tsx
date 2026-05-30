"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
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
      }>("/api/auth/register", { email, password, name, surname: surname || undefined });

      localStorage.setItem("access_token", result.tokens.accessToken);
      localStorage.setItem("refresh_token", result.tokens.refreshToken);
      localStorage.setItem("auth_user", JSON.stringify(result.user));

      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.");
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
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Hesap oluşturun</h1>
          <p className="mt-2 text-sm text-gray-500">
            Akademik belgelerinizi denetlemeye başlayın.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="label-text">Ad *</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-field"
                  placeholder="Ahmet"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="surname" className="label-text">Soyad</label>
                <input
                  id="surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="input-field"
                  placeholder="Yılmaz"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label-text">E-posta *</label>
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
              <label htmlFor="password" className="label-text">Şifre *</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input-field"
                placeholder="En az 8 karakter"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500">En az 8 karakter olmalıdır.</p>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? "Kayıt yapılıyor..." : "Hesap Oluştur"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Giriş Yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
