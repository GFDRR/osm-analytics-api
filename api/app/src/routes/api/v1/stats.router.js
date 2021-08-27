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


const tileLimit = 240 // maximum number of tiles to load per request

class StatsRouter {

  static async calculate(featureType, geometry, zoom, nocache=false, minDate=null, maxDate=null, precision=13) {

    logger.debug('Obtaining tiles');
    var max = 13;
    var tiles
    do {
      tiles = cover.tiles(geometry, {
        min_zoom: Math.min(max, precision),
        max_zoom: max--
      });
    } while (tiles.length > tileLimit);
    const response = await OSMService.summary(geometry, featureType, tiles, max+1, nocache, minDate, maxDate, max+1 === 13);
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
    let minDate, maxDate = null;
    try {
      if (ctx.query.period) {
        const periods = ctx.query.period.split(',');
        if (!periods || periods.length !== 2) {
          throw new Error('Period not valid');
        }
        minDate = new Date(periods[0]).getTime() / 1000;
        maxDate = new Date(periods[1]).getTime() / 1000;
      }
    } catch(e) {
      ctx.throw(400, 'query param \'period\' not valid');
      return;
    }

    const precision = ctx.query.precision && !isNaN(ctx.query.precision) ? parseInt(ctx.query.precision) : 13;

    const promises = [];
    if (ctx.params.featureType === 'all') {
      promises.push(StatsRouter.calculate('buildings', geometry, null, ctx.query.nocache, minDate, maxDate, precision));
      promises.push(StatsRouter.calculate('highways', geometry, null, ctx.query.nocache, minDate, maxDate, precision));
      promises.push(StatsRouter.calculate('waterways', geometry, null, ctx.query.nocache, minDate, maxDate, precision));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, geometry, null, ctx.query.nocache, minDate, maxDate, precision));
    }

    const partialResults = await Promise.all(promises);
    let finalResult = {};
    partialResults.map(result => Object.assign(finalResult, result));
    finalResult.min_date = minDate;
    finalResult.max_date = maxDate;
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

    let minDate, maxDate = null;
    try {
      if (ctx.query.period) {
        const periods = ctx.query.period.split(',');
        if (!periods || periods.length !== 2) {
          throw new Error('Period not valid');
        }
        minDate = new Date(periods[0]).getTime() / 1000;
        maxDate = new Date(periods[1]).getTime() / 1000;
      }
    } catch(e) {
      ctx.throw(400, 'query param \'period\' not valid');
      return;
    }

    const precision = ctx.query.precision && !isNaN(ctx.query.precision) ? parseInt(ctx.query.precision) : 13;

    const promises = [];
    if (ctx.params.featureType === 'all') {
      promises.push(StatsRouter.calculate('buildings', geometry, null,  ctx.query.nocache, minDate, maxDate, precision));
      promises.push(StatsRouter.calculate('highways', geometry, null,  ctx.query.nocache, minDate, maxDate, precision));
      promises.push(StatsRouter.calculate('waterways', geometry, null, ctx.query.nocache, minDate, maxDate, precision));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, geometry, 13,  ctx.query.nocache, minDate, maxDate, precision));
    }

    const partialResults = await Promise.all(promises);
    let finalResult = {};
    partialResults.map(result => Object.assign(finalResult, result));
    finalResult.min_date = minDate;
    finalResult.max_date = maxDate;
    ctx.body = finalResult;
  }

  static async country(ctx) {
    logger.info('Obtaining data by iso3 ', ctx.params.iso3);
    let feature = null;
    for(let i = 0, length = countries.features.length; i < length; i++) {
      if(countries.features[i].properties.iso === ctx.params.iso3) {
        feature = countries.features[i];
        break;
      }
    }
    if (!feature) {
      ctx.throw(404, 'Iso not found');
      return;
    }
    let minDate, maxDate = null;
    try {
      if (ctx.query.period) {
        const periods = ctx.query.period.split(',');
        if (!periods || periods.length !== 2) {
          throw new Error('Period not valid');
        }
        minDate = new Date(periods[0]).getTime() / 1000;
        maxDate = new Date(periods[1]).getTime() / 1000;
      }
    } catch(e) {
      ctx.throw(400, 'query param \'period\' not valid');
      return;
    }

    const precision = ctx.query.precision && !isNaN(ctx.query.precision) ? parseInt(ctx.query.precision) : 13;

    const promises = [];
    if (ctx.params.featureType === 'all') {
      promises.push(StatsRouter.calculate('buildings', feature.geometry, 13, ctx.query.nocache, minDate, maxDate, precision));
      promises.push(StatsRouter.calculate('highways', feature.geometry, 13, ctx.query.nocache, minDate, maxDate, precision));
      promises.push(StatsRouter.calculate('waterways', feature.geometry, 13, ctx.query.nocache, minDate, maxDate, precision));
    } else {
      promises.push(StatsRouter.calculate(ctx.params.featureType, feature.geometry, 13,  ctx.query.nocache, minDate, maxDate, precision));
    }

    const partialResults = await Promise.all(promises);
    let finalResult = {};
    partialResults.map(result => Object.assign(finalResult, result));
    finalResult.country_iso = feature.properties.iso;
    finalResult.country_name = feature.properties.name_iso;
    finalResult.min_date = minDate;
    finalResult.max_date = maxDate;
    ctx.body = finalResult;
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
    redisService.setex(ctx.url, JSON.stringify(ctx.body), 'EX', 24 * 60 * 60);
  }
});

router.get('/:featureType/polygon/:polyline', StatsRouter.area);
router.get('/:featureType/bbox/:minLng,:minLat,:maxLng,:maxLat', StatsRouter.bbox);
router.get('/:featureType/country/:iso3', StatsRouter.country);



module.exports = {
  router,
  class: StatsRouter
};
