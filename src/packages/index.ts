import type { Plugin, ResolvedConfig } from 'vite'
import type { VitePluginImageMin } from './types'
import path from 'pathe'
import fs from 'fs-extra'
import {
  isRegExp,
  isFunction,
  readAllFiles,
} from './utils'
import chalk from 'chalk'
import Debug from 'debug'

import imagemin from 'imagemin'
import imageminGifsicle from 'imagemin-gifsicle'
import imageminPngquant from 'imagemin-pngquant'
import imageminOptpng from 'imagemin-optipng'
import imageminMozjpeg from 'imagemin-mozjpeg'
import imageminSvgo from 'imagemin-svgo'
import imageminWebp from 'imagemin-webp'
import imageminJpegTran from 'imagemin-jpegtran'

const debug = Debug.debug('vite-plugin-imagemin')

const extRE = /\.(png|jpeg|gif|jpg|bmp|svg)$/i

export default function (options: VitePluginImageMin = {}) {
  let outputPath: string
  let publicDir: string
  let config: ResolvedConfig

  const { disable = false, filter = extRE, verbose = true } = options

  if (disable) {
    return {} as any
  }

  debug('plugin options:', options)

  const mtimeCache = new Map<string, number>()
  let tinyMap = new Map<
    string,
    { size: number; oldSize: number; ratio: number }
  >()

  async function processFile(filePath: string, buffer: Buffer) {
    let content: Buffer

    try {
      content = await imagemin.buffer(buffer, {
        plugins: [
            imageminGifsicle({
                optimizationLevel: 7,
                interlaced: false,
            }),
            imageminOptpng({
                optimizationLevel: 7,
            }),
            imageminMozjpeg({
                quality: 20,
            }),
            imageminPngquant({
                quality: [0.8, 0.9],
                speed: 4,
            }),
            imageminSvgo({
                plugins: [
                    {
                        name: 'removeViewBox',
                    },
                    {
                        name: 'removeEmptyAttrs',
                        active: false,
                    },
                ],
            }),
        ],
      })

      const size = content.byteLength,
        oldSize = buffer.byteLength

      tinyMap.set(filePath, {
        size: size / 1024,
        oldSize: oldSize / 1024,
        ratio: size / oldSize - 1,
      })

      return content
    } catch (error) {
      config.logger.error('imagemin error:' + filePath)
    }
  }

  return {
    name: 'vite:imagemin',
    apply: 'build',
    enforce: 'post',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      outputPath = config.build.outDir

      // get public static assets directory: https://vitejs.dev/guide/assets.html#the-public-directory
      if (typeof config.publicDir === 'string') {
        publicDir = config.publicDir
      }

      debug('resolvedConfig:', resolvedConfig)
    },
    async generateBundle(_, bundler) {
      tinyMap = new Map()
      const files: string[] = []

      Object.keys(bundler).forEach((key) => {
        filterFile(path.resolve(outputPath, key), filter) && files.push(key)
      })

      debug('files:', files)

      if (!files.length) {
        return
      }

      const handles = files.map(async (filePath: string) => {
        const source = (bundler[filePath] as any).source
        const content = await processFile(filePath, source)
        if (content) {
          ;(bundler[filePath] as any).source = content
        }
      })

      await Promise.all(handles)
    },
    async closeBundle() {
      if (publicDir) {
        const files: string[] = []

        // try to find any static images in original static folder
        readAllFiles(publicDir).forEach((file) => {
          filterFile(file, filter) && files.push(file)
        })

        if (files.length) {
          const handles = files.map(async (publicFilePath: string) => {
            // now convert the path to the output folder
            const filePath = publicFilePath.replace(publicDir + path.sep, '')
            const fullFilePath = path.join(outputPath, filePath)

            if (fs.existsSync(fullFilePath) === false) {
              return
            }

            const { mtimeMs } = await fs.stat(fullFilePath)
            if (mtimeMs <= (mtimeCache.get(filePath) || 0)) {
              return
            }

            const buffer = await fs.readFile(fullFilePath)
            const content = await processFile(filePath, buffer)

            if (content) {
              await fs.writeFile(fullFilePath, content)
              mtimeCache.set(filePath, Date.now())
            }
          })

          await Promise.all(handles)
        }
      }

      if (verbose) {
        handleOutputLogger(config, tinyMap)
      }
    },
  } as Plugin
}

// Packed output logic
function handleOutputLogger(
  config: ResolvedConfig,
  recordMap: Map<string, { size: number; oldSize: number; ratio: number }>,
) {
  config.logger.info(
    `\n${chalk.cyan('✨ [vite-plugin-imagemin]')}` +
      '- compressed image resource successfully: ',
  )

  const keyLengths = Array.from(recordMap.keys(), (name) => name.length)
  const valueLengths = Array.from(
    recordMap.values(),
    (value) => `${Math.floor(100 * value.ratio)}`.length,
  )

  const maxKeyLength = Math.max(...keyLengths)
  const valueKeyLength = Math.max(...valueLengths)
  recordMap.forEach((value, name) => {
    let { ratio } = value
    const { size, oldSize } = value
    ratio = Math.floor(100 * ratio)
    const fr = `${ratio}`

    const denseRatio =
      ratio > 0 ? chalk.red(`+${fr}%`) : ratio <= 0 ? chalk.green(`${fr}%`) : ''

    const sizeStr = `${oldSize.toFixed(2)}kb / tiny: ${size.toFixed(2)}kb`

    config.logger.info(
      chalk.dim(path.basename(config.build.outDir)) +
        '/' +
        chalk.blueBright(name) +
        ' '.repeat(2 + maxKeyLength - name.length) +
        chalk.gray(`${denseRatio} ${' '.repeat(valueKeyLength - fr.length)}`) +
        ' ' +
        chalk.dim(sizeStr),
    )
  })
  config.logger.info('\n')
}

function filterFile(
  file: string,
  filter: RegExp | ((file: string) => boolean),
) {
  if (filter) {
    const isRe = isRegExp(filter)
    const isFn = isFunction(filter)
    if (isRe) {
      return (filter as RegExp).test(file)
    }
    if (isFn) {
      return (filter as (file: any) => any)(file)
    }
  }
  return false
}
