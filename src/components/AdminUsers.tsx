import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { TrashIcon, CheckIcon as Check, XIcon, UserIcon, RefreshCwIcon, CurrencyEuroIcon, ChartBarIcon, FlameIcon, ZapIcon, TrophyIcon, SettingsIcon } from './Icons';

const TELENCO_LOGO = 'https://tailormate.ai/telencotool/images/logos/telencologo.png';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_id: string;
  is_active: boolean;
  is_archived: boolean;
  role: string;
  created_at: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

export default function AdminUsers({ currentUserEmail }: { currentUserEmail: string }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formFirst, setFormFirst] = useState('');
  const [formLast, setFormLast] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formRole, setFormRole] = useState<'user' | 'admin'>('user');
  const [errorError, setErrorError] = useState<string | null>(null);

  // Combined refresh: always fetch profiles + auth status together to prevent UI flickering
  const refreshAll = async () => {
    setLoading(true);

    try {
      // 1. Fetch profiles
      const { data, error } = await supabase.from('profiles').select('*');
      let fetched: Profile[] = (data as Profile[]) || [];

      // Failsafe: Als het ingelogde profiel (jijzelf) verborgen wordt door database-rechten (RLS) of query-fout, injecteer het dan handmatig in de UI.
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !fetched.find(u => u.email === user.email)) {
        fetched = [{
          id: user.id,
          email: user.email || currentUserEmail,
          first_name: 'Admin',
          last_name: '(Jij)',
          avatar_id: '',
          is_active: true,
          is_archived: false,
          role: 'admin',
          created_at: new Date().toISOString()
        }, ...fetched];
      }

      // 2. Fetch auth status concurrently without blocking UI with false data
      try {
        const res = await fetch('/api/admin/auth-users');
        if (res.ok) {
          const authUsers: { id: string; email: string; email_confirmed_at: string | null; last_sign_in_at: string | null }[] = await res.json();
          fetched = fetched.map(u => {
            const authUser = authUsers.find(a => a.email.toLowerCase() === u.email.toLowerCase());
            return authUser ? { ...u, email_confirmed_at: authUser.email_confirmed_at, last_sign_in_at: authUser.last_sign_in_at } : u;
          });
        }
      } catch { /* silently ignore auth errors */ }

      // 3. Set standard complete state all at once! No flickering!
      setUsers(fetched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleToggleStatus = async (id: string, is_active: boolean, is_archived: boolean) => {
    try {
      const res = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active, is_archived })
      });
      if (!res.ok) throw new Error(await res.text());
      refreshAll();
    } catch (err: any) {
      alert('Fout bij updaten: ' + err.message);
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!window.confirm('Weet je ZEKER dat je dit account en alle bijbehorende data definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
    try {
      const res = await fetch('/api/admin/hard-delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error(await res.text());
      refreshAll();
    } catch (err: any) {
      alert('Fout bij verwijderen: ' + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/webp' && !file.name.toLowerCase().endsWith('.webp')) {
      setErrorError('Alleen .webp configuraties zijn toegestaan voor uploads.');
      return;
    }

    setIsUploading(true);
    setErrorError(null);
    try {
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      const filePath = `user-avatars/${filename}`;

      const { data, error } = await supabase.storage.from('images').upload(filePath, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

      setFormAvatar(publicUrl);
    } catch (err: any) {
      setErrorError('Error bij het uploaden van de afbeelding: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorError(null);
    try {
      if (editingUser) {
        // Update User Profile
        const res = await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            firstName: formFirst,
            lastName: formLast,
            avatarId: formAvatar,
            role: formRole
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error bij het bewerken.');
      } else {
        // Create User Account
        const activeAdmin = users.find(u => u.email === currentUserEmail);
        const adminName = activeAdmin ? `${activeAdmin.first_name || ''} ${activeAdmin.last_name || ''}`.trim() : 'Een beheerder';

        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formEmail,
            password: 'WelkomTelenco123!',
            firstName: formFirst,
            lastName: formLast,
            role: formRole,
            avatarId: formAvatar,
            adminName: adminName || 'Een beheerder'
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error bij het uitnodigen.');
      }

      setShowModal(false);
      setEditingUser(null);
      refreshAll();
    } catch (err: any) {
      setErrorError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormRole('user');
    setFormFirst('');
    setFormLast('');
    setFormAvatar('');
    setErrorError(null);
    setShowModal(true);
  };

  const openEditModal = (user: Profile) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormFirst(user.first_name || '');
    setFormLast(user.last_name || '');
    setFormAvatar(user.avatar_id || '');
    setFormRole((user.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin');
    setErrorError(null);
    setShowModal(true);
  };

  const filteredUsers = users.filter(u => {
    const search = searchQuery.toLowerCase();
    const first = u.first_name || '';
    const last = u.last_name || '';
    const emailStr = u.email || '';
    return (
      first.toLowerCase().includes(search) ||
      last.toLowerCase().includes(search) ||
      emailStr.toLowerCase().includes(search)
    );
  }).sort((a, b) => {
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase() || a.email.toLowerCase();
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase() || b.email.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const activeUsers = filteredUsers.filter(u => !u.is_archived);
  const archivedUsers = filteredUsers.filter(u => u.is_archived);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Admin Top Bar matches Screenshot exactly */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] transition-all shadow-sm"
          />
        </div>
        <button onClick={refreshAll} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-500 shadow-sm transition-colors">
          <RefreshCwIcon className="w-5 h-5" />
        </button>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-[#91C848] hover:bg-[#7fae3d] text-white rounded-xl font-black shadow-sm transition-colors shrink-0"
        >
          + Toevoegen
        </button>
      </div>

      {/* Tabs Container matching Screenshot */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-8 px-2 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 min-w-max pb-3">
          <button onClick={() => setTab('active')} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'active' ? 'bg-[#91C848] text-white shadow-md shadow-[#91C848]/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
            <UserIcon className="w-4 h-4" /> USERS
          </button>
          <button className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all opacity-50 cursor-not-allowed">
            <Check className="w-4 h-4" /> LOG
          </button>
          <button className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all opacity-50 cursor-not-allowed">
            <TrophyIcon className="w-4 h-4" /> TOP USERS
          </button>
          <button onClick={() => setTab('archived')} className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'archived' ? 'bg-[#91C848] text-white shadow-md shadow-[#91C848]/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
            <TrashIcon className="w-4 h-4" /> ARCHIEF
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1">
        {loading ? (
          <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#91C848] rounded-full animate-spin" /></div>
        ) : (tab === 'active' ? activeUsers : archivedUsers).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <UserIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold text-lg">Geen accounts gevonden in deze weergave.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-20"
          >
            {(tab === 'active' ? activeUsers : archivedUsers).map(user => {
              const isImage = user.avatar_id && (user.avatar_id.startsWith('http') || user.avatar_id.includes('/'));
              const avatarSrc = isImage ? user.avatar_id : TELENCO_LOGO;
              const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0];

              // Calculate status
              const now = new Date();
              const lastSeenDate = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
              const diffMs = lastSeenDate ? now.getTime() - lastSeenDate.getTime() : Infinity;
              const diffMins = Math.floor(diffMs / 1000 / 60);

              const isOnline = user.is_active && (user.email === currentUserEmail || diffMins < 5 || !lastSeenDate);

              let timeString = 'Offline';
              let dotColor = 'bg-slate-300';
              let borderColor = 'border-slate-300';

              if (isOnline) {
                 timeString = 'Online';
                 dotColor = 'bg-[#91C848]';
                 borderColor = 'border-[#91C848]';
              } else if (lastSeenDate) {
                if (diffMins < 60) {
                  timeString = `${diffMins}m geleden`;
                  dotColor = 'bg-blue-400';
                  borderColor = 'border-blue-400';
                } else if (diffMins < 1440) {
                  timeString = `${Math.floor(diffMins / 60)}u geleden`;
                  dotColor = 'bg-blue-400';
                  borderColor = 'border-blue-400';
                } else if (diffMins < 2880) { // 1 to 2 days
                  timeString = `${Math.floor(diffMins / 1440)}d geleden`;
                  dotColor = 'bg-orange-400';
                  borderColor = 'border-orange-400';
                } else { // 2+ days
                  timeString = `${Math.floor(diffMins / 1440)}d geleden`;
                  dotColor = 'bg-slate-300';
                  borderColor = 'border-slate-300';
                }
              }

              return (
                <div key={user.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative flex items-center gap-4 group">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shadow-inner border-[3px] ${borderColor} ${isImage ? 'bg-slate-50' : 'bg-white'}`}>
                      <img src={avatarSrc} alt="Avatar" className={`w-full h-full ${isImage ? 'object-cover' : 'object-contain p-2 opacity-40 grayscale brightness-0'}`} />
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${dotColor}`} />
                  </div>

                  {/* Name & Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-600 tracking-tight leading-tight truncate">{fullName}</h4>
                      {user.role === 'admin' && (
                        <div className="px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 flex items-center shrink-0">
                          <span className="text-[8px] font-black uppercase tracking-wider text-blue-600">Admin</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400">{timeString}</span>
                    </div>
                  </div>

                  {/* Right side: Actions + Confirmation */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      {tab === 'active' ? (
                        <>
                          <button onClick={() => openEditModal(user)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 rounded-lg transition-colors" title="Bewerken">
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                          {user.email !== currentUserEmail && (
                            <button onClick={() => handleToggleStatus(user.id, false, true)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Archiveren">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleToggleStatus(user.id, true, false)} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg hover:bg-emerald-100 transition-colors">
                            Herstel
                          </button>
                          <button onClick={() => handleHardDelete(user.id)} className="p-1.5 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-colors" title="Verwijderen">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.2 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">

              {/* Dark header with live avatar -> Now light gray */}
              <div className="bg-slate-100 px-6 py-5 flex items-center gap-4 relative overflow-hidden border-b border-slate-200">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 90% 50%, rgba(145,200,72,0.15) 0%, transparent 65%)' }} />
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0 relative z-10">
                  {formAvatar && (formAvatar.startsWith('http') || formAvatar.includes('/')) ? (
                    <img src={formAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-black text-slate-300">{(formFirst || '?').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingUser ? 'Gebruiker bewerken' : 'Nieuw account'}</p>
                  <h3 className="font-black text-slate-700 text-base leading-tight truncate">{formFirst || formLast ? `${formFirst} ${formLast}`.trim() : 'Nieuwe gebruiker'}</h3>
                  {editingUser && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500 truncate">{formEmail}</p>
                      {editingUser.email_confirmed_at ? (
                        <div className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500 shrink-0"><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Bevestigd</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 border border-amber-500/20">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-amber-500 shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Onbevestigd</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors relative z-10 shrink-0 shadow-sm border border-transparent hover:border-slate-200">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
                {errorError && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl border border-rose-100">{errorError}</div>}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Voornaam</label>
                    <input type="text" required value={formFirst} onChange={e => setFormFirst(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Achternaam</label>
                    <input type="text" required value={formLast} onChange={e => setFormLast(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] transition-all" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">E-mailadres</label>
                  <input type="email" required disabled={!!editingUser} value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] disabled:opacity-40 transition-all" placeholder="naam@telenco.be" />
                  {editingUser && <p className="text-[10px] text-slate-400 mt-1">E-mailadres kan niet worden gewijzigd.</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Profiel foto</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input type="file" id="avatarUpload" accept="image/webp" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                      <label htmlFor="avatarUpload" className={`flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer border transition-all ${isUploading ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#91C848] text-slate-500 hover:text-[#91C848]'}`}>
                        {isUploading ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                        )}
                        {isUploading ? 'Uploaden...' : 'Upload .webp'}
                      </label>
                    </div>
                    {formAvatar && (formAvatar.startsWith('http') || formAvatar.includes('/')) ? (
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-[#91C848] relative group bg-slate-50">
                        <img src={formAvatar} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setFormAvatar('')} className="absolute inset-0 bg-rose-500/80 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"><XIcon className="w-3.5 h-3.5 text-white" /></button>
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-50 flex items-center justify-center">
                        <img src={TELENCO_LOGO} alt="Telenco" className="w-full h-full object-contain p-2 opacity-20 grayscale brightness-0" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Toggle */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Rol</label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setFormRole('user')}
                      className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                        formRole === 'user'
                          ? 'bg-white text-slate-600 shadow-sm border-r border-slate-200'
                          : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      Gebruiker
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormRole('admin')}
                      className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                        formRole === 'admin'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                {editingUser && (
                  <button type="button" onClick={async () => { await handleToggleStatus(editingUser.id, !editingUser.is_active, false); setShowModal(false); }}
                    className="w-full py-2 rounded-xl text-xs font-bold text-rose-400 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100">
                    {editingUser.is_active ? 'Blokkeer toegang' : 'Deblokkeer toegang'}
                  </button>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm transition-all">Annuleren</button>
                  <button type="submit" disabled={isSubmitting || isUploading} className="flex-[2] py-2.5 rounded-xl font-black text-white text-sm bg-[#91C848] hover:bg-[#7fae3d] shadow-md shadow-[#91C848]/20 transition-all disabled:opacity-50">
                    {isSubmitting ? 'Bezig...' : editingUser ? 'Opslaan' : 'Uitnodiging versturen'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
