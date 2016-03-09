import crud, { associations } from './crud';
import url from 'url';
import qs from 'qs';
import snakeCase from 'snake-case';

const register = (server, options = {}, next) => {
  options.prefix = options.prefix || '';
  options.scopePrefix = options.scopePrefix || 's';
  options.snakeCase = options.snakeCase || false;
  options.private = options.private || [];

  let db = server.plugins['hapi-sequelize'].db;
  let models = db.sequelize.models;

  const onRequest = function (request, reply) {
    const uri = request.raw.req.url;
    const parsed = url.parse(uri, false);
    parsed.query = qs.parse(parsed.query);
    request.setUrl(parsed);

    return reply.continue();
  };

  const convertCase = options.snakeCase ? snakeCase : function (str) { return str; };

  server.ext({
    type: 'onRequest',
    method: onRequest
  });

  for (let modelName of Object.keys(models).filter(m => options.private.indexOf(m) === -1)) {
    let model = models[modelName];
    let { plural, singular } = model.options.name;
    model._plural = convertCase(plural);
    model._singular = convertCase(singular);

    // Join tables
    if (model.options.name.singular !== model.name) continue;

    crud(server, model, options);

    if (model.name !== 'message') continue;

    for (let key of Object.keys(model.associations)) {
      let association = model.associations[key];
      let { associationType, source, target } = association;

      let associationName = association.options.name;

      association._plural = convertCase(associationName.plural);
      association._singular = convertCase(associationName.singular);

      try {
        switch(associationType) {
          case 'BelongsTo':
          case 'HasOne':
            associations.oneToOne(server, source, association, options);
            break;
          case 'HasMany':
          case 'BelongsToMany':
            associations.oneToMany(server, source, association, options);
            break;
        }
      } catch(e) {
        // There might be conflicts in case of models associated with themselves and some other
        // rare cases.
        console.warm(e)
      }
    }
  }

  next();
}

register.attributes = {
  pkg: require('../package.json')
}

export { register };
