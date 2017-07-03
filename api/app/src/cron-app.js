const logger = require('logger');
const CronJob = require('cron').CronJob;
const redisService = require('services/redis.service');
const StatsRouter = require('routes/api/v1/stats.router').class;

const countries = require('data/countries.geo.json');
let running = false;
async function tick() {
  if (!running){
    let time = Date.now();
    running= true;
    logger.info('Populating cache');
    await redisService.clearCache();
    for(let i = 0, length = countries.features.length; i < length; i++) {
      try {
        logger.info(`Calculating country ${countries.features[i].properties.iso}`);
        const ctx = {
          params: {
            iso3: countries.features[i].properties.iso,
            featureType: 'all'
          },
          query: {
            nocache: 'true'
          }
        };
        await StatsRouter.country(ctx);
        logger.info(`Saving in cache /stats/all/country/${ctx.params.iso3}`);
        redisService.setex(`/stats/all/country/${ctx.params.iso3}`, JSON.stringify(ctx.body));
      } catch(err) {
        logger.error(err);
      }
    }
    running = false;
    logger.info(`Cron finished!! ${Date.now() - time}`);
  }
}

logger.info('Cron started');
new CronJob('00 15 12 * * *', tick, null, true, 'Europe/Madrid');  // eslint-disable-line no-new
