const logger = require('logger');
const Router = require('koa-router');
const request = require('request-promise');
const config = require('config');


const router = new Router({
  prefix: '/gazeteer',
});

class GazeteerRouter {

  static async search(ctx) {
    ctx.assert(ctx.query.q, 'q query param is required');
    logger.info('Obtaining gazeteer');
    const response = await request(`https://nominatim.openstreetmap.org/search?format=json&q=${ctx.query.q}`, {json: true});
    ctx.body = response;
  }

  static async relation(ctx) {
    logger.info('Obtaining relation');
    const response = await request(`https://overpass-api.de/api/interpreter?data=[out:json][timeout:3];relation(${ctx.params.osmId});out geom;`)
    ctx.body = response;
  }

}

router.get('/search', GazeteerRouter.search);
router.get('/relation/:osmId', GazeteerRouter.relation);

module.exports = {
  router,
  class: GazeteerRouter
};
