import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music, 
  FileText, 
  Smile, 
  Share2, 
  Users, 
  Plus, 
  History, 
  Volume2, 
  Sparkles, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { WASession } from '../types';

interface BotControlProps {
  token: string;
  session: WASession | null;
}

interface OutgoingMessage {
  id: string;
  targetPhone: string;
  type: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'failed' | 'sending';
}

interface AutoRule {
  trigger: string;
  response: string;
}

export default function BotControl({ token, session }: BotControlProps) {
  const [activeTab, setActiveTab] = useState<'send' | 'groups' | 'auto'>('send');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker'>('text');
  
  // Form fields
  const [targetPhones, setTargetPhones] = useState('');
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [fileName, setFileName] = useState('');
  
  // Groups data
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState('');

  // Status logs
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [sentHistory, setSentHistory] = useState<OutgoingMessage[]>([]);

  // Auto responder triggers
  const [autoRules, setAutoRules] = useState<AutoRule[]>([
    { trigger: 'hello', response: 'Hi! This is an automated response from Hijjaze Bot. I am active!' },
    { trigger: 'info', response: 'We are using Baileys multi-device pairing credentials synced securely.' },
    { trigger: 'price', response: 'Hijjaze WhatsApp Session Generator is completely free!' }
  ]);
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');

  // Preset media templates for easier user testing
  const MEDIA_PRESETS = {
    image: [
      { name: 'Abstract Art', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80' },
      { name: 'Developer Setup', url: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=800&q=80' }
    ],
    video: [
      { name: 'Nature Loop', url: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4' }
    ],
    audio: [
      { name: 'Chime Sound', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }
    ],
    sticker: [
      { name: 'Happy Face', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=sticker' }
    ],
    document: [
      { name: 'Sample CSV file', url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv' }
    ]
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    setGroupsError('');
    try {
      const response = await fetch('/api/whatsapp/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch WhatsApp groups');
      }
      setGroups(data);
    } catch (err: any) {
      setGroupsError(err.message || 'Make sure WhatsApp is completely connected to read live groups.');
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (session?.status === 'connected' && activeTab === 'groups') {
      loadGroups();
    }
  }, [activeTab, session]);

  const selectPreset = (url: string, name?: string) => {
    setMediaUrl(url);
    if (name) setFileName(name);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhones.trim()) {
      setStatusMessage('Please specify at least one target phone number');
      return;
    }

    setSending(true);
    setStatusMessage('');

    // Parse broadcast comma separated inputs
    const phoneList = targetPhones
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const activeContent = messageType === 'text' ? textContent : mediaUrl;

    if (!activeContent) {
      setStatusMessage('Please enter message content or select a media link');
      setSending(false);
      return;
    }

    let successCount = 0;
    
    // Dispatch to each recipient (broadcast support)
    for (const phone of phoneList) {
      const msgId = 'msg_' + Math.random().toString(36).substr(2, 9);
      const newMsg: OutgoingMessage = {
        id: msgId,
        targetPhone: phone,
        type: messageType,
        content: activeContent.substring(0, 100) + (activeContent.length > 100 ? '...' : ''),
        timestamp: new Date().toLocaleTimeString(),
        status: 'sending'
      };

      setSentHistory(prev => [newMsg, ...prev]);

      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            targetPhone: phone,
            messageType,
            content: activeContent,
            fileName: fileName || 'media-attachment'
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to dispatch');
        }

        setSentHistory(prev => prev.map(m => m.id === msgId ? { ...m, status: 'sent' } : m));
        successCount++;
      } catch (err: any) {
        setSentHistory(prev => prev.map(m => m.id === msgId ? { ...m, status: 'failed' } : m));
      }
    }

    setSending(false);
    setStatusMessage(`Broadcast completed: ${successCount} of ${phoneList.length} messages sent successfully.`);
    
    // Clean inputs
    if (messageType === 'text') setTextContent('');
    setMediaUrl('');
    setFileName('');
  };

  const handleAddAutoRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrigger.trim() || !newResponse.trim()) return;
    
    setAutoRules(prev => [...prev, {
      trigger: newTrigger.toLowerCase().trim(),
      response: newResponse.trim()
    }]);

    setNewTrigger('');
    setNewResponse('');
  };

  const handleDeleteRule = (index: number) => {
    setAutoRules(prev => prev.filter((_, i) => i !== index));
  };

  const isConnected = session?.status === 'connected';

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-green-400 shadow-xl shadow-green-550/5">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">WhatsApp Client Offline</h2>
        <p className="mt-2 text-sm text-zinc-400 leading-normal max-w-sm mx-auto">
          You must link and connect your WhatsApp account first inside the primary Dashboard before you can send live messages or inspect participating groups.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-left">
        <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl font-sans">Bot Control Panel</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Interact live with WhatsApp using your active paired session: <span className="text-green-400 font-semibold font-mono">+{session.phone}</span>.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('send')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${activeTab === 'send' ? 'border-green-500 text-green-400 bg-green-500/5' : 'border-transparent text-zinc-400 hover:text-white'}`}
          id="tab_btn_send"
        >
          <Send className="h-4 w-4" />
          Interactive Messenger
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${activeTab === 'groups' ? 'border-green-500 text-green-400 bg-green-500/5' : 'border-transparent text-zinc-400 hover:text-white'}`}
          id="tab_btn_groups"
        >
          <Users className="h-4 w-4" />
          My Groups & Contacts
        </button>

        <button
          onClick={() => setActiveTab('auto')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${activeTab === 'auto' ? 'border-green-500 text-green-400 bg-green-500/5' : 'border-transparent text-zinc-400 hover:text-white'}`}
          id="tab_btn_auto"
        >
          <Sparkles className="h-4 w-4" />
          Auto-Responder Trigger Rules
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-12 text-left">
        {/* LEFT COLUMN: Main Tab Action Panel */}
        <div className="md:col-span-8">
          <AnimatePresence mode="wait">
            {activeTab === 'send' && (
              <motion.div
                key="send-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl"
              >
                <h3 className="text-base font-bold text-white mb-5">Compose Custom Media Broadcast</h3>

                {statusMessage && (
                  <div className="mb-4 rounded-xl bg-green-500/5 border border-green-500/15 p-3 text-xs text-green-400 font-medium">
                    {statusMessage}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="space-y-4">
                  {/* Target Phones Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Recipient Number(s)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 923001234567, 14155552671"
                      value={targetPhones}
                      onChange={(e) => setTargetPhones(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white placeholder-zinc-650 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all font-mono"
                      id="messenger_recipient_input"
                    />
                    <span className="block text-[9px] text-zinc-500">Separate multiple WhatsApp numbers with commas for broadcasting. Include country codes, no spaces or + signs.</span>
                  </div>

                  {/* Message Type selectors */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Message Type Format</label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {(['text', 'image', 'video', 'audio', 'document', 'sticker'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setMessageType(type);
                            setMediaUrl('');
                          }}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${messageType === type ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-zinc-800 bg-zinc-950/20 text-zinc-400 hover:bg-zinc-900/60 hover:text-white'}`}
                          id={`msg_type_btn_${type}`}
                        >
                          {type === 'text' && <MessageSquare className="h-4 w-4" />}
                          {type === 'image' && <ImageIcon className="h-4 w-4" />}
                          {type === 'video' && <VideoIcon className="h-4 w-4" />}
                          {type === 'audio' && <Music className="h-4 w-4" />}
                          {type === 'document' && <FileText className="h-4 w-4" />}
                          {type === 'sticker' && <Smile className="h-4 w-4" />}
                          <span className="text-[9px] font-mono">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Inputs based on type selection */}
                  {messageType === 'text' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Text Content</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Type WhatsApp message contents here..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white placeholder-zinc-650 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                        id="messenger_text_content"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Media URL Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">{messageType} URL Address</label>
                        <input
                          type="url"
                          required
                          placeholder={`Enter standard http/https ${messageType} link...`}
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white placeholder-zinc-650 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all font-mono"
                          id="messenger_media_url"
                        />
                      </div>

                      {/* Document Name if document selected */}
                      {messageType === 'document' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">File Name</label>
                          <input
                            type="text"
                            placeholder="document.pdf"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white placeholder-zinc-650 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                          />
                        </div>
                      )}

                      {/* Display Media Presets for testing */}
                      <div className="space-y-1.5 text-left">
                        <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">Test templates (One-click fill)</span>
                        <div className="flex flex-wrap gap-2">
                          {(MEDIA_PRESETS[messageType as keyof typeof MEDIA_PRESETS] || []).map((preset: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectPreset(preset.url, preset.name)}
                              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all font-mono"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 disabled:opacity-50 transition-all shadow-md shadow-green-500/10"
                    id="dispatch_message_btn"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dispatching payload...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Dispatch Message
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'groups' && (
              <motion.div
                key="groups-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-sans">Participating Group chats</h3>
                  <button
                    onClick={loadGroups}
                    disabled={loadingGroups}
                    className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-850 disabled:opacity-50 transition-all font-mono"
                    id="refresh_groups_btn"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingGroups ? 'animate-spin' : ''}`} />
                    Sync Groups
                  </button>
                </div>

                {loadingGroups ? (
                  <div className="py-12 text-center text-zinc-400">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-green-400" />
                    <span className="text-xs font-mono">Querying Baileys group state...</span>
                  </div>
                ) : groupsError ? (
                  <div className="py-8 text-center text-red-400 text-xs border border-dashed border-zinc-800 rounded-xl p-4">
                    {groupsError}
                  </div>
                ) : groups.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-4">
                    <Users className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
                    <span className="block text-xs font-semibold">No active groups detected</span>
                    <p className="mt-1 text-[11px] text-zinc-600">Join a group chat on this WhatsApp account, then click Sync Groups above.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {groups.map((g: any, i: number) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between rounded-xl bg-zinc-950 p-3.5 border border-zinc-850 hover:border-zinc-800 transition-all text-left"
                      >
                        <div className="overflow-hidden">
                          <span className="block font-semibold text-sm text-zinc-100 truncate">{g.subject || 'Unnamed Group'}</span>
                          <span className="block text-[10px] text-zinc-500 truncate mt-0.5 font-mono">{g.id}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 font-semibold bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 font-mono">
                            {g.participants?.length || 0} members
                          </span>
                          <button
                            onClick={() => {
                              const cleanId = g.id.split('@')[0];
                              setTargetPhones(cleanId);
                              setActiveTab('send');
                            }}
                            className="rounded-lg bg-green-500/10 p-1.5 text-green-400 hover:bg-green-500/20 transition-all"
                            title="Direct Message Group"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'auto' && (
              <motion.div
                key="auto-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl"
              >
                <h3 className="text-base font-bold text-white mb-1.5">Auto-Responder Trigger Rules</h3>
                <p className="text-xs text-zinc-400 mb-5 leading-normal">Set trigger keywords. When any WhatsApp user sends that word to your connected number, Hijjaze Bot will automatically send the customized reply!</p>

                {/* Form to add new rule */}
                <form onSubmit={handleAddAutoRule} className="grid gap-3 sm:grid-cols-12 mb-6">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      placeholder="Trigger keyword (e.g. price)"
                      value={newTrigger}
                      onChange={(e) => setNewTrigger(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 font-mono"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      required
                      placeholder="Automatic reply text..."
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="flex h-full w-full items-center justify-center gap-1.5 rounded-xl bg-green-500 text-xs font-bold text-black hover:bg-green-400 transition-all py-2.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </form>

                {/* Existing Rules */}
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {autoRules.map((rule, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between rounded-xl bg-zinc-950 p-3 border border-zinc-850 text-left"
                    >
                      <div className="text-xs">
                        <span className="inline-block rounded bg-green-500/15 border border-green-500/30 px-1.5 py-0.5 font-mono font-bold text-green-400 uppercase">
                          {rule.trigger}
                        </span>
                        <span className="text-zinc-500 mx-2 font-mono">→</span>
                        <span className="text-zinc-300 font-medium">{rule.response}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(idx)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                        title="Delete trigger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Active Sent Log History Ledger */}
        <div className="md:col-span-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-5">
              <History className="h-4 w-4 text-green-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Outgoing History</h3>
            </div>

            {sentHistory.length === 0 ? (
              <div className="py-10 text-center text-zinc-500">
                <span className="block text-xs font-semibold">No messages sent</span>
                <p className="mt-1 text-[10px] text-zinc-500">Send custom texts or attachments to track your live socket dispatch history here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {sentHistory.map((m) => (
                  <div key={m.id} className="rounded-xl bg-zinc-950 p-3 border border-zinc-850 space-y-1.5 text-xs text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-100 font-mono">+{m.targetPhone}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">{m.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-400 truncate max-w-[130px]">{m.content}</span>
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${m.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : m.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20'}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
