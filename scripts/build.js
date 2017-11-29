#!/usr/bin/env node

const path = require("path");
const assert = require("assert");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const mkdirp = Promise.promisify(require("mkdirp"));
const browserify = require("browserify");
const babelify = require("babelify");
const exorcist = require("exorcist");
const del = require("del");
const debug = require("debug")("xpuz:build");
require("babel-core/register"); // needed to properly require ../src/index below
const index = require("../src/index");

const SOURCE_DIR = path.resolve(__dirname, "..", "src");
const OUTPUT_DIR = path.resolve(__dirname, "..", "dist");
const ENTRY_FILE = path.join(SOURCE_DIR, "index.js");
const OUTPUT_FILE = path.join(OUTPUT_DIR, `xpuz.js`);

const SOURCE_MAP_PATH = path.join(OUTPUT_DIR, `xpuz.js.map`);

debug("Bundling entry point %s for production build", ENTRY_FILE);

mkdirp(OUTPUT_DIR).then(
	() => debug("Created output directory %s", OUTPUT_DIR)
).catch(() => {}).then(
	()  => {
		debug("Removing existing output files if they exist", OUTPUT_DIR);
		return del([OUTPUT_FILE, SOURCE_MAP_PATH]).then(
			() => debug("Removed output files")
		).catch(
			(err) => {
				debug("Error removing output files: %s", err);
			}
		);
	}
).then(
	() => new Promise(
		(resolve, reject) => {
			const bundler = browserify(
				ENTRY_FILE,
				{
					standalone: "XPuz",
					debug: true,
					basedir: SOURCE_DIR,
					bundleExternal: false,
				}
			).transform(
				babelify.configure({ comments: false, sourceRoot: SOURCE_DIR })
			).transform("uglifyify", { global: true });

			const stream = bundler.bundle()
				.pipe(exorcist(SOURCE_MAP_PATH, null, null, SOURCE_DIR, true))
				.pipe(fs.createWriteStream(OUTPUT_FILE), "utf8");

			stream.on("finish", () => resolve());

			stream.on("error", reject);
		}
	)
).then(
	() => {
		debug("Checking bundle");
		const bundleOutput = require(OUTPUT_FILE);

		Object.keys(index).forEach(
			(key) => assert(bundleOutput[key], `Bundle contains ${key} key`)
		);
	}
).then(
	() => {
		debug("Build complete");
		process.exit(0);
	}
);
