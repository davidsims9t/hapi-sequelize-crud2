import Boom from 'boom';
import Hoek from 'hoek';
import Joi from 'joi';
import error from '../error';
import { queryParams, validation } from '../helpers';

let prefix, scopePrefix;

const defaultHandlerOptions = {
  index: true,
  create: true,
  update: true,
  updateMany: true,
  destroy: true,
  destroyMany: true,
  count: true
};

const methods = {};

export default (server, model, association, options) => {
  prefix = options.prefix;
  scopePrefix = options.scopePrefix;

  const associationOptions = options.handlerOptions.associations && options.handlerOptions.associations[association._plural]
                              ? options.handlerOptions.associations[association._plural]
                              : {}
  ;
  const handlerOptions = Hoek.applyToDefaults(defaultHandlerOptions, associationOptions);

  for (const method in methods) {
    let methodOpts = handlerOptions[method];

    if (!! methodOpts) {
      methodOpts = typeof methodOpts === 'object' ? methodOpts : {};

      methods[method](server, model, association, methodOpts);
    }
  }
}

export const index = methods.index = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const { where, offset, limit, include } = queryParams(server, request);

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
          include: validation.include(association.target),
          offset: validation.offset,
          limit: validation.limit
        }
      }
    }
  }, options);

  server.route(route);
}

export const create = methods.create = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
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
  }, options);

  server.route(route);
}

export const update = methods.update = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}/{bid}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.add](request.params.bid);

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
  }, options);

  server.route(route);
}

export const updateMany = methods.updateMany = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.add](request.query.id);

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
  }, options);

  server.route(route);
}

export const destroy = methods.destroy = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
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
  }, options);

  server.route(route);
}

export const destroyMany = methods.destroyMany = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const ids = request.query.id || null;
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
  }, options);

  server.route(route);
}

export const count = methods.count = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/{aid}/${association._plural}/count`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.aid);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const { where } = queryParams(server, request);

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
  }, options);

  server.route(route);
}
