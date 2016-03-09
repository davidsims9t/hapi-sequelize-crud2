import joi from 'joi';

export const validation = {
  id: joi.number().integer().min(1).required(),
  limit: joi.number().integer().min(0).default(0, 'results offset'),
  offset: joi.number().integer().min(1).default(20, 'number of results per set'),

  include(model) {
    return joi.string();
  },

  filter(model) {
    return joi.object();
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
