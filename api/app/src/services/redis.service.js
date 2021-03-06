const logger = require('logger');
const redis = require('redis');
const config = require('config');

class RedisService {

  constructor() {
    this.redisClient = redis.createClient({
      host: config.get('redis.host'),
      port: config.get('redis.port'),
    });
    this.timeCache = config.get('redis.timeCache');
  }

  async getAsync(key){
    return this.redisClient.getAsync(key);
  }

  setex(key, value, expireCache = true){
    if (expireCache){
      return this.redisClient.setex(key, this.timeCache, value);
    } else {
      return this.redisClient.set(key, value);
    }
  }

  async clearCache(){
    await this.redisClient.flushdb();
  }

}

module.exports = new RedisService();
