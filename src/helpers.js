const Joi = require('joi');

export const validation = {
  id: Joi.number().integer().min(1).required(),
  offset: Joi.number().integer().min(0).default(0, 'results offset'),
  limit: Joi.number().integer().min(1).default(20, 'number of results per set'),

  include(model) {
    return Joi.string();
  },

  filter(model) {
    return Joi.object();
  }
}

export const queryParams = (server, request) => {
  const q = request.query;
  const models = server.plugins['hapi-sequelize'].db.sequelize.models;

  return {
    where: q.filter || {},
    offset: q.offset,
    limit: q.limit,
    include: q.include ? [models[q.include]] : []
  };
}
