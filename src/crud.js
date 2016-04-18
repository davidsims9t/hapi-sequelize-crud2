import Boom from 'boom';
import Hoek from 'hoek';
import Joi from 'joi';
import error from './error';
import { getModel, prepareScopes, queryParams, validation } from './helpers';

let prefix, scopePrefix, controllerOptions;

const methods = {};

export default (server, model, options) => {
  prefix = options.prefix,
  scopePrefix = options.scopePrefix,
  controllerOptions = options.controllerOptions;

  for (const method in methods) {
    let methodOpts = controllerOptions[method];

    if (!! methodOpts) {
      methodOpts = typeof methodOpts === 'object' ? methodOpts : {};

      methods[method](server, model, methodOpts);
    }
  }
}

export const index = methods.index = (server, model, options) => {
  const auth = options.config && options.config.auth ? options.config.auth : false;

  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}`,

    @error
    async handler(request, reply) {
      const { where, offset, limit, include } = queryParams(server, request);

      for (const key of Object.keys(where)) {
        try {
          where[key] = JSON.parse(where[key]);
        } catch (e) {
          //
        }
      }

      let list = await model.scope(request.pre.scope).findAll({
        where, include, offset, limit
      });

      reply(list);
    },
    config: {
      auth,
      validate: {
        query: {
          filter: validation.filter(model),
          include: validation.include(model),
          offset: validation.offset,
          limit: validation.limit
        }
      }
    }
  }, options);

  server.route(route);
}

export const get = methods.get = (server, model, options) => {
  const auth = options.config && options.config.auth ? options.config.auth : false;

  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const { include } = queryParams(server, request);

      const instance = request.pre.model
                        || await model.scope(request.pre.scope).findById(request.params.id, { include });

      if (!instance) {
        return reply(Boom.notFound());
      }

      reply(instance);
    },
    config: {
      auth,
      validate: {
        params: {
          id: Joi.number().integer()
        },
        query: {
          include: validation.include(model)
        }
      }
    }
  }, options);

  server.route(route);
}

export const scope = methods.scope = (server, model, options) => {
  let scopes = Object.keys(model.options.scopes);
  const auth = options.config && options.config.auth ? options.config.auth : false;

  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/${scopePrefix}/{scope}`,

    @error
    async handler(request, reply) {
      const { where, offset, limit, include } = queryParams(server, request);

      for (const key of Object.keys(where)) {
        try {
          where[key] = JSON.parse(where[key]);
        } catch (e) {
          //
        }
      }

      const preparedScopes = prepareScopes([request.pre.scope, request.params.scope]);

      const list = await model.scope(preparedScopes)
                              .findAll({ include, where, offset, limit });

      reply(list);
    },
    config: {
      auth,
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
  }, options);

  server.route(route);
}

export const create = methods.create = (server, model, options) => {
  const auth = options.config && options.config.auth ? options.config.auth : false;

  const route = Hoek.applyToDefaults({
    method: 'POST',
    path: `${prefix}/${model._plural}`,

    @error
    async handler(request, reply) {
      const instance = await model.create(request.payload);

      reply(instance);
    },
    config: {
      auth
    }
  }, options);

  server.route(route);
}

export const update = methods.update = (server, model, options) => {
  const auth = options.config && options.config.auth ? options.config.auth : false;

  const route = Hoek.applyToDefaults({
    method: 'PUT',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      if (!instance) {
        reply(Boom.notFound());
      }

      const result = await instance.update(request.payload);

      reply(result);
    },
    config: {
      auth,
      validate: {
        params: {
          id: validation.id
        }
      }
    }
  }, options);

  server.route(route);
}

export const destroy = methods.destroy = (server, model, options) => {
  const auth = options.config && options.config.auth ? options.config.auth : false;

  const route = Hoek.applyToDefaults({
    method: 'DELETE',
    path: `${prefix}/${model._plural}/{id}`,

    @error
    async handler(request, reply) {
      const instance = await getModel(request, model);

      if (!instance) {
        reply(Boom.notFound());
      }

      const result = await instance.destroy();

      reply(result);
    },
    config: {
      auth,
      validate: {
        params: {
          id: validation.id
        }
      }
    }
  }, options);

  server.route(route);
}

export const count = methods.count = (server, model, options) => {
  const auth = options.config && options.config.auth ? options.config.auth : false;

  const route = Hoek.applyToDefaults({
    method: 'GET',
    path: `${prefix}/${model._plural}/count`,

    @error
    async handler(request, reply) {
      const { where } = queryParams(server, request);

      const count = await model.scope(request.pre.scope).count({ where });

      reply({ count });
    },
    config: {
      auth,
      validate: {
        query: {
          filter: validation.filter(model)
        }
      }
    }
  }, options);

  server.route(route);
}

import * as associations from './associations/index';
export { associations };
