
var db 
var redis = require('redis')
exports.connect = function() {
  if (!db) db = redis.createClient(GLOBAL.redis_server_port, GLOBAL.redis_server_ip)
  return db
}

exports.disconnect = function() {
  redis.quit()
  db = null
}