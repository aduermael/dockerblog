
var SERVER = location.protocol + "//" + location.host;

function Get(path,callback,errorCallback)
{
	$.ajax
	({
		url: SERVER + path,
		type:"GET",
		cache: false,
		processData:false,
		
		success: function(data, textStatus, jqXHR)
		{
			callback(data);
		},
		error: function(jqXHR, textStatus, errorThrown) 
		{
			errorCallback(JSON.parse(jqXHR.responseText));
		}
	});
}

function Post(path,obj,callback,errorCallback)
{
	$.ajax
	({
		url: SERVER + path,
		type:"POST",
		data:JSON.stringify(obj),
		contentType: "application/json",
		cache: false,
		processData:false,
		
		success: function(data, textStatus, jqXHR)
		{
			callback(data);
		},
		error: function(jqXHR, textStatus, errorThrown) 
		{	
			errorCallback(JSON.parse(jqXHR.responseText));
		}
	});
}

var errorCallback = function()
{
	alert("error");
}
