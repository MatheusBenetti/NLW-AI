import { FastifyInstance } from "fastify"
import { fastifyMultipart } from "@fastify/multipart"
import path from "node:path"
import { randomUUID } from "node:crypto"
import fs from 'node:fs'
import { pipeline } from "node:stream"
import { promisify } from "node:util"
import { prisma } from "../lib/prisma"

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25,
        }
    })

    app.post('/videos', async (req, res) => {
        const data = await req.file()

        if (!data) {
            return res.status(400).send({ error: 'Missing file input.'})
        }

        const extension = path.extname(data.filename)

        if (extension !== '.mp3') {
            return res.status(400).send({ error: 'Invalid file extension.'})
        }

        const fileBaseName = path.basename(data.filename, extension)
        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`

        const uploadPath = path.resolve(__dirname, '../../temp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadPath))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadPath
            }
        })

        return { video }
    })
}