const logger = require('logger');
const Router = require('koa-router');
const tileService = require('services/mbtile.service');

const router = new Router();

class PbfRouter {

  static async pbf(ctx) {
    logger.info(`Obtaining tile of layer: ${ctx.params.layer} - z: ${ctx.params.z}; x: ${ctx.params.x}; y: ${ctx.params.y}`)
    try {
      const data = await tileService.getTileNotParse(ctx.params.z, ctx.params.x, ctx.params.y, ctx.params.layer);
      ctx.body = data.tile;
      ctx.set(data.headers);
    } catch(err) {
      logger.error('Tile does not exist', err);
      ctx.status = 404;
      ctx.body = 'Tile does not exist';
      return;
    }
  }

  static async historic(ctx) {
    logger.info(`Obtaining tile of year ${ctx.params.year} and layer: ${ctx.params.layer} - z: ${ctx.params.z}; x: ${ctx.params.x}; y: ${ctx.params.y}`)
    try {
      const data = await tileService.getTileNotParse(ctx.params.z, ctx.params.x, ctx.params.y, `${ctx.params.layer}-${ctx.params.year}`);
      ctx.body = data.tile;
      ctx.set(data.headers);
    } catch(err) {
      logger.error('Tile does not exist', err);
      ctx.status = 404;
      ctx.body = 'Tile does not exist';
      return;
    }
  }
}

router.get('/:layer/:z/:x/:y.pbf', PbfRouter.pbf);
router.get('/:year/:layer/:z/:x/:y.pbf', PbfRouter.historic);

module.exports = {
  router,
  class: PbfRouter
};
