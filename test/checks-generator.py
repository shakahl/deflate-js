#!/usr/bin/env python

import zlib
import base64
import os
import json

def deflate(data, compresslevel=9):
	compress = zlib.compressobj(
		compresslevel,        # level: 0-9
		zlib.DEFLATED,        # method: must be DEFLATED
		-zlib.MAX_WBITS,      # window size in bits:
		                      #   -15..-8: negate, suppress header
		                      #   8..15: normal
		                      #   16..30: subtract 16, gzip header
		zlib.DEF_MEM_LEVEL,   # mem level: 1..8/9
		0                     # strategy:
		                      #   0 = Z_DEFAULT_STRATEGY
		                      #   1 = Z_FILTERED
		                      #   2 = Z_HUFFMAN_ONLY
		                      #   3 = Z_RLE
		                      #   4 = Z_FIXED
	)
	deflated = compress.compress(data)
	deflated += compress.flush()
	return deflated

def inflate(data):
	decompress = zlib.decompressobj(-zlib.MAX_WBITS)  # see above
	inflated = decompress.decompress(data)
	inflated += decompress.flush()
	return inflated

out = {}

for tFile in os.listdir('test-files'):
	f = open(os.path.join('test-files', tFile))
	data = f.read()
	f.close()
	out[tFile] = base64.b64encode(deflate(data))

f = open('checks.json', 'w+')
f.write(json.JSONEncoder().encode(out))
