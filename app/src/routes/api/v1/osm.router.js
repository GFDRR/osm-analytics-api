const logger = require('logger');
const Router = require('koa-router');
const OSMService = require('services/osm.service');
const cover = require('@mapbox/tile-cover');
const geojson = require('data/haiti.geo.json');
const polyline = require('polyline');

const router = new Router({
  prefix: '/osm',
});

class OSMRouter {

  static async test(ctx) {
    const coordinates = polyline.decode(ctx.params.polyline);

    const limits = {
      min_zoom: 13,
      max_zoom: 13
    };


    const tiles = cover.tiles({type: 'Polygon', coordinates: [coordinates]}, limits);

    ctx.body = await OSMService.summary(tiles, 13);

  }

}

router.get('/:polyline', OSMRouter.test);


module.exports = router;
