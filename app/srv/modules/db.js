
var db 
var redis = require('redis')
exports.connect = function() {
  if (!db) db = redis.createClient(6379, "blog-db")
  return db
}

exports.disconnect = function() {
  redis.quit()
  db = null
}