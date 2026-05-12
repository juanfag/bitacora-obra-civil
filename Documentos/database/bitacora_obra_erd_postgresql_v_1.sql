-- =========================================================
-- Proyecto: Bitácora diaria de Obra Civil
-- Versión: ERD PostgreSQL v1
-- Base: Multi-proyecto, eventos diarios, firmas, documentos,
--       aprobaciones, PDF final, auditoría y permisos.
-- =========================================================

-- =========================================================
-- 1. EXTENSIONES
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 2. TIPOS ENUM
-- =========================================================

CREATE TYPE record_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);

CREATE TYPE attachment_requirement AS ENUM (
    'REQUIRED',
    'OPTIONAL',
    'NOT_REQUIRED'
);

CREATE TYPE project_status AS ENUM (
    'PLANNED',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED',
    'CANCELLED'
);

CREATE TYPE daily_log_status AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'OBSERVED',
    'APPROVED',
    'PDF_GENERATED',
    'SIGNED',
    'CLOSED',
    'VOIDED'
);

CREATE TYPE event_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'OBSERVED',
    'APPROVED',
    'REJECTED',
    'VOIDED'
);

CREATE TYPE signature_type AS ENUM (
    'DRAWN',
    'DIGITAL',
    'CERTIFICATE',
    'OTP'
);

CREATE TYPE approval_action AS ENUM (
    'APPROVED',
    'REJECTED',
    'OBSERVED'
);

CREATE TYPE document_storage_provider AS ENUM (
    'LOCAL',
    'GOOGLE_DRIVE',
    'S3',
    'AZURE_BLOB'
);

CREATE TYPE daily_log_document_role AS ENUM (
    'SUPPORT',
    'GENERATED_PDF',
    'SIGNED_PDF'
);

CREATE TYPE pdf_version_status AS ENUM (
    'GENERATED',
    'SIGNED',
    'VOIDED'
);

CREATE TYPE audit_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'SUBMIT',
    'APPROVE',
    'REJECT',
    'OBSERVE',
    'SIGN',
    'UPLOAD_DOCUMENT',
    'GENERATE_PDF',
    'CLOSE',
    'VOID'
);

-- =========================================================
-- 3. TABLAS MAESTRAS
-- =========================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    nit VARCHAR(50),
    email VARCHAR(150),
    phone VARCHAR(50),
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_organizations_nit UNIQUE (nit)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    document_type VARCHAR(30),
    document_number VARCHAR(50),
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_document UNIQUE (document_type, document_number)
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_roles_code UNIQUE (code)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permissions_code UNIQUE (code)
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    status project_status NOT NULL DEFAULT 'PLANNED',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_projects_org_code UNIQUE (organization_id, code)
);

CREATE TABLE project_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    status record_status NOT NULL DEFAULT 'ACTIVE',
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    CONSTRAINT uq_project_user_role UNIQUE (project_id, user_id, role_id)
);

CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    attachment_requirement attachment_requirement NOT NULL DEFAULT 'OPTIONAL',
    requires_signature BOOLEAN NOT NULL DEFAULT TRUE,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_types_code UNIQUE (code)
);

CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(80) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_types_code UNIQUE (code)
);

-- =========================================================
-- 4. BITÁCORA DIARIA Y EVENTOS
-- =========================================================

CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    log_date DATE NOT NULL,
    status daily_log_status NOT NULL DEFAULT 'DRAFT',
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    closed_at TIMESTAMP,
    comments TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_logs_project_date UNIQUE (project_id, log_date)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id UUID NOT NULL REFERENCES daily_logs(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    event_type_id UUID NOT NULL REFERENCES event_types(id),
    activity TEXT NOT NULL,
    execution_description TEXT NOT NULL,
    event_datetime TIMESTAMP NOT NULL,
    reported_by UUID NOT NULL REFERENCES users(id),
    status event_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE event_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id),
    version_number INTEGER NOT NULL,
    event_type_id UUID NOT NULL REFERENCES event_types(id),
    activity TEXT NOT NULL,
    execution_description TEXT NOT NULL,
    status event_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_versions UNIQUE (event_id, version_number)
);

