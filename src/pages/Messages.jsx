import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Messages = () => {
  const { user } = useOutletContext();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: rows, error: conversationError } = await supabase
      .from('conversations')
      .select('id, job_id, created_at, job:jobs!conversations_job_id_fkey(job_number, title, status, client_id, provider_id)')
      .order('created_at', { ascending: false });

    if (conversationError) {
      setError(`Your conversations could not be loaded: ${conversationError.message}`);
      setLoading(false);
      return;
    }

    const conversationRows = rows || [];
    if (conversationRows.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: messageRows, error: messagesError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at, sender:profiles(full_name)')
      .in('conversation_id', conversationRows.map((conversation) => conversation.id))
      .order('created_at', { ascending: false })
      .limit(200);

    if (messagesError) {
      setError(`Your messages could not be loaded: ${messagesError.message}`);
      setLoading(false);
      return;
    }

    const latestByConversation = new Map();
    (messageRows || []).forEach((message) => {
      if (!latestByConversation.has(message.conversation_id)) {
        latestByConversation.set(message.conversation_id, message);
      }
    });

    setConversations(conversationRows
      .map((conversation) => ({
        ...conversation,
        latestMessage: latestByConversation.get(conversation.id) || null,
      }))
      .sort((left, right) => {
        const leftDate = left.latestMessage?.created_at || left.created_at;
        const rightDate = right.latestMessage?.created_at || right.created_at;
        return new Date(rightDate) - new Date(leftDate);
      }));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load, retry]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Workspace</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Job messages</h1>
        <p className="mt-2 max-w-2xl text-slate-500">Keep conversations about your work together with each job.</p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((current) => current + 1)} className="mt-2 font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Loading conversations…</p>
      ) : !error && conversations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <MessageSquareText className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-bold text-brand-navy">No job conversations yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Open a job to start a conversation with its client or provider. Messages will appear here.
          </p>
          <Button as={Link} to="/dashboard/bookings" className="mt-5 inline-flex items-center gap-2">
            View bookings <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <section aria-label="Conversations" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {conversations.map((conversation) => {
            const message = conversation.latestMessage;
            const otherUserId = conversation.job?.client_id === user.id
              ? conversation.job?.provider_id
              : conversation.job?.client_id;
            const otherName = message?.sender_id === user.id
              ? 'You'
              : message?.sender?.full_name || (otherUserId ? 'Job participant' : 'Waiting for a provider');
            const date = message?.created_at || conversation.created_at;

            return (
              <Link
                key={conversation.id}
                to={`/dashboard/jobs/${conversation.job_id}#job-chat`}
                className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 transition-colors last:border-b-0 hover:bg-slate-50"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <MessageSquareText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-brand-navy">
                      {conversation.job?.title || `Job #${conversation.job?.job_number || ''}`}
                    </span>
                    <span className="mt-1 block truncate text-sm text-slate-500">
                      {message ? `${otherName}: ${message.body || 'Attachment'}` : 'No messages yet. Start the conversation.'}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs text-slate-400">
                    {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date))}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-green">
                    Open chat <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </span>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default Messages;
