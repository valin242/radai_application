-- CreateTable
CREATE TABLE "audio_cache" (
    "id" TEXT NOT NULL,
    "script_hash" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_cache_script_hash_key" ON "audio_cache"("script_hash");
