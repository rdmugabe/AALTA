import { z } from 'zod';

// ============ ENUMS ============

export const DocumentType = {
  INSPECTION_REPORT: 'INSPECTION_REPORT',
  STATEMENT_OF_DEFICIENCIES: 'STATEMENT_OF_DEFICIENCIES',
  PLAN_OF_CORRECTION: 'PLAN_OF_CORRECTION',
  LICENSE_APPLICATION: 'LICENSE_APPLICATION',
  LICENSE_CERTIFICATE: 'LICENSE_CERTIFICATE',
  COMPLAINT_REPORT: 'COMPLAINT_REPORT',
  ENFORCEMENT_ACTION: 'ENFORCEMENT_ACTION',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

// ============ SCHEMAS ============

export const DocumentSchema = z.object({
  id: z.string(),
  facilityId: z.string(),

  documentType: z.nativeEnum(DocumentType),
  title: z.string(),
  description: z.string().nullable(),

  s3Key: z.string(),
  s3Bucket: z.string(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),

  documentDate: z.date().nullable(),
  sourceUrl: z.string().url().nullable(),

  ocrProcessed: z.boolean().default(false),
  ocrText: z.string().nullable(),

  createdAt: z.date(),
});

export type Document = z.infer<typeof DocumentSchema>;

export const CreateDocumentSchema = DocumentSchema.omit({
  id: true,
  ocrProcessed: true,
  ocrText: true,
  createdAt: true,
});

export type CreateDocument = z.infer<typeof CreateDocumentSchema>;

// ============ DISPLAY HELPERS ============

export const DOCUMENT_TYPE_DISPLAY: Record<DocumentType, { label: string; icon: string }> = {
  INSPECTION_REPORT: { label: 'Inspection Report', icon: 'file-search' },
  STATEMENT_OF_DEFICIENCIES: { label: 'Statement of Deficiencies', icon: 'file-warning' },
  PLAN_OF_CORRECTION: { label: 'Plan of Correction', icon: 'file-check' },
  LICENSE_APPLICATION: { label: 'License Application', icon: 'file-plus' },
  LICENSE_CERTIFICATE: { label: 'License Certificate', icon: 'award' },
  COMPLAINT_REPORT: { label: 'Complaint Report', icon: 'file-x' },
  ENFORCEMENT_ACTION: { label: 'Enforcement Action', icon: 'gavel' },
};
