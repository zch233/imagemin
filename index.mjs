import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import imageminGifsicle from 'imagemin-gifsicle';
import imageminOptpng from 'imagemin-optipng';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminSvgo from 'imagemin-svgo';

imagemin(['src/assets/**/*.{jpg,svg,webp,png}'], {
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
    destination: sourcePath => 'src/assets/' + sourcePath,
});
