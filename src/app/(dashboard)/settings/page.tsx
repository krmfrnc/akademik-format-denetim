"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

interface UserProfile {
  university: string | null;
  department: string | null;
  studentId: string | null;
  academicTitle: string | null;
  phone: string | null;
  bio: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiGet<{ data: UserProfile }>("/api/auth/me");
      setProfile(result.data ?? null);
    } catch {
      // Profil henüz oluşturulmamış olabilir
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Ayarlar</h1>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Profil Bilgileri
          </h2>

          {profile ? (
            <div className="space-y-3 text-sm">
              {profile.university && (
                <div>
                  <span className="text-gray-500">Üniversite: </span>
                  <span className="text-gray-900">{profile.university}</span>
                </div>
              )}
              {profile.department && (
                <div>
                  <span className="text-gray-500">Bölüm: </span>
                  <span className="text-gray-900">{profile.department}</span>
                </div>
              )}
              {profile.academicTitle && (
                <div>
                  <span className="text-gray-500">Akademik Unvan: </span>
                  <span className="text-gray-900">
                    {profile.academicTitle}
                  </span>
                </div>
              )}
              {profile.studentId && (
                <div>
                  <span className="text-gray-500">Öğrenci No: </span>
                  <span className="text-gray-900">{profile.studentId}</span>
                </div>
              )}
              {profile.phone && (
                <div>
                  <span className="text-gray-500">Telefon: </span>
                  <span className="text-gray-900">{profile.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              Henüz profil bilgisi eklenmemiş.
            </p>
          )}
        </div>

        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Hesap Ayarları
          </h2>
          <p className="text-gray-400 text-sm">
            Hesap ayarları yakında eklenecektir.
          </p>
        </div>
      </div>
    </div>
  );
}
