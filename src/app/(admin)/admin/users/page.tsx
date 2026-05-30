"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api-client";

interface UserItem {
  id: string;
  email: string;
  name: string;
  surname: string | null;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { documents: number };
  credit: { balance: number } | null;
  subscription: { status: string; plan: { name: string } | null } | null;
}

interface PaginatedUsers {
  data: UserItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);

      const result = await apiGet<PaginatedUsers>(`/api/admin/users?${params}`);
      setUsers(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleUpdate = async (userId: string, field: string, value: string | boolean) => {
    try {
      setUpdating(userId);
      await apiPut(`/api/admin/users/${userId}`, { [field]: value });
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
        <p className="mt-1 text-sm text-gray-500">Tüm kullanıcıları görüntüleyin ve yönetin.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          placeholder="E-posta veya isim ara..."
          className="input-field max-w-xs"
        />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="input-field w-auto">
          <option value="">Tüm Roller</option>
          <option value="USER">Kullanıcı</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Süper Admin</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Kullanıcı</th>
                <th className="px-4 py-3 font-medium text-gray-600">Rol</th>
                <th className="px-4 py-3 font-medium text-gray-600">Durum</th>
                <th className="px-4 py-3 font-medium text-gray-600">Kredi</th>
                <th className="px-4 py-3 font-medium text-gray-600">Abonelik</th>
                <th className="px-4 py-3 font-medium text-gray-600">Belge</th>
                <th className="px-4 py-3 font-medium text-gray-600">Son Giriş</th>
                <th className="px-4 py-3 font-medium text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name} {u.surname ?? ""}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdate(u.id, "role", e.target.value)}
                      disabled={updating === u.id}
                      className="rounded border border-gray-200 px-2 py-1 text-xs"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleUpdate(u.id, "isActive", !u.isActive)}
                      disabled={updating === u.id}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{u.credit?.balance ?? 0}</td>
                  <td className="px-4 py-3 text-xs">
                    {u.subscription ? (
                      <span className={u.subscription.status === "ACTIVE" ? "text-green-600" : "text-gray-500"}>
                        {u.subscription.plan?.name ?? "Plansız"} · {u.subscription.status}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{u._count.documents}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
