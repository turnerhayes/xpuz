"use strict";

var _                    = require('lodash');
var path                 = require('path');
var fs                   = require('fs');
var del                  = require('del');

var gulp                 = require('gulp');
var gulpIf               = require('gulp-if');
var jshint               = require('gulp-jshint');
var gutil                = require('gulp-util');
var sourcemaps           = require('gulp-sourcemaps');
var uglify               = require('gulp-uglify');
var jsdoc                = require('gulp-jsdoc3');

var watchify             = require('watchify');
var browserify           = require('browserify');
var babelify             = require('babelify');
var source               = require('vinyl-source-stream');
var buffer               = require('vinyl-buffer');
var merge                = require('merge-stream');
var stylish              = require('jshint-stylish');

var IS_DEVELOPMENT = process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : true;

var documentationDirectory = path.join(__dirname, 'docs');

var buildDirectory = path.join(__dirname, 'dist');

var jsFileBlobs = ['index.js', 'parsers/**/*.js', 'lib/**/*.js'];

var browserifyOptions = _.extend({}, watchify.args, {
	debug: IS_DEVELOPMENT,
});

var babelifyOptions = {
	sourceRoot: __dirname,
	presets: ['es2015'],
	comments: IS_DEVELOPMENT,
	babelrc: false
};

function _changeEventToOperation(eventType) {
	var operation;

	switch(eventType) {
		case 'add': 
			operation = 'addition of';
			break;
		case 'unlink':
			operation = 'deletion of';
			break;
		case 'change':
			operation = 'changes to';
			break;
	}

	return operation;
}

function _cleanBuild() {
	return del(path.join(buildDirectory, '*'));
}

function _cleanDocumentation() {
	return del(path.join(documentationDirectory, '*'));
}

function _changeEventToOperation(eventType) {
	var operation;

	switch(eventType) {
		case 'add': 
			operation = 'addition of';
			break;
		case 'unlink':
			operation = 'deletion of';
			break;
		case 'change':
			operation = 'changes to';
			break;
	}

	return operation;
}

function _getLintStream(files) {
	return gulp.src(_.size(files) > 0 ? files : jsFileBlobs)
		.pipe(jshint())
		.pipe(jshint.reporter(stylish));
}

function _compileScripts(bundler, changedFiles) {
	gutil.log('Recompiling styles due to changes in the following files: \n' + _.map(
			function(changedFile) {
				return '\t' + _changeEventToOperation(changedFile.event) + path.relative(__dirname, changedFile.path);
			}
		).join('\n')
	);

	var compileStream = bundler
		.bundle()
		.on('error', function(err) {
			gutil.log(gutil.colors.red('Browserify Error\n'), err.message, err.stack || '');
		})
		.on('log', gutil.log)
		.pipe(source('build.js'))
		.pipe(buffer())
		.pipe(sourcemaps.init({
			loadMaps: true // loads map from browserify file
		}))
		.pipe(gulpIf(!IS_DEVELOPMENT, uglify()))
		.pipe(sourcemaps.write('.')) // writes .map file
		.pipe(gulp.dest(buildDirectory));

	// Don't bother linting in prod environment--errors will only be fixed in dev anyway
	if (IS_DEVELOPMENT) {
		return merge(
			_getLintStream(changedFiles),
			compileStream
		);
	}

	return compileStream;
}

function _scriptsTask(watch) {
	var bundler = browserify([path.join(__dirname, 'index.js')], browserifyOptions);
	
	if (watch) {
		bundler = watchify(bundler);
	}
	
	bundler.transform(babelify.configure(babelifyOptions));

	if (watch) {
		bundler.on('update', _.bind(_compileScripts, undefined, bundler));
	}

	return _compileScripts(bundler);
}

gulp.task('browser-build', ['clean-build'], function() {
	return _scriptsTask();
});

gulp.task('watch-browser-build', function() {
	return _scriptsTask(true);
});

gulp.task('lint', function() {
	return _getLintStream();
});

gulp.task('clean-build', function(done) {
	_cleanBuild().then(function() {
		done();
	});
});

gulp.task('clean-docs', function(done) {
	_cleanDocumentation().then(function() {
		done();
	});
});

gulp.task('clean', function(done) {
	_cleanBuild().then(function() {
		_cleanDocumentation();
	}).then(
		function() {
			done();
		}
	);
});

gulp.task('build', ['browser-build', 'docs']);

gulp.task('docs', ['clean-docs'], function(done) {
	fs.readFile('./.jsdocrc', { encoding: 'utf8' }, function(err, configText) {
		if (err) {
			throw new Error(err);
		}

		var jsdocConfig = JSON.parse(configText);

		jsdocConfig.opts = jsdocConfig.opts || {};
		jsdocConfig.opts.destination = documentationDirectory;

		gulp.src(jsFileBlobs, { read: false }).
			pipe(jsdoc(jsdocConfig, done));
	});
});