CREATE TABLE event_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id),
    signed_by UUID NOT NULL REFERENCES users(id),
    signature_type signature_type NOT NULL DEFAULT 'DRAWN',
    signature_url TEXT,
    signature_hash TEXT,
    signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(80),
    device_info TEXT,
    CONSTRAINT uq_event_signature UNIQUE (event_id, signed_by)
);

-- =========================================================
-- 5. APROBACIONES DE BITÁCORA
-- =========================================================

CREATE TABLE daily_log_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id UUID NOT NULL REFERENCES daily_logs(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    action approval_action NOT NULL,
    comments TEXT,
    signature_type signature_type DEFAULT 'DRAWN',
    signature_url TEXT,
    signature_hash TEXT,
    signed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 6. DOCUMENTOS Y ADJUNTOS
-- =========================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(250) NOT NULL,
    description TEXT,
    file_name VARCHAR(250) NOT NULL,
    file_url TEXT NOT NULL,
    storage_provider document_storage_provider NOT NULL DEFAULT 'LOCAL',
    mime_type VARCHAR(120),
    file_size BIGINT,
    file_hash TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status record_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE event_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id),
    document_id UUID NOT NULL REFERENCES documents(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_documents UNIQUE (event_id, document_id)
);

CREATE TABLE daily_log_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id UUID NOT NULL REFERENCES daily_logs(id),
    document_id UUID NOT NULL REFERENCES documents(id),
    document_role daily_log_document_role NOT NULL DEFAULT 'SUPPORT',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_log_documents UNIQUE (daily_log_id, document_id, document_role)
);

CREATE TABLE daily_log_pdf_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_log_id UUID NOT NULL REFERENCES daily_logs(id),
    document_id UUID NOT NULL REFERENCES documents(id),
    version_number INTEGER NOT NULL,
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status pdf_version_status NOT NULL DEFAULT 'GENERATED',
    CONSTRAINT uq_daily_log_pdf_versions UNIQUE (daily_log_id, version_number)
);

-- =========================================================
-- 7. AUDITORÍA
-- =========================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action audit_action NOT NULL,
    performed_by UUID REFERENCES users(id),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(80),
    device_info TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- 8. ÍNDICES RECOMENDADOS
-- =========================================================

CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_project_users_user ON project_users(user_id);

CREATE INDEX idx_daily_logs_project_date ON daily_logs(project_id, log_date);
CREATE INDEX idx_daily_logs_status ON daily_logs(status);

CREATE INDEX idx_events_daily_log ON events(daily_log_id);
CREATE INDEX idx_events_project_date ON events(project_id, event_datetime);
CREATE INDEX idx_events_reported_by ON events(reported_by);
CREATE INDEX idx_events_status ON events(status);

CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_type ON documents(document_type_id);
CREATE INDEX idx_event_documents_event ON event_documents(event_id);
CREATE INDEX idx_daily_log_documents_log ON daily_log_documents(daily_log_id);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =========================================================
-- 9. DATOS INICIALES: ROLES
-- =========================================================

INSERT INTO roles (code, name, description) VALUES
('SUPER_ADMIN', 'Super administrador', 'Administra toda la plataforma'),
('ORG_ADMIN', 'Administrador de organización', 'Administra usuarios y proyectos de una organización'),
('PROJECT_ADMIN', 'Administrador de proyecto', 'Configura el proyecto y su equipo'),
('DIRECTOR', 'Director de obra', 'Revisa y aprueba bitácoras diarias'),
('RESIDENT_ENGINEER', 'Ingeniero residente', 'Registra y valida eventos de obra'),
('INSPECTOR', 'Inspector', 'Registra eventos y evidencias'),
('CONTRACTOR', 'Contratista', 'Reporta actividades asignadas'),
('AUDITOR', 'Auditor', 'Consulta trazabilidad y evidencias'),
('VIEWER', 'Solo lectura', 'Consulta información sin modificarla');

-- =========================================================
-- 10. DATOS INICIALES: PERMISOS
-- =========================================================

