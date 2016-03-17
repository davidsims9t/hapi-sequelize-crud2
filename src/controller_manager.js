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

  const defaultCtrl = arguments.length === 1 // Pass a second argument to avoid infinite recursion
                      ? this.controllerOptions('_default', true)
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

      if (methodOpts !== false) {
          associationOpts[method] = Hoek.applyToDefaults(defaultOpts, methodOpts);
      }
    }
  }

  return associationOpts;
};

exports.loadControllers = function(server, patterns) {
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  internals.controllers = {};

  internals.getFiles(patterns).forEach(f => {
    const pathInfo = Path.parse(f);
    const fileName = Path.resolve('.', pathInfo.dir, pathInfo.base);
    const name = pathInfo.name.replace(/\..+$/, ''); // enables adding suffix for testing, e.g. modelName.timestamp.js
    const modelName = name.indexOf('_') < 1 // -1 or 0 match
                      ? name
                      : camelCase(name);

    internals.controllers[modelName] = require(fileName)(server, models[modelName]);

    internals.applyControllerDefaults(internals.controllers[modelName]);
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
