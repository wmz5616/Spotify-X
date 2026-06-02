-- AlterTable
ALTER TABLE "Artist" ADD COLUMN "avatarPosition" TEXT DEFAULT '50% 50%';
ALTER TABLE "Artist" ADD COLUMN "backgroundPosition" TEXT DEFAULT '50% 50%';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "avatarPath" TEXT,
    "bio" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "avatarPosition" TEXT DEFAULT '50% 50%',
    "backgroundPath" TEXT,
    "backgroundPosition" TEXT DEFAULT '50% 50%',
    "ipLocation" TEXT
);
INSERT INTO "new_User" ("avatarPath", "avatarPosition", "backgroundPath", "backgroundPosition", "bio", "createdAt", "displayName", "email", "id", "ipLocation", "passwordHash", "updatedAt", "username") SELECT "avatarPath", "avatarPosition", "backgroundPath", "backgroundPosition", "bio", "createdAt", "displayName", "email", "id", "ipLocation", "passwordHash", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
