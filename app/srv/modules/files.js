//
// FILES
//
//
//


var fs = require('fs');

var tools = require('./tools');

var PUBLIC_DIR = GLOBAL.public_dir_path;
var UPLOADS_DIR = GLOBAL.uploads_dir;


function checkUploadsDir (callback)
{
	var dir = PUBLIC_DIR + '/' + UPLOADS_DIR;
	
	fs.exists(dir, function (exists)
	{
		if (!exists)
		{
			fs.mkdir(dir, 0777, function (err)
			{
				if (err)
				{
					callback(false);
				} 
				else 
				{
					callback(true);
				}
			}); 
		}
		else
		{
			callback(true);
		}
	});
};


var checkYearDir = function(year, callback)
{
	var dir = PUBLIC_DIR + '/' + UPLOADS_DIR + '/' + year;
	
	fs.exists(dir, function (exists)
	{
		if (!exists)
		{
			fs.mkdir(dir, 0777, function (err)
			{
				if (err)
				{
					callback(false);
				} 
				else 
				{
					callback(true);
				}
			}); 
		}
		else
		{
			callback(true);
		}
	});
};

var checkMonthDir = function(year,month,callback)
{    
  var dir = PUBLIC_DIR + '/' + UPLOADS_DIR + '/' + year + '/' + month;
  
  fs.exists(dir, function (exists)
  {
    if (!exists)
    {
      fs.mkdir(dir, 0777, function (err)
      {
        if (err)
        {
          callback(false);
        } 
        else 
        {
          callback(true);
        }
      });
    }
    else
    {
      callback(true);
    }
  });
};


function getFilenameExtension(filename)
{
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
}


function getFilenameWithoutExtension(filename)
{
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(0,i);
}



//====================================================
//
// EXPORTED FUNCTIONS
//
//====================================================


// receives the request which is a file upload
exports.saveFile = function(req, res)
{
	// parse the multipart-data-form
	// and populate req.files and req.body objects
		
	// create the req.files hash
	req.files = {};
	
	req.busboy.on('error', function(err)
	{
        console.log('BUSBOY ERROR : ' + err);
	});
	
	// code to parse each file
	req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype)
	{
		//console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding);
		// create the <fieldname> object in req.files
		req.files[fieldname] = {};
		req.files[fieldname].filename = filename;
		req.files[fieldname].encoding = encoding;

		var chunks = [];
		
		file.on('data', function(chunk)
		{
			//console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
			chunks.push(chunk);
		});
		
		file.on('end', function()
		{
			// console.log('File [' + fieldname + '] Finished ---- ');
			req.files[fieldname].data = Buffer.concat(chunks);
		});
	});
	
/*
	// code to parse each field
	req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated)
	{
		console.log('Field [' + fieldname + '] as value: ' + val);
		req.body[fieldname] = val;
	});
*/
	
	req.busboy.on('finish', function()
	{
		// upload is finished
		// handle the request and reply to the client
		
		var file = req.files.upload_file_input;
		
		// get current timestamp		
		var date = new Date();
		// get current year and month for directories
		var year = date.getFullYear();
		var month = date.getMonth() + 1;
		month = (month < 10 ? "0" : "") + month;
		
		checkUploadsDir (function(ok) 
		{
			if (ok)
			{
				checkYearDir (year,function(ok)
				{
					if (ok)
					{
						checkMonthDir (year,month,function(ok)
						{
							if (ok)
							{
								// TODO: ALLOW FILES WITH SAME NAME !!
								// TODO: get the prefix and suffix values from the config
								var prefix = "";
								var suffix = "";
								
								// add a prefix to the filename
								var filename = prefix + getFilenameWithoutExtension(file.filename) + suffix + getFilenameExtension(file.filename);
								console.log('NAME : ' + filename);
								var destination_directory_relative_path = '/' + UPLOADS_DIR + '/' + year + '/' + month;
								var destination_file_relative_path = destination_directory_relative_path + '/' + filename;
								var destination_directory_absolute_path = PUBLIC_DIR + destination_directory_relative_path;
								var destination_file_absolute_path = PUBLIC_DIR + destination_file_relative_path;
								
								fs.exists(destination_directory_absolute_path, function (exists)
								{
									if (exists)
									{
										// destination directory already exists
										// we can write the file in it
										fs.writeFile(destination_file_absolute_path, file.data, function (error_writefile)
										{
											if (!error_writefile)
											{
												// writefile success
												var response = {};
												response.success = true;
												response.image_path = destination_file_relative_path;
												tools.returnJSON(res, response);
											}
											else
											{
												// writefile error
												var response = {};
												response.success = false;
												response.error = 'write file error';
												tools.returnJSON(res, response);
											}
										});
									}
									else
									{
										// destination directory does not exist yet
										fs.mkdir(destination_directory_absolute_path, function (error_mkdir)
										{
											if (!error_mkdir)
											{
												// destination directory now exists
												// we can write the file in it
												fs.writeFile(destination_file_absolute_path, file.data, function (error_writefile)
												{
													if (!error_writefile)
													{
														// writefile success
														var response = {};
														response.success = true;
														response.image_path = destination_file_relative_path;
														tools.returnJSON(res, response);
													}
													else
													{
														// writefile error
														var response = {};
														response.result = false;
														response.error = 'fs error on writefile operation';
														tools.returnJSON(res, response);
													}
												});
											}
											else
											{
												// mkdir error
												var response = {};
												response.result = false;
												response.error = 'fs error on mkdir operation';
												tools.returnJSON(res, response);
											}
										});
									}
								});
							}
							else
							{
								var response = {};
								response.result = false;
								tools.returnJSON(res, response);
							}
						});
					}
					else
					{
						var response = {};
						response.result = false;
						tools.returnJSON(res, response);
					}
				});
			}
			else
			{
				var response = {};
				response.result = false;
				tools.returnJSON(res, response);
			}
		});
	});
};


















