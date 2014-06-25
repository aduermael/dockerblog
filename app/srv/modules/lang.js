var tools = require('./tools');

var DEFAULT_LANG = "en"; // default lang
var AVAILABLE_LANGS = ["en","fr"];


exports.app = function()
{
	var express = require('express');
	var app = express();

	app.get('/:lang', setLang );

	return app;
}();



function setLang(req,res,next)
{
	console.log("SET LANG: " + req.params.lang + "(req.lang: " + req.lang + ")");
	
	var lang = req.params.lang;
	
	for (var j = 0; j < AVAILABLE_LANGS.length; j++)
	{
		if (lang == AVAILABLE_LANGS[j])
		{
			req.lang = lang;
			break;
		}
	}
								
	if (!req.lang) req.lang = DEFAULT_LANG;
	
	console.log("req.lang: " + req.lang);
	
	var hour = 3600000;
	res.cookie('lang', req.lang, { maxAge: 365 * 24 * hour, httpOnly: false});

	next();
}



exports.use = function(req,res,next)
{
	console.dir("LANG.USE - " + req.url);
	console.dir("-----ACCEPTED LANGUAGES:" + req.headers["accept-language"]);
	console.dir("-----REQ.LANG: " + req.lang);
	console.dir("-----LANG COOKIE: " + req.cookies.lang);

	
	if (!req.lang)
	{
		if (!req.cookies.lang) // if no cookie
		{
			if (req.headers["accept-language"])
			{
				var acceptedLanguages = req.headers["accept-language"].split(',');
				
				
				for (var i = 0; i < acceptedLanguages.length; i++)
				{
					var langField = acceptedLanguages[i].trim();
					
					var lang = langField.substr(0,2);
					
					for (var j = 0; j < AVAILABLE_LANGS.length; j++)
					{
						if (lang == AVAILABLE_LANGS[j])
						{
							console.log("----------LANG FOUND FROM BROWSER: " + lang);
							req.lang = lang;
							break;
						}
					}
					
					if (req.lang) break;
				}
			}
			
			if (!req.lang) req.lang = DEFAULT_LANG;
			
			var hour = 3600000;
			res.cookie('lang', req.lang, { maxAge: 365 * 24 * hour, httpOnly: false});
		
		} // no lang cookie
		else // there is a lang cookie
		{
			req.lang = req.cookies.lang;
		}
	}
	
	console.dir("-----REQ.LANG: " + req.lang);

  next();
}


exports.get = function(req)
{
  return req.lang;
}

exports.is = function(req,lang)
{
	return lang == req.lang;
}
