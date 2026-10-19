# 0031 - Signatory images in Firebase Storage

## Decision

- Store signatory profile fields and image paths in Firebase Data Connect PostgreSQL.
- Store signature and company-stamp image binaries in Firebase Storage under `settings/signatories/{id}/`.
- Allow authenticated users to read these private company assets and restrict writes to the current administrator email in Storage Rules.
- Keep deactivated records and files for historical document use.

## Rationale

Binary images do not belong in relational rows. Keeping stable paths separately allows future documents to reference the exact signatory assets while retaining database filtering and status control.
