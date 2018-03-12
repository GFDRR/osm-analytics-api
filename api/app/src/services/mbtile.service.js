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

const loadTiles = [{
    path: `${__dirname}/../data/buildings.mbtiles`,
    name: 'buildings'
  }
  // , {
  //   path: `${__dirname}/../data/highways.mbtiles`,
  //   name: 'highways'
  // }, {
  //   path: `${__dirname}/../data/waterways.mbtiles`,
  //   name: 'waterways'
  // },
  // {
  //   path: `${__dirname}/../data/historic/buildings.planet-2007.mbtiles`,
  //   name: 'buildings-2007'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2008.mbtiles`,
  //   name: 'buildings-2008'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2009.mbtiles`,
  //   name: 'buildings-2009'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2010.mbtiles`,
  //   name: 'buildings-2010'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2011.mbtiles`,
  //   name: 'buildings-2011'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2012.mbtiles`,
  //   name: 'buildings-2012'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2013.mbtiles`,
  //   name: 'buildings-2013'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2014.mbtiles`,
  //   name: 'buildings-2014'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2015.mbtiles`,
  //   name: 'buildings-2015'
  // }, {
  //   path: `${__dirname}/../data/historic/buildings.planet-2016.mbtiles`,
  //   name: 'buildings-2016'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2007.lowres.mbtiles`,
  //   name: 'highways-2007'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2008.lowres.mbtiles`,
  //   name: 'highways-2008'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2009.lowres.mbtiles`,
  //   name: 'highways-2009'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2010.lowres.mbtiles`,
  //   name: 'highways-2010'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2011.lowres.mbtiles`,
  //   name: 'highways-2011'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2012.lowres.mbtiles`,
  //   name: 'highways-2012'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2013.lowres.mbtiles`,
  //   name: 'highways-2013'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2014.lowres.mbtiles`,
  //   name: 'highways-2014'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2015.lowres.mbtiles`,
  //   name: 'highways-2015'
  // }, {
  //   path: `${__dirname}/../data/historic/highways.planet-2016.lowres.mbtiles`,
  //   name: 'highways-2016'
  // }, {
  //   path: `${__dirname}/../data/historic/waterways.planet-2015.lowres.mbtiles`,
  //   name: 'waterways-2015'
  // }, {
  //   path: `${__dirname}/../data/historic/waterways.planet-2016.lowres.mbtiles`,
  //   name: 'waterways-2016'
  // }

];

class TileService {

  constructor() {
    this.source = {};
    loadTiles.map(tile => {
      this.loadTile(tile.path, tile.name);
    });
  }

  loadTile(pathFile, name)  {
    let pathMbtile = path.resolve(pathFile);
    tilelive.load(`mbtiles://${pathMbtile}`, (err, source) => {
      if (err) {
        logger.error('Error opening' + name, err);
        process.exit(1);
      }
      logger.info(name, ' mbtile loaded correctly!!!');
      this.source[name] = source;
    });
  }

  async getTileNotParse(z, x, y, layer = 'buildings') {
    return new Promise((resolve, reject) => {
      try {
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
      } catch(err) {
        reject(err);
      }
    });
  }

  async getTile(z, x, y, layer = 'buildings', nocache = false) {
    let data = null;
    // let data = await redisService.getAsync(`${layer}/${z}/${x}/${y}`);
    // if (data && !nocache) {
    //   if (data === 'empty') {
    //     return null;
    //   }
    //   return JSON.parse(data);
    // }
    // logger.debug(`Cache fail ${layer}/${z}/${x}/${y}`);
    try {
      const res = await new Promise((resolve, reject) => {
        try {
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
        } catch(err) {
          reject(err);
        }
      });

      data = await PBFService.parseTile({
        tile: res.tile,
        headers: res.headers
      }, z, x, y);
      // logger.debug(`Saving cache ${layer}/${z}/${x}/${y}`);
      // if (!nocache) {
      //   redisService.setex(`${layer}/${z}/${x}/${y}`, JSON.stringify(data));
      // }
      return data;

    } catch (err) {
      return data;
    }

  }

}

module.exports = new TileService();
