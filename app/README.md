### Building

docker build --no-cache --rm=true -t blog_app .

### Running

docker run -t -i -d --volumes-from volumes --name app blog_app