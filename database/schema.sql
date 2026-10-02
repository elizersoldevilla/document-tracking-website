CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'professor', 'admin') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  professor_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  research_team_name VARCHAR(120),
  status ENUM(
    'SUBMITTED',
    'UNDER_REVIEW',
    'SIGNED_APPROVED',
    'ENDORSED_TO_ADMIN',
    'ADMIN_PROCESSING',
    'READY_FOR_PICKUP',
    'COMPLETED'
  ) NOT NULL DEFAULT 'SUBMITTED',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_student_status_updated (student_id, status, updated_at),
  KEY idx_documents_professor_status_updated (professor_id, status, updated_at),
  KEY idx_documents_status_updated (status, updated_at),
  CONSTRAINT fk_documents_student
    FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_documents_professor
    FOREIGN KEY (professor_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NOT NULL,
  previous_status ENUM(
    'SUBMITTED',
    'UNDER_REVIEW',
    'SIGNED_APPROVED',
    'ENDORSED_TO_ADMIN',
    'ADMIN_PROCESSING',
    'READY_FOR_PICKUP',
    'COMPLETED'
  ) NULL,
  new_status ENUM(
    'SUBMITTED',
    'UNDER_REVIEW',
    'SIGNED_APPROVED',
    'ENDORSED_TO_ADMIN',
    'ADMIN_PROCESSING',
    'READY_FOR_PICKUP',
    'COMPLETED'
  ) NOT NULL,
  remarks VARCHAR(2000) NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_document_logs_timeline (document_id, timestamp, id),
  KEY idx_document_logs_user (updated_by_user_id, timestamp),
  CONSTRAINT fk_document_logs_document
    FOREIGN KEY (document_id) REFERENCES documents (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_document_logs_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  requirement_slug VARCHAR(64) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  content MEDIUMBLOB NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_document_files_document (document_id, requirement_slug),
  KEY idx_document_files_document_time (document_id, uploaded_at, id),
  CONSTRAINT fk_document_files_document
    FOREIGN KEY (document_id) REFERENCES documents (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_document_files_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_document_messages_document (document_id, created_at, id),
  KEY idx_document_messages_sender (sender_id, created_at),
  CONSTRAINT fk_document_messages_document
    FOREIGN KEY (document_id) REFERENCES documents (id)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_document_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
