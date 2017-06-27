const logger = require('logger');
const request = require('request-promise');
const tileService = require('services/tile.service');
const config = require('config');

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
      summary.userExperience += feature.properties._userExperience;
    }
    if ((feature.properties._userExperienceMin && feature.properties._userExperienceMin < summary.userExperienceMin) || !summary.userExperienceMin) {
      summary.userExperienceMin = feature.properties._userExperienceMin;
    }
    if ((feature.properties._userExperienceMax && feature.properties._userExperienceMax > summary.userExperienceMax) || summary.userExperienceMax) {
      summary.userExperienceMax = feature.properties._userExperienceMax;
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
          id: key,
          value: users[key]
        }
      }).sort((a, b) => {
        if (a.value < b.value) {
          return 1;
        } else if (a.value === b.value) {
          return 0;
        }
        return -1;
      });

      let usersIds = Object.keys(users);
      for (let i = 0, length = arrayUsers.length; i < length && i < 20; i++) {
        let name = await OSMService.getUser(arrayUsers[i].id);
        arrayUsers[i].name = name;
      }
    }
    return arrayUsers;
  }

  static async summary(layer, tiles, level, nocache)  {
    logger.debug('Obtaining summary of ', tiles);
    let summary = {
      count: 0,
      userExperienceMin: null,
      userExperienceMax: null,
      userExperience: 0,
      num: 0,
      users: {}
    };

    for (let tile of tiles) {
      try {
        //logger.debug('Obtaining tile ', tile);
        const features = await tileService.getTileServer(tile[2], tile[0], tile[1], layer, nocache);
        if (features) {
          for (let feature of features) {
            summary.num++;
            if (level > 12) {
              summary = OSMService.summaryLevel13(feature, summary);
            } else {
              summary = OSMService.summaryLevel12(feature, summary);
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
    summary.userExperience = summary.userExperience / summary.num;

    summary.users = await OSMService.manageUsers(summary.users);
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