INSERT INTO permissions (code, name, description) VALUES
('PROJECT_CREATE', 'Crear proyectos', 'Permite crear nuevos proyectos'),
('PROJECT_UPDATE', 'Editar proyectos', 'Permite modificar proyectos existentes'),
('PROJECT_VIEW', 'Ver proyectos', 'Permite consultar proyectos'),
('USER_INVITE', 'Invitar usuarios', 'Permite invitar usuarios'),
('USER_ASSIGN_ROLE', 'Asignar roles', 'Permite asignar roles a usuarios'),
('EVENT_CREATE', 'Crear eventos', 'Permite crear eventos de obra'),
('EVENT_UPDATE_OWN', 'Editar eventos propios', 'Permite editar eventos creados por el usuario'),
('EVENT_UPDATE_ANY', 'Editar cualquier evento', 'Permite editar eventos de cualquier usuario'),
('EVENT_VIEW', 'Ver eventos', 'Permite consultar eventos'),
('EVENT_APPROVE', 'Aprobar eventos', 'Permite aprobar eventos'),
('EVENT_REJECT', 'Rechazar eventos', 'Permite rechazar eventos'),
('DOCUMENT_UPLOAD', 'Cargar documentos', 'Permite cargar documentos'),
('DOCUMENT_VIEW', 'Ver documentos', 'Permite consultar documentos'),
('DOCUMENT_DELETE', 'Eliminar documentos', 'Permite eliminar documentos'),
('DAILY_LOG_VIEW', 'Ver bitácora diaria', 'Permite consultar bitácoras diarias'),
('DAILY_LOG_SUBMIT', 'Enviar bitácora a revisión', 'Permite enviar bitácora a revisión'),
('DAILY_LOG_APPROVE', 'Aprobar bitácora diaria', 'Permite aprobar bitácoras diarias'),
('DAILY_LOG_REJECT', 'Rechazar bitácora diaria', 'Permite rechazar bitácoras diarias'),
('DAILY_LOG_CLOSE', 'Cerrar bitácora diaria', 'Permite cerrar bitácoras diarias'),
('PDF_GENERATE', 'Generar PDF', 'Permite generar PDF de bitácora'),
('PDF_SIGN', 'Firmar PDF', 'Permite firmar PDF de bitácora'),
('AUDIT_VIEW', 'Ver auditoría', 'Permite consultar auditoría del sistema');

-- =========================================================
-- 11. DATOS INICIALES: TIPOS DE EVENTO
-- =========================================================

INSERT INTO event_types (code, name, attachment_requirement, requires_signature) VALUES
('WORK_PROGRESS', 'Avance de obra', 'OPTIONAL', TRUE),
('ACTIVITY_EXECUTION', 'Ejecución de actividad', 'OPTIONAL', TRUE),
('INCIDENT', 'Incidente', 'REQUIRED', TRUE),
('ACCIDENT', 'Accidente', 'REQUIRED', TRUE),
('WEATHER_CONDITION', 'Condición climática', 'OPTIONAL', TRUE),
('MATERIAL_DELIVERY', 'Entrega de material', 'OPTIONAL', TRUE),
('EQUIPMENT_ENTRY', 'Ingreso de equipo', 'OPTIONAL', TRUE),
('EQUIPMENT_EXIT', 'Salida de equipo', 'OPTIONAL', TRUE),
('TECHNICAL_INSTRUCTION', 'Instrucción técnica', 'OPTIONAL', TRUE),
('SUSPENSION_REQUEST', 'Solicitud de suspensión', 'REQUIRED', TRUE),
('WORK_SUSPENSION', 'Suspensión de obra', 'REQUIRED', TRUE),
('WORK_RESUMPTION', 'Reanudación de obra', 'REQUIRED', TRUE),
('SITE_VISIT', 'Visita de obra', 'OPTIONAL', TRUE),
('LEGAL_CLAIM', 'Demanda / reclamación', 'REQUIRED', TRUE),
('COMPLAINT', 'Denuncia / queja', 'REQUIRED', TRUE),
('OTHER', 'Otro', 'OPTIONAL', TRUE);

-- =========================================================
-- 12. DATOS INICIALES: TIPOS DOCUMENTALES
-- =========================================================

