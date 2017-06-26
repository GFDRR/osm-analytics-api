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


const areaByZoomTile = [
  1603319479926784,//0
  400829869981696,//1
  100207467495424,//2
  25051866873856,//3
  6262966718464,//4
  1565741679616,//5
  391435419904,//6
  97858854976,//7
  24464713744,//8
  6116178436,//9
  1529044609,//10
  382261152.25,//11
  95565288.0625,//12
  23891322.015625//13
];

class StatsRouter {

  static async calculate(featureType, geometry, zoom) {

    const limits = {
      min_zoom: 1,
      max_zoom: 10
    };
    logger.debug('Obtaining tiles');

    if (!zoom){
      const areaGeom = area(geometry);
      const areaByTile = areaGeom / 16;
      for (let i = 0, length = areaByZoomTile.length; i < length; i++) {
        if (areaByZoomTile[i] < areaByTile){
          limits.max_zoom = i;
          break;
        }
      }
    } else {
      limits.max_zoom = zoom;
    }

    const tiles = cover.tiles(geometry, limits);
    const response = await OSMService.summary(featureType, tiles.slice(0, 10), limits.max_zoom);
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
    ctx.body = await StatsRouter.calculate(ctx.params.featureType, geometry);
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

    const promises = [];
    if (ctx.params.featureType === 'all') {
      promises.push(StatsRouter.calculate('buildings', geometry));
      promises.push(StatsRouter.calculate('highways', geometry));
      promises.push(StatsRouter.calculate('waterways', geometry));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, geometry));
    }

    const partialResults = await Promise.all(promises);
    let finalResult = {};
    partialResults.map(result => Object.assign(finalResult, result));
    ctx.body = finalResult;
  }

  static async country(ctx) {
    logger.debug('Obtaining data by iso3 ', ctx.params.iso3);
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
      promises.push(StatsRouter.calculate('buildings', geometry, 13));
      promises.push(StatsRouter.calculate('highways', geometry, 13));
      promises.push(StatsRouter.calculate('waterways', geometry, 13));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, geometry));
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
  if (data){
    ctx.body = JSON.parse(data);
    return;
  }

  await next();
  if (ctx.body) {
    logger.info(`Caching ${ctx.url}`);
    redisService.setex(ctx.url, JSON.stringify(ctx.body));
  }
});

router.get('/:featureType/area/:polyline', StatsRouter.area);
router.get('/:featureType/bbox/:minLng/:minLat/:maxLng/:maxLat', StatsRouter.bbox);
router.get('/:featureType/country/:iso3', StatsRouter.country);
router.get('/:featureType/project/:id', StatsRouter.project);



module.exports = {
  router,
  class: StatsRouter
};
