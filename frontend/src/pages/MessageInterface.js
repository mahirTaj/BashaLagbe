// frontend/src/pages/MessageInterface.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getThreads, getThread } from '../messages';
import ChatBox from '../components/ui/ChatBox';
import { getSocket } from '../socket';

export default function MessageInterfacePage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  // 📌 Load threads
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { threads } = await getThreads();
        if (!mounted) return;
        setThreads(threads);
        if (!threadId && threads.length) {
          navigate(`/messages/${threads[0]._id}`, { replace: true });
        }
      } catch (e) {
        console.error('Load threads error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [threadId, navigate]);

  // 📌 Load active thread
  useEffect(() => {
    let mounted = true;
    if (!threadId) return;

    (async () => {
      try {
        const data = await getThread(threadId);
        if (!mounted) return;
        setActive(data);

        const socket = getSocket();
        socket.emit('thread:join', threadId);
      } catch (e) {
        console.error('Load thread error:', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [threadId]);

  // 📌 Real-time updates
  useEffect(() => {
    const socket = getSocket();

    const onNotify = ({ threadId: tid, preview }) => {
      setThreads((prev) => {
        const next = [...prev];
        const idx = next.findIndex((t) => String(t._id) === String(tid));

        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            lastMessage: preview,
            updatedAt: new Date().toISOString(),
          };
          const [item] = next.splice(idx, 1);
          next.unshift(item);
        } else {
          next.unshift({
            _id: tid,
            lastMessage: preview,
            listing: null,
          });
        }
        return next;
      });
    };

    socket.on('message:notify', onNotify);

    return () => {
      socket.off('message:notify', onNotify);
    };
  }, []);

  if (loading) {
    return <div className="p-4">Loading messages...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-80px)] border rounded-lg overflow-hidden bg-white">
      {/* Sidebar */}
      <aside className="w-80 border-r overflow-y-auto">
        <div className="p-4 font-semibold text-gray-700">Conversations</div>
        <ul>
          {threads.map((t) => (
            <li key={t._id}>
              <Link
                to={`/messages/${t._id}`}
                className={`block p-3 hover:bg-gray-50 ${
                  String(t._id) === String(threadId) ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-800">
                  {t?.listing?.title || 'Listing'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {t.lastMessage || 'No messages yet'}
                </div>
              </Link>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="p-4 text-sm text-gray-500">No conversations yet.</li>
          )}
        </ul>
      </aside>

      {/* Active chat */}
      <main className="flex-1">
        {active ? (
          <ChatBox
            threadId={threadId}
            initialThread={active.thread}
            initialMessages={active.messages}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a conversation
          </div>
        )}
      </main>
    </div>
  );
}
