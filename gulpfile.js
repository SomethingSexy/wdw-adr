var gulp = require("gulp");
var babel = require("gulp-babel");
var es = require('event-stream');

gulp.task("default", function () {
  return es.merge(
    gulp.src(['dining/dining.js']).pipe(babel()).pipe(gulp.dest('dist/dining')),
    gulp.src(['config/times.js', 'config/venues.js']).pipe(babel()).pipe(gulp.dest("dist/config"))

    );


 ;
});
