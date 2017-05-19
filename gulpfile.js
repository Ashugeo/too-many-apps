const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const webpackStream = require('webpack-stream');
const webpack = require('webpack');

// Compile game assets for production
gulp.task('build', () => {
    const css = gulp.src('css/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(concat('main.min.css'))
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('css/'));

    const js = gulp.src('js/main.js')
        .pipe(webpackStream({
            module: {
                rules: [
                    { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
                ],
            },
            plugins: [
                new webpack.optimize.UglifyJsPlugin(),
            ],
        }, webpack))
        .pipe(concat('main.min.js'))
        .pipe(gulp.dest('js/'));

    return [css, js];
});
