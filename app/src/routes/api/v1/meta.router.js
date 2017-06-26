const logger = require('logger');
const Router = require('koa-router');
const request = require('request-promise');
const config = require('config');

const router = new Router({
  prefix: '/meta',
});

class MetaRouter {

  static async countries(ctx) {

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
