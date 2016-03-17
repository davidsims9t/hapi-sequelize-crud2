import Boom from 'boom';
import ControllerManager from '../controller_manager';
import Hoek from 'hoek';
import Joi from 'joi';
import error from '../error';
import { getModel, queryParams, validation } from '../helpers';

let prefix, scopePrefix;

const defaultControllerOptions = {
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

 const controllerOptions = Hoek.applyToDefaults(
                              defaultControllerOptions,
                              ControllerManager.pluckAssociationOptions(options.controllerOptions, association._plural)
                            );

  for (const method in methods) {
    let methodOpts = controllerOptions[method];

    if (!! methodOpts) {
      methodOpts = typeof methodOpts === 'object' ? methodOpts : {};

      methods[method](server, model, association, methodOpts);
    }
  }
}

export const index = methods.index = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/{id}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

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
          id: Joi.number().integer()
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
    path: `${prefix}/${model._plural}/{id}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.create](request.payload);

      reply(result);
    },
    config: {
      validate: {
        params: {
          id: validation.id
        }
      }
    }
  }, options);

  server.route(route);
}

export const update = methods.update = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{id}/${association._plural}/{aid}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.add](request.params.aid);

      reply(result);
    },
    config: {
      validate: {
        params: {
          id: validation.id,
          aid: validation.id
        }
      }
    }
  }, options);

  server.route(route);
}

export const updateMany = methods.updateMany = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{id}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      if (!instance) {
        return reply(Boom.notFound());
      }

      const result = await instance[association.accessors.add](request.query.id);

      reply(result);
    },

    config: {
      validate: {
        params: {
          id: validation.id
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
    path: `${prefix}/${model._plural}/{id}/${association._plural}/{aid}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      const result = await instance[association.accessors.remove](request.params.aid);

      reply(result);
    },
    config: {
      validate: {
        params: {
          id: validation.id,
          aid: validation.id
        }
      }
    }
  }, options);

  server.route(route);
}

export const destroyMany = methods.destroyMany = (server, model, association, options) => {
  const route = Hoek.applyToDefaults({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{id}/${association._plural}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

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
          id: validation.id
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
    path: `${prefix}/${model._plural}/{id}/${association._plural}/count`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

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
          id: validation.id
        },
        query: {
          filter: validation.filter(model)
        }
      }
    }
  }, options);

  server.route(route);
}
