const logger = require('logger');
const request = require('request-promise');
const tileService = require('services/tile.service');
const config = require('config');
const intersect = require('@turf/intersect');
const inside = require('@turf/inside');
const invariant = require('@turf/invariant');
const helpers = require('@turf/helpers');
const booleanContains = require('@turf/boolean-contains');
const tilebelt = require('@mapbox/tilebelt');



class OSMService {

  static summaryLevel13(feature, summary) {

    if (feature.properties.building && feature.properties.building === 'yes') {
      summary.count++;
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

    if (feature.properties._uid) {
      if (!summary.users[feature.properties._uid]) {
        summary.users[feature.properties._uid] = 0;
      }
      summary.users[feature.properties._uid]++;
    }

    //recency
    if (!summary.recency) {
      summary.recency = {};
    }
    let day = new Date(feature.properties._timestamp * 1000)
    day.setMilliseconds(0)
    day.setSeconds(0)
    day.setMinutes(0)
    day.setHours(0)
    day = +day
    if (!summary.recency[day]) {
      summary.recency[day] = 0;
    }
    summary.recency[day]++;

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

    //recency
    let samples = feature.properties._timestamps.split(';').map(Number);
    let countPerSample = feature.properties._count / samples.length;
    if (!summary.recency) {
      summary.recency = {};
    }
    samples.forEach(function (sample) {
      let day = new Date(sample * 1000)
      day.setMilliseconds(0)
      day.setSeconds(0)
      day.setMinutes(0)
      day.setHours(0)
      day = +day
      if (!summary.recency[day]) {
        summary.recency[day] = 0;
      }
      summary.recency[day] += countPerSample;
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

  static async manageUsers(users) {
    let arrayUsers = [];
    if (users) {
      arrayUsers = Object.keys(users).map(key => {
        return {
          osm_id: key,
          feature_value: users[key]
        }
      }).sort((a, b) => {
        if (a.feature_value < b.feature_value) {
          return 1;
        } else if (a.feature_value === b.feature_value) {
          return 0;
        }
        return -1;
      });

      let usersIds = Object.keys(users);
      for (let i = 0, length = arrayUsers.length; i < length && i < 20; i++) {
        let osm_name = await OSMService.getUser(arrayUsers[i].osm_id);
        arrayUsers[i].osm_name = osm_name;
      }
    }
    return arrayUsers;
  }

  static async summary(geometry, layer, tiles, level, nocache)  {
    logger.debug('Obtaining summary of ', tiles);
    let summary = {
      count: 0,
      user_experience_min: null,
      user_experience_max: null,
      user_experience: 0,
      num: 0,
      users: {}
    };
    // console.log(tiles.length)
    for (let tile of tiles) {
      try {
        logger.debug('Obtaining tile ', tile);
        console.log(tile)
        // z x y
        const features = await tileService.getTileServer(tile[2], tile[0], tile[1], layer, nocache);
        // check if tile is entirely inside queried geometry
        const tileGeoJSON = tilebelt.tileToGeoJSON(tile);
        const isTileEntirelyInQueriedGeometry = booleanContains(geometry, tileGeoJSON);
        console.log(booleanContains(geometry, tileGeoJSON))
        if (features) {

          let i = 0;
          for (let feature of features) {
            try {
              const featureFirstPoint = helpers.point(feature.geometry.coordinates[0][0]);
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
              logger.error(err);
            }
          }
        }
      } catch (err) {
        logger.error(err);
      }
    }
    // logger.debug('summary', summary);
    if (summary.recency) {
      summary.recency = Object.keys(summary.recency).map(day => ({
        day: +day,
        count_day: summary.recency[day]
      }));
    }
    if (summary.experience) {
      summary.experience = Object.keys(summary.experience).map(experience => ({
        experience: +experience,
        count_experience: summary.experience[experience]
      }));
    }
    summary.user_experience = summary.user_experience / summary.num;

    summary.users = await OSMService.manageUsers(summary.users);
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
