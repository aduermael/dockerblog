dockerblog
==========

A light blog engine made with NodeJS, Redis, Jade &amp; Docker.

I'll add details soon, so far these are only notes for myself.

### Build Docker images

```shell
docker build -t app app
docker build -t db redis
docker build -t volume volume
docker build -t fbcomments plugins/fbcomments
```

### Run the containers (in that order):

```shell
docker run -ti -d --name volume volume
docker run -ti -d --volumes-from volume --name db db
docker run -ti -d --name fbcomments fbcomments
docker run -ti -d --link db:db --link fbcomments:fbcomments \
-p 80:80 --volumes-from volume --name app app
```

Admin: `/admin`

Credentials: admin/admin

For now there's a specific design (for bloglaurel.com), but it's going to be updated soon with a generic design and options to customize it.