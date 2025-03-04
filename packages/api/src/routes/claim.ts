import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { Egg, ClaimEggParams } from '../types'
import { EggRepository } from '../repositories/egg'
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from 'unique-names-generator'

const claim: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  if (!fastify.mongo.db) throw Error('mongo db not found')
  const repository = new EggRepository(fastify.mongo.db)

  fastify.post<{ Body: ClaimEggParams; Reply: Egg | Error }>('/claim', {
    schema: {
      body: ClaimEggParams,
      response: {
        200: Egg,
      },
    },
    handler: async (
      request: FastifyRequest<{ Body: ClaimEggParams }>,
      reply
    ) => {
      const key = request.body.key
      const egg = await repository.get(key)

      if (!egg) {
        return reply
          .status(400)
          .send(new Error(`Egg does not exist (key: ${key})`))
      }

      if (egg.token) {
        return reply
          .status(400)
          .send(new Error(`Egg has already been claimed (key ${key})`))
      }

      const token = fastify.jwt.sign({ id: key })
      const username = uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        length: 2,
        separator: '-',
      })

      try {
        return reply.status(200).send(
          await repository.update({
            ...egg,
            token,
            username,
          })
        )
      } catch (error) {
        reply.status(409).send(error as Error)
      }
    },
  })
}

export default claim