dockerblog
==========

A light blog engine made with NodeJS, Redis, Jade &amp; Docker


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
