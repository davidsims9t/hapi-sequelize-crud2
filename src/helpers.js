import Joi from 'joi';

export const validation = {
  id: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(0).default(0, 'results offset'),
  offset: Joi.number().integer().min(1).default(20, 'number of results per set'),

  include(model) {
    return Joi.string();
  },

  filter(model) {
    return Joi.object();
  }
}

export const queryParams = (request) => {
  const q = request.query;

  return {
    where: q.filter,
    offset: q.offset,
    limit: q.limit,
    include: q.include ? [request.models[q.include]] : []
  };
}
