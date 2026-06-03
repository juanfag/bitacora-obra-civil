-- Add document relation target types for enterprise document links.
ALTER TYPE "document_relation_type" ADD VALUE IF NOT EXISTS 'DAILY_LOG';
ALTER TYPE "document_relation_type" ADD VALUE IF NOT EXISTS 'DAILY_LOG_EVENT';
ALTER TYPE "document_relation_type" ADD VALUE IF NOT EXISTS 'PROJECT';

-- Add audit actions for document relation lifecycle.
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'DOCUMENT_RELATION_CREATED';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'DOCUMENT_RELATION_DELETED';