INSERT INTO document_types (code, name, description) VALUES
('PHOTO', 'Fotografía', 'Imagen o evidencia fotográfica'),
('PLAN', 'Plano', 'Plano técnico o arquitectónico'),
('TECHNICAL_REPORT', 'Informe técnico', 'Informe técnico asociado al proyecto'),
('ACT', 'Acta', 'Acta de reunión, entrega o comité'),
('SUSPENSION_REQUEST', 'Solicitud de suspensión', 'Documento de solicitud de suspensión de obra'),
('COMPLAINT', 'Denuncia', 'Documento de denuncia o queja'),
('LEGAL_CLAIM', 'Demanda', 'Documento legal o reclamación formal'),
('LICENSE', 'Licencia', 'Licencia o autorización'),
('CONTRACT', 'Contrato', 'Contrato asociado al proyecto'),
('POLICY', 'Póliza', 'Póliza o garantía'),
('QUALITY_CERTIFICATE', 'Certificado de calidad', 'Certificado de calidad de material o servicio'),
('MATERIAL_SUPPORT', 'Soporte de material', 'Soporte de entrega o recepción de material'),
('GENERATED_DAILY_LOG_PDF', 'PDF generado de bitácora', 'PDF generado de la bitácora diaria'),
('SIGNED_DAILY_LOG_PDF', 'PDF firmado de bitácora', 'PDF final firmado'),
('OTHER', 'Otro', 'Otro tipo documental');

-- =========================================================
-- 13. ASIGNACIÓN SIMPLE DE PERMISOS A ROLES
-- Nota: versión inicial. Luego puede afinarse.
-- =========================================================

-- SUPER_ADMIN: todos los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN';

-- ORG_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_VIEW',
    'USER_INVITE', 'USER_ASSIGN_ROLE',
    'EVENT_VIEW', 'DOCUMENT_VIEW', 'DAILY_LOG_VIEW', 'AUDIT_VIEW'
)
WHERE r.code = 'ORG_ADMIN';

-- PROJECT_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_UPDATE', 'PROJECT_VIEW',
    'USER_INVITE', 'USER_ASSIGN_ROLE',
    'EVENT_CREATE', 'EVENT_UPDATE_ANY', 'EVENT_VIEW',
    'DOCUMENT_UPLOAD', 'DOCUMENT_VIEW', 'DOCUMENT_DELETE',
    'DAILY_LOG_VIEW', 'DAILY_LOG_SUBMIT',
    'PDF_GENERATE', 'AUDIT_VIEW'
)
WHERE r.code = 'PROJECT_ADMIN';

-- DIRECTOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_VIEW',
    'EVENT_VIEW', 'EVENT_APPROVE', 'EVENT_REJECT',
    'DOCUMENT_VIEW',
    'DAILY_LOG_VIEW', 'DAILY_LOG_APPROVE', 'DAILY_LOG_REJECT', 'DAILY_LOG_CLOSE',
    'PDF_GENERATE', 'PDF_SIGN', 'AUDIT_VIEW'
)
WHERE r.code = 'DIRECTOR';

-- RESIDENT_ENGINEER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_VIEW',
    'EVENT_CREATE', 'EVENT_UPDATE_OWN', 'EVENT_VIEW',
    'DOCUMENT_UPLOAD', 'DOCUMENT_VIEW',
    'DAILY_LOG_VIEW', 'DAILY_LOG_SUBMIT'
)
WHERE r.code = 'RESIDENT_ENGINEER';

-- INSPECTOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_VIEW',
    'EVENT_CREATE', 'EVENT_UPDATE_OWN', 'EVENT_VIEW',
    'DOCUMENT_UPLOAD', 'DOCUMENT_VIEW',
    'DAILY_LOG_VIEW'
)
WHERE r.code = 'INSPECTOR';

-- CONTRACTOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_VIEW',
    'EVENT_CREATE', 'EVENT_UPDATE_OWN', 'EVENT_VIEW',
    'DOCUMENT_UPLOAD', 'DOCUMENT_VIEW'
)
WHERE r.code = 'CONTRACTOR';

-- AUDITOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_VIEW', 'EVENT_VIEW', 'DOCUMENT_VIEW', 'DAILY_LOG_VIEW', 'AUDIT_VIEW'
)
WHERE r.code = 'AUDITOR';

-- VIEWER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PROJECT_VIEW', 'EVENT_VIEW', 'DOCUMENT_VIEW', 'DAILY_LOG_VIEW'
)
WHERE r.code = 'VIEWER';
