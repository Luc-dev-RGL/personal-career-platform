-- Migration v2 : sessions d'authentification, profil CMS,
-- enrichissement CRM/booking, config chatbot, analytics.
-- Les colonnes NOT NULL ajoutées portent un DEFAULT (et un backfill
-- pour les slugs/tokens) afin de rester sûres sur des tables peuplées.

-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_articleId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "repoUrl" TEXT,
ADD COLUMN     "techTags" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN     "slug" TEXT;
UPDATE "Project" SET "slug" = 'projet-' || "id" WHERE "slug" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "location" TEXT,
ALTER COLUMN "details" SET NOT NULL,
ALTER COLUMN "details" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "excerpt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Article" SET "slug" = 'article-' || "id" WHERE "slug" IS NULL;
ALTER TABLE "Article" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER,
ADD COLUMN     "authorId" INTEGER;
UPDATE "Media" SET "authorId" = (SELECT "id" FROM "User" LIMIT 1) WHERE "authorId" IS NULL;
ALTER TABLE "Media" ALTER COLUMN "authorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "message" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "value" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "visitorId",
ADD COLUMN     "visitorEmail" TEXT,
ADD COLUMN     "visitorName" TEXT,
ADD COLUMN     "visitorToken" TEXT;
UPDATE "Conversation" SET "visitorToken" = gen_random_uuid()::text WHERE "visitorToken" IS NULL;
ALTER TABLE "Conversation" ALTER COLUMN "visitorToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "readByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "link" TEXT;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT 'Développeur Full-Stack',
    "bio" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "emailPublic" TEXT,
    "phonePublic" TEXT,
    "avatarUrl" TEXT,
    "resumeUrl" TEXT,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "websiteUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateBlock" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "DateBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" INTEGER NOT NULL,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotConfig" (
    "id" SERIAL NOT NULL,
    "assistantName" TEXT NOT NULL DEFAULT 'Assistant',
    "greeting" TEXT NOT NULL DEFAULT 'Bonjour ! Posez-moi vos questions sur mon parcours, mes projets ou mes compétences.',
    "tone" TEXT NOT NULL DEFAULT 'professionnel et amical',
    "extraContext" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ChatbotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "visitorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "DateBlock_authorId_date_idx" ON "DateBlock"("authorId", "date");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_createdAt_idx" ON "LeadEvent"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatbotConfig_userId_key" ON "ChatbotConfig"("userId");

-- CreateIndex
CREATE INDEX "PageView_authorId_createdAt_idx" ON "PageView"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "PageView"("path");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_authorId_status_createdAt_idx" ON "Project"("authorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Experience_authorId_startDate_idx" ON "Experience"("authorId", "startDate");

-- CreateIndex
CREATE INDEX "Skill_authorId_category_order_idx" ON "Skill"("authorId", "category", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_authorId_published_createdAt_idx" ON "Article"("authorId", "published", "createdAt");

-- CreateIndex
CREATE INDEX "Service_authorId_active_idx" ON "Service"("authorId", "active");

-- CreateIndex
CREATE INDEX "Availability_authorId_dayOfWeek_idx" ON "Availability"("authorId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Appointment_authorId_status_dateTime_idx" ON "Appointment"("authorId", "status", "dateTime");

-- CreateIndex
CREATE INDEX "Appointment_dateTime_idx" ON "Appointment"("dateTime");

-- CreateIndex
CREATE INDEX "Lead_authorId_stage_createdAt_idx" ON "Lead"("authorId", "stage", "createdAt");

-- CreateIndex
CREATE INDEX "LeadNote_leadId_createdAt_idx" ON "LeadNote"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_visitorToken_key" ON "Conversation"("visitorToken");

-- CreateIndex
CREATE INDEX "Conversation_authorId_updatedAt_idx" ON "Conversation"("authorId", "updatedAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_authorId_isRead_createdAt_idx" ON "Notification"("authorId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_authorId_source_sourceId_idx" ON "KnowledgeChunk"("authorId", "source", "sourceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Media_authorId_createdAt_idx" ON "Media"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "DateBlock" ADD CONSTRAINT "DateBlock_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotConfig" ADD CONSTRAINT "ChatbotConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
