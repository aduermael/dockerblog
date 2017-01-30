-- use this file to define commands

-- 'docker ps' will only list containers created in the context of
-- this project (from root folder or children)
function ps()
	docker.cmd("ps --filter label=docker.project.id=" .. docker.project.id)
end
