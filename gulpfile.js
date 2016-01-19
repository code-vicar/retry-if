var del = require('del');
var gulp = require('gulp');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('default', ['transpile']);

gulp.task('transpile', ['clean'], function() {    
    return gulp.src('src/**/*', { base: './src' })
    .pipe(sourcemaps.init())
    .pipe(babel({
        presets: ['es2015'] 
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function(){
    return del('dist');
})