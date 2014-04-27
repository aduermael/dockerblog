var express = require('express');
var app = express();

var db = require('./db').connect();


exports.returnJSON = function(res,obj)
{
  var body = JSON.stringify(obj);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', body.length);
  res.end(body);
}


exports.renderJade = function(res,page,options)
{
	res.render(page,options);
}



