var express = require('express');
var app = express();
var crypto = require('crypto');

exports.returnJSON = function(res,obj)
{
  var body = JSON.stringify(obj);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', body.length);
  res.end(body);
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

exports.md5 = function(string)
{
	var sum = crypto.createHash('md5');
	sum.update(string);
	return sum.digest('hex');
}



