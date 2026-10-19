import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle, MessageSquareText, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const JobChat = ({ jobId, user }) => {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [initError, setInitError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;
    (async () => {
      const { data, error } = await supabase.rpc('ensure_job_conversation', { target_job_id: jobId });
      if (!isCurrent) return;
      if (error) setInitError(`Job chat could not be opened: ${error.message}`);
      else setConversationId(data);
      setIsLoading(false);
    })();
    return () => { isCurrent = false; };
  }, [jobId]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at, sender:profiles!messages_sender_id_fkey(full_name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) setLoadError(`Messages could not be loaded: ${error.message}`);
    else {
      setLoadError('');
      setMessages(data || []);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return undefined;
    loadMessages();
    const timer = setInterval(loadMessages, 5000);
    return () => clearInterval(timer);
  }, [conversationId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !conversationId) return;
    setSendError('');
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    });
    if (!error) setDraft('');
    else setSendError(`Message could not be sent: ${error.message}`);
    setSending(false);
    loadMessages();
  };

  return (
    <section id="job-chat" aria-label="Job chat" className="rounded-lg border border-slate-200 bg-white p-5 scroll-mt-24">
      <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
        <MessageSquareText className="h-4 w-4" /> Job chat
      </h2>
      {initError ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{initError}</p>
      ) : (
        <>
          {isLoading && <p className="mt-3 text-sm text-slate-500" role="status">Opening job chat…</p>}
          {loadError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{loadError}</p>}
          <div className="mt-4 flex h-72 flex-col gap-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
            {!isLoading && !loadError && messages.length === 0 && (
              <p className="m-auto text-sm text-slate-400">No messages yet. Say hello!</p>
            )}
            {messages.map((message) => {
              const own = message.sender_id === user.id;
              return (
                <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${own ? 'bg-brand-green text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                    {!own && <p className="text-[11px] font-bold text-brand-navy">{message.sender?.full_name || 'Participant'}</p>}
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <p className={`mt-1 text-[10px] ${own ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input
              type="text"
              maxLength={2000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              aria-label="Message"
              className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending || isLoading || !conversationId || Boolean(initError) || Boolean(loadError)}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white transition-colors hover:bg-brand-green/90 disabled:opacity-50"
            >
              {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
          {sendError && <p className="mt-2 text-sm text-red-700" role="alert">{sendError}</p>}
        </>
      )}
    </section>
  );
};

export default JobChat;
