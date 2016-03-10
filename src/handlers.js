import Glob from 'glob';
import Path from 'path';
import camelCase from 'camel-case';

const internals = {
  handlers: {}
};

internals.getFiles = (patterns) => {
  if (! Array.isArray(patterns)) {
    patterns = [patterns];
  }

  return patterns.reduce((arr, pattern) => {
    return arr.concat(Glob.sync(pattern, { nodir: true }));
  }, []);
};

exports.handlerOptions = function (modelName) {
  return internals.handlers.hasOwnProperty(modelName) ? internals.handlers[modelName] : {};
}

exports.loadHandlers = function(server, patterns) {
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  internals.getFiles(patterns).forEach(f => {
    const pathInfo = Path.parse(f);
    const fileName = Path.resolve('.', pathInfo.dir, pathInfo.base);
    const modelName = pathInfo.name.indexOf('_') !== -1
                      ? pathInfo.name
                      : camelCase(pathInfo.name);

    internals.handlers[modelName] = require(fileName)(server, models[modelName]);
  });

  return this;
};

exports.handlersEnabled = function (modelName) {
  const opts = this.handlerOptions(modelName);

  return ! opts.hasOwnProperty('*') || !! opts['*'];
}

exports.associationsEnabled = function (modelName) {
  const opts = this.handlerOptions(modelName);

  return ! opts.hasOwnProperty('associations') || !! opts.associations;
}

exports.associationEnabled = function (modelName, associationKey) {
  const opts = this.handlerOptions(modelName);

  return ! opts.hasOwnProperty('associations')
          || ! opts.associations.hasOwnProperty(associationKey)
          || !! opts.associations[associationKey];
}
