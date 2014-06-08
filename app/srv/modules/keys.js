//
// 
// KEYS
//
//

// import GLOBAL modules

// import LOCAL modules
var lang = require('./lang');
var db = require('./db').connect();
var tools = require('./tools');




module.exports = function()
{
	var express = require('express');
	var app = express();
	
	app.post('/key', post_key );
	app.get('/', root );	
	
	return app;	
}();



function root(req, res)
{
	// display the /admin/keys page
	db.hgetall('keys_' + lang.get(), function(error, value)
	{
		if (!error)
		{
			var options = {};
			options.siteName = 'Blog | Admin - Keys (kvs)';
			options.lang = lang.get();
			options.prefs = value ? value : [];
			console.log(JSON.stringify(options));			
			tools.renderJade(res, 'admin_keys', options);	
		}
	});
}



function post_key(req, res)
{
	console.log('POST KEY '+JSON.stringify(req.body));
	console.log('LANG : ' + JSON.stringify(lang.get()));
	
	var key   = req.body.key;
	var value = req.body.value;
	var langue  = req.body.lang;
	
	if (key)
	{
		if (value)
		{
			if (langue)
			{
				setValueForKey(value, key, function(error) 
				{
					if (!error)
					{
						var response = {};
						response.success = true;
						tools.returnJSON(res, response)
					}
					else
					{
						var response = {};
						response.success = false;
						tools.returnJSON(res, response)
					}
				});
			}
			else
			{
				var response = {};
				response.success = false;
				tools.returnJSON(res, response)
			}
		}
		else
		{
			var response = {};
			response.success = false;
			tools.returnJSON(res, response)
		}
	}
	else
	{
		var response = {};
		response.success = false;
		tools.returnJSON(res, response)
	}
}



////////////////////////////////
//
// HELPERS
//
////////////////////////////////



// add a value for key in the Keys KVS
// callback(error)
function setValueForKey(value, key, callback)
{
	var hashname = 'keys_' + lang.get();
	db.hset(hashname, key, value, function(error, value) 
	{
		callback(error);
	});
}



// callback(error, value)
function getValueForKey(key, callback)
{
	var hashname = 'keys_' + lang.get();
	db.hget(hashname, key, callback);
}



// callback(error)
function deleteValueForKey(key, callback)
{
	var hashname = 'keys_' + lang.get();
	db.hdel(hashname, key, function(error, nbRemoved)
	{
		callback(error);
	});
}



// callback(error, value)
function getAllValues(callback)
{
	var hashname = 'keys_' + lang.get();
	db.hgetall(hashname, callback);
}













































/*
function get(callback)
{
  db.get('config_' + lang.get(),function(error,json)
  {
    if (error)
    {
      callback();
    }
    else
    {
      var obj = JSON.parse(json);
      callback(obj);
    }
  });
}


function set(value,key,callback)
{
  db.get('config_' + lang.get(),function(error,json)
  {
    if (error)
    {
      callback();
    }
    else
    {
      var obj = JSON.parse(json);
      obj[key] = value;

      var multi = db.multi();
      multi.set('config_' + lang.get(),JSON.stringify(obj));

      multi.exec(function(err,replies)
      {
        if (err)
        {
          callback(JSON.parse(json));
        }
        else
        {
          callback(obj);
        }
      });
    }
  });
}

function del(key,callback)
{
	db.hdel('config_' + lang.get(),key,function(error,nbRemoved)
	{
		
	});
}
*/
























/*
var db = require('./db').connect();
var tools = require('./tools');
var lang = require('./lang');





module.exports = function()
{
	var express = require('express');
	var app = express();
	
	app.get('/', page );	

	//app.post('/value', postValue);
	//app.get('/value/:key', getValue);
	//app.get('/allvalues', allValues);
	//app.get('/deleteValue/:key', deleteValue);	
	
	return app;
	
}();



/////////////////////////////////////////////////////////////////
///
///    UTILITY FUNCTIONS
///
/////////////////////////////////////////////////////////////////

//
// set value for key
//
function setValueForKey(value, key, callback)
{
	var hashname = 'kvs_' + lang.get();
	db.hset(hashname, key, value, function(error, value) 
	{
		if (!error)
		{
			callback(value);
		}
		else
		{
			callback();
		}
	});
}



//
// get all stored values for the current lang
//
function getAllValues(callback)
{
	var hashname = 'kvs_' + lang.get();
	db.hgetall(hashname, function(error,value)
	{
		if (!error)
		{
			callback(value);
		}
		else
		{
			callback();
		}
	});
}



function getValueForKey(key, callback)
{
  var hashname = 'kvs_' + lang.get();
  db.hget(hashname, key, function(error,value)
  {
    if (!error)
    {
    	callback(value);
    }
    else
    {
      callback();
    }
  });
}



function deleteValueForKey(key,callback)
{
	var hashname = 'kvs_' + lang.get();
	db.hdel(hashname, key, function(error,nbRemoved)
	{
		if (!error)
		{
			callback(nbRemoved);
		}
		else
		{
			callback();
		}
	});
}
*/