const logger = require('logger');
const request = require('request-promise');
const tileService = require('services/mbtile.service');
const config = require('config');
const intersect = require('@turf/intersect');
const inside = require('@turf/inside');
const invariant = require('@turf/invariant');
const helpers = require('@turf/helpers');
const booleanContains = require('@turf/boolean-contains');
const lineDistance = require('@turf/line-distance');
const tilebelt = require('@mapbox/tilebelt');



class OSMService {

  static summaryLevel12(feature, summary) {
    if (feature.properties._count) {
      summary.count += feature.properties._count;
    }
    if (feature.properties._userExperience) {
      summary.user_experience += feature.properties._userExperience;
    }
    if ((feature.properties._userExperienceMin && feature.properties._userExperienceMin < summary.user_experience_min) || !summary.user_experience_min) {
      summary.user_experience_min = feature.properties._userExperienceMin;
    }
    if ((feature.properties._userExperienceMax && feature.properties._userExperienceMax > summary.user_experience_max) || summary.user_experienc_max) {
      summary.user_experience_max = feature.properties._userExperienceMax;
    }

    //activity_count
    let samples = feature.properties._timestamps.split(';').map(Number);
    let countPerSample = feature.properties._count / samples.length;
    if (!summary.activity_count) {
      summary.activity_count = {};
    }
    samples.forEach(function (sample) {
      let day = new Date(sample * 1000)
      day.setMilliseconds(0)
      day.setSeconds(0)
      day.setMinutes(0)
      day.setHours(0)
      day = +day
      if (!summary.activity_count[day]) {
        summary.activity_count[day] = 0;
      }
      summary.activity_count[day] += countPerSample;
    });

    //experience
    samples = feature.properties._userExperiences.split(';').map(Number);

    countPerSample = feature.properties._count / samples.length;
    if (!summary.experience) {
      summary.experience = {};
    }
    samples.forEach(function (sample) {
      let experienceBin = Math.min(100, Math.floor(Math.log2(sample)));
      if (!summary.experience[experienceBin]) {
        summary.experience[experienceBin] = 0;
      }
      summary.experience[experienceBin] += countPerSample;
    });

    return summary;
  }

  static summaryLevel13(feature, summary) {
    logger.debug(feature);
    if (feature.properties.building && feature.properties.building === 'yes') {
      summary.count++;
    } else if (feature.properties.highway){
      summary.count += lineDistance(feature);
    }
    if (feature.properties._userExperience) {
      summary.user_experience += feature.properties._userExperience;
    }
    if ((feature.properties._userExperience && feature.properties._userExperience < summary.user_experience_min) || !summary.user_experience_min) {
      summary.user_experience_min = feature.properties._userExperience;
    }
    if ((feature.properties._userExperience && feature.properties._userExperience > summary.user_experience_max) || summary.user_experience_max) {
      summary.user_experience_max = feature.properties._userExperience;
    }

    //activity_count
    if (!summary.activity_count) {
      summary.activity_count = {};
    }
    let day = new Date(feature.properties._timestamp * 1000)
    day.setMilliseconds(0)
    day.setSeconds(0)
    day.setMinutes(0)
    day.setHours(0)
    day = +day
    if (!summary.activity_count[day]) {
      summary.activity_count[day] = 0;
    }
    summary.activity_count[day]++;

    //experience
    if (!summary.experience) {
      summary.experience = {};
    }

    let experienceBin = Math.min(100, Math.floor(Math.log2(feature.properties._userExperience)));
    if (!summary.experience[experienceBin]) {
      summary.experience[experienceBin] = 0;
    }
    summary.experience[experienceBin]++;
    summary.num++;

    return summary;

  }

  static async summary(geometry, layer, tiles, level, nocache, minDate, maxDate)  {
    logger.info('Obtaining summary of ', tiles.length, minDate, maxDate);
    let summary = {
      count: 0,
      user_experience_min: null,
      user_experience_max: null,
      user_experience: 0,
      num: 0
    };

    for (let tile of tiles) {
      try {
        logger.debug('Obtaining tile ', tile);
        // z x y
        const features = await tileService.getTile(tile[2], tile[0], tile[1], layer, nocache);
        // check if tile is entirely inside queried geometry
        const tileGeoJSON = tilebelt.tileToGeoJSON(tile);
        let isTileEntirelyInQueriedGeometry = false;
        if (geometry.type === 'MultiPolygon'){
          for (let coordinates of geometry.coordinates){
            isTileEntirelyInQueriedGeometry = booleanContains({type: 'Polygon', coordinates}, tileGeoJSON);
            if (isTileEntirelyInQueriedGeometry){
              break;
            }
          }
        } else {
          isTileEntirelyInQueriedGeometry = booleanContains(geometry, tileGeoJSON);
        }
        if (features) {

          let i = 0;
          for (let feature of features) {
            if (!minDate || !maxDate || (feature.properties._timestamp >= minDate && feature.properties._timestamp <= maxDate)) {
              try {
                let point = null;
                if (feature.geometry.type.toLowerCase() === 'polygon'){
                  point = feature.geometry.coordinates[0][0];
                } else if (feature.geometry.type.toLowerCase() === 'linestring') {
                  point = feature.geometry.coordinates[0];
                } else {
                  point = feature.geometry.coordinates;
                }
                const featureFirstPoint = helpers.point(point);
                const isFeatureInQueriedGeometry = isTileEntirelyInQueriedGeometry || inside(featureFirstPoint, geometry);
                if (isFeatureInQueriedGeometry) {
                  summary.num++;
                  if (tile[2] > 12) {
                    summary = OSMService.summaryLevel13(feature, summary);
                  } else {
                    summary = OSMService.summaryLevel12(feature, summary);
                  }
                }
              } catch (err) {
                //logger.error(err);
              }
            }
          }
        }
      } catch (err) {
        logger.error(err);
      }
    }
    if (summary.activity_count) {
      summary.activity_count = Object.keys(summary.activity_count).map(day => ({
        day: +day,
        count_features: summary.activity_count[day]
      }));
    }
    if (summary.experience) {
      summary.experience = Object.keys(summary.experience).map(experience => ({
        experience: +experience,
        count_users: summary.experience[experience]
      }));
    }
    summary.user_experience = summary.user_experience / summary.num;

    delete summary.num;
    return summary;
  }

  static async getUser(userId) {
    try  {
      const body = await request.get(`${config.get('usersAPI')}${userId}`);
      const name = JSON.parse(body);
      if (name && name.length === 1 && name[0]) {
        return name[0];
      }
      return 'noname';
    } catch (err) {
      return 'noname';
    }
  }

}

module.exports = OSMService;
