const Koa = require('koa');
const logger = require('logger');
const koaLogger = require('koa-logger');
const config = require('config');
const loader = require('loader');
const convert = require('koa-convert');
const ErrorSerializer = require('serializers/error.serializer');
const cors = require('kcors');

const koaBody = require('koa-body')({
  multipart: true,
  jsonLimit: '50mb',
  formLimit: '50mb',
  textLimit: '50mb'
});


const app = new Koa();
app.use(cors());

app.use(convert(koaBody));

app.use(async(ctx, next) => {
  try {
    await next();
  } catch (err) {

    logger.error(err);
    let error = err;
    ctx.status = error.status || 500;
    ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
    if (process.env.NODE_ENV === 'prod' && this.status === 500) {
      ctx.body = 'Unexpected error';
    }
    ctx.response.type = 'application/vnd.api+json';
  }

});

app.use(koaLogger());

loader.loadRoutes(app);


const instance = app.listen(process.env.PORT, () => {
  logger.info('Server started in ', process.env.PORT);
});
instance.setTimeout(60 * 60 * 1000);

module.exports = instance;
