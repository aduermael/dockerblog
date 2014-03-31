
var db 
var redis = require('redis')
exports.connect = function() {
  if (!db) db = redis.createClient()
  return db
}

exports.disconnect = function() {
  redis.quit()
  db = null
}