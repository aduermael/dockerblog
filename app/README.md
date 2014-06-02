### Building

docker build --no-cache --rm=true -t blog_app .

### Running

docker run -t -i -d -p 80:80 -p 122:22 --volumes-from volumes --name app blog_app