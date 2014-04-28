var db = require('./db').connect();
var tools = require('./tools');
var lang = require('./lang');





module.exports = function()
{
	var express = require('express');
	var app = express();
	
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

/**
 * set value for key
 */
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



/**
 * get all stored values for the current lang
 */
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