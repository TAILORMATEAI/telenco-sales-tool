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
  last_login?: string;
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
  const [errorError, setErrorError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
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
    
    setUsers(fetched);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id: string, is_active: boolean, is_archived: boolean) => {
    try {
      const res = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active, is_archived })
      });
      if (!res.ok) throw new Error(await res.text());
      fetchUsers();
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
      fetchUsers();
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
            avatarId: formAvatar
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error bij het bewerken.');
      } else {
        // Create User Account
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formEmail,
            password: 'WelkomTelenco123!',
            firstName: formFirst,
            lastName: formLast,
            role: 'user',
            avatarId: formAvatar
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error bij het uitnodigen.');
      }
      
      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setErrorError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormEmail('');
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
            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] transition-all shadow-sm"
          />
        </div>
        <button onClick={fetchUsers} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 shadow-sm transition-colors">
          <RefreshCwIcon className="w-5 h-5" />
        </button>
        <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 shadow-sm transition-colors">
          <CurrencyEuroIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-[#91C848] hover:bg-[#7fae3d] text-white rounded-xl font-black shadow-sm transition-colors shrink-0"
        >
          + Uitnodigen
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
          <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#91C848] rounded-full animate-spin"/></div>
        ) : (tab === 'active' ? activeUsers : archivedUsers).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <UserIcon className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold text-lg">Geen accounts gevonden in deze weergave.</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20"
          >
            {(tab === 'active' ? activeUsers : archivedUsers).map(user => {
              const isImage = user.avatar_id && (user.avatar_id.startsWith('http') || user.avatar_id.includes('/'));
              const avatarSrc = isImage ? user.avatar_id : TELENCO_LOGO;
              const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0];
              
              // Seed pseudo-random stats based on user ID for visual mockup matching screenshot
              const charSum = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const stat1 = Math.floor((charSum * 13) % 400);   // Green stat
              const stat2 = Math.floor((charSum * 7) % 300);    // Orange stat
              const stat3 = Math.floor((charSum * 19) % 500);   // Purple stat
              const totalCoins = stat1 + stat2 + stat3;

              return (
                <div key={user.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative flex flex-col group">
                  {/* Header: Avatar & Info */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-inner relative group border-2 ${isImage ? 'border-[#91C848] bg-slate-50' : 'border-slate-200 bg-white'}`}>
                        <img src={avatarSrc} alt="Avatar" className={`w-full h-full ${isImage ? 'object-cover' : 'object-contain p-2 opacity-40 grayscale brightness-0'}`} />
                      </div>
                      {/* Online Status Dot */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${user.is_active ? 'bg-[#91C848]' : 'bg-slate-300'}`} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 tracking-tight leading-tight">{fullName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{user.role}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-[#91C848]' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-bold text-slate-400 capitalize">{user.is_active ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: 3 Stat Blocks imitating screenshot */}
                  {user.is_active || tab === 'archived' ? (
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="bg-emerald-50 rounded-2xl py-3 flex flex-col items-center justify-center gap-1">
                        <ZapIcon className="w-4 h-4 text-emerald-600 mb-1" />
                        <span className="font-black text-emerald-600 text-sm leading-none">{stat1}</span>
                      </div>
                      <div className="bg-orange-50 rounded-2xl py-3 flex flex-col items-center justify-center gap-1">
                        <FlameIcon className="w-4 h-4 text-orange-600 mb-1" />
                        <span className="font-black text-orange-600 text-sm leading-none">{stat2}</span>
                      </div>
                      <div className="bg-purple-50 rounded-2xl py-3 flex flex-col items-center justify-center gap-1">
                        <TrophyIcon className="w-4 h-4 text-purple-600 mb-1" />
                        <span className="font-black text-purple-600 text-sm leading-none">{stat3}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center justify-center border border-slate-100">
                      <p className="text-xs font-bold text-slate-400">Account geblokkeerd</p>
                    </div>
                  )}

                  {/* Bottom: Actions */}
                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-end">
                    <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                      {tab === 'active' ? (
                        <>
                          {/* Toggle Active Button (Eye/View abstraction or Lock) */}
                          <button onClick={() => handleToggleStatus(user.id, !user.is_active, false)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-lg transition-colors" title={user.is_active ? 'Blokkeer toegang' : 'De-blokkeer toegang'}>
                            <UserIcon className="w-4 h-4" />
                          </button>
                          {/* Edit Config Abstraction */}
                          <button onClick={() => openEditModal(user)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 rounded-lg transition-colors" title="Bewerken instellingen">
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                          {/* Archive/Trash - Hidden for own account to prevent self-lockout */}
                          {user.email !== currentUserEmail && (
                            <button onClick={() => handleToggleStatus(user.id, false, true)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Archiveren">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleToggleStatus(user.id, true, false)} className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-100 transition-colors mr-2">
                            Herstellen
                          </button>
                          <button onClick={() => handleHardDelete(user.id)} className="p-1.5 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-colors" title="Definitief verwijderen">
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
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-xl text-slate-900">{editingUser ? 'Gebruiker Bewerken' : 'Gebruiker Uitnodigen'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
                {errorError && <div className="p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl border border-rose-100">{errorError}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Voornaam</label>
                    <input type="text" required value={formFirst} onChange={e => setFormFirst(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Achternaam</label>
                    <input type="text" required value={formLast} onChange={e => setFormLast(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] transition-all" />
                  </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">E-mailadres</label>
                   <input type="email" required disabled={!!editingUser} value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#91C848]/30 focus:border-[#91C848] disabled:opacity-50 transition-all" placeholder="naam@telenco.be" />
                   {editingUser && <p className="text-[10px] text-slate-400 mt-1">E-mailadres kan niet zomaar worden overschreven om veiligheidsredenen.</p>}
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Kies Profiel Avatar Of Upload</label>
                   
                   {/* WebP Uploader Interface */}
                   <div className="flex items-center gap-4 mb-4">
                     <div className="relative flex-1">
                       <input type="file" id="avatarUpload" accept="image/webp" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                       <label htmlFor="avatarUpload" className={`flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer border-2 border-dashed transition-all ${isUploading ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600 hover:border-[#91C848] hover:text-[#91C848]'}`}>
                         {isUploading ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : (
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                         )}
                         {isUploading ? 'Uploaden...' : 'Upload Foto (.webp)'}
                       </label>
                     </div>
                     
                     {/* Preview Sphere if URL matched or Blank Telenco Logo */}
                     {formAvatar && (formAvatar.startsWith('http') || formAvatar.includes('/')) ? (
                       <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-[#91C848] shadow-md relative group bg-slate-50">
                         <img src={formAvatar} alt="Upload Preview" className="w-full h-full object-cover" />
                         <button type="button" onClick={() => setFormAvatar('')} className="absolute inset-0 bg-rose-500/80 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex"><XIcon className="w-4 h-4 text-white" /></button>
                       </div>
                     ) : (
                       <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-slate-200 shadow-md relative bg-white flex items-center justify-center">
                         <img src={TELENCO_LOGO} alt="Telenco" className="w-full h-full object-contain p-2 opacity-40 grayscale brightness-0" />
                       </div>
                     )}
                   </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Annuleren</button>
                  <button type="submit" disabled={isSubmitting || isUploading} className="flex-[2] py-3 rounded-xl font-black text-white bg-[#91C848] hover:bg-[#7fae3d] shadow-lg shadow-[#91C848]/30 transition-all disabled:opacity-50">
                    {isSubmitting ? 'Bezig met opslaan...' : editingUser ? 'Wijzigingen Opslaan' : 'Account Definitief Aanmaken'}
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
