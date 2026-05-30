import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Akademik Format
          <br />
          Denetim Platformu
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          Tez, makale ve akademik belgelerinizi APA7, Vancouver ve kurumsal
          formatlara göre otomatik denetleyin. Kaynakçalarınızı Crossref &
          Semantic Scholar ile doğrulayın.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/login" className="btn-primary min-w-[160px]">
            Giriş Yap
          </Link>
          <Link href="/register" className="btn-secondary min-w-[160px]">
            Hesap Oluştur
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: "Format Denetimi",
              desc: "Font, satır aralığı, kenar boşlukları",
            },
            {
              title: "Kaynakça Doğrulama",
              desc: "Crossref & Semantic Scholar entegrasyonu",
            },
            {
              title: "Esnek Kurallar",
              desc: "Kurumsal format şablonları oluşturun",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
              <p className="font-semibold text-gray-900">{f.title}</p>
              <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
