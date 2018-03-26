Dockerblog
==========

### Build images

```shell
docker-compose build
```

### Run containers

```shell
docker-compose up -d
```

### Default admin UI

Path: `/admin`

Username: `admin`

Password: `admin`

### Routes

- `/`: default template (`default.tmpl`)
- `/js`: global js functions
- `/files`: uploaded files (static)
- `/uploads`: redirect to `/files` (deprecated)
- `/theme`: files from selected theme (`theme/SELECTED/files`)
- `/admin`: admin routes
	- `/admin/theme`: files from admin theme (not customizable)
- `/post/SLUG/ID`: post
	- 	`/post/SLUG` redirects to `/post/SLUG/ID`
	-  `/post/ID` redirects to `/post/SLUG/ID`
	-  `/SLUG` & `/ID` redirect to `/post/SLUG/ID` when possible (try before showing 404)
-   `/user` user routes

Custom routes and redirects can be set in the config:

```json
{
	"routes": [
		{"redirect": "/foo/bar", "to": "/post/test/1"},
		{"route": "/faq", "post": 1234},
		{"route": "/boutique", "template": "boutique"},
		{"route": "/special-event", "template": "event", "post": 1234},
	]
}
```