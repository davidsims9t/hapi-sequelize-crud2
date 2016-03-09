import Boom from 'boom';
import Joi from 'joi';
import error from './error';
import { queryParams, validation } from './helpers';

let prefix, scopePrefix;

export default (server, model, options) => {
  prefix = options.prefix;
  scopePrefix = options.scopePrefix;

  index(server, model);
  count(server, model);
  get(server, model);
  scope(server, model);
  create(server, model);
  destroy(server, model);
  update(server, model);
}

export const index = (server, model) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}`,

    @error
    async handler(request, reply) {
      const { where, offset, limit, include } = queryParams(request);

      for (const key of Object.keys(where)) {
        try {
          where[key] = JSON.parse(where[key]);
        } catch (e) {
          //
        }
      }

      let list = await model.findAll({
        where, include, offset, limit
      });

      reply(list);
    },
    config: {
      validate: {
        query: {
          filter: validation.filter(model),
          include: validation.include(model),
          offset: validation.offset,
          limit: validation.limit
        }
      }
    }
  });
}

export const get = (server, model) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const { include } = queryParams(request);

      const instance = await model.findById(request.params.id, { include });

      if (!instance) {
        return reply(Boom.notFound());
      }

      reply(instance);
    },
    config: {
      validate: {
        params: {
          id: Joi.number().integer()
        },
        query: {
          include: validation.include(model)
        }
      }
    }
  })
}

export const scope = (server, model) => {
  let scopes = Object.keys(model.options.scopes);

  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/${scopePrefix}/{scope}`,

    @error
    async handler(request, reply) {
      const { where, offset, limit, include } = queryParams(request);

      for (const key of Object.keys(where)) {
        try {
          where[key] = JSON.parse(where[key]);
        } catch (e) {
          //
        }
      }

      const list = await model.scope(request.params.scope).findAll({ include, where, offset, limit });

      reply(list);
    },
    config: {
      validate: {
        params: {
          scope: Joi.string().valid(...scopes)
        },
        query: {
          filter: validation.filter(model),
          include: validation.include(model),
          offset: validation.offset,
          limit: validation.limit
        }
      }
    }
  });
}

export const create = (server, model) => {
  server.route({
    method: 'POST',
    path: `${prefix}/${model._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.create(request.payload);

      reply(instance);
    }
  })
}

export const update = (server, model) => {
  server.route({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.id);

      if (!instance) {
        reply(Boom.notFound());
      }

      const result = await instance.update(request.payload);

      reply(result);
    },
    config: {
      validate: {
        params: {
          id: validation.id
        }
      }
    }
  })
}

export const destroy = (server, model) => {
  server.route({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const instance = await model.findById(request.params.id);

      if (!instance) {
        reply(Boom.notFound());
      }

      const result = await instance.destroy();

      reply(result);
    },
    config: {
      validate: {
        params: {
          id: validation.id
        }
      }
    }
  })
}

export const count = (server, model) => {
  server.route({
    method: 'GET',
    path: `${prefix}/${model._plural}/count`,

    @error
    async handler(request, reply) {
      const { where } = queryParams(request);

      const count = await model.count({ where });

      reply({ count });
    },
    config: {
      validate: {
        query: {
          filter: validation.filter(model)
        }
      }
    }
  })
}

import * as associations from './associations/index';
export { associations };
