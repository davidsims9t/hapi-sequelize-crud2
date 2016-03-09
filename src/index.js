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

    for (let key of Object.keys(model.associations)) {
      let association = model.associations[key];
      let { associationType, source, target } = association;

      let sourceName = source.options.name;
      let targetName = target.options.name;

      target._plural = convertCase(targetName.plural);
      target._singular = convertCase(targetName.singular);

      let targetAssociations = target.associations[sourceName.plural] || target.associations[sourceName.singular];
      let sourceType = association.associationType,
          targetType = (targetAssociations || {}).associationType;

      try {
        if (sourceType === 'BelongsTo' && (targetType === 'BelongsTo' || !targetType)) {
          associations.oneToOne(server, source, target, options);
          associations.oneToOne(server, target, source, options);
        }

        if (sourceType === 'BelongsTo' && targetType === 'HasMany') {
          associations.oneToOne(server, source, target, options);
          associations.oneToOne(server, target, source, options);
          associations.oneToMany(server, target, source, options);
        }

        if (sourceType === 'BelongsToMany' && targetType === 'BelongsToMany') {
          associations.oneToOne(server, source, target, options);
          associations.oneToOne(server, target, source, options);

          associations.oneToMany(server, source, target, options);
          associations.oneToMany(server, target, source, options);
        }

        associations.associate(server, source, target, options);
        associations.associate(server, target, source, options);
      } catch(e) {
        // There might be conflicts in case of models associated with themselves and some other
        // rare cases.
      }
    }
  }

  next();
}

register.attributes = {
  pkg: require('../package.json')
}

export { register };
