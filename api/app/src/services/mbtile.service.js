const logger = require('logger');
const config = require('config');
const tilelive = require('tilelive');
const path = require('path');
const redis = require('redis');
const bluebird = require('bluebird');
const PBFService = require('services/pbf.service');
const redisService = require('services/redis.service');
require('mbtiles').registerProtocols(tilelive);

bluebird.promisifyAll(redis.RedisClient.prototype);

class TileService {

  constructor() {
    this.source = {};
    let pathMbtile = path.resolve(`${__dirname}/../data/buildings.mbtiles`);
    tilelive.load(`mbtiles://${pathMbtile}`, (err, source) => {
      if (err) {
        logger.error(err);
        process.exit(1);
      }
      logger.info('Buildings mbtile loaded correctly!!!');
      this.source.buildings = source;
    });

    pathMbtile = path.resolve(`${__dirname}/../data/highways.mbtiles`);
    tilelive.load(`mbtiles://${pathMbtile}`, (err, source) => {
      if (err) {
        logger.error(err);
        process.exit(1);
      }
      logger.info('Highways mbtile loaded correctly!!!');
      this.source.highways = source;
    });
    pathMbtile = path.resolve(`${__dirname}/../data/waterways.mbtiles`);
    tilelive.load(`mbtiles://${pathMbtile}`, (err, source) => {
      if (err) {
        logger.error(err);
        process.exit(1);
      }
      logger.info('waterways mbtile loaded correctly!!!');
      this.source.waterways = source;
    });
  }

  async getTileNotParse(z, x, y, layer = 'buildings') {
    return new Promise((resolve, reject) => {
        if (['buildings', 'highways'].indexOf(layer) > -1) {
          logger.debug(parseInt(z), parseInt(x), parseInt(y));
          this.source[layer].getTile(parseInt(z), parseInt(x), parseInt(y), function (err, tile, headers) {
            if (err) {
              reject(err);
            } else {
              resolve({
                tile,
                headers
              });
            }
          });
        } else {
          reject();
        }
      });
  }

  async getTile(z, x, y, layer = 'buildings', nocache = false) {
    let data = await redisService.getAsync(`${layer}/${z}/${x}/${y}`);
    if (data && !nocache) {
      if (data === 'empty') {
        return null;
      }
      return JSON.parse(data);
    }
    logger.debug(`Cache fail ${layer}/${z}/${x}/${y}`);
    try {
      const res = await new Promise((resolve, reject) => {
        if (['buildings', 'highways'].indexOf(layer) > -1) {
          this.source[layer].getTile(z, x, y, function (err, tile, headers) {
            if (err) {
              reject(err);
            } else {
              resolve({
                tile,
                headers
              });
            }
          });
        } else {
          reject();
        }
      });

      data = await PBFService.parseTile({
        tile: res.tile,
        headers: res.headers
      }, z, x, y);
      logger.debug(`Saving cache ${layer}/${z}/${x}/${y}`);
      if (!nocache) {
        redisService.setex(`${layer}/${z}/${x}/${y}`, JSON.stringify(data));
      }
      return data;

    }
    catch(err) {
       return data;
    }

  }

}

module.exports = new TileService();
