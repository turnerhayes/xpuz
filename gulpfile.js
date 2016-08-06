"use strict";

const _                    = require('lodash');
const path                 = require('path');
const fs                   = require('fs');
const del                  = require('del');

const gulp                 = require('gulp');
const gulpIf               = require('gulp-if');
const jshint               = require('gulp-jshint');
const gutil                = require('gulp-util');
const sourcemaps           = require('gulp-sourcemaps');
const uglify               = require('gulp-uglify');
const jsdoc                = require('gulp-jsdoc3');

const watchify             = require('watchify');
const browserify           = require('browserify');
const babelify             = require('babelify');
const source               = require('vinyl-source-stream');
const buffer               = require('vinyl-buffer');
const merge                = require('merge-stream');
const stylish              = require('jshint-stylish');

const IS_DEVELOPMENT = process.env.NODE_ENV ? process.env.NODE_ENV === 'development' : true;

const documentationDirectory = path.join(__dirname, 'docs');

const buildDirectory = path.join(__dirname, 'dist');

const jsFileBlobs = ['index.js', 'parsers/**/*.js', 'lib/**/*.js'];

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

		let jsdocConfig = JSON.parse(configText);

		jsdocConfig.opts = jsdocConfig.opts || {};
		jsdocConfig.opts.destination = documentationDirectory;

		gulp.src(jsFileBlobs, { read: false }).
			pipe(jsdoc(jsdocConfig, done));
	});
});
