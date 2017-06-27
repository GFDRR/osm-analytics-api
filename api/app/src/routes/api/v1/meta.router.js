const logger = require('logger');
const Router = require('koa-router');
const request = require('request-promise');
const config = require('config');
const countries = require('data/countries.geo.json');

const router = new Router({
  prefix: '/meta',
});

class MetaRouter {

  static async countries(ctx) {
    logger.info('Obtaining countries');
    const body = [];
    for (let i = 0, length = countries.features.length; i < length; i++) {
      body.push({
        name: countries.features[i].properties.name_iso,
        iso: countries.features[i].properties.iso
      });
    }

    ctx.body = body;
  }

  static async hot(ctx) {
    logger.info('Obtaining hot projects');
    const body = await request(config.get('hotProjectsUrl'));
    logger.debug(body);
    ctx.body = body;
  }

}

router.get('/countries', MetaRouter.countries);
router.get('/hot', MetaRouter.hot);


module.exports = {
  router,
  class: MetaRouter
};
