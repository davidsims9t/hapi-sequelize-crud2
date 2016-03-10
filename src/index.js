import Fs from 'fs';
import Hoek from 'hoek';
import URL from 'url';
import QS from 'qs';
import Handlers from './handlers';
import crud, { associations } from './crud';
import snakeCase from 'snake-case';

const internals = {};

internals.onRequest = (request, reply) => {
  const uri = request.raw.req.url;
  const parsed = URL.parse(uri, false);
  parsed.query = QS.parse(parsed.query);
  request.setUrl(parsed);

  return reply.continue();
};

internals.optionDefaults = {
  prefix: '',
  scopePrefix: 's',
  snakeCase: false,
  private: [],
  handlers: 'handlers/**/*.js'
};

exports.register = (server, options = {}, next) => {
  options = Hoek.applyToDefaults(internals.optionDefaults, options);

  const db = server.plugins['hapi-sequelize'].db;
  const models = db.sequelize.models;
  const modelNames = Object.keys(models).filter(m => options.private.indexOf(m) === -1);
  const convertCase = options.snakeCase ? snakeCase : function (str) { return str; };

  Handlers.loadHandlers(server, options.handlers);

  server.ext({
    type: 'onRequest',
    method: internals.onRequest
  });

  for (const modelName of modelNames) {
    if (! Handlers.handlersEnabled(modelName)) {
      continue;
    }

    const model = models[modelName];
    const { plural, singular } = model.options.name;
    model._plural = convertCase(plural);
    model._singular = convertCase(singular);

    // Join tables
    if (model.options.name.singular !== model.name) {
      continue;
    }

    options.handlerOptions = Handlers.handlerOptions(modelName);

    crud(server, model, options);

    if (! Handlers.associationsEnabled(modelName)) {
      continue;
    }

    for (const key of Object.keys(model.associations)) {
      if (! Handlers.associationEnabled(modelName, key)) {
        continue;
      }

      const association = model.associations[key]
      const associationName = association.options.name;
      const { associationType, source, target } = association;

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
        console.warn(e);
      }
    }
  }

  next();
}

exports.register.attributes = {
  pkg: require('../package.json')
}
