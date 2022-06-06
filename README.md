# gupo-imagemin

## 食用方法

##### 安装

```
npm install gupo-imagemin -g

// or

yarn global add imagemin
```

*注意:*
```
// 如果 npm 安装不上，请使用 cnpm
cnpm install gupo-imagemin -g

// yarn 安装不上请在 global package 或者 project package 加上
"resolutions": {
    "bin-wrapper": "npm:bin-wrapper-china",
}
```

##### 使用

```
// 默认将压缩 ./src/assets 下的文件
gupo-imagemin
```

### 参数

```
$ gupo-imagemin --help

  Usage
    $ gupo-imagemin --assetsPath [压缩文件目录]
    $ gupo-imagemin --extRE [目标文件过滤条件]

  Options
    --assetsPath string // default: ./src/assets
    --extRE  RegExp | ((file: string) => boolean) // default: /\.(png|jpeg|gif|jpg|bmp|svg)$/i
```

