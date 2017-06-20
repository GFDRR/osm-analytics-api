const logger = require('logger');
const Router = require('koa-router');
const OSMService = require('services/osm.service');
const cover = require('@mapbox/tile-cover');
const geojson = require('data/spain.geo.json');
const polyline = require('polyline');

const router = new Router({
  prefix: '/stats',
});

class OSMRouter {

  static async calculate(ctx, geometry) {


    const limits = {
      min_zoom: 3,
      max_zoom: 3
    };

    logger.debug(JSON.stringify(geometry));

    const tiles = cover.tiles(geometry, limits);
    logger.debug('Num tiles', tiles.length);

    const response = await OSMService.summary(ctx.params.featureType, tiles, 12);
    ctx.body = {
      [ctx.params.featureType]: response
    };

  }

  static async area(ctx) {
    logger.info('Obtaining data by area');
    const coordinates = polyline.decode(ctx.params.polyline);
    coordinates.push(coordinates[0]);

    const geometry = {
      type: 'Polygon',
      coordinates: [coordinates]
    };
    await OSMRouter.calculate(ctx, geometry);
  }

  static async bbox(ctx) {
    logger.info('Obtaining data by bbox');
    const coordinates = [
      [
        [ctx.params.minLng, ctx.params.maxLat],
        [ctx.params.maxLng, ctx.params.maxLat],
        [ctx.params.maxLng, ctx.params.minLat],
        [ctx.params.minLng, ctx.params.minLat],
        [ctx.params.minLng, ctx.params.maxLat]
      ]
    ];


    const geometry = {
      type: 'Polygon',
      coordinates,
    };

    logger.debug(JSON.stringify(geometry));
    await OSMRouter.calculate(ctx, geometry);
  }

  static async country(ctx) {

  }

  static async project(ctx) {

  }

}

router.get('/area/:featureType/:polyline', OSMRouter.area);
router.get('/bbox/:featureType/:minLng/:minLat/:maxLng/:maxLat', OSMRouter.bbox);
router.get('/country/:featureType/:iso3', OSMRouter.country);
router.get('/project/:featureType/:id', OSMRouter.project);


module.exports = router;
