module.exports = {
	"plugins": [
		"transform-undefined-to-void"
	],
	"presets": [
		"@babel/preset-env",
		"@babel/preset-typescript"
	],
	"env": {
		"production": {
			"only": [
				"src"
			],
		},
		"test": {
			"plugins": [
				"transform-es2015-modules-commonjs",
				"dynamic-import-node"
			]
		}
	}
};
