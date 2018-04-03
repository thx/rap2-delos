-- MySQL dump 10.13  Distrib 5.7.12, for osx10.9 (x86_64)
--
-- Host: localhost    Database: RAP2_DELOS_APP_LOCAL
-- ------------------------------------------------------
-- Server version	5.7.12

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `interfaces`
--

DROP TABLE IF EXISTS `interfaces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `interfaces` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `name` varchar(256) NOT NULL COMMENT '-',
  `url` varchar(256) NOT NULL COMMENT '-',
  `method` varchar(32) NOT NULL COMMENT '-',
  `description` text COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  `moduleId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `creatorId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `lockerId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `repositoryId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  KEY `idx_moduleId` (`moduleId`),
  KEY `idx_creatorId` (`creatorId`),
  KEY `idx_lockerId` (`lockerId`),
  KEY `idx_repositoryId` (`repositoryId`),
  CONSTRAINT `interfaces_ibfk_1` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `interfaces_ibfk_2` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `interfaces_ibfk_3` FOREIGN KEY (`lockerId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `interfaces_ibfk_4` FOREIGN KEY (`repositoryId`) REFERENCES `repositories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT='接口';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `loggers`
--

DROP TABLE IF EXISTS `loggers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loggers` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `type` varchar(32) NOT NULL COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  `userId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `repositoryId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `organizationId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `moduleId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `interfaceId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_repositoryId` (`repositoryId`),
  KEY `idx_organizationId` (`organizationId`),
  KEY `idx_moduleId` (`moduleId`),
  KEY `idx_interfaceId` (`interfaceId`),
  CONSTRAINT `loggers_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `loggers_ibfk_2` FOREIGN KEY (`repositoryId`) REFERENCES `repositories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `loggers_ibfk_3` FOREIGN KEY (`organizationId`) REFERENCES `organizations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `loggers_ibfk_4` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `loggers_ibfk_5` FOREIGN KEY (`interfaceId`) REFERENCES `interfaces` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT='操作日志';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `modules` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `name` varchar(256) NOT NULL COMMENT '-',
  `description` text COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  `repositoryId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `creatorId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  KEY `idx_repositoryId` (`repositoryId`),
  KEY `idx_creatorId` (`creatorId`),
  CONSTRAINT `modules_ibfk_1` FOREIGN KEY (`repositoryId`) REFERENCES `repositories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `modules_ibfk_2` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT='模块';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `fromId` bigint(11) DEFAULT NULL COMMENT '-',
  `toId` bigint(11) NOT NULL COMMENT '-',
  `type` varchar(128) NOT NULL COMMENT '-',
  `param1` varchar(128) DEFAULT NULL COMMENT '-',
  `param2` varchar(128) DEFAULT NULL COMMENT '-',
  `param3` varchar(128) DEFAULT NULL COMMENT '-',
  `readed` tinyint(1) NOT NULL COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`)
) COMMENT='消息';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizations`
--

DROP TABLE IF EXISTS `organizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organizations` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `name` varchar(256) NOT NULL COMMENT '-',
  `description` text COMMENT '-',
  `logo` varchar(256) DEFAULT NULL COMMENT '-',
  `visibility` tinyint(1) NOT NULL DEFAULT '1' COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  `ownerId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `creatorId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  KEY `idx_creatorId` (`creatorId`),
  CONSTRAINT `organizations_ibfk_1` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT='团队';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repositories_collaborators`
--

