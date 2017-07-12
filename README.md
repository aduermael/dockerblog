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

### SSH FileSystem

The blog uses a custom file system accessible over ssh. Each FS operation is handled in a dedicated channel (read, write, watch, eval (TODO)).