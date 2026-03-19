# imageminx

> imagemin(extreme) for CLI automation

## 食用方法

##### 安装

```
npm install imageminx -g

// or

yarn global add imageminx
```

*注意:*
```
// 如果 npm 安装不上，请使用 cnpm
cnpm install imageminx -g

// yarn 安装不上请在 global package 或者 project package 加上
"resolutions": {
    "bin-wrapper": "npm:bin-wrapper-china",
}
```

##### 使用

```
// 默认将压缩 ./src/assets 下的文件
imageminx
```

### 参数

```
$ imagemin --help

  Usage
    $ imagemin --assetsPath [压缩文件目录]
    $ imagemin --extRE [目标文件过滤条件]

  Options
    --assetsPath string // default: ./src/assets
    --extRE  RegExp | ((file: string) => boolean) // default: /\.(png|jpeg|gif|jpg|bmp|svg)$/i
```

## Related

- [imagemin](https://github.com/imagemin/imagemin) - API for this module