ALTER TABLE repositories_collaborators
	DROP COLUMN createdat ;

ALTER TABLE repositories_collaborators
	DROP COLUMN updatedat ;

ALTER TABLE repositories_members 
	DROP COLUMN createdat ;

ALTER TABLE repositories_members 
	DROP COLUMN updatedat ;