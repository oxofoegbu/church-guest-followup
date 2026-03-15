'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RoleConfig } from '@/lib/roles';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetch('/api/roles').then(r => r.ok ? r.json() : { roles: [] })
      .then(data => setRoles(data.roles || []))
      .catch(() => {});
  }, [fetchUsers]);

  const getRoleLabel = (roleName: string) => {
    const r = roles.find(r => r.name === roleName);
    return r?.label || roleName;
  };

  const getRoleBadgeColor = (roleName: string) => {
    const r = roles.find(r => r.name === roleName);
    if (!r) return 'bg-church-100 text-church-700';
    switch (r.permissionLevel) {
      case 'ADMIN_ACCESS': return 'bg-purple-100 text-purple-700';
      case 'LEADER_ACCESS': return 'bg-blue-100 text-blue-700';
      case 'VOLUNTEER_ACCESS': return 'bg-green-100 text-green-700';
      default: return 'bg-church-100 text-church-700';
    }
  };

  const toggleActive = async (user: any) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, active: !user.active }),
    });
    fetchUsers();
  };

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="page-header">User Management</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add User
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-church-400">Loading...</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className={!user.active ? 'opacity-50' : ''}>
                <td className="font-medium">{user.name}</td>
                <td className="text-sm">{user.email}</td>
                <td className="text-sm">{user.phone || '—'}</td>
                <td>
                  <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="text-sm">{user._count?.assignedGuests || 0}</td>
                <td>
                  <span className={`badge ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => setEditUser(user)} className="text-brand-600 hover:text-brand-700 text-sm">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(user)} className="text-sm text-church-500 hover:text-church-700">
                      {user.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showCreate || editUser) && (
        <UserModal
          user={editUser}
          roles={roles}
          onClose={() => { setShowCreate(false); setEditUser(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}

function UserModal({ user, roles, onClose }: { user: any; roles: RoleConfig[]; onClose: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'VOLUNTEER',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const body: any = { ...form };
    if (isEdit) {
      body.id = user.id;
      if (!body.password) delete body.password;
    }

    const res = await fetch('/api/users', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to save');
      setSaving(false);
      return;
    }
    onClose();
  };

  // Group roles by permission level for the dropdown
  const adminRoles = roles.filter(r => r.permissionLevel === 'ADMIN_ACCESS');
  const leaderRoles = roles.filter(r => r.permissionLevel === 'LEADER_ACCESS');
  const volunteerRoles = roles.filter(r => r.permissionLevel === 'VOLUNTEER_ACCESS');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h2 className="section-header mb-4">{isEdit ? 'Edit User' : 'Create User'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              required className="input-field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required className="input-field" />
          </div>
          <div>
            <label className="label">Phone (with country code for WhatsApp)</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className="input-field" placeholder="+12025551234" />
          </div>
          <div>
            <label className="label">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="select-field">
              {volunteerRoles.length > 0 && (
                <optgroup label="— Volunteer Access —">
                  {volunteerRoles.map(r => (
                    <option key={r.name} value={r.name}>{r.label}</option>
                  ))}
                </optgroup>
              )}
              {leaderRoles.length > 0 && (
                <optgroup label="— Leader Access —">
                  {leaderRoles.map(r => (
                    <option key={r.name} value={r.name}>{r.label}</option>
                  ))}
                </optgroup>
              )}
              {adminRoles.length > 0 && (
                <optgroup label="— Admin Access —">
                  {adminRoles.map(r => (
                    <option key={r.name} value={r.name}>{r.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="input-field" required={!isEdit} minLength={6} />
          </div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create User'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
