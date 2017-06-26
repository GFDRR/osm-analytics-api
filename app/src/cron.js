const logger = require('logger');
const CronJob = require('cron').CronJob;
const redisService = require('services/redis.service');
const StatsRouter = require('routes/api/v1/stats.router').class;

const countries = require('data/countries.geo.json');

async function tick() {
    logger.info('Populating cache');
    await redisService.clearCache();
    for(let i = 0, length = countries.features.length; i < length; i++) {
      logger.info(`Calculating country ${countries.features[i].properties.iso}`);
      const ctx = {
        params: {
          iso3: countries.features[i].properties.iso,
          featureType: 'all'
        }
      };
      await StatsRouter.country(ctx);

      redisService.setex(`/stats/all/country/${ctx.params.iso3}`, JSON.stringify(ctx.body));

    }

}

new CronJob('*/30 * * * * *', tick, null, true, 'America/Los_Angeles');  // eslint-disable-line no-new
