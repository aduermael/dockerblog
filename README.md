dockerblog
==========

A light blog engine made with NodeJS, Redis, Jade &amp; Docker

To run it, you first need to install Docker:
http://www.docker.com/whatisdocker/

Dockerblog relies on 3 containers:
- Application
- Database
- Files (volume)

### Pull the 3 images:
```
docker pull aduermael/dockerblog-data
docker pull aduermael/dockerblog-db
docker pull aduermael/dockerblog-app
```
### Run the 3 containers (in that same order):
```
docker run -t -i -d --name volumes aduermael/dockerblog-data
docker run -t -i -d --volumes-from volumes --name redis aduermael/dockerblog-db
docker run -t -i -d --link redis:db -p 80:80 --volumes-from volumes --name app aduermael/dockerblog-app
```

Now it runs!

You'll find the admin here: <**your host**>/admin

Credentials: admin/admin

For now we have a specific design (for bloglaurel.com) but we'll update soon with a generic design you can use for your own blog. 

[@Gaetan_dv][1] & [@a_duermael][2]


  [1]: https://twitter.com/gaetan_dv
  [2]: https://twitter.com/aduermael

#### Dev notes

containers :

```
[app]-----------[redis]
    \           /
     \         /
      \       /
      [volumes]-----------[backup]
```

app     : nodejs server
redis   : just a redis server
volumes : a container with 2 volumes, 1 for blog's files [app], 1 for redis dumps [redis]
backup  : a container accessing to [volumes] to handle backup (BTSync for example)
