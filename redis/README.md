### Building

```
$ docker build -t blog_redis .
```

### Running

```
$ docker run -t -i -d --volumes-from volumes --name redis blog_redis
```