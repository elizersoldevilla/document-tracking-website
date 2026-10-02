import { ADMIN_VISIBLE_STATUSES, ROLES } from '../domain/documentWorkflow.js';

const DOCUMENT_SELECT = `
  SELECT
    d.id,
    d.student_id AS studentId,
    d.professor_id AS professorId,
    d.title,
    d.description,
    d.research_team_name AS researchTeamName,
    d.status,
    d.version,
    d.created_at AS createdAt,
    d.updated_at AS updatedAt,
    student.name AS studentName,
    student.email AS studentEmail,
    professor.name AS professorName,
    professor.email AS professorEmail
  FROM documents d
  INNER JOIN users student ON student.id = d.student_id
  INNER JOIN users professor ON professor.id = d.professor_id`;

export function buildScope(user) {
  if (user.role === ROLES.STUDENT) {
    return { clause: 'd.student_id = ?', params: [user.id] };
  }

  if (user.role === ROLES.PROFESSOR) {
    return { clause: 'd.professor_id = ?', params: [user.id] };
  }

  if (user.role === ROLES.ADMIN) {
    return {
      clause: `d.status IN (${ADMIN_VISIBLE_STATUSES.map(() => '?').join(', ')})`,
      params: [...ADMIN_VISIBLE_STATUSES],
    };
  }

  return { clause: '1 = 0', params: [] };
}

export class DocumentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async withTransaction(callback) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async list(user, filters) {
    const scope = buildScope(user);
    const where = [scope.clause];
    const params = [...scope.params];

    if (filters.search) {
      where.push('(d.title LIKE ? OR d.description LIKE ? OR student.name LIKE ? OR professor.name LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    if (filters.status) {
      where.push('d.status = ?');
      params.push(filters.status);
    }

    if (filters.hasRemarks) {
      where.push(`EXISTS (
        SELECT 1 FROM document_logs l
        WHERE l.document_id = d.id
          AND l.remarks IS NOT NULL
          AND TRIM(l.remarks) <> ''
      )`);
    }

    const whereSql = where.join(' AND ');
    const offset = (filters.page - 1) * filters.limit;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM documents d
      INNER JOIN users student ON student.id = d.student_id
      INNER JOIN users professor ON professor.id = d.professor_id
      WHERE ${whereSql}`;
    const listSql = `${DOCUMENT_SELECT}
      WHERE ${whereSql}
      ORDER BY d.updated_at DESC, d.id DESC
      LIMIT ? OFFSET ?`;
    const summarySql = `
      SELECT d.status, COUNT(*) AS count
      FROM documents d
      WHERE ${scope.clause}
      GROUP BY d.status`;
    // Requests flagged with reviewer remarks ("For Revision" queue).
    const remarksSql = `
      SELECT COUNT(DISTINCT d.id) AS count
      FROM documents d
      INNER JOIN document_logs l ON l.document_id = d.id
      WHERE ${scope.clause}
        AND l.remarks IS NOT NULL
        AND TRIM(l.remarks) <> ''`;

    const [[countRows], [rows], [summaryRows], [remarksRows]] = await Promise.all([
      this.pool.execute(countSql, params),
      this.pool.execute(listSql, [...params, filters.limit, offset]),
      this.pool.execute(summarySql, scope.params),
      this.pool.execute(remarksSql, scope.params),
    ]);

    const summary = {};
    for (const row of summaryRows) {
      summary[row.status] = Number(row.count);
    }

    return {
      items: rows,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: Number(countRows[0].total),
        totalPages: Math.max(1, Math.ceil(Number(countRows[0].total) / filters.limit)),
      },
      summary,
      withRemarks: Number(remarksRows[0]?.count || 0),
    };
  }

  async findAccessibleById(user, documentId, executor = this.pool) {
    const scope = buildScope(user);
    const [rows] = await executor.execute(
      `${DOCUMENT_SELECT}
       WHERE d.id = ? AND ${scope.clause}
       LIMIT 1`,
      [documentId, ...scope.params],
    );
    return rows[0] || null;
  }

  async findByIdForUpdate(connection, documentId) {
    const [rows] = await connection.execute(
      `SELECT
         id,
         student_id AS studentId,
         professor_id AS professorId,
         title,
         description,
         research_team_name AS researchTeamName,
         status,
         version,
         created_at AS createdAt,
         updated_at AS updatedAt
       FROM documents
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [documentId],
    );
    return rows[0] || null;
  }

  async updateResearchTeamName(documentId, researchTeamName) {
    await this.pool.execute(
      `UPDATE documents
       SET research_team_name = ?
       WHERE id = ?`,
      [researchTeamName, documentId],
    );
  }

  async insert(connection, document) {
    const [result] = await connection.execute(
      `INSERT INTO documents (student_id, professor_id, title, description, research_team_name, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        document.studentId,
        document.professorId,
        document.title,
        document.description,
        document.researchTeamName || null,
        document.status,
      ],
    );
    return result.insertId;
  }

  async updateStatus(connection, documentId, expectedVersion, newStatus) {
    const [result] = await connection.execute(
      `UPDATE documents
       SET status = ?, version = version + 1
       WHERE id = ? AND version = ?`,
      [newStatus, documentId, expectedVersion],
    );
    return result.affectedRows === 1;
  }

  async insertLog(connection, log) {
    await connection.execute(
      `INSERT INTO document_logs
         (document_id, updated_by_user_id, previous_status, new_status, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [
        log.documentId,
        log.updatedByUserId,
        log.previousStatus,
        log.newStatus,
        log.remarks,
      ],
    );
  }

  async findHistory(documentId) {
    const [rows] = await this.pool.execute(
      `SELECT
         l.id,
         l.document_id AS documentId,
         l.updated_by_user_id AS updatedByUserId,
         l.previous_status AS previousStatus,
         l.new_status AS newStatus,
         l.remarks,
         l.timestamp,
         u.name AS updatedByName,
         u.role AS updatedByRole
       FROM document_logs l
       INNER JOIN users u ON u.id = l.updated_by_user_id
       WHERE l.document_id = ?
       ORDER BY l.timestamp ASC, l.id ASC`,
      [documentId],
    );
    return rows;
  }
}
