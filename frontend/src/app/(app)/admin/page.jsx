"use client";

import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { fetchUsers, updateUserRole } from "@/lib/enterpriseApi";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers()
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message || "Unable to load users"));
  }, []);

  const onRoleChange = async (id, role) => {
    try {
      await updateUserRole(id, role);
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role } : user)));
    } catch (err) {
      setError(err.message || "Role update failed");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin control</p>
        <h1 className="font-display text-3xl">User management</h1>
      </header>

      <Card>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Select value={user.role} onChange={(event) => onRoleChange(user.id, event.target.value)}>
                <option value="ceo">CEO</option>
                <option value="quality">Quality Manager</option>
                <option value="business">Business Manager</option>
                <option value="marketing">Marketing Manager</option>
              </Select>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
