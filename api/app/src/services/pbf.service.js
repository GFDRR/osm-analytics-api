const logger = require('logger');
const zlib = require('zlib');
const Protobuf = require('pbf');
const vt = require('vector-tile');

class PBFService {

  static async uncompress(buffer) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(buffer, function (err, decoded) {
        if (err) {
          reject(err);
          return;
        }
        resolve(decoded);
      });
    });
  }

  static decode(buffer, z, x, y) {
    const vector = new vt.VectorTile(new Protobuf(new Uint8Array(buffer)));
    const layer = vector.layers['osm'];
    var features = [];
    if (layer) {
      for (let i = 0; i < layer.length; i++) {
        let feature = layer.feature(i);
        features.push(feature.toGeoJSON(x, y, z));
      }
    }
    return features;
  }

  static async parseTile(data, z, x, y) {

    let buffer = data.tile;
    if (data.headers['content-encoding'] === 'gzip') {
      buffer = await PBFService.uncompress(data.tile);
    }
    return PBFService.decode(buffer, z, x, y);
  }
}

module.exports = PBFService;
