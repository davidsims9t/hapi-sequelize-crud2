const Joi = require('joi');

export const validation = {

  id: Joi.number().integer().min(1).required(),
  offset: Joi.number().integer().min(0).default(0, 'results offset'),
  limit: Joi.number().integer().min(1).max(100).default(20, 'number of results per set'),

  include(model) {
    return Joi.string();
  },

  filter(model) {
    return Joi.object();
  }
};

export const queryParams = (server, request) => {

  const q = request.query;
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  return {
    where: q.filter || {},
    offset: q.offset,
    limit: q.limit,
    include: q.include ? [models[q.include]] : []
  };
};

export const getModel = (request, model, param) => {

  param = param || 'id';
  const id = request.params[param];

  return request.pre.model
          ? Promise.resolve(request.pre.model)
          : model.scope(prepareScopes(request.pre.scope)).findById(id);
};

export const prepareScopes = (scopes) => {

  if (!Array.isArray(scopes)) {
    scopes = [scopes];
  }

  const flattenedScopes = scopes.reduce((flat, item) => {

    if (Array.isArray(item)) {
      item.forEach(i => flat.push(i));
    } else {
      flat.push(item);
    }

    return flat;
  }, []);

  return flattenedScopes.filter(s => !!s);
};
