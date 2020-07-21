ALTER TABLE `RAP2_DELOS_APP`.`Properties`
MODIFY COLUMN `scope` enum('request','response','script') CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL
  DEFAULT 'response' COMMENT 'property owner' AFTER `id`;