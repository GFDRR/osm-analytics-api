const logger = require('logger');
const tileService = require('services/tile.service');
const PBFService = require('services/pbf.service');

class OSMService {

  static summaryLevel13(feature, summary) {

    if (feature.properties.building && feature.properties.building === 'yes') {
      summary.count++;
    }
    if (feature.properties._userExperience) {
      summary.userExperience += feature.properties._userExperience;
    }
    if ((feature.properties._userExperience && feature.properties._userExperience < summary.userExperienceMin) || !summary.userExperienceMin) {
      summary.userExperienceMin = feature.properties._userExperience;
    }
    if ((feature.properties._userExperience && feature.properties._userExperience > summary.userExperienceMax) || summary.userExperienceMax) {
      summary.userExperienceMax = feature.properties._userExperience;
    }
    return summary;
  }

  static summaryLevel12(feature, summary) {
    if (feature.properties._count) {
      summary.count += feature.properties._count;
    }
    if (feature.properties._userExperience) {
      summary.userExperience += feature.properties._userExperience;
    }
    if ((feature.properties._userExperienceMin && feature.properties._userExperienceMin < summary.userExperienceMin) || !summary.userExperienceMin) {
      summary.userExperienceMin = feature.properties._userExperienceMin;
    }
    if ((feature.properties._userExperienceMax && feature.properties._userExperienceMax > summary.userExperienceMax) || summary.userExperienceMax) {
      summary.userExperienceMax = feature.properties._userExperienceMax;
    }
    return summary;
  }

  static async summary(tiles, level)  {
    logger.debug('Obtaining summary of ', tiles);
    let summary = {
      count: 0,
      userExperienceMin: null,
      userExperienceMax: null,
      userExperience: 0
    };

    for (let tile of tiles) {
      try {
        logger.debug('Obtaining tile ', tile);

        const data = await tileService.getTile(tile[2], tile[0], tile[1]);

        const features = await PBFService.parseTile(data, tile[2], tile[0], tile[1]);

        for (let feature of features) {
          if (level > 12) {
            summary = OSMService.summaryLevel13(feature, summary);
          } else {
            summary = OSMService.summaryLevel12(feature, summary);
          }

        }
      } catch (err) {
        // logger.error(err);
      }
    }
    return summary;
  }

}

module.exports = OSMService;
