const logger = require('logger');
const area = require('turf-area');
const Router = require('koa-router');
const OSMService = require('services/osm.service');
const cover = require('@mapbox/tile-cover');
const countries = require('data/countries.geo.json');
const polyline = require('polyline');
const redisService = require('services/redis.service');

const router = new Router({
  prefix: '/stats',
});


class StatsRouter {

  static async calculate(featureType, geometry, zoom, nocache=false) {

    logger.debug('Obtaining tiles');
    const tiles = cover.tiles(geometry, {
      min_zoom: 13,
      max_zoom: 13
    });
    const response = await OSMService.summary(geometry, featureType, tiles, limits.max_zoom, nocache);
    return {
      [featureType]: response
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

    const promises = [];
    if (ctx.params.featureType === 'all') {
      promises.push(StatsRouter.calculate('buildings', geometry, null, ctx.query.nocache));
      promises.push(StatsRouter.calculate('highways', geometry, null, ctx.query.nocache));
      promises.push(StatsRouter.calculate('waterways', geometry, null, ctx.query.nocache));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, geometry, null, ctx.query.nocache));
    }

    const partialResults = await Promise.all(promises);
    let finalResult = {};
    partialResults.map(result => Object.assign(finalResult, result));
    ctx.body = finalResult;

  }

  static async bbox(ctx) {
    logger.info('Obtaining data by bbox');
    ctx.params.minLng = parseFloat(ctx.params.minLng);
    ctx.params.maxLat = parseFloat(ctx.params.maxLat);
    ctx.params.minLat = parseFloat(ctx.params.minLat);
    ctx.params.maxLng = parseFloat(ctx.params.maxLng);
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

    const promises = [];
    if (ctx.params.featureType === 'all') {
      promises.push(StatsRouter.calculate('buildings', geometry, null,  ctx.query.nocache));
      promises.push(StatsRouter.calculate('highways', geometry, null,  ctx.query.nocache));
      promises.push(StatsRouter.calculate('waterways', geometry, null, ctx.query.nocache));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, geometry, 13,  ctx.query.nocache));
    }

    const partialResults = await Promise.all(promises);
    let finalResult = {};
    partialResults.map(result => Object.assign(finalResult, result));
    ctx.body = finalResult;
  }

  static async country(ctx) {
    logger.info('Obtaining data by iso3 ', ctx.params.iso3);
    let geometry = null;
    for(let i = 0, length = countries.features.length; i < length; i++) {
      if(countries.features[i].properties.iso === ctx.params.iso3) {
        geometry = countries.features[i].geometry;
        break;
      }
    }
    if (!geometry) {
      ctx.throw(404, 'Iso not found');
      return;
    }

    const promises = [];
    if (ctx.params.featureType === 'all') {
      promises.push(StatsRouter.calculate('buildings', geometry, 13, ctx.query.nocache));
      promises.push(StatsRouter.calculate('highways', geometry, 13, ctx.query.nocache));
      promises.push(StatsRouter.calculate('waterways', geometry, 13, ctx.query.nocache));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, geometry, 13,  ctx.query.nocache));
    }

    const partialResults = await Promise.all(promises);
    let finalResult = {};
    partialResults.map(result => Object.assign(finalResult, result));
    ctx.body = finalResult;
  }

  static async project(ctx) {
    ctx.throw(500, 'Not implemented');
  }

}

router.use(async (ctx, next) => {
  const data = await redisService.getAsync(ctx.url);
  if (data && !ctx.query.nocache){
    logger.info('Return caching response');
    ctx.body = JSON.parse(data);
    return;
  }

  await next();
  if (ctx.body && !ctx.query.nocache) {
    logger.info(`Caching ${ctx.url}`);
    redisService.setex(ctx.url, JSON.stringify(ctx.body));
  }
});

router.get('/:featureType/polygon/:polyline', StatsRouter.area);
router.get('/:featureType/bbox/:minLng,:minLat,:maxLng,:maxLat', StatsRouter.bbox);
router.get('/:featureType/country/:iso3', StatsRouter.country);
router.get('/:featureType/project/:id', StatsRouter.project);



module.exports = {
  router,
  class: StatsRouter
};
