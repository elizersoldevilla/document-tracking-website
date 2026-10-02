import { ROLES } from '../domain/documentWorkflow.js';

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

export class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async findByEmail(email, executor = this.pool) {
    const [rows] = await executor.execute(
      `SELECT id, name, email, password AS passwordHash, role
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
    return rows[0] ? { ...mapUser(rows[0]), passwordHash: rows[0].passwordHash } : null;
  }

  async findById(id, executor = this.pool) {
    const [rows] = await executor.execute(
      `SELECT id, name, email, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    return mapUser(rows[0]);
  }

  async listProfessors() {
    const [rows] = await this.pool.execute(
      `SELECT id, name, email, role
       FROM users
       WHERE role = ?
       ORDER BY name ASC`,
      [ROLES.PROFESSOR],
    );
    return rows.map(mapUser);
  }
}
