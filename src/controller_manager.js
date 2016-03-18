import Glob from 'glob';
import Hoek from 'hoek';
import Path from 'path';
import camelCase from 'camel-case';

const internals = {
  controllers: {},
  resolvedControllers: {},
};

internals.defaultControllerOptions = {
  index: true,
  get: true,
  count: true,
  scope: true,
  create: true,
  destroy: true,
  update: true
};

internals.defaultAssociationOptions = {
  index: true,
  create: true,
  update: true,
  updateMany: true,
  destroy: true,
  destroyMany: true,
  count: true
};

internals.getFiles = (patterns) => {
  if (! Array.isArray(patterns)) {
    patterns = [patterns];
  }

  return patterns.reduce((arr, pattern) => {
    return arr.concat(Glob.sync(pattern, { nodir: true }));
  }, []);
};

exports.controllerOptions = function (modelName) {

  if (internals.resolvedControllers[modelName]) {
    return internals.resolvedControllers[modelName];
  }

  const server = internals.server;
  const model = server.plugins['hapi-sequelize'].db.sequelize.models[modelName];

  const defaultCtrl = internals.defaultControllerFactory
                      ? internals.defaultControllerFactory(server, model)
                      : {};

  const modelCtrl = internals.controllers.hasOwnProperty(modelName)
                      ? internals.controllers[modelName]
                      : {};

  const ctrl = internals.resolvedControllers[modelName]
             = internals.applyControllerDefaults(Hoek.applyToDefaults(defaultCtrl, modelCtrl));

  return ctrl;
}

exports.pluckAssociationOptions = function(options, association) {
  if (!options.associations) {
    return internals.defaultAssociationOptions;
  }

  const defaultOpts = options.associations['*'] || {};

  const associationOpts = options.associations && options.associations[association]
                              ? options.associations[association]
                              : {};

  if (Object.keys(defaultOpts).length > 0) {
    const methods = Object.keys(internals.defaultAssociationOptions);

    for (const method of methods) {
      const methodOpts = associationOpts.hasOwnProperty(method) ? associationOpts[method] : {};

      if (defaultOpts.hasOwnProperty(method)) {

        const defaultMethodOpts = defaultOpts[method];

        if (methodOpts !== false && defaultMethodOpts !== false) {
          associationOpts[method] = Hoek.applyToDefaults(defaultMethodOpts, methodOpts);
        } else if (! associationOpts.hasOwnProperty(method) && defaultMethodOpts === false) {
          associationOpts[method] = false;
        }
      }
    }
  }

  return Hoek.applyToDefaults(internals.defaultAssociationOptions, associationOpts);
};

exports.loadControllers = function(server, patterns) {
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  internals.server = server;
  internals.controllers = {};
  internals.resolvedControllers = {};
  delete internals.defaultControllerFactory;

  internals.getFiles(patterns).forEach(f => {
    const pathInfo = Path.parse(f);
    const fileName = Path.resolve('.', pathInfo.dir, pathInfo.base);
    const name = pathInfo.name.replace(/\..+$/, ''); // enables adding suffix for testing, e.g. modelName.timestamp.js
    const modelName = name.indexOf('_') < 1 // -1 or 0 match
                      ? name
                      : camelCase(name);

    const ctrlFactory = require(fileName);

    if (modelName === '_default') {
      internals.defaultControllerFactory = ctrlFactory;
    } else {
      internals.controllers[modelName] = ctrlFactory(server, models[modelName]);
    }
  });

  return this;
};

exports.controllersEnabled = function (modelName) {
  const opts = this.controllerOptions(modelName);

  return ! opts.hasOwnProperty('*') || !! opts['*'];
};

exports.associationsEnabled = function (modelName) {
  const opts = this.controllerOptions(modelName);

  return ! opts.hasOwnProperty('associations') || !! opts.associations;
};

exports.associationEnabled = function (modelName, associationKey) {
  const opts = this.controllerOptions(modelName);

  return ! opts.hasOwnProperty('associations')
          || ! opts.associations.hasOwnProperty(associationKey)
          || !! opts.associations[associationKey];
};


internals.applyControllerDefaults = (ctrl) => {

  if (ctrl['*'] === false) {
    return ctrl;
  }

  const defaults = ctrl['*'] || {};

  if (Object.keys(defaults).length > 0) {

    delete ctrl['*'];

    const methods = Object.keys(internals.defaultControllerOptions);

    for (const method of methods) {
      if (method === 'associations' || ctrl[method] === false) {
        continue;
      }

      ctrl[method] = Hoek.applyToDefaults(defaults, ctrl[method] || {});
    }

    const ascDefaults = ctrl.associations && ctrl.associations.hasOwnProperty('*') ? ctrl.associations['*'] : {};

    if (ascDefaults !== false) {
      ctrl.associations = ctrl.associations || {};

      ctrl.associations['*'] = Hoek.applyToDefaults(defaults, ascDefaults);
    }
  }

  return Hoek.applyToDefaults(internals.defaultControllerOptions, ctrl);
};
