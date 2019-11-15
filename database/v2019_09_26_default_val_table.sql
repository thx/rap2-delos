CREATE TABLE `default_val` (
	`id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
	`createdat` datetime NOT NULL COMMENT '创建时间',
	`updatedat` datetime NOT NULL COMMENT '修改时间',
	`name` varchar(256) NOT NULL COMMENT '名字',
	`rule` varchar(512) NOT NULL COMMENT '规则',
	`value` text NOT NULL COMMENT '值',
	`repositoryid` bigint unsigned NOT NULL COMMENT 'FK',
	`deletedat` datetime NOT NULL COMMENT '删除时间',
	PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET=utf8mb4 COMMENT='默认值';