ALTER TABLE `Properties`
  MODIFY COLUMN `type` enum('String','Number','Boolean','Object','Array','Function','RegExp','Null') NOT NULL;