const logger = require('logger');
const tilelive = require('tilelive');
const path = require('path');
require('mbtiles').registerProtocols(tilelive);


class TileService {

  constructor() {
    const pathMbtile = path.resolve(`${__dirname}/../data/buildings.mbtiles`);
    logger.debug('path', pathMbtile);
    tilelive.load(`mbtiles://${pathMbtile}`, (err, source) => {
      if (err) {
        logger.error(err);
        process.exit(1);
      }
      logger.info('Buildings mbtile loaded correctly!!!');
      this.source = source;
    });
  }

  async getTile(z, x, y) {
    return new Promise((resolve, reject) => {
      this.source.getTile(z, x, y, function (err, tile, headers) {
        if (err) {
          reject(err);
        } else {
          resolve({
            tile,
            headers
          });
        }
      });
    })
  }

}

module.exports = new TileService();
