import Glob from 'glob';
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
  return internals.controllers.hasOwnProperty(modelName) ? internals.controllers[modelName] : {};
}

exports.loadControllers = function(server, patterns) {
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  internals.getFiles(patterns).forEach(f => {
    const pathInfo = Path.parse(f);
    const fileName = Path.resolve('.', pathInfo.dir, pathInfo.base);
    const name = pathInfo.name.replace(/\..+$/, ''); // enables adding suffix for testing, e.g. modelName.timestamp.js
    const modelName = name.indexOf('_') !== -1
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
