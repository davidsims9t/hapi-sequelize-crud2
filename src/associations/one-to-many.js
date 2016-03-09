import Boom from 'boom';
import Joi from 'joi';
import error from '../error';
import { queryParams, validation } from '../helpers';

let prefix, scopePrefix;

export default (server, model, association, options) => {
  prefix = options.prefix;
  scopePrefix = options.scopePrefix;

  index(server, model, association);
  create(server, model, association);
  add(server, model, association);
  addMany(server, model, association);
  destroy(server, model, association);
  destroyMany(server, model, association);
  count(server, model, association);
}

export const index = (server, model, association) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const { where, offset, limit, include } = queryParams(request);

      const result = await instance[association.accessors.get]({
        where,
        include,
        offset,
        limit,
      });

      reply(result);
    },
    config: {
      validate: {
        params: {
          aid: Joi.number().integer()
        },
        query: {
          filter: validation.filter(association.target),
          include: validation.where(association.target),
          offset: validation.offset,
          limit: validation.limit
        }
      }
    }
  })
}

export const create = (server, model, association) => {
  server.route({
    method: 'POST',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.create](request.payload);

      reply(result);
    },
    config: {
      validate: {
        params: {
          aid: validation.id
        }
      }
    }
  })
}

export const add = (server, model, association) => {
  server.route({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}/{bid}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessor.add](request.params.bid);

      reply(result);
    },
    config: {
      validate: {
        params: {
          aid: validation.id,
          bid: validation.id
        }
      }
    }
  })
}

export const addMany = (server, model, association) => {
  server.route({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessor.add](request.query.id);

      reply(result);
    },

    config: {
      validate: {
        params: {
          aid: validation.id
        },
        query: {
          id: Joi.array().items(validation.id).required()
        }
      }
    }
  })
}

export const destroy = (server, model, association) => {
  server.route({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}/{bid}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      const result = await instance[association.accessors.remove](request.params.bid);

      reply(result);
    },
    config: {
      validate: {
        params: {
          aid: validation.id,
          bid: validation.id
        }
      }
    }
  })
}

export const destroyMany = (server, model, association) => {
  server.route({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const ids = request.query.id;
      const destroyMethod = ids ? 'removeMultiple' : 'set';

      const result = await instance[association.accessors[destroyMethod]](ids);

      reply(result);
    },

    config: {
      validate: {
        params: {
          aid: validation.id
        },
        query: {
          id: Joi.array().items(validation.id).optional()
        }
      }
    }
  })
}

export const count = (server, model, association) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}/count`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const { where } = queryParams(request);

      const count = await instance[association.accessors.count]({ where });

      reply({ count });
    },
    config: {
      validate: {
        params: {
          aid: validation.id
        },
        query: {
          filter: validation.filter(model)
        }
      }
    }
  })
}
