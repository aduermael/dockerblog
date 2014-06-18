//
//
//
//
//


// import LOCAL modules
var tools = require('./tools');


var _lang = "en"; // default lang
var _justSet = false;



module.exports = function()
{
	var express = require('express');
	var app = express();

	app.get('/:lang', setLang );

	return app;
}();



//////////////////////////////
//
// exported methods
//
//////////////////////////////

// MIDDLEWARE
// detecting the accepted language
// and putting it in the client session
module.exports.detect = function(req, res, next)
{
    if (req.session.lang == undefined)
    {
        // the last one is also the default one
        var languages = ['fr', 'en'];
        var selected = undefined;

        for (var i = 0 ; i < languages.length ; i++)
        {
            selected = languages[i];
            if (req.acceptsLanguage(languages[i]))
            {
                break;
            }
        }

        console.log('AUTO SELECTED LANGUAGE : ' + selected);

        req.session.lang = selected;
    }
    else
    {
        // client already have a lang in its session
    }
    next();
}




function setLang(req,res,next)
{
	console.log("MANUALLY SELECTED LANGUAGE: " + req.params.lang);
    req.session.lang = req.params.lang;

	// _lang = req.params.lang
	// var hour = 3600000;
	// res.cookie('lang', _lang, { maxAge: 365 * 24 * hour, httpOnly: false});

	// _justSet = true;

	next();
}








// module.exports.use = function(req,res,next)
// {
//   if (!_justSet)
//   {
//     if (!req.cookies.lang) // if no cookie
//     {
//       if (req.acceptedLanguages)
//       {
//         for (var i = 0; i< req.acceptedLanguages.length; ++i)
//         {
//           var lang = req.acceptedLanguages[i].substr(0,2);
        
//           if (lang == "en" || lang == "fr")
//           {
//             _lang = lang;
//             break;
//           }
//         }
//       }

//       var hour = 3600000;
//       res.cookie('lang', _lang, { maxAge: 365 * 24 * hour, httpOnly: false});

//     } // no lang cookie
//     else // there is a lang cookie
//     {
//       _lang = req.cookies.lang;
//     }
//   }
  
//   //console.log("use lang:" + _lang);

//   next();
// }


// module.exports.get = function()
// {
//   return _lang;
// }

// module.exports.is = function(lang)
// {
// 	return lang == _lang;
// }
