import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, fmtDateTime, loadJobsMap, loadProfilesMap } from './adminUi';

// Read-only moderation view of every conversation on the platform.
const MessagesTab = ({ notify }) => {
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [names, setNames] = useState({});
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, jobMap, convRes, memberRes, msgRes] = await Promise.all([
        loadProfilesMap(),
        loadJobsMap(),
        supabase.from('conversations').select('id, job_id, created_by, created_at')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('conversation_members').select('conversation_id, user_id, joined_at'),
        supabase.from('messages').select('id, conversation_id, sender_id, body, created_at')
          .order('created_at', { ascending: false }).limit(300),
      ]);
      if (convRes.error) throw convRes.error;
      if (memberRes.error) throw memberRes.error;
      if (msgRes.error) throw msgRes.error;
      setNames(profileNames);
      setJobs(jobMap);
      setConversations(convRes.data || []);
      setMembers(memberRes.data || []);
      setMessages(msgRes.data || []);
    } catch (e) {
      setError(e.message || String(e));
      if (notify) notify(`Conversations could not be loaded: ${e.message}`, 'red');
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const membersOf = (conversationId) =>
    members.filter((m) => m.conversation_id === conversationId).map((m) => names[m.user_id] || '—').join(', ') || '—';
  const messagesOf = (conversationId) =>
    messages.filter((m) => m.conversation_id === conversationId);

  return (
    <div className="space-y-6">
      <Card title="Conversations" subtitle={`${conversations.length} conversation(s) — click a row to read messages`}>
        <DataTable
          columns={[
            {
              key: 'job_id', label: 'Job',
              render: (c) => {
                const j = jobs[c.job_id];
                return j ? `#${j.number}` : 'General';
              },
            },
            { key: 'members', label: 'Members', render: (c) => membersOf(c.id) },
            { key: 'created_by', label: 'Created by', render: (c) => names[c.created_by] || '—' },
            { key: 'messages', label: 'Messages', render: (c) => messagesOf(c.id).length },
            { key: 'created_at', label: 'Created', render: (c) => fmtDateTime(c.created_at) },
          ]}
          rows={conversations}
          empty="No conversations."
          onRowClick={(c) => setExpandedId(expandedId === c.id ? null : c.id)}
        />
      </Card>

      {expandedId && (() => {
        const conv = conversations.find((c) => c.id === expandedId);
        const jobNumber = conv ? jobs[conv.job_id]?.number : null;
        return (
          <Card
            title="Messages"
            subtitle={jobNumber ? `Conversation for job #${jobNumber}` : 'General conversation'}
          >
            <DataTable
              columns={[
                { key: 'sender', label: 'Sender', render: (m) => names[m.sender_id] || '—' },
                { key: 'body', label: 'Message', render: (m) => m.body || <span className="italic text-slate-400">attachment/audio</span> },
                { key: 'created_at', label: 'Sent', render: (m) => fmtDateTime(m.created_at) },
              ]}
              rows={messagesOf(expandedId).slice().reverse()}
              empty="No messages in this conversation."
            />
          </Card>
        );
      })()}
    </div>
  );
};

export default MessagesTab;
