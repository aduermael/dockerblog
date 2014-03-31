var fs = require('fs');
var PUBLIC_DIR = "";
var FILES_DIR = "files";

exports.init = function(public_dir)
{
  PUBLIC_DIR = public_dir;
}


var checkYearDir = function(year, callback)
{    
  var dir = PUBLIC_DIR + '/' + FILES_DIR + '/' + year;
  
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

var checkMonthDir = function(year,month,callback){
    
  var dir = PUBLIC_DIR + '/' + FILES_DIR + '/' + year + '/' + month;
  
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


function getExtension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
}



exports.saveFile = function(req, res)
{
  var ret = {"success":false};

  var files = req.files.upload_file_input;
  
  //we only send images one by one, no array
  var file = files;

  var date = new Date();
  
  // for directories
  var year = date.getFullYear();
  
  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;


  checkYearDir(year,function(ok)
  {
    if (ok)
    {
      checkMonthDir(year,month,function(ok)
      {
        if (ok)
        {
          // for file name
          var day  = date.getDate();
          day = (day < 10 ? "0" : "") + day;
          
          var hour = date.getHours();
          hour = (hour < 10 ? "0" : "") + hour;

          var min  = date.getMinutes();
          min = (min < 10 ? "0" : "") + min;

          var sec  = date.getSeconds();
          sec = (sec < 10 ? "0" : "") + sec;

          var suffix = day + hour + min + sec;

          //var hash = crypto.randomBytes(5).toString('hex');
          //var filename = "bloglaurel-comics-" + suffix;
          //var relative_path = '/' + FILES_DIR + '/' + year + '/' + month + '/' + filename + getExtension(file.originalFilename);

          var filename = "bloglaurel-" + file.originalFilename;
          var relative_path = '/' + FILES_DIR + '/' + year + '/' + month + '/' + filename;

          var path = PUBLIC_DIR + relative_path;
          

          var source = fs.createReadStream(file.path);
          var dest = fs.createWriteStream(path); 
          source.pipe(dest);
          
          source.on('end', function()
          {
            ret = {"success":true,"image_path":relative_path};
            end(res,ret);
          });
          
          source.on('error', function(err)
          {
            ret = {"success":false,"error":err};
            end(res,ret);
          });
        }
        else
        {
          ret = {"success":false};
          end(res,ret);
        }
      });
    }
    else
    {
      ret = {"success":false};
      end(res,ret);
    }
  });
};



function end(res,data)
{
  var body = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', body.length);
  res.end(body);
}

