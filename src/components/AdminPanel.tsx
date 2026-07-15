import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Database, 
  Trash2, 
  ShieldAlert, 
  Activity, 
  Download, 
  UserX, 
  Search, 
  Lock, 
  CheckCircle, 
  Clock, 
  FileSpreadsheet, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { User, WASession, ActivityLog } from '../types';

interface AdminPanelProps {
  token: string;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'logs'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<WASession[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [usersRes, sessionsRes, logsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/sessions', { headers }),
        fetch('/api/admin/logs', { headers })
      ]);

      if (!usersRes.ok || !sessionsRes.ok || !logsRes.ok) {
        throw new Error('Failed to retrieve full admin payload. Ensure your session is valid.');
      }

      const usersData = await usersRes.json();
      const sessionsData = await sessionsRes.json();
      const logsData = await logsRes.json();

      setUsers(usersData);
      setSessions(sessionsData);
      setLogs(logsData);
    } catch (err: any) {
      setError(err.message || 'Error fetching admin datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [token]);

  const handleToggleRole = async (targetUserId: string) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}/toggle-role`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle user role');
      }
      setSuccess('User role updated successfully!');
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForceDisconnect = async (targetUserId: string) => {
    if (!window.confirm('Are you sure you want to force disconnect this user\'s WhatsApp session? This terminates remote connections and wipes credentials.')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/sessions/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to terminate session');
      }
      setSuccess('Target WhatsApp session forcefully disconnected and wiped.');
      loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const response = await fetch('/api/admin/backup', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to download system backup');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hijjaze-bot-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccess('System configuration backup downloaded successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const activeSessionsCount = sessions.filter(s => s.status === 'connected').length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-left">
          <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">Admin Console</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Global system monitoring, session telemetry, and user management.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-850 disabled:opacity-50 transition-all font-mono"
            id="admin_refresh_btn"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''} text-green-400`} />
            Refresh Telemetry
          </button>

          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-black shadow-md shadow-green-500/10 hover:bg-green-400 transition-all font-mono"
            id="admin_backup_btn"
          >
            <Download className="h-4 w-4" />
            Download Backup JSON
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 flex items-center gap-2 text-left">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-xs text-green-400 flex items-center gap-2 text-left cursor-pointer" onClick={() => setSuccess('')}>
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SYSTEM STATS COUNTERS */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8 text-left">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Total Accounts</span>
            <Users className="h-5 w-5 text-green-400" />
          </div>
          <span className="block text-3xl font-black text-white mt-2 font-mono">{totalUsers}</span>
          <span className="block text-[10px] text-zinc-500 mt-1">Registered users inside directory</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Active WA Sessions</span>
            <Database className="h-5 w-5 text-green-400" />
          </div>
          <span className="block text-3xl font-black text-white mt-2 font-mono">{activeSessionsCount} / {sessions.length}</span>
          <span className="block text-[10px] text-zinc-500 mt-1">Paired WhatsApp sockets live</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-xl">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">System Logs</span>
            <Activity className="h-5 w-5 text-green-400" />
          </div>
          <span className="block text-3xl font-black text-white mt-2 font-mono">{logs.length}</span>
          <span className="block text-[10px] text-zinc-500 mt-1">Audit logs cached in database</span>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5">
        {/* Tab Controls */}
        <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {(['users', 'sessions', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm('');
              }}
              className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition-all font-mono ${activeTab === tab ? 'bg-zinc-900 border border-zinc-850 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pr-4 pl-9 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      {/* MAIN DATA TABLES CONTAINER */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl overflow-hidden text-left">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-green-400" />
            <span className="block text-xs mt-3 text-zinc-400 font-mono">Loading admin datasets...</span>
          </div>
        ) : (
          <div>
            {/* USERS MANAGEMENT TAB */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-950/40 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">User Details</th>
                      <th className="px-6 py-4">Account ID</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Created Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-xs font-mono">No users match your criteria</td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`}
                                alt="User Avatar"
                                className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-850"
                              />
                              <div>
                                <span className="block font-semibold text-white">{u.name}</span>
                                <span className="block text-xs text-zinc-500 font-mono">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-400">{u.id}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-850'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.email !== 'admin@hijjaze.com' ? (
                              <button
                                onClick={() => handleToggleRole(u.id)}
                                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-350 hover:text-white hover:bg-zinc-850 transition-all font-mono"
                              >
                                Toggle Role
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-600 font-semibold italic uppercase font-mono">System Root</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ACTIVE SESSIONS TAB */}
            {activeTab === 'sessions' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-950/40 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Linked Profile</th>
                      <th className="px-6 py-4">User Owner ID</th>
                      <th className="px-6 py-4">Connection Phone</th>
                      <th className="px-6 py-4">Baileys Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-xs font-mono">No active WhatsApp pairing sessions found</td>
                      </tr>
                    ) : (
                      sessions.map((s) => (
                        <tr key={s.id} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={s.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.name || 'WA')}`}
                                alt="WA Avatar"
                                className="h-9 w-9 rounded-full bg-zinc-900 object-cover border border-zinc-850"
                              />
                              <span className="font-semibold text-white">{s.name || 'Unpaired Client'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-400">{s.userId}</td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                            {s.phone ? `+${s.phone}` : 'None'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.status === 'connected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                              {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleForceDisconnect(s.userId)}
                              className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-all"
                              title="Force Disconnect & Clean Session"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SYSTEM AUDIT LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-950/40 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Auth Account</th>
                      <th className="px-6 py-4">Trigger Action</th>
                      <th className="px-6 py-4">Details Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono text-xs">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-xs font-sans">No audit events match your search term</td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-900/20 transition-colors">
                          <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-green-400 truncate max-w-[150px]">
                            {log.userEmail}
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded bg-zinc-950 px-2 py-1 border border-zinc-850 font-bold uppercase text-[10px] tracking-wider text-green-400">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-300 max-w-sm truncate" title={log.details}>
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
