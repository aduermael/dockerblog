### Building

docker build -t blog_app .

### Running

docker run -t -i -d --link redis:db -p 80:80 -p 122:22 --volumes-from volumes --name app blog_app