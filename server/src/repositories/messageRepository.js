import { buildScope } from './documentRepository.js';

const MESSAGE_SELECT = `
  SELECT
    m.id,
    m.document_id AS documentId,
    m.sender_id AS senderId,
    m.body,
    m.created_at AS createdAt,
    sender.name AS senderName,
    d.title AS documentTitle,
    d.status AS documentStatus,
    CONCAT('RES-', LPAD(d.id, 5, '0')) AS reference
  FROM document_messages m
  INNER JOIN documents d ON d.id = m.document_id
  INNER JOIN users sender ON sender.id = m.sender_id`;

export class MessageRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async insert({ documentId, senderId, body }) {
    const [result] = await this.pool.execute(
      'INSERT INTO document_messages (document_id, sender_id, body) VALUES (?, ?, ?)',
      [documentId, senderId, body],
    );
    return result.insertId;
  }

  async find(messageId) {
    const [rows] = await this.pool.execute(
      `${MESSAGE_SELECT} WHERE m.id = ? LIMIT 1`,
      [messageId],
    );
    return rows[0] || null;
  }

  async listByDocument(documentId) {
    const [rows] = await this.pool.execute(
      `${MESSAGE_SELECT}
       WHERE m.document_id = ?
       ORDER BY m.created_at ASC, m.id ASC`,
      [documentId],
    );
    return rows;
  }

  // Every message on a document the caller is allowed to see, newest first.
  async listAccessible(user, { limit = 200 } = {}) {
    const scope = buildScope(user);
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const [rows] = await this.pool.execute(
      `${MESSAGE_SELECT}
       WHERE ${scope.clause}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ${safeLimit}`,
      [...scope.params],
    );
    return rows;
  }
}
