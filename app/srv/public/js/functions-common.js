var SERVER = "http://192.241.237.140";

function Get(path,callback,errorCallback)
{
	alert(SERVER + path);
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
			errorCallback();
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
			errorCallback();
		}
	});
}

var errorCallback = function()
{
  alert("error");
}
