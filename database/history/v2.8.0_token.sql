# 给 Repositories 表添加 token 列
# 2019-11-11
ALTER TABLE Repositories 
ADD COLUMN token VARCHAR(32) NULL;