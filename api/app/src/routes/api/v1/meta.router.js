const logger = require('logger');
const Router = require('koa-router');
const request = require('request-promise');
const config = require('config');
const countries = require('data/countries.geo.json');
const polyline = require('polyline');
const turf_buffer = require('@turf/buffer');
const turf_simplify = require('@turf/simplify');
const turf_area = require('@turf/area');
const turf_lineStringToPolygon = require('@turf/linestring-to-polygon');

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

  static async country_polyline(ctx) {
    logger.info('Obtaining polyline by iso3 ', ctx.params.iso3);
    const matchingCountry = countries.features.find(country => country.properties.iso === ctx.params.iso3.toUpperCase());

    if (!matchingCountry) {
      ctx.throw(404, 'Iso not found');
      return;
    }

    // get main country landmass by getting 'largest' polygon, ie the one with the max number of points
    let maxPoints = 0;
    let largestPolyCoords;

    matchingCountry.geometry.coordinates.forEach(poly => {
      const numPoints = poly[0].length;
      if (numPoints > maxPoints) {
        maxPoints = numPoints;
        largestPolyCoords = poly[0];
      }
    });


    const largestPolyGeoJSON = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": largestPolyCoords
      }
    };

    // the more complex the geometry, the higher tolerance will be
    const tolerance = maxPoints / 3000;

    // buffer size should depend on polygon area
    const area = turf_area(turf_lineStringToPolygon(largestPolyGeoJSON));
    let bufferKm = Math.pow(area, 1/3) / 500;

    // simplify geometry and draw a buffer around it to try to compensate for the 'lost' geometries
    const finalGeoJSON = turf_buffer(turf_simplify(largestPolyGeoJSON, tolerance), bufferKm, 'kilometers');
    const finalGeometry = finalGeoJSON.geometry.coordinates[0];

    ctx.body = polyline.encode(finalGeometry);
    // var decoded = polyline.decode(polyline.encode(finalGeometry));
    // ctx.body = JSON.stringify({
    //   "type": "Feature",
    //   "properties": {},
    //   "geometry": {
    //     "type": "LineString",
    //     "coordinates": decoded
    //   }
    // })
  }

  static async hot(ctx) {
    logger.info('Obtaining hot projects');
    const body = await request(config.get('hotProjectsUrl'));
    logger.debug(body);
    ctx.body = body;
  }

  static async featureTypes(ctx) {
    logger.info('Obtaining feature types');
    const body = ['buildings', 'highways', 'waterways', 'all'];
    ctx.body = body;
  }

}

router.get('/countries', MetaRouter.countries);
router.get('/country_polyline/:iso3', MetaRouter.country_polyline);
router.get('/feature-types', MetaRouter.featureTypes);
router.get('/hot', MetaRouter.hot);


module.exports = {
  router,
  class: MetaRouter
};
