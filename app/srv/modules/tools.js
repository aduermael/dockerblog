var express = require('express');
var app = express();

app.set('views', GLOBAL.views_dir_path);
app.set('view engine', 'jade');

var db = require('./db').connect();
var crypto = require('crypto');
var keys = require('./keys');


exports.returnJSON = function(res,obj)
{
  var body = JSON.stringify(obj);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', body.length);
  res.end(body);
}


exports.renderJade = function(res,page,options)
{	
	keys.getAllKeysAndValues(function(err,values)
	{
		options.keys = values;
		res.render(page,options);
	});
}


exports.randomHash = function(nbBytes)
{
	return crypto.randomBytes(nbBytes).toString('hex');
}

exports.sha1 = function(string)
{
	var shasum = crypto.createHash('sha1');
	shasum.update(string);
	return shasum.digest('hex');
}


