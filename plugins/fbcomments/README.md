### Building

docker build -t fbcomments_app .

### Running

docker run -t -i -d --volumes-from fbcomments_volume --name fbcomments_app fbcomments_app