CREATE TABLE `history_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entityType` int NOT NULL,
  `entityId` int NOT NULL,
  `changeLog` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `relatedJSONData` text COLLATE utf8mb4_unicode_ci,
  `userId` bigint(11) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  CONSTRAINT `hisotry_log_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`) ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
