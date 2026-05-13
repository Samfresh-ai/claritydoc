-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "original_filename" TEXT,
    "document_type" TEXT,
    "text_hash" TEXT NOT NULL,
    "text_preview" TEXT NOT NULL,
    "full_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "model_used" TEXT NOT NULL,
    "usage" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_session_id_idx" ON "documents"("session_id");

-- CreateIndex
CREATE INDEX "documents_text_hash_idx" ON "documents"("text_hash");

-- CreateIndex
CREATE INDEX "analyses_document_id_idx" ON "analyses"("document_id");

-- CreateIndex
CREATE INDEX "analyses_session_id_idx" ON "analyses"("session_id");

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
