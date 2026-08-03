-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusHistoryJson" TEXT NOT NULL DEFAULT '[]',
    "subtotalCents" INTEGER NOT NULL,
    "deliveryFeeCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Pay on delivery',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "deliveryAddress", "deliveryFeeCents", "id", "paymentMethod", "restaurantId", "status", "subtotalCents", "totalCents", "updatedAt", "userId") SELECT "createdAt", "deliveryAddress", "deliveryFeeCents", "id", "paymentMethod", "restaurantId", "status", "subtotalCents", "totalCents", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE TABLE "new_Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "cuisineTags" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Sydney',
    "suburb" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "deliveryFeeCents" INTEGER NOT NULL,
    "minOrderCents" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rating" REAL NOT NULL DEFAULT 4.5,
    "placeId" TEXT,
    "userRatingCount" INTEGER NOT NULL DEFAULT 0,
    "openingHoursJson" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Restaurant" ("city", "createdAt", "cuisineTags", "deliveryFeeCents", "description", "id", "image", "isActive", "isOpen", "lat", "lng", "minOrderCents", "name", "phone", "rating", "slug", "suburb", "updatedAt") SELECT "city", "createdAt", "cuisineTags", "deliveryFeeCents", "description", "id", "image", "isActive", "isOpen", "lat", "lng", "minOrderCents", "name", "phone", "rating", "slug", "suburb", "updatedAt" FROM "Restaurant";
DROP TABLE "Restaurant";
ALTER TABLE "new_Restaurant" RENAME TO "Restaurant";
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE UNIQUE INDEX "Restaurant_placeId_key" ON "Restaurant"("placeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
