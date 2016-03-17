import Glob from 'glob';
import Hoek from 'hoek';
import Path from 'path';
import camelCase from 'camel-case';

const internals = {
  controllers: {}
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

  const server = internals.server;
  const model = server.plugins['hapi-sequelize'].db.sequelize.models[modelName];

  const defaultCtrl = internals.defaultControllerFactory
                      ? internals.defaultControllerFactory(server, model)
                      : {};

  const modelCtrl = internals.controllers.hasOwnProperty(modelName)
                      ? internals.controllers[modelName]
                      : {};

  return Hoek.applyToDefaults(defaultCtrl, modelCtrl);
}

exports.pluckAssociationOptions = function(options, association, methods) {
  if (!options.associations) {
    return {};
  }

  const defaultOpts = options.associations['*'] || {};

  const associationOpts = options.associations && options.associations[association]
                              ? options.associations[association]
                              : {};

  if (Object.keys(defaultOpts).length > 0) {
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

  return associationOpts;
};

exports.loadControllers = function(server, patterns) {
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  internals.server = server;
  internals.controllers = {};
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
      internals.controllers[modelName] = internals.applyControllerDefaults(ctrlFactory(server, models[modelName]));
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

  if (Object.keys(defaults) > 0) {

    delete ctrl['*'];

    for (const method in ctrl) {
      if (method === 'associations' || ctrl[method] === false) {
        continue;
      }

      ctrl[method] = Hoek.applyToDefaults(defaults, ctrl[method]);
    }

    const ascDefaults = ctrl.associations.hasOwnProperty('*') ? ctrl.associations['*'] : {};

    if (ascDefaults !== false) {
      ctrl.associations['*'] = Hoke.applyToDefaults(defaults, ascDefaults);
    }
  }

  return ctrl;
};
