#!/usr/bin/env node

import chalk from "chalk";
import {isFunction, isRegExp} from "./utils";
import fs from 'fs';
import path from 'path';
import imagemin from "imagemin";
import imageminGifsicle from "imagemin-gifsicle";
import imageminOptpng from "imagemin-optipng";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";

const verbose = true
const assetsPath = './src/assets'
const extRE = /\.(png|jpeg|gif|jpg|bmp|svg)$/i

let tinyMap = new Map<
    string,
    { size: number; oldSize: number; ratio: number }
    >()

let files: string[] = []

fileDisplay(assetsPath)
files = files.filter(v => filterFile(v, extRE));

(async () => {
    Promise.all(files.map(async filePath => {
        const source = fs.readFileSync(filePath)
        const content = await processFile(filePath, source)
        if (content) {
            fs.writeFileSync(filePath, content)
        }
    })).then(() => {
        if (verbose) {
            handleOutputLogger(tinyMap)
        }
    })
})()

// Packed output logic
function handleOutputLogger(
    recordMap: Map<string, { size: number; oldSize: number; ratio: number }>,
) {
   console.info(
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

        console.info(
            chalk.dim(assetsPath) +
            '/' +
            chalk.blueBright(name) +
            ' '.repeat(2 + maxKeyLength - name.length) +
            chalk.gray(`${denseRatio} ${' '.repeat(valueKeyLength - fr.length)}`) +
            ' ' +
            chalk.dim(sizeStr),
        )
    })
    console.info('\n')
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

function fileDisplay(filePath){
    const dirFiles = fs.readdirSync(filePath)
    dirFiles.map((filename) => {
        //获取当前文件的绝对路径
        const filedir = path.join(filePath, filename);
        const stats = fs.statSync(filedir) // 根据文件路径获取文件信息，返回一个fs.Stats对象
        const isFile = stats.isFile(); // 是文件
        const isDir = stats.isDirectory(); // 是文件夹
        if(isFile){
            files.push(filedir)
        }
        if(isDir){
            fileDisplay(filedir); // 递归，如果是文件夹，就继续遍历该文件夹下面的文件
        }
    });
    return files
}

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
        console.error('imagemin error:' + filePath)
    }
}
