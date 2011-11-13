Intro
=====

Does deflate compression/decompression in the browser and node.

This module is not meant to be run on node for any production code. The native version of deflate should be used instead because it is much faster.  The main reason for this being node-compatible is for testing purposes.

Install
=======

For node, deflate-js can be installed with npm: `npm install deflate-js`

For the browser, deflate-js can be installed with pakmanager.

API
===

Deflate:

> *deflate(str[, level])*
> 
> **str**- The string to compress
> 
> **level**- 1-9 (compression level; optional)

Inflate:

> *inflate(str)*
> 
> 
> **str**- The string to decompress

The basic usage (no level) will suffice for most purposes.

Basic Usage
-----------

    var deflate = require('deflate-js');

	// compress some text
	var compressed = deflate.deflate('Hello world');

	// decompress some text
	var decompressed = deflate.inflate(compressed);


