import { buildScope } from './documentRepository.js';

// Metadata only — `content` is deliberately excluded so list responses stay light.
const FILE_META_SELECT = `
  SELECT
    f.id,
    f.document_id AS documentId,
    f.requirement_slug AS requirementSlug,
    f.original_name AS originalName,
    f.mime_type AS mimeType,
    f.size_bytes AS sizeBytes,
    f.uploaded_by AS uploadedBy,
    f.uploaded_at AS uploadedAt,
    f.viewed_at AS viewedAt,
    uploader.name AS uploadedByName,
    d.student_id AS studentId,
    d.title AS documentTitle,
    d.status AS documentStatus,
    CONCAT('RES-', LPAD(d.id, 5, '0')) AS reference
  FROM document_files f
  INNER JOIN documents d ON d.id = f.document_id
  INNER JOIN users uploader ON uploader.id = f.uploaded_by`;

export class FileRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async insert({
    documentId, requirementSlug, originalName, mimeType, sizeBytes, content, uploadedBy,
  }) {
    const [result] = await this.pool.execute(
      `INSERT INTO document_files
         (document_id, requirement_slug, original_name, mime_type, size_bytes, content, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [documentId, requirementSlug, originalName, mimeType, sizeBytes, content, uploadedBy],
    );
    return result.insertId;
  }

  async listByDocument(documentId) {
    const [rows] = await this.pool.execute(
      `${FILE_META_SELECT}
       WHERE f.document_id = ?
       ORDER BY f.uploaded_at DESC, f.id DESC`,
      [documentId],
    );
    return rows;
  }

  // Returns the metadata row only when the caller's role may see the parent document.
  async findAccessible(user, fileId) {
    const scope = buildScope(user);
    const [rows] = await this.pool.execute(
      `${FILE_META_SELECT}
       WHERE f.id = ? AND ${scope.clause}
       LIMIT 1`,
      [fileId, ...scope.params],
    );
    return rows[0] || null;
  }

  async findContent(fileId) {
    const [rows] = await this.pool.execute(
      'SELECT content FROM document_files WHERE id = ? LIMIT 1',
      [fileId],
    );
    return rows[0]?.content || null;
  }

  async remove(fileId) {
    const [result] = await this.pool.execute('DELETE FROM document_files WHERE id = ?', [fileId]);
    return result.affectedRows > 0;
  }

  // Records the first time the ethics board opened a single submission.
  async markViewed(fileId) {
    await this.pool.execute(
      'UPDATE document_files SET viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP) WHERE id = ?',
      [fileId],
    );
  }

  // Records the first time the ethics board opened the whole submission set.
  async markDocumentViewed(documentId) {
    await this.pool.execute(
      `UPDATE document_files
       SET viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP)
       WHERE document_id = ? AND viewed_at IS NULL`,
      [documentId],
    );
  }
}
