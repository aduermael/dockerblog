var _lang = "en"; // default lang
var _justSet = false;

exports.app = function()
{
	var express = require('express');
  var app = express();

  app.get('/:lang', setLang );

  return app;
}();


function setLang(req,res,next)
{
	_lang = req.params.lang
  var hour = 3600000;
  res.cookie('lang', _lang, { maxAge: 365 * 24 * hour, httpOnly: false});

  _justSet = true;

	next();
}


exports.use = function(req,res,next)
{
  if (!_justSet)
  {
    if (!req.cookies.lang) // if no cookie
    {
      if (req.acceptedLanguages)
      {
        for (var i = 0; i< req.acceptedLanguages.length; ++i)
        {
          var lang = req.acceptedLanguages[i].substr(0,2);
        
          if (lang == "en" || lang == "fr")
          {
            _lang = lang;
            break;
          }
        }
      }

      var hour = 3600000;
      res.cookie('lang', _lang, { maxAge: 365 * 24 * hour, httpOnly: false});

    } // no lang cookie
    else // there is a lang cookie
    {
      _lang = req.cookies.lang;
    }
  }
  
  //console.log("use lang:" + _lang);

  next();
}


exports.get = function()
{
  return _lang;
}

exports.is = function(lang)
{
	return lang == _lang;
}
