#!/usr/bin/env node

(function () {
	'use strict';

	var fs = require('fs'),
		path = require('path'),
		Base64 = require('../examples/base64'),
		inflate = require('../lib/rawinflate.js'),
		deflate = require('../lib/rawdeflate.js'),
		testFileDir = './test-files',
		checks;
	
	checks = JSON.parse(fs.readFileSync('./checks.json', 'utf8'));

	fs.readdirSync(testFileDir).forEach(function (file) {
		var data = fs.readFileSync(path.join(testFileDir, file), 'utf8'),
			result;

		result = Base64.toBase64(deflate(data));

		if (checks[file] !== result) {
			console.log(file, '- Failed:', result, checks[file]);
		} else {
			console.log(file, '- Passed');
		}
	});
}());
