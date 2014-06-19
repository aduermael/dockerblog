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
	if (!req.lang)
	{
		if (!req.cookies.lang) // if no cookie
		{
			if (req.acceptedLanguages)
			{
				for (var i = 0; i < req.acceptedLanguages.length; i++)
				{
					var lang = req.acceptedLanguages[i].substr(0,2);
					
					for (var j = 0; j < AVAILABLE_LANGS.length; j++)
					{
						if (lang == AVAILABLE_LANGS[j])
						{
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
