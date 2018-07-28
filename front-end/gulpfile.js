const gulp = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const babel = require('gulp-babel');

gulp.task('default', ['css', 'js']);

gulp.task('css', () => {
    return gulp.src(['css/styles.css'])
        .pipe(cleanCSS({ level: 2 }))
        .pipe(concat('bundle.css'))
        .pipe(rename('bundle.min.css'))
        .pipe(gulp.dest('dist'));
});

gulp.task('js', () => {
    return gulp.src(['js/main.js', 'js/dbhelper.js'])
        .pipe(babel({ presets: ['env'] }))
        .pipe(concat('bundle.js'))
        .pipe(rename('bundle.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});

