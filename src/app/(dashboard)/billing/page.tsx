"use client";

export default function BillingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">
        Faturalandırma
      </h1>

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-3">
          <svg
            className="h-12 w-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Fatura Geçmişi
        </h3>
        <p className="text-gray-500 text-sm">
          Henüz bir fatura kaydınız bulunmamaktadır. Abonelik veya kredi satın
          alma işlemleriniz burada listelenecektir.
        </p>
      </div>
    </div>
  );
}