DROP TABLE IF EXISTS `repositories_collaborators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repositories_collaborators` (
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `repositoryId` bigint(11) unsigned NOT NULL COMMENT '-',
  `collaboratorId` bigint(11) unsigned NOT NULL COMMENT '-',
  PRIMARY KEY (`repositoryId`,`collaboratorId`),
  KEY `idx_collaboratorId` (`collaboratorId`),
  CONSTRAINT `repositories_collaborators_ibfk_1` FOREIGN KEY (`repositoryId`) REFERENCES `repositories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `repositories_collaborators_ibfk_2` FOREIGN KEY (`collaboratorId`) REFERENCES `repositories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT='协同仓库';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organizations_members`
--

DROP TABLE IF EXISTS `organizations_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `organizations_members` (
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `userId` bigint(11) unsigned NOT NULL COMMENT '-',
  `organizationId` bigint(11) unsigned NOT NULL COMMENT '-',
  PRIMARY KEY (`userId`,`organizationId`),
  KEY `idx_organizationId` (`organizationId`),
  CONSTRAINT `organizations_members_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `organizations_members_ibfk_2` FOREIGN KEY (`organizationId`) REFERENCES `organizations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT='用户';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `properties`
--

DROP TABLE IF EXISTS `properties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `properties` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `scope` varchar(32) NOT NULL DEFAULT 'response' COMMENT '-',
  `name` varchar(256) NOT NULL COMMENT '-',
  `type` varchar(32) NOT NULL COMMENT '-',
  `rule` varchar(128) DEFAULT NULL COMMENT '-',
  `value` text COMMENT '-',
  `description` text COMMENT '-',
  `parentId` bigint(11) NOT NULL DEFAULT '-1' COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  `interfaceId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `creatorId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `moduleId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `repositoryId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  KEY `idx_interfaceId` (`interfaceId`),
  KEY `idx_creatorId` (`creatorId`),
  KEY `idx_moduleId` (`moduleId`),
  KEY `idx_repositoryId` (`repositoryId`),
  CONSTRAINT `properties_ibfk_1` FOREIGN KEY (`interfaceId`) REFERENCES `interfaces` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `properties_ibfk_2` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `properties_ibfk_3` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `properties_ibfk_4` FOREIGN KEY (`repositoryId`) REFERENCES `repositories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT='属性';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repositories`
--

DROP TABLE IF EXISTS `repositories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repositories` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `name` varchar(256) NOT NULL COMMENT '-',
  `description` text COMMENT '-',
  `logo` varchar(256) DEFAULT NULL COMMENT '-',
  `visibility` tinyint(1) NOT NULL DEFAULT '1' COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  `ownerId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `organizationId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `creatorId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `lockerId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  KEY `idx_ownerId` (`ownerId`),
  KEY `idx_organizationId` (`organizationId`),
  KEY `idx_creatorId` (`creatorId`),
  CONSTRAINT `repositories_ibfk_1` FOREIGN KEY (`ownerId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `repositories_ibfk_2` FOREIGN KEY (`organizationId`) REFERENCES `organizations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `repositories_ibfk_3` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT='仓库';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repositories_members`
--

DROP TABLE IF EXISTS `repositories_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repositories_members` (
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `userId` bigint(11) unsigned NOT NULL COMMENT '-',
  `repositoryId` bigint(11) unsigned NOT NULL COMMENT '-',
  PRIMARY KEY (`userId`,`repositoryId`),
  KEY `idx_repositoryId` (`repositoryId`),
  CONSTRAINT `repositories_members_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `repositories_members_ibfk_2` FOREIGN KEY (`repositoryId`) REFERENCES `repositories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT='用户';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '唯一标识',
  `fullname` varchar(32) NOT NULL COMMENT '-',
  `password` varchar(32) DEFAULT NULL COMMENT '-',
  `email` varchar(128) NOT NULL COMMENT '-',
  `createdAt` datetime NOT NULL COMMENT '-',
  `updatedAt` datetime NOT NULL COMMENT '-',
  `deletedAt` datetime DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_users_email_unique` (`email`)
) COMMENT='用户';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

--
-- Table structure for table `foreign_room`
--

DROP TABLE IF EXISTS `foreign_room`;
CREATE TABLE `foreign_room` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `repositoryId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  `roomProjectId` bigint(11) unsigned DEFAULT NULL COMMENT '-',
  PRIMARY KEY (`id`),
  KEY `idx_repositoryId` (`repositoryId`),
  KEY `idx_roomProjectId` (`roomProjectId`),
  CONSTRAINT `interfaces_1` FOREIGN KEY (`repositoryId`) REFERENCES `repositories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-05-19 23:47:54
