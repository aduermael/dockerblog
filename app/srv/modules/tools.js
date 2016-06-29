var MIN_TIME_BETWEEN_PAGE_RENDERING_AND_POST = 5; // in seconds

var http = require('http');
var https = require('https');

var express = require('express');
var fs = require('fs');
var app = express();

app.set('views', GLOBAL.views_dir_path);
app.set('view engine', 'jade');

var db = require('./db').connect();
var crypto = require('crypto');
var keys = require('./keys');
var lang_module = require('./lang');

var transporter;



exports.returnJSON = function(res,obj)
{
  var body = JSON.stringify(obj);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', body.length);
  res.end(body);
}

// callback(err, value)
exports.getValueForKey = function(req, key, callback) {

	keys.getAllKeysAndValues(req,function(err,values)
	{	
		if (err) {
			callback(err)
			return
		}

		var keys = values;
		if (! keys ) {
			callback("can't find value for key: " + key)
			return
		}

		console.log(keys)
		
		var value = keys[key]
		if (! value ) {
			callback("can't find value for key: " + key)
			return
		}

		callback(null, value)
	});
}

exports.renderJade = function(req,res,page,options)
{		
	// Store the last time a page was rendered in session
	// Used to detect robots when receiving post messages from non-admin users
	req.session.lastPageRenderTime = new Date().getTime();
	options.timestamp304 = req.session.lastPageRenderTime;
	
	if (req.params.lang)
		options.lang = req.params.lang;
	else
		options.lang = lang_module.get(req);
	
	keys.getAllKeysAndValues(req,function(err,values)
	{
		if (!err)
		{
			var keys = values;
			if (! keys ) keys = {};
			
			options.keys = keys;
			res.render(page,options);
		}
		else
		{
			options.keys = {};
			res.render(page,options);
		}
	});
}

// answers with "success" without doing anything
// if robots fill trap fields such as "url"
exports.killStupidRobots = function(req,res,next)
{
	if (req.body.url && req.body.url != "") {
		console.log("just killed one stupid robot.");
		var obj = {"success":true};		
		var body = JSON.stringify(obj);
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Content-Length', body.length);
		res.end(body);
	} else {
		next();
	}
}

exports.killFastRobots = function(req,res,next)
{
	if (req.session.lastPageRenderTime)
	{
		var lastPageRenderTime = new Date(req.session.lastPageRenderTime);
		var now = new Date();
		
		var diff = (now - lastPageRenderTime) / 1000;
		
		if (diff >= MIN_TIME_BETWEEN_PAGE_RENDERING_AND_POST)
		{	
			next();			
		}
		else
		{
			var obj = {"success":false};
		
			var body = JSON.stringify(obj);
			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Content-Length', body.length);
			res.end(body);
		}
	}
	else
	{
		var obj = {"success":false};
		
		var body = JSON.stringify(obj);
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Content-Length', body.length);
		res.end(body);
  
	}
}


exports.deleteMailTransporter = function()
{
	delete transporter;
}

// html is optional
exports.sendMail = function(sendgridApiKey,to,title,text,html)
{
	console.log("send email to: " + to)
	console.log("title to send: " + title)
	console.log("text to send: " + text)
	console.log("html to send: " + html)

	// help: https://github.com/sendgrid/sendgrid-nodejs/blob/master/examples/helpers/mail/example.js

	var helper = require('sendgrid').mail

	mail = new helper.Mail()

	// TODO: get that from config
	from = new helper.Email("no-reply@bloglaurel.com", "Bloglaurel")
  	mail.setFrom(from)

  	personalization = new helper.Personalization()

  	emailTo = new helper.Email(to) //, "Example User")
  	personalization.addTo(emailTo)
  	mail.addPersonalization(personalization)

	mail.setSubject(title)

	textContentontent = new helper.Content("text/plain", text)
	mail.addContent(textContentontent)
	
	if (html) {
		htmlContent = new helper.Content("text/html", html)
		mail.addContent(htmlContent)
	}

	var sg = require('sendgrid').SendGrid(sendgridApiKey)
  	var requestBody = mail.toJSON()
  	var request = sg.emptyRequest()
  	request.method = 'POST'
  	request.path = '/v3/mail/send'
	request.body = requestBody
	sg.API(request, function (response) {
		console.log(response.statusCode)
		console.log(response.body)
		console.log(response.headers)
	})
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


/**
 * send a HTTP request asynchronously
 *
 * PARAMETERS :
 * 		options  [required] : (object)   request options
 *		callback [required] : (function) callback of the request
 *		body     [optional] : (object)   body of a POST request
 * 
 * EXAMPLE :

var options = {
		host: IP,
		port: PORT,
		path: '/user/create',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	};
	var request_body = {};
	utils.send_http_request(options, callback, request_body);

 * RETURN VALUE :
 *		there is no return value
 */
exports.send_http_request = function(options, callback, body)
{
    var protocol = options.port == 443 ? https : http;
   
    var req = protocol.request(options, function(res)
    {
        var output = '';

        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() 
        {
        	var result_object = JSON.parse(output);
			callback(true, res.statusCode, result_object);    
        });
    });
	
    req.on('error', function(err)
    {
    	//console.log('inner HTTP request failed : '+err.message);
    	callback(false, undefined, undefined);
    });
    
    // if a body value is defined, add it to the request object
    if (body)
    {
        // defines the request body
    	req.write(JSON.stringify(body));
    }
	
	// send the request
    req.end();
};





