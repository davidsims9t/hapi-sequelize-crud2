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

exports.pluckAssociationOptions = function(options, association) {
  if (!options.associations) {
    return {};
  }

  const defaultOpts = options.associations['*'] || {};

  const associationOpts = options.associations && options.associations[association]
                              ? options.associations[association]
                              : {}

  return Hoek.applyToDefaults(defaultOpts, associationOpts);
};

exports.loadControllers = function(server, patterns) {
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  internals.getFiles(patterns).forEach(f => {
    const pathInfo = Path.parse(f);
    const fileName = Path.resolve('.', pathInfo.dir, pathInfo.base);
    const name = pathInfo.name.replace(/\..+$/, ''); // enables adding suffix for testing, e.g. modelName.timestamp.js
    const modelName = name.indexOf('_') < 1 // -1 or 0 match
                      ? name
                      : camelCase(name);

    internals.controllers[modelName] = require(fileName)(server, models[modelName]);
  });

  return this;
};

exports.controllersEnabled = function (modelName) {
  const opts = this.controllerOptions(modelName);

  return ! opts.hasOwnProperty('*') || !! opts['*'];
}

exports.associationsEnabled = function (modelName) {
  const opts = this.controllerOptions(modelName);

  return ! opts.hasOwnProperty('associations') || !! opts.associations;
}

exports.associationEnabled = function (modelName, associationKey) {
  const opts = this.controllerOptions(modelName);

  return ! opts.hasOwnProperty('associations')
          || ! opts.associations.hasOwnProperty(associationKey)
          || !! opts.associations[associationKey];
}
