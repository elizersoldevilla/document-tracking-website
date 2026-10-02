import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Keeps a message in the same shape as a history entry so both can be merged
// into one conversation list by the Message Center.
function toMessageEvent(message) {
  return {
    id: `msg-${message.id}`,
    kind: 'message',
    remarks: message.body,
    updatedByName: message.senderName,
    timestamp: message.createdAt,
    newStatus: null,
    documentId: message.documentId,
    documentTitle: message.documentTitle,
    documentStatus: message.documentStatus,
    reference: message.reference,
  };
}

export function useActivity() {
  const [state, setState] = useState({
    documents: [],
    events: [],
    messages: [],
    loading: true,
    error: '',
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));

    Promise.all([
      api.documents({ page: 1, limit: 100 }),
      api.messages().catch(() => []),
    ])
      .then(async ([{ items }, messages]) => {
        const histories = await Promise.all(
          items.map((item) => api.history(item.id).catch(() => [])),
        );
        const events = items
          .flatMap((item, index) => histories[index].map((entry) => ({
            ...entry,
            documentId: item.id,
            documentTitle: item.title,
            documentStatus: item.status,
            studentName: item.studentName,
            professorName: item.professorName,
            reference: `RES-${String(item.id).padStart(5, '0')}`,
          })))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const mappedMessages = (messages || [])
          .map(toMessageEvent)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (active) {
          setState({
            documents: items,
            events,
            messages: mappedMessages,
            loading: false,
            error: '',
          });
        }
      })
      .catch((requestError) => {
        if (active) {
          setState({
            documents: [],
            events: [],
            messages: [],
            loading: false,
            error: requestError.message,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

  return { ...state, refresh };
}
