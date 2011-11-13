var global = Function("return this;")()
/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context.$

  function require (identifier) {
    // modules can be required from ender's build system, or found on the window
    var module = modules[identifier] || window[identifier]
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules[name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  function boosh(s, r, els) {
    // string || node || nodelist || window
    if (typeof s == 'string' || s.nodeName || (s.length && 'item' in s) || s == window) {
      els = ender._select(s, r)
      els.selector = s
    } else els = isFinite(s.length) ? s : [s]
    return aug(els, boosh)
  }

  function ender(s, r) {
    return boosh(s, r)
  }

  aug(ender, {
      _VERSION: '0.3.6'
    , fn: boosh // for easy compat to jQuery plugins
    , ender: function (o, chain) {
        aug(chain ? boosh : ender, o)
      }
    , _select: function (s, r) {
        return (r || document).querySelectorAll(s)
      }
  })

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
      // return self for chaining
      return this
    },
    $: ender // handy reference to self
  })

  ender.noConflict = function () {
    context.$ = old
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this);
// ender:domready as domready
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function (name, definition) {
    if (typeof define == 'function') define(definition)
    else if (typeof module != 'undefined') module.exports = definition()
    else this[name] = this['domReady'] = definition()
  }('domready', function (ready) {
  
    var fns = [], fn, f = false
      , doc = document
      , testEl = doc.documentElement
      , hack = testEl.doScroll
      , domContentLoaded = 'DOMContentLoaded'
      , addEventListener = 'addEventListener'
      , onreadystatechange = 'onreadystatechange'
      , loaded = /^loade|c/.test(doc.readyState)
  
    function flush(f) {
      loaded = 1
      while (f = fns.shift()) f()
    }
  
    doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
      doc.removeEventListener(domContentLoaded, fn, f)
      flush()
    }, f)
  
  
    hack && doc.attachEvent(onreadystatechange, (fn = function () {
      if (/^c/.test(doc.readyState)) {
        doc.detachEvent(onreadystatechange, fn)
        flush()
      }
    }))
  
    return (ready = hack ?
      function (fn) {
        self != top ?
          loaded ? fn() : fns.push(fn) :
          function () {
            try {
              testEl.doScroll('left')
            } catch (e) {
              return setTimeout(function() { ready(fn) }, 50)
            }
            fn()
          }()
      } :
      function (fn) {
        loaded ? fn() : fns.push(fn)
      })
  })

  provide("domready", module.exports);
  provide("domready", module.exports);
  $.ender(module.exports);
}(global));

// ender:domready/ender-bridge as domready/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function ($) {
    var ready =  require('domready')
    $.ender({domReady: ready})
    $.ender({
      ready: function (f) {
        ready(f)
        return this
      }
    }, true)
  }(ender);

  provide("domready/ender-bridge", module.exports);
  provide("domready/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:qwery as qwery
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * Qwery - A Blazing Fast query selector engine
    * https://github.com/ded/qwery
    * copyright Dustin Diaz & Jacob Thornton 2011
    * MIT License
    */
  
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
    else this[name] = definition()
  }('qwery', function () {
    var context = this
      , doc = document
      , old = context.qwery
      , html = doc.documentElement
      , byClass = 'getElementsByClassName'
      , byTag = 'getElementsByTagName'
      , byId = 'getElementById'
      , qSA = 'querySelectorAll'
      , id = /#([\w\-]+)/
      , clas = /\.[\w\-]+/g
      , idOnly = /^#([\w\-]+)$/
      , classOnly = /^\.([\w\-]+)$/
      , tagOnly = /^([\w\-]+)$/
      , tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/
      , easy = new RegExp(idOnly.source + '|' + tagOnly.source + '|' + classOnly.source)
      , splittable = /(^|,)\s*[>~+]/
      , normalizr = /^\s+|\s*([,\s\+\~>]|$)\s*/g
      , splitters = /[\s\>\+\~]/
      , splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\]|[\s\w\+\-]*\))/
      , specialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g
      , simple = /^([a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/
      , attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/
      , pseudo = /:([\w\-]+)(\(['"]?([\s\w\+\-]+)['"]?\))?/
      , dividers = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g')
      , tokenizr = new RegExp(splitters.source + splittersMore.source)
      , chunker = new RegExp(simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?')
      , walker = {
          ' ': function (node) {
            return node && node !== html && node.parentNode
          }
        , '>': function (node, contestant) {
            return node && node.parentNode == contestant.parentNode && node.parentNode
          }
        , '~': function (node) {
            return node && node.previousSibling
          }
        , '+': function (node, contestant, p1, p2) {
            if (!node) return false
            return (p1 = previous(node)) && (p2 = previous(contestant)) && p1 == p2 && p1
          }
        }
  
    function cache() {
      this.c = {}
    }
    cache.prototype = {
        g: function (k) {
          return this.c[k] || undefined
        }
      , s: function (k, v) {
          return (this.c[k] = v)
        }
    }
  
    var classCache = new cache()
      , cleanCache = new cache()
      , attrCache = new cache()
      , tokenCache = new cache()
  
    function classRegex(c) {
      return classCache.g(c) || classCache.s(c, new RegExp('(^|\\s+)' + c + '(\\s+|$)'));
    }
  
    // not quite as fast as inline loops in older browsers so don't use liberally
    function each(a, fn) {
      var i = 0, l = a.length
      for (; i < l; i++) fn.call(null, a[i])
    }
  
    function flatten(ar) {
      var r = []
      each(ar, function(a) {
        if (arrayLike(a)) r = r.concat(a)
        else r[r.length] = a
      });
      return r
    }
  
    function arrayify(ar) {
      var i = 0, l = ar.length, r = []
      for (; i < l; i++) r[i] = ar[i]
      return r
    }
  
    function previous(n) {
      while (n = n.previousSibling) if (n.nodeType == 1) break;
      return n
    }
  
    function q(query) {
      return query.match(chunker)
    }
  
    // called using `this` as element and arguments from regex group results.
    // given => div.hello[title="world"]:foo('bar')
    // div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
    function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal) {
      var i, m, k, o, classes
      if (tag && this.tagName.toLowerCase() !== tag) return false
      if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) return false
      if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
        for (i = classes.length; i--;) {
          if (!classRegex(classes[i].slice(1)).test(this.className)) return false
        }
      }
      if (pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo](this, pseudoVal)) {
        return false
      }
      if (wholeAttribute && !value) { // select is just for existance of attrib
        o = this.attributes
        for (k in o) {
          if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
            return this
          }
        }
      }
      if (wholeAttribute && !checkAttr(qualifier, getAttr(this, attribute) || '', value)) {
        // select is for attrib equality
        return false
      }
      return this
    }
  
    function clean(s) {
      return cleanCache.g(s) || cleanCache.s(s, s.replace(specialChars, '\\$1'))
    }
  
    function checkAttr(qualify, actual, val) {
      switch (qualify) {
      case '=':
        return actual == val
      case '^=':
        return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, new RegExp('^' + clean(val))))
      case '$=':
        return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, new RegExp(clean(val) + '$')))
      case '*=':
        return actual.match(attrCache.g(val) || attrCache.s(val, new RegExp(clean(val))))
      case '~=':
        return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, new RegExp('(?:^|\\s+)' + clean(val) + '(?:\\s+|$)')))
      case '|=':
        return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, new RegExp('^' + clean(val) + '(-|$)')))
      }
      return 0
    }
  
    // given a selector, first check for simple cases then collect all base candidate matches and filter
    function _qwery(selector) {
      var r = [], ret = [], i, l, m, token, tag, els, root, intr, item
        , tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
        , dividedTokens = selector.match(dividers)
  
      if (!tokens.length) return r
      tokens = tokens.slice(0) // this makes a copy of the array so the cached original is not affected
  
      token = tokens.pop()
      root = tokens.length && (m = tokens[tokens.length - 1].match(idOnly)) ? doc[byId](m[1]) : doc
      if (!root) return r
  
      intr = q(token)
      // collect base candidates to filter
      els = root.nodeType !== 9 && dividedTokens && /^[+~]$/.test(dividedTokens[dividedTokens.length - 1]) ?
        function (r) {
          while (root = root.nextSibling) {
            root.nodeType == 1 && (intr[1] ? intr[1] == root.tagName.toLowerCase() : 1) && (r[r.length] = root)
          }
          return r
        }([]) :
        root[byTag](intr[1] || '*')
      // filter elements according to the right-most part of the selector
      for (i = 0, l = els.length; i < l; i++) {
        if (item = interpret.apply(els[i], intr)) r[r.length] = item
      }
      if (!tokens.length) return r
  
      // filter further according to the rest of the selector (the left side)
      each(r, function(e) { if (ancestorMatch(e, tokens, dividedTokens)) ret[ret.length] = e })
      return ret
    }
  
    // compare element to a selector
    function is(el, selector, root) {
      if (isNode(selector)) return el == selector
      if (arrayLike(selector)) return !!~flatten(selector).indexOf(el) // if selector is an array, is el a member?
  
      var selectors = selector.split(','), tokens, dividedTokens
      while (selector = selectors.pop()) {
        tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
        dividedTokens = selector.match(dividers)
        tokens = tokens.slice(0) // copy array
        if (interpret.apply(el, q(tokens.pop())) && (!tokens.length || ancestorMatch(el, tokens, dividedTokens, root))) {
          return true
        }
      }
    }
  
    // given elements matching the right-most part of a selector, filter out any that don't match the rest
    function ancestorMatch(el, tokens, dividedTokens, root) {
      var cand
      // recursively work backwards through the tokens and up the dom, covering all options
      function crawl(e, i, p) {
        while (p = walker[dividedTokens[i]](p, e)) {
          if (isNode(p) && (found = interpret.apply(p, q(tokens[i])))) {
            if (i) {
              if (cand = crawl(p, i - 1, p)) return cand
            } else return p
          }
        }
      }
      return (cand = crawl(el, tokens.length - 1, el)) && (!root || isAncestor(cand, root))
    }
  
    function isNode(el) {
      return el && typeof el === 'object' && el.nodeType && (el.nodeType == 1 || el.nodeType == 9)
    }
  
    function uniq(ar) {
      var a = [], i, j;
      label:
      for (i = 0; i < ar.length; i++) {
        for (j = 0; j < a.length; j++) {
          if (a[j] == ar[i]) continue label;
        }
        a[a.length] = ar[i]
      }
      return a
    }
  
    function arrayLike(o) {
      return (typeof o === 'object' && isFinite(o.length))
    }
  
    function normalizeRoot(root) {
      if (!root) return doc
      if (typeof root == 'string') return qwery(root)[0]
      if (arrayLike(root)) return root[0]
      return root
    }
  
    function qwery(selector, _root) {
      var m, el, root = normalizeRoot(_root)
  
      // easy, fast cases that we can dispatch with simple DOM calls
      if (!root || !selector) return []
      if (selector === window || isNode(selector)) {
        return !_root || (selector !== window && isNode(root) && isAncestor(selector, root)) ? [selector] : []
      }
      if (selector && arrayLike(selector)) return flatten(selector)
      if (m = selector.match(easy)) {
        if (m[1]) return (el = doc[byId](m[1])) ? [el] : []
        if (m[2]) return arrayify(root[byTag](m[2]))
        if (supportsCSS3 && m[3]) return arrayify(root[byClass](m[3]))
      }
  
      return select(selector, root)
    }
  
    // where the root is not document and a relationship selector is first we have to
    // do some awkward adjustments to get it to work, even with qSA
    function collectSelector(root, collector) {
      return function(s) {
        var oid, nid
        if (splittable.test(s)) {
          if (root !== doc) {
           // make sure the el has an id, rewrite the query, set root to doc and run it
           if (!(nid = oid = root.getAttribute('id'))) root.setAttribute('id', nid = '__qwerymeupscotty')
           s = '#' + nid + s
           collector(doc, s)
           oid || root.removeAttribute('id')
          }
          return;
        }
        s.length && collector(root, s)
      }
    }
  
    var isAncestor = 'compareDocumentPosition' in html ?
      function (element, container) {
        return (container.compareDocumentPosition(element) & 16) == 16
      } : 'contains' in html ?
      function (element, container) {
        container = container == doc || container == window ? html : container
        return container !== element && container.contains(element)
      } :
      function (element, container) {
        while (element = element.parentNode) if (element === container) return 1
        return 0
      }
    , getAttr = function() {
        // detect buggy IE src/href getAttribute() call
        var e = doc.createElement('p')
        return ((e.innerHTML = '<a href="#x">x</a>') && e.firstChild.getAttribute('href') != '#x') ?
          function(e, a) {
            return a === 'class' ? e.className : (a === 'href' || a === 'src') ?
              e.getAttribute(a, 2) : e.getAttribute(a)
          } :
          function(e, a) { return e.getAttribute(a) }
     }()
    , supportsCSS3 = function () {
        // does native qSA support CSS3 level selectors
        try {
          return doc[byClass] && doc.querySelector && doc[qSA] && doc[qSA](':nth-of-type(1)').length
        } catch (e) { return false }
      }()
    , select = supportsCSS3 ?
      function (selector, root) {
        var result = [], ss, e
        if (root === doc || !splittable.test(selector)) {
          // most work is done right here, defer to qSA
          return arrayify(root[qSA](selector))
        }
        // special case where we need the services of `collectSelector()`
        each(ss = selector.split(','), collectSelector(root, function(ctx, s) {
          e = ctx[qSA](s)
          if (e.length == 1) result[result.length] = e.item(0)
          else if (e.length) result = result.concat(arrayify(e))
        }))
        return ss.length > 1 && result.length > 1 ? uniq(result) : result
      } :
      function (selector, root) {
        var result = [], m, i, l, r, ss
        selector = selector.replace(normalizr, '$1')
        if (m = selector.match(tagAndOrClass)) {
          // simple & common case, safe to use non-CSS3 qSA if present
          if (root[qSA]) return arrayify(root[qSA](selector))
          r = classRegex(m[2])
          items = root[byTag](m[1] || '*')
          for (i = 0, l = items.length; i < l; i++) {
            if (r.test(items[i].className)) result[result.length] = items[i]
          }
          return result
        }
        // more complex selector, get `_qwery()` to do the work for us
        each(ss = selector.split(','), collectSelector(root, function(ctx, s) {
          var i = 0, r = _qwery(s), l = r.length
          for (; i < l; i++) {
            if (ctx === doc || isAncestor(r[i], root)) result[result.length] = r[i]
          }
        }))
        return ss.length > 1 && result.length > 1 ? uniq(result) : result
      }
  
    qwery.uniq = uniq
    qwery.is = is
    qwery.pseudos = {}
  
    qwery.noConflict = function () {
      context.qwery = old
      return this
    }
  
    return qwery
  })
  

  provide("qwery", module.exports);
  provide("qwery", module.exports);
  $.ender(module.exports);
}(global));

// ender:qwery/ender-bridge as qwery/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function (doc, $) {
    var q =  require('qwery')
      , table = 'table'
      , nodeMap = {
            thead: table
          , tbody: table
          , tfoot: table
          , tr: 'tbody'
          , th: 'tr'
          , td: 'tr'
          , fieldset: 'form'
          , option: 'select'
        }
    function create(node, root) {
      var tag = /^\s*<([^\s>]+)\s*/.exec(node)[1]
        , el = (root || doc).createElement(nodeMap[tag] || 'div'), els = []
  
      el.innerHTML = node
      var nodes = el.childNodes
      el = el.firstChild
      el.nodeType == 1 && els.push(el)
      while (el = el.nextSibling) (el.nodeType == 1) && els.push(el)
      return els
    }
  
    $._select = function (s, r) {
      return /^\s*</.test(s) ? create(s, r) : q(s, r)
    }
  
    $.pseudos = q.pseudos
  
    $.ender({
      find: function (s) {
        var r = [], i, l, j, k, els
        for (i = 0, l = this.length; i < l; i++) {
          els = q(s, this[i])
          for (j = 0, k = els.length; j < k; j++) r.push(els[j])
        }
        return $(q.uniq(r))
      }
      , and: function (s) {
        var plus = $(s)
        for (var i = this.length, j = 0, l = this.length + plus.length; i < l; i++, j++) {
          this[i] = plus[j]
        }
        return this
      }
      , is: function(s, r) {
        var i, l
        for (i = 0, l = this.length; i < l; i++) {
          if (q.is(this[i], s, r)) {
            return true
          }
        }
        return false
      }
    }, true)
  }(document, ender);
  

  provide("qwery/ender-bridge", module.exports);
  provide("qwery/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:bonzo as bonzo
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * Bonzo: DOM Utility (c) Dustin Diaz 2011
    * https://github.com/ded/bonzo
    * License MIT
    */
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && define.amd) define(name, definition)
    else this[name] = definition()
  }('bonzo', function() {
    var context = this
      , old = context.bonzo
      , win = window
      , doc = win.document
      , html = doc.documentElement
      , parentNode = 'parentNode'
      , query = null
      , specialAttributes = /^checked|value|selected$/
      , specialTags = /select|fieldset|table|tbody|tfoot|td|tr|colgroup/i
      , table = [ '<table>', '</table>', 1 ]
      , td = [ '<table><tbody><tr>', '</tr></tbody></table>', 3 ]
      , option = [ '<select>', '</select>', 1 ]
      , tagMap = {
          thead: table, tbody: table, tfoot: table, colgroup: table, caption: table
          , tr: [ '<table><tbody>', '</tbody></table>', 2 ]
          , th: td , td: td
          , col: [ '<table><colgroup>', '</colgroup></table>', 2 ]
          , fieldset: [ '<form>', '</form>', 1 ]
          , legend: [ '<form><fieldset>', '</fieldset></form>', 2 ]
          , option: option
          , optgroup: option }
      , stateAttributes = /^checked|selected$/
      , ie = /msie/i.test(navigator.userAgent)
      , uidList = []
      , uuids = 0
      , digit = /^-?[\d\.]+$/
      , dattr = /^data-(.+)$/
      , px = 'px'
      , setAttribute = 'setAttribute'
      , getAttribute = 'getAttribute'
      , byTag = 'getElementsByTagName'
      , features = function() {
          var e = doc.createElement('p')
          e.innerHTML = '<a href="#x">x</a><table style="float:left;"></table>'
          return {
            hrefExtended: e[byTag]('a')[0][getAttribute]('href') != '#x' // IE < 8
            , autoTbody: e[byTag]('tbody').length !== 0 // IE < 8
            , computedStyle: doc.defaultView && doc.defaultView.getComputedStyle
            , cssFloat: e[byTag]('table')[0].style.styleFloat ? 'styleFloat' : 'cssFloat'
            , transform: function () {
                var props = ['webkitTransform', 'MozTransform', 'OTransform', 'msTransform', 'Transform'], i
                for (i = 0; i < props.length; i++) {
                  if (props[i] in e.style) return props[i]
                }
              }()
          }
        }()
      , trimReplace = /(^\s*|\s*$)/g
      , unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 }
      , trim = String.prototype.trim ?
          function (s) {
            return s.trim()
          } :
          function (s) {
            return s.replace(trimReplace, '')
          }
  
    function classReg(c) {
      return new RegExp("(^|\\s+)" + c + "(\\s+|$)")
    }
  
    function each(ar, fn, scope) {
      for (var i = 0, l = ar.length; i < l; i++) fn.call(scope || ar[i], ar[i], i, ar)
      return ar
    }
  
    function camelize(s) {
      return s.replace(/-(.)/g, function (m, m1) {
        return m1.toUpperCase()
      })
    }
  
    function decamelize(s) {
      return s ? s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : s
    }
  
    function data(el) {
      el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids)
      uid = el[getAttribute]('data-node-uid')
      return uidList[uid] || (uidList[uid] = {})
    }
  
    function dataValue(d) {
      try {
        return d === 'true' ? true : d === 'false' ? false : d === 'null' ? null : !isNaN(d) ? parseFloat(d) : d;
      } catch(e) {}
      return undefined
    }
  
    function isNode(node) {
      return node && node.nodeName && node.nodeType == 1
    }
  
    function some(ar, fn, scope, i) {
      for (i = 0, j = ar.length; i < j; ++i) if (fn.call(scope, ar[i], i, ar)) return true
      return false
    }
  
    function styleProperty(p) {
        (p == 'transform' && (p = features.transform)) ||
          (/^transform-?[Oo]rigin$/.test(p) && (p = features.transform + "Origin")) ||
          (p == 'float' && (p = features.cssFloat))
        return p ? camelize(p) : null
    }
  
    var getStyle = features.computedStyle ?
      function (el, property) {
        var value = null
          , computed = doc.defaultView.getComputedStyle(el, '')
        computed && (value = computed[property])
        return el.style[property] || value
      } :
  
      (ie && html.currentStyle) ?
  
      function (el, property) {
        if (property == 'opacity') {
          var val = 100
          try {
            val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity
          } catch (e1) {
            try {
              val = el.filters('alpha').opacity
            } catch (e2) {}
          }
          return val / 100
        }
        var value = el.currentStyle ? el.currentStyle[property] : null
        return el.style[property] || value
      } :
  
      function (el, property) {
        return el.style[property]
      }
  
    // this insert method is intense
    function insert(target, host, fn) {
      var i = 0, self = host || this, r = []
        // target nodes could be a css selector if it's a string and a selector engine is present
        // otherwise, just use target
        , nodes = query && typeof target == 'string' && target.charAt(0) != '<' ? query(target) : target
      // normalize each node in case it's still a string and we need to create nodes on the fly
      each(normalize(nodes), function (t) {
        each(self, function (el) {
          var n = !el[parentNode] || (el[parentNode] && !el[parentNode][parentNode]) ?
            function () {
              var c = el.cloneNode(true)
              // check for existence of an event cloner
              // preferably https://github.com/fat/bean
              // otherwise Bonzo won't do this for you
              self.$ && self.cloneEvents && self.$(c).cloneEvents(el)
              return c
            }() : el
          fn(t, n)
          r[i] = n
          i++
        })
      }, this)
      each(r, function (e, i) {
        self[i] = e
      })
      self.length = i
      return self
    }
  
    function xy(el, x, y) {
      var $el = bonzo(el)
        , style = $el.css('position')
        , offset = $el.offset()
        , rel = 'relative'
        , isRel = style == rel
        , delta = [parseInt($el.css('left'), 10), parseInt($el.css('top'), 10)]
  
      if (style == 'static') {
        $el.css('position', rel)
        style = rel
      }
  
      isNaN(delta[0]) && (delta[0] = isRel ? 0 : el.offsetLeft)
      isNaN(delta[1]) && (delta[1] = isRel ? 0 : el.offsetTop)
  
      x != null && (el.style.left = x - offset.left + delta[0] + px)
      y != null && (el.style.top = y - offset.top + delta[1] + px)
  
    }
  
    function hasClass(el, c) {
      return classReg(c).test(el.className)
    }
    function addClass(el, c) {
      el.className = trim(el.className + ' ' + c)
    }
    function removeClass(el, c) {
      el.className = trim(el.className.replace(classReg(c), ' '))
    }
  
    // this allows method calling for setting values
    // example:
  
    // bonzo(elements).css('color', function (el) {
    //   return el.getAttribute('data-original-color')
    // })
  
    function setter(el, v) {
      return typeof v == 'function' ? v(el) : v
    }
  
    function Bonzo(elements) {
      this.length = 0
      if (elements) {
        elements = typeof elements !== 'string' &&
          !elements.nodeType &&
          typeof elements.length !== 'undefined' ?
            elements :
            [elements]
        this.length = elements.length
        for (var i = 0; i < elements.length; i++) {
          this[i] = elements[i]
        }
      }
    }
  
    Bonzo.prototype = {
  
        get: function (index) {
          return this[index]
        }
  
      , each: function (fn, scope) {
          return each(this, fn, scope)
        }
  
      , map: function (fn, reject) {
          var m = [], n, i
          for (i = 0; i < this.length; i++) {
            n = fn.call(this, this[i], i)
            reject ? (reject(n) && m.push(n)) : m.push(n)
          }
          return m
        }
  
      , first: function () {
          return bonzo(this.length ? this[0] : [])
        }
  
      , last: function () {
          return bonzo(this.length ? this[this.length - 1] : [])
        }
  
      , html: function (h, text) {
          var method = text ?
            html.textContent === undefined ?
              'innerText' :
              'textContent' :
            'innerHTML', m;
          function append(el) {
            while (el.firstChild) el.removeChild(el.firstChild)
            each(normalize(h), function (node) {
              el.appendChild(node)
            })
          }
          return typeof h !== 'undefined' ?
              this.each(function (el) {
                !text && (m = el.tagName.match(specialTags)) ?
                  append(el, m[0]) :
                  (el[method] = h)
              }) :
            this[0] ? this[0][method] : ''
        }
  
      , text: function (text) {
          return this.html(text, 1)
        }
  
      , addClass: function (c) {
          return this.each(function (el) {
            hasClass(el, setter(el, c)) || addClass(el, setter(el, c))
          })
        }
  
      , removeClass: function (c) {
          return this.each(function (el) {
            hasClass(el, setter(el, c)) && removeClass(el, setter(el, c))
          })
        }
  
      , hasClass: function (c) {
          return some(this, function (el) {
            return hasClass(el, c)
          })
        }
  
      , toggleClass: function (c, condition) {
          return this.each(function (el) {
            typeof condition !== 'undefined' ?
              condition ? addClass(el, c) : removeClass(el, c) :
              hasClass(el, c) ? removeClass(el, c) : addClass(el, c)
          })
        }
  
      , show: function (type) {
          return this.each(function (el) {
            el.style.display = type || ''
          })
        }
  
      , hide: function () {
          return this.each(function (el) {
            el.style.display = 'none'
          })
        }
  
      , append: function (node) {
          return this.each(function (el) {
            each(normalize(node), function (i) {
              el.appendChild(i)
            })
          })
        }
  
      , prepend: function (node) {
          return this.each(function (el) {
            var first = el.firstChild
            each(normalize(node), function (i) {
              el.insertBefore(i, first)
            })
          })
        }
  
      , appendTo: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t.appendChild(el)
          })
        }
  
      , prependTo: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t.insertBefore(el, t.firstChild)
          })
        }
  
      , next: function () {
          return this.related('nextSibling')
        }
  
      , previous: function () {
          return this.related('previousSibling')
        }
  
      , related: function (method) {
          return this.map(
            function (el) {
              el = el[method]
              while (el && el.nodeType !== 1) {
                el = el[method]
              }
              return el || 0
            },
            function (el) {
              return el
            }
          )
        }
  
      , before: function (node) {
          return this.each(function (el) {
            each(bonzo.create(node), function (i) {
              el[parentNode].insertBefore(i, el)
            })
          })
        }
  
      , after: function (node) {
          return this.each(function (el) {
            each(bonzo.create(node), function (i) {
              el[parentNode].insertBefore(i, el.nextSibling)
            })
          })
        }
  
      , insertBefore: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t[parentNode].insertBefore(el, t)
          })
        }
  
      , insertAfter: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            var sibling = t.nextSibling
            if (sibling) {
              t[parentNode].insertBefore(el, sibling);
            }
            else {
              t[parentNode].appendChild(el)
            }
          })
        }
  
      , replaceWith: function(html) {
          return this.each(function (el) {
            el.parentNode.replaceChild(bonzo.create(html)[0], el)
          })
        }
  
      , css: function (o, v, p) {
          // is this a request for just getting a style?
          if (v === undefined && typeof o == 'string') {
            // repurpose 'v'
            v = this[0]
            if (!v) {
              return null
            }
            if (v === doc || v === win) {
              p = (v === doc) ? bonzo.doc() : bonzo.viewport()
              return o == 'width' ? p.width : o == 'height' ? p.height : ''
            }
            return (o = styleProperty(o)) ? getStyle(v, o) : null
          }
          var iter = o
          if (typeof o == 'string') {
            iter = {}
            iter[o] = v
          }
  
          if (ie && iter.opacity) {
            // oh this 'ol gamut
            iter.filter = 'alpha(opacity=' + (iter.opacity * 100) + ')'
            // give it layout
            iter.zoom = o.zoom || 1;
            delete iter.opacity;
          }
  
          function fn(el, p, v) {
            for (var k in iter) {
              if (iter.hasOwnProperty(k)) {
                v = iter[k];
                // change "5" to "5px" - unless you're line-height, which is allowed
                (p = styleProperty(k)) && digit.test(v) && !(p in unitless) && (v += px)
                el.style[p] = setter(el, v)
              }
            }
          }
          return this.each(fn)
        }
  
      , offset: function (x, y) {
          if (typeof x == 'number' || typeof y == 'number') {
            return this.each(function (el) {
              xy(el, x, y)
            })
          }
          if (!this[0]) return {
              top: 0
            , left: 0
            , height: 0
            , width: 0
          }
          var el = this[0]
            , width = el.offsetWidth
            , height = el.offsetHeight
            , top = el.offsetTop
            , left = el.offsetLeft
          while (el = el.offsetParent) {
            top = top + el.offsetTop
            left = left + el.offsetLeft
          }
  
          return {
              top: top
            , left: left
            , height: height
            , width: width
          }
        }
  
      , dim: function () {
          var el = this[0]
            , orig = !el.offsetWidth && !el.offsetHeight ?
               // el isn't visible, can't be measured properly, so fix that
               function (t, s) {
                  s = {
                      position: el.style.position || ''
                    , visibility: el.style.visibility || ''
                    , display: el.style.display || ''
                  }
                  t.first().css({
                      position: 'absolute'
                    , visibility: 'hidden'
                    , display: 'block'
                  })
                  return s
                }(this) : null
            , width = el.offsetWidth
            , height = el.offsetHeight
  
          orig && this.first().css(orig)
          return {
              height: height
            , width: width
          }
        }
  
      , attr: function (k, v) {
          var el = this[0]
          if (typeof k != 'string' && !(k instanceof String)) {
            for (var n in k) {
              k.hasOwnProperty(n) && this.attr(n, k[n])
            }
            return this
          }
          return typeof v == 'undefined' ?
            specialAttributes.test(k) ?
              stateAttributes.test(k) && typeof el[k] == 'string' ?
                true : el[k] : (k == 'href' || k =='src') && features.hrefExtended ?
                  el[getAttribute](k, 2) : el[getAttribute](k) :
            this.each(function (el) {
              specialAttributes.test(k) ? (el[k] = setter(el, v)) : el[setAttribute](k, setter(el, v))
            })
        }
  
      , val: function (s) {
          return (typeof s == 'string') ? this.attr('value', s) : this[0].value
        }
  
      , removeAttr: function (k) {
          return this.each(function (el) {
            stateAttributes.test(k) ? (el[k] = false) : el.removeAttribute(k)
          })
        }
  
      , data: function (k, v) {
          var el = this[0], uid, o, m
          if (typeof v === 'undefined') {
            o = data(el)
            if (typeof k === 'undefined') {
              each(el.attributes, function(a) {
                (m = (''+a.name).match(dattr)) && (o[camelize(m[1])] = dataValue(a.value))
              })
              return o
            } else {
              return typeof o[k] === 'undefined' ?
                (o[k] = dataValue(this.attr('data-' + decamelize(k)))) : o[k]
            }
          } else {
            return this.each(function (el) { data(el)[k] = v })
          }
        }
  
      , remove: function () {
          return this.each(function (el) {
            el[parentNode] && el[parentNode].removeChild(el)
          })
        }
  
      , empty: function () {
          return this.each(function (el) {
            while (el.firstChild) {
              el.removeChild(el.firstChild)
            }
          })
        }
  
      , detach: function () {
          return this.map(function (el) {
            return el[parentNode].removeChild(el)
          })
        }
  
      , scrollTop: function (y) {
          return scroll.call(this, null, y, 'y')
        }
  
      , scrollLeft: function (x) {
          return scroll.call(this, x, null, 'x')
        }
  
      , toggle: function(callback) {
          this.each(function (el) {
            el.style.display = (el.offsetWidth || el.offsetHeight) ? 'none' : 'block'
          })
          callback && callback()
          return this
        }
    }
  
    function normalize(node) {
      return typeof node == 'string' ? bonzo.create(node) : isNode(node) ? [node] : node // assume [nodes]
    }
  
    function scroll(x, y, type) {
      var el = this[0]
      if (x == null && y == null) {
        return (isBody(el) ? getWindowScroll() : { x: el.scrollLeft, y: el.scrollTop })[type]
      }
      if (isBody(el)) {
        win.scrollTo(x, y)
      } else {
        x != null && (el.scrollLeft = x)
        y != null && (el.scrollTop = y)
      }
      return this
    }
  
    function isBody(element) {
      return element === win || (/^(?:body|html)$/i).test(element.tagName)
    }
  
    function getWindowScroll() {
      return { x: win.pageXOffset || html.scrollLeft, y: win.pageYOffset || html.scrollTop }
    }
  
    function bonzo(els, host) {
      return new Bonzo(els, host)
    }
  
    bonzo.setQueryEngine = function (q) {
      query = q;
      delete bonzo.setQueryEngine
    }
  
    bonzo.aug = function (o, target) {
      for (var k in o) {
        o.hasOwnProperty(k) && ((target || Bonzo.prototype)[k] = o[k])
      }
    }
  
    bonzo.create = function (node) {
      return typeof node == 'string' && node !== '' ?
        function () {
          var tag = /^\s*<([^\s>]+)/.exec(node)
            , el = doc.createElement('div')
            , els = []
            , p = tag ? tagMap[tag[1].toLowerCase()] : null
            , dep = p ? p[2] + 1 : 1
            , pn = parentNode
            , tb = features.autoTbody && p && p[0] == '<table>' && !(/<tbody/i).test(node)
  
          el.innerHTML = p ? (p[0] + node + p[1]) : node
          while (dep--) el = el.firstChild
          do {
            // tbody special case for IE<8, creates tbody on any empty table
            // we don't want it if we're just after a <thead>, <caption>, etc.
            if ((!tag || el.nodeType == 1) && (!tb || el.tagName.toLowerCase() != 'tbody')) {
              els.push(el)
            }
          } while (el = el.nextSibling)
          // IE < 9 gives us a parentNode which messes up insert() check for cloning
          // `dep` > 1 can also cause problems with the insert() check (must do this last)
          each(els, function(el) { el[pn] && el[pn].removeChild(el) })
          return els
  
        }() : isNode(node) ? [node.cloneNode(true)] : []
    }
  
    bonzo.doc = function () {
      var vp = bonzo.viewport()
      return {
          width: Math.max(doc.body.scrollWidth, html.scrollWidth, vp.width)
        , height: Math.max(doc.body.scrollHeight, html.scrollHeight, vp.height)
      }
    }
  
    bonzo.firstChild = function (el) {
      for (var c = el.childNodes, i = 0, j = (c && c.length) || 0, e; i < j; i++) {
        if (c[i].nodeType === 1) e = c[j = i]
      }
      return e
    }
  
    bonzo.viewport = function () {
      return {
          width: ie ? html.clientWidth : self.innerWidth
        , height: ie ? html.clientHeight : self.innerHeight
      }
    }
  
    bonzo.isAncestor = 'compareDocumentPosition' in html ?
      function (container, element) {
        return (container.compareDocumentPosition(element) & 16) == 16
      } : 'contains' in html ?
      function (container, element) {
        return container !== element && container.contains(element);
      } :
      function (container, element) {
        while (element = element[parentNode]) {
          if (element === container) {
            return true
          }
        }
        return false
      }
  
    bonzo.noConflict = function () {
      context.bonzo = old
      return this
    }
  
    return bonzo
  })
  

  provide("bonzo", module.exports);
  provide("bonzo", module.exports);
  $.ender(module.exports);
}(global));

// ender:bonzo/ender-bridge as bonzo/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function ($) {
  
    var b =  require('bonzo')
    b.setQueryEngine($)
    $.ender(b)
    $.ender(b(), true)
    $.ender({
      create: function (node) {
        return $(b.create(node))
      }
    })
  
    $.id = function (id) {
      return $([document.getElementById(id)])
    }
  
    function indexOf(ar, val) {
      for (var i = 0; i < ar.length; i++) {
        if (ar[i] === val) return i
      }
      return -1
    }
  
    function uniq(ar) {
      var a = [], i, j
      label:
      for (i = 0; i < ar.length; i++) {
        for (j = 0; j < a.length; j++) {
          if (a[j] == ar[i]) {
            continue label
          }
        }
        a[a.length] = ar[i]
      }
      return a
    }
  
    $.ender({
      parents: function (selector, closest) {
        var collection = $(selector), j, k, p, r = []
        for (j = 0, k = this.length; j < k; j++) {
          p = this[j]
          while (p = p.parentNode) {
            if (~indexOf(collection, p)) {
              r.push(p)
              if (closest) break;
            }
          }
        }
        return $(uniq(r))
      },
  
      closest: function (selector) {
        return this.parents(selector, true)
      },
  
      first: function () {
        return $(this.length ? this[0] : this)
      },
  
      last: function () {
        return $(this.length ? this[this.length - 1] : [])
      },
  
      next: function () {
        return $(b(this).next())
      },
  
      previous: function () {
        return $(b(this).previous())
      },
  
      appendTo: function (t) {
        return b(this.selector).appendTo(t, this)
      },
  
      prependTo: function (t) {
        return b(this.selector).prependTo(t, this)
      },
  
      insertAfter: function (t) {
        return b(this.selector).insertAfter(t, this)
      },
  
      insertBefore: function (t) {
        return b(this.selector).insertBefore(t, this)
      },
  
      siblings: function () {
        var i, l, p, r = []
        for (i = 0, l = this.length; i < l; i++) {
          p = this[i]
          while (p = p.previousSibling) p.nodeType == 1 && r.push(p)
          p = this[i]
          while (p = p.nextSibling) p.nodeType == 1 && r.push(p)
        }
        return $(r)
      },
  
      children: function () {
        var i, el, r = []
        for (i = 0, l = this.length; i < l; i++) {
          if (!(el = b.firstChild(this[i]))) continue;
          r.push(el)
          while (el = el.nextSibling) el.nodeType == 1 && r.push(el)
        }
        return $(uniq(r))
      },
  
      height: function (v) {
        return dimension(v, this, 'height')
      },
  
      width: function (v) {
        return dimension(v, this, 'width')
      }
    }, true)
  
    function dimension(v, self, which) {
      return v ?
        self.css(which, v) :
        function (r) {
          if (!self[0]) return 0
          r = parseInt(self.css(which), 10);
          return isNaN(r) ? self[0]['offset' + which.replace(/^\w/, function (m) {return m.toUpperCase()})] : r
        }()
    }
  
  }(ender);
  

  provide("bonzo/ender-bridge", module.exports);
  provide("bonzo/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:bean as bean
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * bean.js - copyright Jacob Thornton 2011
    * https://github.com/fat/bean
    * MIT License
    * special thanks to:
    * dean edwards: http://dean.edwards.name/
    * dperini: https://github.com/dperini/nwevents
    * the entire mootools team: github.com/mootools/mootools-core
    */
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition();
    else if (typeof define == 'function' && typeof define.amd  == 'object') define(definition);
    else this[name] = definition();
  }('bean', function () {
    var win = window,
        __uid = 1,
        registry = {},
        collected = {},
        overOut = /over|out/,
        namespace = /[^\.]*(?=\..*)\.|.*/,
        stripName = /\..*/,
        addEvent = 'addEventListener',
        attachEvent = 'attachEvent',
        removeEvent = 'removeEventListener',
        detachEvent = 'detachEvent',
        doc = document || {},
        root = doc.documentElement || {},
        W3C_MODEL = root[addEvent],
        eventSupport = W3C_MODEL ? addEvent : attachEvent,
  
    isDescendant = function (parent, child) {
      var node = child.parentNode;
      while (node !== null) {
        if (node == parent) {
          return true;
        }
        node = node.parentNode;
      }
    },
  
    retrieveUid = function (obj, uid) {
      return (obj.__uid = uid && (uid + '::' + __uid++) || obj.__uid || __uid++);
    },
  
    retrieveEvents = function (element) {
      var uid = retrieveUid(element);
      return (registry[uid] = registry[uid] || {});
    },
  
    listener = W3C_MODEL ? function (element, type, fn, add) {
      element[add ? addEvent : removeEvent](type, fn, false);
    } : function (element, type, fn, add, custom) {
      if (custom && add && element['_on' + custom] === null) {
        element['_on' + custom] = 0;
      }
      element[add ? attachEvent : detachEvent]('on' + type, fn);
    },
  
    nativeHandler = function (element, fn, args) {
      return function (event) {
        event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event);
        return fn.apply(element, [event].concat(args));
      };
    },
  
    customHandler = function (element, fn, type, condition, args) {
      return function (event) {
        if (condition ? condition.apply(this, arguments) : W3C_MODEL ? true : event && event.propertyName == '_on' + type || !event) {
          event = event ? fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event) : null;
          fn.apply(element, Array.prototype.slice.call(arguments, event ? 0 : 1).concat(args));
        }
      };
    },
  
    addListener = function (element, orgType, fn, args) {
      var type = orgType.replace(stripName, ''),
          events = retrieveEvents(element),
          handlers = events[type] || (events[type] = {}),
          originalFn = fn,
          uid = retrieveUid(fn, orgType.replace(namespace, ''));
      if (handlers[uid]) {
        return element;
      }
      var custom = customEvents[type];
      if (custom) {
        fn = custom.condition ? customHandler(element, fn, type, custom.condition) : fn;
        type = custom.base || type;
      }
      var isNative = nativeEvents[type];
      fn = isNative ? nativeHandler(element, fn, args) : customHandler(element, fn, type, false, args);
      isNative = W3C_MODEL || isNative;
      if (type == 'unload') {
        var org = fn;
        fn = function () {
          removeListener(element, type, fn) && org();
        };
      }
      element[eventSupport] && listener(element, isNative ? type : 'propertychange', fn, true, !isNative && type);
      handlers[uid] = fn;
      fn.__uid = uid;
      fn.__originalFn = originalFn;
      return type == 'unload' ? element : (collected[retrieveUid(element)] = element);
    },
  
    removeListener = function (element, orgType, handler) {
      var uid, names, uids, i, events = retrieveEvents(element), type = orgType.replace(stripName, '');
      if (!events || !events[type]) {
        return element;
      }
      names = orgType.replace(namespace, '');
      uids = names ? names.split('.') : [handler.__uid];
  
      function destroyHandler(uid) {
        handler = events[type][uid];
        if (!handler) {
          return;
        }
        delete events[type][uid];
        if (element[eventSupport]) {
          type = customEvents[type] ? customEvents[type].base : type;
          var isNative = W3C_MODEL || nativeEvents[type];
          listener(element, isNative ? type : 'propertychange', handler, false, !isNative && type);
        }
      }
  
      destroyHandler(names); //get combos
      for (i = uids.length; i--; destroyHandler(uids[i])) {} //get singles
  
      return element;
    },
  
    del = function (selector, fn, $) {
      return function (e) {
        var array = typeof selector == 'string' ? $(selector, this) : selector;
        for (var target = e.target; target && target != this; target = target.parentNode) {
          for (var i = array.length; i--;) {
            if (array[i] == target) {
              return fn.apply(target, arguments);
            }
          }
        }
      };
    },
  
    add = function (element, events, fn, delfn, $) {
      if (typeof events == 'object' && !fn) {
        for (var type in events) {
          events.hasOwnProperty(type) && add(element, type, events[type]);
        }
      } else {
        var isDel = typeof fn == 'string', types = (isDel ? fn : events).split(' ');
        fn = isDel ? del(events, delfn, $) : fn;
        for (var i = types.length; i--;) {
          addListener(element, types[i], fn, Array.prototype.slice.call(arguments, isDel ? 4 : 3));
        }
      }
      return element;
    },
  
    remove = function (element, orgEvents, fn) {
      var k, m, type, events, i,
          isString = typeof(orgEvents) == 'string',
          names = isString && orgEvents.replace(namespace, ''),
          rm = removeListener,
          attached = retrieveEvents(element);
      names = names && names.split('.');
      if (isString && /\s/.test(orgEvents)) {
        orgEvents = orgEvents.split(' ');
        i = orgEvents.length - 1;
        while (remove(element, orgEvents[i]) && i--) {}
        return element;
      }
      events = isString ? orgEvents.replace(stripName, '') : orgEvents;
      if (!attached || names || (isString && !attached[events])) {
        for (k in attached) {
          if (attached.hasOwnProperty(k)) {
            for (i in attached[k]) {
              for (m = names.length; m--;) {
                attached[k].hasOwnProperty(i) && new RegExp('^' + names[m] + '::\\d*(\\..*)?$').test(i) && rm(element, [k, i].join('.'));
              }
            }
          }
        }
        return element;
      }
      if (typeof fn == 'function') {
        rm(element, events, fn);
      } else if (names) {
        rm(element, orgEvents);
      } else {
        rm = events ? rm : remove;
        type = isString && events;
        events = events ? (fn || attached[events] || events) : attached;
        for (k in events) {
          if (events.hasOwnProperty(k)) {
            rm(element, type || k, events[k]);
            delete events[k]; // remove unused leaf keys
          }
        }
      }
      return element;
    },
  
    fire = function (element, type, args) {
      var evt, k, i, m, types = type.split(' ');
      for (i = types.length; i--;) {
        type = types[i].replace(stripName, '');
        var isNative = nativeEvents[type],
            isNamespace = types[i].replace(namespace, ''),
            handlers = retrieveEvents(element)[type];
        if (isNamespace) {
          isNamespace = isNamespace.split('.');
          for (k = isNamespace.length; k--;) {
            for (m in handlers) {
              handlers.hasOwnProperty(m) && new RegExp('^' + isNamespace[k] + '::\\d*(\\..*)?$').test(m) && handlers[m].apply(element, [false].concat(args));
            }
          }
        } else if (!args && element[eventSupport]) {
          fireListener(isNative, type, element);
        } else {
          for (k in handlers) {
            handlers.hasOwnProperty(k) && handlers[k].apply(element, [false].concat(args));
          }
        }
      }
      return element;
    },
  
    fireListener = W3C_MODEL ? function (isNative, type, element) {
      evt = document.createEvent(isNative ? "HTMLEvents" : "UIEvents");
      evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, win, 1);
      element.dispatchEvent(evt);
    } : function (isNative, type, element) {
      isNative ? element.fireEvent('on' + type, document.createEventObject()) : element['_on' + type]++;
    },
  
    clone = function (element, from, type) {
      var events = retrieveEvents(from), obj, k;
      var uid = retrieveUid(element);
      obj = type ? events[type] : events;
      for (k in obj) {
        obj.hasOwnProperty(k) && (type ? add : clone)(element, type || from, type ? obj[k].__originalFn : k);
      }
      return element;
    },
  
    fixEvent = function (e) {
      var result = {};
      if (!e) {
        return result;
      }
      var type = e.type, target = e.target || e.srcElement;
      result.preventDefault = fixEvent.preventDefault(e);
      result.stopPropagation = fixEvent.stopPropagation(e);
      result.target = target && target.nodeType == 3 ? target.parentNode : target;
      if (~type.indexOf('key')) {
        result.keyCode = e.which || e.keyCode;
      } else if ((/click|mouse|menu/i).test(type)) {
        result.rightClick = e.which == 3 || e.button == 2;
        result.pos = { x: 0, y: 0 };
        if (e.pageX || e.pageY) {
          result.clientX = e.pageX;
          result.clientY = e.pageY;
        } else if (e.clientX || e.clientY) {
          result.clientX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
          result.clientY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        overOut.test(type) && (result.relatedTarget = e.relatedTarget || e[(type == 'mouseover' ? 'from' : 'to') + 'Element']);
      }
      for (var k in e) {
        if (!(k in result)) {
          result[k] = e[k];
        }
      }
      return result;
    };
  
    fixEvent.preventDefault = function (e) {
      return function () {
        if (e.preventDefault) {
          e.preventDefault();
        }
        else {
          e.returnValue = false;
        }
      };
    };
  
    fixEvent.stopPropagation = function (e) {
      return function () {
        if (e.stopPropagation) {
          e.stopPropagation();
        } else {
          e.cancelBubble = true;
        }
      };
    };
  
    var nativeEvents = { click: 1, dblclick: 1, mouseup: 1, mousedown: 1, contextmenu: 1, //mouse buttons
      mousewheel: 1, DOMMouseScroll: 1, //mouse wheel
      mouseover: 1, mouseout: 1, mousemove: 1, selectstart: 1, selectend: 1, //mouse movement
      keydown: 1, keypress: 1, keyup: 1, //keyboard
      orientationchange: 1, // mobile
      touchstart: 1, touchmove: 1, touchend: 1, touchcancel: 1, // touch
      gesturestart: 1, gesturechange: 1, gestureend: 1, // gesture
      focus: 1, blur: 1, change: 1, reset: 1, select: 1, submit: 1, //form elements
      load: 1, unload: 1, beforeunload: 1, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
      error: 1, abort: 1, scroll: 1 }; //misc
  
    function check(event) {
      var related = event.relatedTarget;
      if (!related) {
        return related === null;
      }
      return (related != this && related.prefix != 'xul' && !/document/.test(this.toString()) && !isDescendant(this, related));
    }
  
    var customEvents = {
      mouseenter: { base: 'mouseover', condition: check },
      mouseleave: { base: 'mouseout', condition: check },
      mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
    };
  
    var bean = { add: add, remove: remove, clone: clone, fire: fire };
  
    var clean = function (el) {
      var uid = remove(el).__uid;
      if (uid) {
        delete collected[uid];
        delete registry[uid];
      }
    };
  
    if (win[attachEvent]) {
      add(win, 'unload', function () {
        for (var k in collected) {
          collected.hasOwnProperty(k) && clean(collected[k]);
        }
        win.CollectGarbage && CollectGarbage();
      });
    }
  
    bean.noConflict = function () {
      context.bean = old;
      return this;
    };
  
    return bean;
  });

  provide("bean", module.exports);
  provide("bean", module.exports);
  $.ender(module.exports);
}(global));

// ender:bean/ender-bridge as bean/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function ($) {
    var b =  require('bean'),
        integrate = function (method, type, method2) {
          var _args = type ? [type] : [];
          return function () {
            for (var args, i = 0, l = this.length; i < l; i++) {
              args = [this[i]].concat(_args, Array.prototype.slice.call(arguments, 0));
              args.length == 4 && args.push($);
              !arguments.length && method == 'add' && type && (method = 'fire');
              b[method].apply(this, args);
            }
            return this;
          };
        };
  
    var add = integrate('add'),
        remove = integrate('remove'),
        fire = integrate('fire');
  
    var methods = {
  
      on: add,
      addListener: add,
      bind: add,
      listen: add,
      delegate: add,
  
      unbind: remove,
      unlisten: remove,
      removeListener: remove,
      undelegate: remove,
  
      emit: fire,
      trigger: fire,
  
      cloneEvents: integrate('clone'),
  
      hover: function (enter, leave, i) { // i for internal
        for (i = this.length; i--;) {
          b.add.call(this, this[i], 'mouseenter', enter);
          b.add.call(this, this[i], 'mouseleave', leave);
        }
        return this;
      }
    };
  
    var i, shortcuts = [
      'blur', 'change', 'click', 'dblclick', 'error', 'focus', 'focusin',
      'focusout', 'keydown', 'keypress', 'keyup', 'load', 'mousedown',
      'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'mouseup', 'mousemove',
      'resize', 'scroll', 'select', 'submit', 'unload'
    ];
  
    for (i = shortcuts.length; i--;) {
      methods[shortcuts[i]] = integrate('add', shortcuts[i]);
    }
  
    $.ender(methods, true);
  }(ender);

  provide("bean/ender-bridge", module.exports);
  provide("bean/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:test/../lib/rawinflate.js as test/../lib/rawinflate.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*
   * $Id: rawinflate.js,v 0.2 2009/03/01 18:32:24 dankogai Exp $
   *
   * original:
   * http://www.onicos.com/staff/iz/amuse/javascript/expert/inflate.txt
   */
  
  /* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
   * Version: 1.0.0.1
   * LastModified: Dec 25 1999
   */
  
  /* Interface:
   * data = zip_inflate(src);
   */
  
  (function() {
  	/* constant parameters */
  	var zip_WSIZE = 32768, // Sliding Window size
  		zip_STORED_BLOCK = 0,
  		zip_STATIC_TREES = 1,
  		zip_DYN_TREES = 2,
  
  	/* for inflate */
  		zip_lbits = 9, // bits in base literal/length lookup table
  		zip_dbits = 6, // bits in base distance lookup table
  		zip_INBUFSIZ = 32768, // Input buffer size
  		zip_INBUF_EXTRA = 64, // Extra buffer
  
  	/* variables (inflate) */
  		zip_slide,
  		zip_wp, // current position in slide
  		zip_fixed_tl = null, // inflate static
  		zip_fixed_td, // inflate static
  		zip_fixed_bl, fixed_bd, // inflate static
  		zip_bit_buf, // bit buffer
  		zip_bit_len, // bits in bit buffer
  		zip_method,
  		zip_eof,
  		zip_copy_leng,
  		zip_copy_dist,
  		zip_tl, zip_td, // literal/length and distance decoder tables
  		zip_bl, zip_bd, // number of bits decoded by tl and td
  
  		zip_inflate_data,
  		zip_inflate_pos,
  
  
  /* constant tables (inflate) */
  		zip_MASK_BITS = [
  			0x0000,
  			0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
  			0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff
  		],
  		// Tables for deflate from PKZIP's appnote.txt.
  		// Copy lengths for literal codes 257..285
  		zip_cplens = [
  			3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  			35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
  		],
  /* note: see note #13 above about the 258 in this list. */
  		// Extra bits for literal codes 257..285
  		zip_cplext = [
  			0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
  			3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99 // 99==invalid
  		],
  		// Copy offsets for distance codes 0..29
  		zip_cpdist = [
  			1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  			257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  			8193, 12289, 16385, 24577
  		],
  		// Extra bits for distance codes
  		zip_cpdext = [
  			0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
  			7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
  			12, 12, 13, 13
  		],
  		// Order of the bit length code lengths
  		zip_border = [
  			16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
  		];
  	/* objects (inflate) */
  
  	function zip_HuftList() {
  		this.next = null;
  		this.list = null;
  	}
  
  	function zip_HuftNode() {
  		this.e = 0; // number of extra bits or operation
  		this.b = 0; // number of bits in this code or subcode
  
  		// union
  		this.n = 0; // literal, length base, or distance base
  		this.t = null; // (zip_HuftNode) pointer to next level of table
  	}
  
  	/*
  	 * @param b-  code lengths in bits (all assumed <= BMAX)
  	 * @param n- number of codes (assumed <= N_MAX)
  	 * @param s- number of simple-valued codes (0..s-1)
  	 * @param d- list of base values for non-simple codes
  	 * @param e- list of extra bits for non-simple codes
  	 * @param mm- maximum lookup bits
  	 */
  	function zip_HuftBuild(b, n, s, d, e, mm) {
  		this.BMAX = 16; // maximum bit length of any code
  		this.N_MAX = 288; // maximum number of codes in any set
  		this.status = 0; // 0: success, 1: incomplete table, 2: bad input
  		this.root = null; // (zip_HuftList) starting table
  		this.m = 0; // maximum lookup bits, returns actual
  
  	/* Given a list of code lengths and a maximum table size, make a set of
  	   tables to decode that set of codes. Return zero on success, one if
  	   the given code set is incomplete (the tables are still built in this
  	   case), two if the input is invalid (all zero length codes or an
  	   oversubscribed set of lengths), and three if not enough memory.
  	   The code with value 256 is special, and the tables are constructed
  	   so that no bits beyond that code are fetched when that code is
  	   decoded. */
  		var a; // counter for codes of length k
  		var c = [];
  		var el; // length of EOB code (value 256)
  		var f; // i repeats in table every f entries
  		var g; // maximum code length
  		var h; // table level
  		var i; // counter, current code
  		var j; // counter
  		var k; // number of bits in current code
  		var lx = [];
  		var p; // pointer into c[], b[], or v[]
  		var pidx; // index of p
  		var q; // (zip_HuftNode) points to current table
  		var r = new zip_HuftNode(); // table entry for structure assignment
  		var u = [];
  		var v = [];
  		var w;
  		var x = [];
  		var xp; // pointer into x or c
  		var y; // number of dummy codes added
  		var z; // number of entries in current table
  		var o;
  		var tail; // (zip_HuftList)
  
  		tail = this.root = null;
  
  		// bit length count table
  		for(i = 0; i < this.BMAX + 1; i++) {
  			c[i] = 0;
  		}
  		// stack of bits per table
  		for(i = 0; i < this.BMAX + 1; i++) {
  			lx[i] = 0;
  		}
  		// zip_HuftNode[BMAX][]  table stack
  		for(i = 0; i < this.BMAX; i++) {
  			u[i] = null;
  		}
  		// values in order of bit length
  		for(i = 0; i < this.N_MAX; i++) {
  			v[i] = 0;
  		}
  		// bit offsets, then code stack
  		for(i = 0; i < this.BMAX + 1; i++) {
  			x[i] = 0;
  		}
  
  		// Generate counts for each bit length
  		el = n > 256 ? b[256] : this.BMAX; // set length of EOB code, if any
  		p = b; pidx = 0;
  		i = n;
  		do {
  			c[p[pidx]]++; // assume all entries <= BMAX
  			pidx++;
  		} while(--i > 0);
  		if(c[0] === n) { // null input--all zero length codes
  			this.root = null;
  			this.m = 0;
  			this.status = 0;
  			return;
  		}
  
  		// Find minimum and maximum length, bound *m by those
  		for(j = 1; j <= this.BMAX; j++)
  			if(c[j] !== 0)
  			break;
  		k = j; // minimum code length
  		if(mm < j)
  			mm = j;
  		for(i = this.BMAX; i !== 0; i--)
  			if(c[i] !== 0)
  			break;
  		g = i; // maximum code length
  		if(mm > i)
  			mm = i;
  
  		// Adjust last length count to fill out codes, if needed
  		for(y = 1 << j; j < i; j++, y <<= 1)
  			if((y -= c[j]) < 0) {
  			this.status = 2; // bad input: more codes than bits
  			this.m = mm;
  			return;
  			}
  		if((y -= c[i]) < 0) {
  			this.status = 2;
  			this.m = mm;
  			return;
  		}
  		c[i] += y;
  
  		// Generate starting offsets into the value table for each length
  		x[1] = j = 0;
  		p = c;
  		pidx = 1;
  		xp = 2;
  		while(--i > 0) // note that i == g from above
  			x[xp++] = (j += p[pidx++]);
  
  		// Make a table of values in order of bit lengths
  		p = b; pidx = 0;
  		i = 0;
  		do {
  			if((j = p[pidx++]) !== 0)
  			v[x[j]++] = i;
  		} while(++i < n);
  		n = x[g]; // set n to length of v
  
  		// Generate the Huffman codes and for each, make the table entries
  		x[0] = i = 0; // first Huffman code is zero
  		p = v; pidx = 0; // grab values in bit order
  		h = -1; // no tables yet--level -1
  		w = lx[0] = 0; // no bits decoded yet
  		q = null; // ditto
  		z = 0; // ditto
  
  		// go through the bit lengths (k already is bits in shortest code)
  		for(; k <= g; k++) {
  			a = c[k];
  			while(a-- > 0) {
  			// here i is the Huffman code of length k bits for value p[pidx]
  			// make tables up to required level
  			while(k > w + lx[1 + h]) {
  				w += lx[1 + h]; // add bits already decoded
  				h++;
  
  				// compute minimum size table less than or equal to *m bits
  				z = (z = g - w) > mm ? mm : z; // upper limit
  				if((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
  				// too few codes for k-w bit table
  				f -= a + 1; // deduct codes from patterns left
  				xp = k;
  				while(++j < z) { // try smaller tables up to z bits
  					if((f <<= 1) <= c[++xp])
  					break; // enough codes to use up j bits
  					f -= c[xp]; // else deduct codes from patterns
  				}
  				}
  				if(w + j > el && w < el)
  				j = el - w; // make EOB code end at table
  				z = 1 << j; // table entries for j-bit table
  				lx[1 + h] = j; // set table size in stack
  
  				// allocate and link in new table
  				q = [];
  				for(o = 0; o < z; o++) {
  					q[o] = new zip_HuftNode();
  				}
  
  				if(!tail) {
  					tail = this.root = new zip_HuftList();
  				} else {
  				tail = tail.next = new zip_HuftList();
  				}
  				tail.next = null;
  				tail.list = q;
  				u[h] = q; // table starts after link
  
  				/* connect to last table, if there is one */
  				if(h > 0) {
  				x[h] = i; // save pattern for backing up
  				r.b = lx[h]; // bits to dump before this table
  				r.e = 16 + j; // bits in this table
  				r.t = q; // pointer to this table
  				j = (i & ((1 << w) - 1)) >> (w - lx[h]);
  				u[h-1][j].e = r.e;
  				u[h-1][j].b = r.b;
  				u[h-1][j].n = r.n;
  				u[h-1][j].t = r.t;
  				}
  			}
  
  			// set up table entry in r
  			r.b = k - w;
  			if(pidx >= n)
  				r.e = 99; // out of values--invalid code
  			else if(p[pidx] < s) {
  				r.e = (p[pidx] < 256 ? 16 : 15); // 256 is end-of-block code
  				r.n = p[pidx++]; // simple code is just the value
  			} else {
  				r.e = e[p[pidx] - s]; // non-simple--look up in lists
  				r.n = d[p[pidx++] - s];
  			}
  
  			// fill code-like entries with r //
  			f = 1 << (k - w);
  			for(j = i >> w; j < z; j += f) {
  				q[j].e = r.e;
  				q[j].b = r.b;
  				q[j].n = r.n;
  				q[j].t = r.t;
  			}
  
  			// backwards increment the k-bit code i
  			for(j = 1 << (k - 1); (i & j) !== 0; j >>= 1)
  				i ^= j;
  			i ^= j;
  
  			// backup over finished tables
  			while((i & ((1 << w) - 1)) !== x[h]) {
  				w -= lx[h]; // don't need to update q
  				h--;
  			}
  			}
  		}
  
  		/* return actual size of base table */
  		this.m = lx[1];
  
  		/* Return true (1) if we were given an incomplete table */
  		this.status = ((y !== 0 && g !== 1) ? 1 : 0);
  	}
  
  
  	/* routines (inflate) */
  
  	function zip_GET_BYTE() {
  		if(zip_inflate_data.length === zip_inflate_pos)
  		return -1;
  		return zip_inflate_data.charCodeAt(zip_inflate_pos++) & 0xff;
  	}
  
  	function zip_NEEDBITS(n) {
  		while(zip_bit_len < n) {
  		zip_bit_buf |= zip_GET_BYTE() << zip_bit_len;
  		zip_bit_len += 8;
  		}
  	}
  
  	function zip_GETBITS(n) {
  		return zip_bit_buf & zip_MASK_BITS[n];
  	}
  
  	function zip_DUMPBITS(n) {
  		zip_bit_buf >>= n;
  		zip_bit_len -= n;
  	}
  
  	function zip_inflate_codes(buff, off, size) {
  		// inflate (decompress) the codes in a deflated (compressed) block.
  		// Return an error code or zero if it all goes ok.
  		var e; // table entry flag/number of extra bits
  		var t; // (zip_HuftNode) pointer to table entry
  		var n;
  
  		if(size === 0) {
  			return 0;
  		}
  
  		// inflate the coded data
  		n = 0;
  		for(;;) { // do until end of block
  		zip_NEEDBITS(zip_bl);
  		t = zip_tl.list[zip_GETBITS(zip_bl)];
  		e = t.e;
  		while(e > 16) {
  			if(e === 99)
  			return -1;
  			zip_DUMPBITS(t.b);
  			e -= 16;
  			zip_NEEDBITS(e);
  			t = t.t[zip_GETBITS(e)];
  			e = t.e;
  		}
  		zip_DUMPBITS(t.b);
  
  		if(e === 16) { // then it's a literal
  			zip_wp &= zip_WSIZE - 1;
  			buff[off + n++] = zip_slide[zip_wp++] = t.n;
  			if(n === size)
  			return size;
  			continue;
  		}
  
  		// exit if end of block
  		if(e === 15)
  			break;
  
  		// it's an EOB or a length
  
  		// get length of block to copy
  		zip_NEEDBITS(e);
  		zip_copy_leng = t.n + zip_GETBITS(e);
  		zip_DUMPBITS(e);
  
  		// decode distance of block to copy
  		zip_NEEDBITS(zip_bd);
  		t = zip_td.list[zip_GETBITS(zip_bd)];
  		e = t.e;
  
  		while(e > 16) {
  			if(e === 99)
  			return -1;
  			zip_DUMPBITS(t.b);
  			e -= 16;
  			zip_NEEDBITS(e);
  			t = t.t[zip_GETBITS(e)];
  			e = t.e;
  		}
  		zip_DUMPBITS(t.b);
  		zip_NEEDBITS(e);
  		zip_copy_dist = zip_wp - t.n - zip_GETBITS(e);
  		zip_DUMPBITS(e);
  
  		// do the copy
  		while(zip_copy_leng > 0 && n < size) {
  			zip_copy_leng--;
  			zip_copy_dist &= zip_WSIZE - 1;
  			zip_wp &= zip_WSIZE - 1;
  			buff[off + n++] = zip_slide[zip_wp++] = zip_slide[zip_copy_dist++];
  		}
  
  		if(n === size)
  			return size;
  		}
  
  		zip_method = -1; // done
  		return n;
  	}
  
  	function zip_inflate_stored(buff, off, size) {
  		/* "decompress" an inflated type 0 (stored) block. */
  		var n;
  
  		// go to byte boundary
  		n = zip_bit_len & 7;
  		zip_DUMPBITS(n);
  
  		// get the length and its complement
  		zip_NEEDBITS(16);
  		n = zip_GETBITS(16);
  		zip_DUMPBITS(16);
  		zip_NEEDBITS(16);
  		if(n !== ((~zip_bit_buf) & 0xffff))
  		return -1; // error in compressed data
  		zip_DUMPBITS(16);
  
  		// read and output the compressed data
  		zip_copy_leng = n;
  
  		n = 0;
  		while(zip_copy_leng > 0 && n < size) {
  		zip_copy_leng--;
  		zip_wp &= zip_WSIZE - 1;
  		zip_NEEDBITS(8);
  		buff[off + n++] = zip_slide[zip_wp++] =
  			zip_GETBITS(8);
  		zip_DUMPBITS(8);
  		}
  
  		if(zip_copy_leng === 0) {
  			zip_method = -1; // done
  		}
  		return n;
  	}
  
  	function zip_inflate_fixed(buff, off, size) {
  		// decompress an inflated type 1 (fixed Huffman codes) block.  We should
  		// either replace this with a custom decoder, or at least precompute the
  		// Huffman tables.
  
  		// if first time, set up tables for fixed blocks
  		if(!zip_fixed_tl) {
  		var i; // temporary variable
  		var l = []; // 288 length list for huft_build (initialized below)
  		var h; // zip_HuftBuild
  
  		// literal table
  		for(i = 0; i < 144; i++) {
  			l[i] = 8;
  		}
  		for(; i < 256; i++) {
  			l[i] = 9;
  		}
  		for(; i < 280; i++) {
  			l[i] = 7;
  		}
  		for(; i < 288; i++) { // make a complete, but wrong code set
  			l[i] = 8;
  		}
  		zip_fixed_bl = 7;
  
  		h = new zip_HuftBuild(l, 288, 257, zip_cplens, zip_cplext, zip_fixed_bl);
  		if(h.status !== 0) {
  			alert("HufBuild error: "+h.status);
  			return -1;
  		}
  		zip_fixed_tl = h.root;
  		zip_fixed_bl = h.m;
  
  		// distance table
  		for(i = 0; i < 30; i++) // make an incomplete code set
  			l[i] = 5;
  		zip_fixed_bd = 5;
  
  		h = new zip_HuftBuild(l, 30, 0, zip_cpdist, zip_cpdext, zip_fixed_bd);
  		if(h.status > 1) {
  			zip_fixed_tl = null;
  			alert("HufBuild error: "+h.status);
  			return -1;
  		}
  		zip_fixed_td = h.root;
  		zip_fixed_bd = h.m;
  		}
  
  		zip_tl = zip_fixed_tl;
  		zip_td = zip_fixed_td;
  		zip_bl = zip_fixed_bl;
  		zip_bd = zip_fixed_bd;
  		return zip_inflate_codes(buff, off, size);
  	}
  
  	function zip_inflate_dynamic(buff, off, size) {
  		// decompress an inflated type 2 (dynamic Huffman codes) block.
  		var i; // temporary variables
  		var j;
  		var l; // last length
  		var n; // number of lengths to get
  		var t; // (zip_HuftNode) literal/length code table
  		var nb; // number of bit length codes
  		var nl; // number of literal/length codes
  		var nd; // number of distance codes
  		var ll = []; 
  		var h; // (zip_HuftBuild)
  
  		// literal/length and distance code lengths
  		for(i = 0; i < 286 + 30; i++) {
  			ll[i] = 0;
  		}
  
  		// read in table lengths
  		zip_NEEDBITS(5);
  		nl = 257 + zip_GETBITS(5); // number of literal/length codes
  		zip_DUMPBITS(5);
  		zip_NEEDBITS(5);
  		nd = 1 + zip_GETBITS(5); // number of distance codes
  		zip_DUMPBITS(5);
  		zip_NEEDBITS(4);
  		nb = 4 + zip_GETBITS(4); // number of bit length codes
  		zip_DUMPBITS(4);
  		if(nl > 286 || nd > 30) {
  			return -1; // bad lengths
  		}
  
  		// read in bit-length-code lengths
  		for(j = 0; j < nb; j++)
  		{
  		zip_NEEDBITS(3);
  		ll[zip_border[j]] = zip_GETBITS(3);
  		zip_DUMPBITS(3);
  		}
  		for(; j < 19; j++)
  		ll[zip_border[j]] = 0;
  
  		// build decoding table for trees--single level, 7 bit lookup
  		zip_bl = 7;
  		h = new zip_HuftBuild(ll, 19, 19, null, null, zip_bl);
  		if(h.status !== 0)
  		return -1; // incomplete code set
  
  		zip_tl = h.root;
  		zip_bl = h.m;
  
  		// read in literal and distance code lengths
  		n = nl + nd;
  		i = l = 0;
  		while(i < n) {
  		zip_NEEDBITS(zip_bl);
  		t = zip_tl.list[zip_GETBITS(zip_bl)];
  		j = t.b;
  		zip_DUMPBITS(j);
  		j = t.n;
  		if(j < 16) // length of code in bits (0..15)
  			ll[i++] = l = j; // save last length in l
  		else if(j === 16) { // repeat last length 3 to 6 times
  			zip_NEEDBITS(2);
  			j = 3 + zip_GETBITS(2);
  			zip_DUMPBITS(2);
  			if(i + j > n)
  			return -1;
  			while(j-- > 0)
  			ll[i++] = l;
  		} else if(j === 17) { // 3 to 10 zero length codes
  			zip_NEEDBITS(3);
  			j = 3 + zip_GETBITS(3);
  			zip_DUMPBITS(3);
  			if(i + j > n)
  			return -1;
  			while(j-- > 0)
  			ll[i++] = 0;
  			l = 0;
  		} else { // j === 18: 11 to 138 zero length codes
  			zip_NEEDBITS(7);
  			j = 11 + zip_GETBITS(7);
  			zip_DUMPBITS(7);
  			if(i + j > n)
  			return -1;
  			while(j-- > 0)
  			ll[i++] = 0;
  			l = 0;
  		}
  		}
  
  		// build the decoding tables for literal/length and distance codes
  		zip_bl = zip_lbits;
  		h = new zip_HuftBuild(ll, nl, 257, zip_cplens, zip_cplext, zip_bl);
  		if(zip_bl === 0) // no literals or lengths
  		h.status = 1;
  		if(h.status !== 0) {
  		if(h.status === 1) {
  			// **incomplete literal tree**
  		}
  		return -1; // incomplete code set
  		}
  		zip_tl = h.root;
  		zip_bl = h.m;
  
  		for(i = 0; i < nd; i++)
  		ll[i] = ll[i + nl];
  		zip_bd = zip_dbits;
  		h = new zip_HuftBuild(ll, nd, 0, zip_cpdist, zip_cpdext, zip_bd);
  		zip_td = h.root;
  		zip_bd = h.m;
  
  		if(zip_bd === 0 && nl > 257) {   // lengths but no distances
  		// **incomplete distance tree**
  		return -1;
  		}
  
  		if(h.status === 1) {
  			// **incomplete distance tree**
  		}
  		if(h.status !== 0)
  		return -1;
  
  		// decompress until an end-of-block code
  		return zip_inflate_codes(buff, off, size);
  	}
  
  	function zip_inflate_start() {
  		var i;
  
  		if(!zip_slide) {
  			zip_slide = []; // new Array(2 * zip_WSIZE); // zip_slide.length is never called
  		}
  		zip_wp = 0;
  		zip_bit_buf = 0;
  		zip_bit_len = 0;
  		zip_method = -1;
  		zip_eof = false;
  		zip_copy_leng = zip_copy_dist = 0;
  		zip_tl = null;
  	}
  
  	function zip_inflate_internal(buff, off, size) {
  		// decompress an inflated entry
  		var n, i;
  
  		n = 0;
  		while(n < size) {
  			if(zip_eof && zip_method === -1) {
  				return n;
  			}
  
  			if(zip_copy_leng > 0) {
  				if(zip_method !== zip_STORED_BLOCK) {
  					// STATIC_TREES or DYN_TREES
  					while(zip_copy_leng > 0 && n < size) {
  						zip_copy_leng--;
  						zip_copy_dist &= zip_WSIZE - 1;
  						zip_wp &= zip_WSIZE - 1;
  						buff[off + n++] = zip_slide[zip_wp++] = zip_slide[zip_copy_dist++];
  					}
  				} else {
  					while(zip_copy_leng > 0 && n < size) {
  						zip_copy_leng--;
  						zip_wp &= zip_WSIZE - 1;
  						zip_NEEDBITS(8);
  						buff[off + n++] = zip_slide[zip_wp++] = zip_GETBITS(8);
  						zip_DUMPBITS(8);
  					}
  				if(zip_copy_leng === 0)
  					zip_method = -1; // done
  				}
  				if(n === size) {
  					return n;
  				}
  			}
  
  			if(zip_method === -1) {
  				if(zip_eof) {
  					break;
  				}
  
  				// read in last block bit
  				zip_NEEDBITS(1);
  				if(zip_GETBITS(1) !== 0)
  				zip_eof = true;
  				zip_DUMPBITS(1);
  
  				// read in block type
  				zip_NEEDBITS(2);
  				zip_method = zip_GETBITS(2);
  				zip_DUMPBITS(2);
  				zip_tl = null;
  				zip_copy_leng = 0;
  			}
  
  			switch(zip_method) {
  				case 0: // zip_STORED_BLOCK
  					i = zip_inflate_stored(buff, off + n, size - n);
  					break;
  
  				case 1: // zip_STATIC_TREES
  					if(zip_tl) {
  						i = zip_inflate_codes(buff, off + n, size - n);
  					} else {
  						i = zip_inflate_fixed(buff, off + n, size - n);
  					}
  					break;
  
  				case 2: // zip_DYN_TREES
  					if(zip_tl) {
  						i = zip_inflate_codes(buff, off + n, size - n);
  					} else {
  						i = zip_inflate_dynamic(buff, off + n, size - n);
  					}
  					break;
  
  				default: // error
  					i = -1;
  					break;
  			}
  
  			if(i === -1) {
  				if(zip_eof) {
  					return 0;
  				}
  				return -1;
  			}
  			n += i;
  		}
  		return n;
  	}
  
  	function zip_inflate(str) {
  		var buff = [],
  			aout = [],
  			i, j, cbuf;
  
  		zip_inflate_start();
  		zip_inflate_data = str;
  		zip_inflate_pos = 0;
  
  		while((i = zip_inflate_internal(buff, 0, 1024)) > 0) {
  			cbuf = []; // new Array(i); // cbuf.length is never called
  			for(j = 0; j < i; j++){
  				cbuf[j] = String.fromCharCode(buff[j]);
  			}
  			aout[aout.length] = cbuf.join("");
  		}
  		zip_inflate_data = null; // G.C.
  		return aout.join("");
  	}
  
  	module.exports = zip_inflate;
  }());
  

  provide("test/../lib/rawinflate.js", module.exports);
  provide("test/../lib/rawinflate.js", module.exports);
  $.ender(module.exports);
}(global));

// ender:test/../lib/rawdeflate.js as test/../lib/rawdeflate.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*
   * $Id: rawdeflate.js,v 0.3 2009/03/01 19:05:05 dankogai Exp dankogai $
   *
   * Original:
   *   http://www.onicos.com/staff/iz/amuse/javascript/expert/deflate.txt
   */
  
  /* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
   * Version: 1.0.1
   * LastModified: Dec 25 1999
   */
  
  /* Interface:
   * data = zip_deflate(src);
   */
  
  (function() {
  	/* constant parameters */
  	var zip_WSIZE = 32768, // Sliding Window size
  		zip_STORED_BLOCK = 0,
  		zip_STATIC_TREES = 1,
  		zip_DYN_TREES = 2,
  
  	/* for deflate */
  		zip_DEFAULT_LEVEL = 6,
  		zip_FULL_SEARCH = true,
  		zip_INBUFSIZ = 32768, // Input buffer size
  		zip_INBUF_EXTRA = 64, // Extra buffer
  		zip_OUTBUFSIZ = 1024 * 8,
  		zip_window_size = 2 * zip_WSIZE,
  		zip_MIN_MATCH = 3,
  		zip_MAX_MATCH = 258,
  		zip_BITS = 16,
  	// for SMALL_MEM
  		zip_LIT_BUFSIZE = 0x2000,
  		zip_HASH_BITS = 13,
  	//for MEDIUM_MEM
  	//	zip_LIT_BUFSIZE = 0x4000,
  	//	zip_HASH_BITS = 14,
  	// for BIG_MEM
  	//	zip_LIT_BUFSIZE = 0x8000,
  	//	zip_HASH_BITS = 15,
  		zip_DIST_BUFSIZE = zip_LIT_BUFSIZE,
  		zip_HASH_SIZE = 1 << zip_HASH_BITS,
  		zip_HASH_MASK = zip_HASH_SIZE - 1,
  		zip_WMASK = zip_WSIZE - 1,
  		zip_NIL = 0, // Tail of hash chains
  		zip_TOO_FAR = 4096,
  		zip_MIN_LOOKAHEAD = zip_MAX_MATCH + zip_MIN_MATCH + 1,
  		zip_MAX_DIST = zip_WSIZE - zip_MIN_LOOKAHEAD,
  		zip_SMALLEST = 1,
  		zip_MAX_BITS = 15,
  		zip_MAX_BL_BITS = 7,
  		zip_LENGTH_CODES = 29,
  		zip_LITERALS =256,
  		zip_END_BLOCK = 256,
  		zip_L_CODES = zip_LITERALS + 1 + zip_LENGTH_CODES,
  		zip_D_CODES = 30,
  		zip_BL_CODES = 19,
  		zip_REP_3_6 = 16,
  		zip_REPZ_3_10 = 17,
  		zip_REPZ_11_138 = 18,
  		zip_HEAP_SIZE = 2 * zip_L_CODES + 1,
  		zip_H_SHIFT = parseInt((zip_HASH_BITS + zip_MIN_MATCH - 1) / zip_MIN_MATCH, 10),
  
  	/* variables */
  		zip_free_queue,
  		zip_qhead, zip_qtail,
  		zip_initflag,
  		zip_outbuf = null,
  		zip_outcnt, zip_outoff,
  		zip_complete,
  		zip_window,
  		zip_d_buf,
  		zip_l_buf,
  		zip_prev,
  		zip_bi_buf,
  		zip_bi_valid,
  		zip_block_start,
  		zip_ins_h,
  		zip_hash_head,
  		zip_prev_match,
  		zip_match_available,
  		zip_match_length,
  		zip_prev_length,
  		zip_strstart,
  		zip_match_start,
  		zip_eofile,
  		zip_lookahead,
  		zip_max_chain_length,
  		zip_max_lazy_match,
  		zip_compr_level,
  		zip_good_match,
  		zip_nice_match,
  		zip_dyn_ltree,
  		zip_dyn_dtree,
  		zip_static_ltree,
  		zip_static_dtree,
  		zip_bl_tree,
  		zip_l_desc,
  		zip_d_desc,
  		zip_bl_desc,
  		zip_bl_count,
  		zip_heap,
  		zip_heap_len,
  		zip_heap_max,
  		zip_depth,
  		zip_length_code,
  		zip_dist_code,
  		zip_base_length,
  		zip_base_dist,
  		zip_flag_buf,
  		zip_last_lit,
  		zip_last_dist,
  		zip_last_flags,
  		zip_flags,
  		zip_flag_bit,
  		zip_opt_len,
  		zip_static_len,
  		zip_deflate_data,
  		zip_deflate_pos;
  
  	if(zip_LIT_BUFSIZE > zip_INBUFSIZ) {
  		alert("error: zip_INBUFSIZ is too small");
  	}
  	if((zip_WSIZE<<1) > (1<<zip_BITS)) {
  		alert("error: zip_WSIZE is too large");
  	}
  	if(zip_HASH_BITS > zip_BITS-1) {
  		alert("error: zip_HASH_BITS is too large");
  	}
  	if(zip_HASH_BITS < 8 || zip_MAX_MATCH !== 258) {
  		alert("error: Code too clever");
  	}
  
  	/* objects (deflate) */
  
  	function zip_DeflateCT() {
  		this.fc = 0; // frequency count or bit string
  		this.dl = 0; // father node in Huffman tree or length of bit string
  	}
  
  	function zip_DeflateTreeDesc() {
  		this.dyn_tree = null; // the dynamic tree
  		this.static_tree = null; // corresponding static tree or NULL
  		this.extra_bits = null; // extra bits for each code or NULL
  		this.extra_base = 0; // base index for extra_bits
  		this.elems = 0; // max number of elements in the tree
  		this.max_length = 0; // max bit length for the codes
  		this.max_code = 0; // largest code with non zero frequency
  	}
  
  	/* Values for max_lazy_match, good_match and max_chain_length, depending on
  	 * the desired pack level (0..9). The values given below have been tuned to
  	 * exclude worst case performance for pathological files. Better values may be
  	 * found for specific files.
  	 */
  	function zip_DeflateConfiguration(a, b, c, d) {
  		this.good_length = a; // reduce lazy search above this match length
  		this.max_lazy = b; // do not perform lazy search above this match length
  		this.nice_length = c; // quit search above this match length
  		this.max_chain = d;
  	}
  
  	function zip_DeflateBuffer() {
  		this.next = null;
  		this.len = 0;
  		this.ptr = []; // new Array(zip_OUTBUFSIZ); // ptr.length is never read
  		this.off = 0;
  	}
  
  	/* constant tables */
  	var zip_extra_lbits = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  	var zip_extra_dbits = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  	var zip_extra_blbits = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];
  	var zip_bl_order = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
  	var zip_configuration_table = [
  		new zip_DeflateConfiguration(0, 0, 0, 0),
  		new zip_DeflateConfiguration(4, 4, 8, 4),
  		new zip_DeflateConfiguration(4, 5, 16, 8),
  		new zip_DeflateConfiguration(4, 6, 32, 32),
  		new zip_DeflateConfiguration(4, 4, 16, 16),
  		new zip_DeflateConfiguration(8, 16, 32, 32),
  		new zip_DeflateConfiguration(8, 16, 128, 128),
  		new zip_DeflateConfiguration(8, 32, 128, 256),
  		new zip_DeflateConfiguration(32, 128, 258, 1024),
  		new zip_DeflateConfiguration(32, 258, 258, 4096)
  	];
  
  
  	/* routines (deflate) */
  
  	function zip_deflate_start(level) {
  		var i;
  
  		if(!level) {
  			level = zip_DEFAULT_LEVEL;
  		} else if(level < 1) {
  			level = 1;
  		} else if(level > 9) {
  			level = 9;
  		}
  
  		zip_compr_level = level;
  		zip_initflag = false;
  		zip_eofile = false;
  		if(zip_outbuf !== null) {
  			return;
  		}
  
  		zip_free_queue = zip_qhead = zip_qtail = null;
  		zip_outbuf = []; // new Array(zip_OUTBUFSIZ); // zip_outbuf.length never called
  		zip_window = []; // new Array(zip_window_size); // zip_window.length never called
  		zip_d_buf = []; // new Array(zip_DIST_BUFSIZE); // zip_d_buf.length never called
  		zip_l_buf = []; // new Array(zip_INBUFSIZ + zip_INBUF_EXTRA); // zip_l_buf.length never called
  		zip_prev = []; // new Array(1 << zip_BITS); // zip_prev.length never called
  
  		zip_dyn_ltree = [];
  		for(i = 0; i < zip_HEAP_SIZE; i++) {
  			zip_dyn_ltree[i] = new zip_DeflateCT();
  		}
  		zip_dyn_dtree = [];
  		for(i = 0; i < 2 * zip_D_CODES + 1; i++) {
  			zip_dyn_dtree[i] = new zip_DeflateCT();
  		}
  		zip_static_ltree = [];
  		for(i = 0; i < zip_L_CODES + 2; i++) {
  			zip_static_ltree[i] = new zip_DeflateCT();
  		}
  		zip_static_dtree = [];
  		for(i = 0; i < zip_D_CODES; i++) {
  			zip_static_dtree[i] = new zip_DeflateCT();
  		}
  		zip_bl_tree = [];
  		for(i = 0; i < 2 * zip_BL_CODES + 1; i++) {
  			zip_bl_tree[i] = new zip_DeflateCT();
  		}
  		zip_l_desc = new zip_DeflateTreeDesc();
  		zip_d_desc = new zip_DeflateTreeDesc();
  		zip_bl_desc = new zip_DeflateTreeDesc();
  		zip_bl_count = []; // new Array(zip_MAX_BITS+1); // zip_bl_count.length never called
  		zip_heap = []; // new Array(2*zip_L_CODES+1); // zip_heap.length never called
  		zip_depth = []; // new Array(2*zip_L_CODES+1); // zip_depth.length never called
  		zip_length_code = []; // new Array(zip_MAX_MATCH-zip_MIN_MATCH+1); // zip_length_code.length never called
  		zip_dist_code = []; // new Array(512); // zip_dist_code.length never called
  		zip_base_length = []; // new Array(zip_LENGTH_CODES); // zip_base_length.length never called
  		zip_base_dist = []; // new Array(zip_D_CODES); // zip_base_dist.length never called
  		zip_flag_buf = []; // new Array(parseInt(zip_LIT_BUFSIZE / 8, 10)); // zip_flag_buf.length never called
  	}
  
  	function zip_deflate_end() {
  		zip_free_queue = zip_qhead = zip_qtail = null;
  		zip_outbuf = null;
  		zip_window = null;
  		zip_d_buf = null;
  		zip_l_buf = null;
  		zip_prev = null;
  		zip_dyn_ltree = null;
  		zip_dyn_dtree = null;
  		zip_static_ltree = null;
  		zip_static_dtree = null;
  		zip_bl_tree = null;
  		zip_l_desc = null;
  		zip_d_desc = null;
  		zip_bl_desc = null;
  		zip_bl_count = null;
  		zip_heap = null;
  		zip_depth = null;
  		zip_length_code = null;
  		zip_dist_code = null;
  		zip_base_length = null;
  		zip_base_dist = null;
  		zip_flag_buf = null;
  	}
  
  	function zip_reuse_queue(p) {
  		p.next = zip_free_queue;
  		zip_free_queue = p;
  	}
  
  	function zip_new_queue() {
  		var p;
  
  		if(zip_free_queue !== null)
  		{
  		p = zip_free_queue;
  		zip_free_queue = zip_free_queue.next;
  		}
  		else
  		p = new zip_DeflateBuffer();
  		p.next = null;
  		p.len = p.off = 0;
  
  		return p;
  	}
  
  	function zip_head1(i) {
  		return zip_prev[zip_WSIZE + i];
  	}
  
  	function zip_head2(i, val) {
  		return (zip_prev[zip_WSIZE + i] = val);
  	}
  
  	/* put_byte is used for the compressed output, put_ubyte for the
  	 * uncompressed output. However unlzw() uses window for its
  	 * suffix table instead of its output buffer, so it does not use put_ubyte
  	 * (to be cleaned up).
  	 */
  	function zip_put_byte(c) {
  		zip_outbuf[zip_outoff + zip_outcnt++] = c;
  		if(zip_outoff + zip_outcnt === zip_OUTBUFSIZ)
  		zip_qoutbuf();
  	}
  
  	/* Output a 16 bit value, lsb first */
  	function zip_put_short(w) {
  		w &= 0xffff;
  		if(zip_outoff + zip_outcnt < zip_OUTBUFSIZ - 2) {
  		zip_outbuf[zip_outoff + zip_outcnt++] = (w & 0xff);
  		zip_outbuf[zip_outoff + zip_outcnt++] = (w >>> 8);
  		} else {
  		zip_put_byte(w & 0xff);
  		zip_put_byte(w >>> 8);
  		}
  	}
  
  	/* ==========================================================================
  	 * Insert string s in the dictionary and set match_head to the previous head
  	 * of the hash chain (the most recent string with same hash key). Return
  	 * the previous length of the hash chain.
  	 * IN  assertion: all calls to to INSERT_STRING are made with consecutive
  	 *    input characters and the first MIN_MATCH bytes of s are valid
  	 *    (except for the last MIN_MATCH-1 bytes of the input file).
  	 */
  	function zip_INSERT_STRING() {
  		zip_ins_h = ((zip_ins_h << zip_H_SHIFT) ^ (zip_window[zip_strstart + zip_MIN_MATCH - 1] & 0xff)) & zip_HASH_MASK;
  		zip_hash_head = zip_head1(zip_ins_h);
  		zip_prev[zip_strstart & zip_WMASK] = zip_hash_head;
  		zip_head2(zip_ins_h, zip_strstart);
  	}
  
  	/* Send a code of the given tree. c and tree must not have side effects */
  	function zip_SEND_CODE(c, tree) {
  		zip_send_bits(tree[c].fc, tree[c].dl);
  	}
  
  	/* Mapping from a distance to a distance code. dist is the distance - 1 and
  	 * must not have side effects. dist_code[256] and dist_code[257] are never
  	 * used.
  	 */
  	function zip_D_CODE(dist) {
  		return (dist < 256 ? zip_dist_code[dist] : zip_dist_code[256 + (dist>>7)]) & 0xff;
  	}
  
  	/* ==========================================================================
  	 * Compares to subtrees, using the tree depth as tie breaker when
  	 * the subtrees have equal frequency. This minimizes the worst case length.
  	 */
  	function zip_SMALLER(tree, n, m) {
  		return tree[n].fc < tree[m].fc || (tree[n].fc === tree[m].fc && zip_depth[n] <= zip_depth[m]);
  	}
  
  	/* ==========================================================================
  	 * read string data
  	 */
  	function zip_read_buff(buff, offset, n) {
  		var i;
  		for(i = 0; i < n && zip_deflate_pos < zip_deflate_data.length; i++)
  		buff[offset + i] = zip_deflate_data.charCodeAt(zip_deflate_pos++) & 0xff;
  		return i;
  	}
  
  	/* ==========================================================================
  	 * Initialize the "longest match" routines for a new file
  	 */
  	function zip_lm_init() {
  		var j;
  
  		// Initialize the hash table. */
  		for(j = 0; j < zip_HASH_SIZE; j++)
  	//	zip_head2(j, zip_NIL);
  		zip_prev[zip_WSIZE + j] = 0;
  		// prev will be initialized on the fly */
  
  		// Set the default configuration parameters:
  		zip_max_lazy_match = zip_configuration_table[zip_compr_level].max_lazy;
  		zip_good_match = zip_configuration_table[zip_compr_level].good_length;
  		if(!zip_FULL_SEARCH)
  		zip_nice_match = zip_configuration_table[zip_compr_level].nice_length;
  		zip_max_chain_length = zip_configuration_table[zip_compr_level].max_chain;
  
  		zip_strstart = 0;
  		zip_block_start = 0;
  
  		zip_lookahead = zip_read_buff(zip_window, 0, 2 * zip_WSIZE);
  		if(zip_lookahead <= 0) {
  		zip_eofile = true;
  		zip_lookahead = 0;
  		return;
  		}
  		zip_eofile = false;
  		// Make sure that we always have enough lookahead. This is important
  		// if input comes from a device such as a tty.
  		while(zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
  		zip_fill_window();
  
  		// If lookahead < MIN_MATCH, ins_h is garbage, but this is
  		// not important since only literal bytes will be emitted.
  		zip_ins_h = 0;
  		for(j = 0; j < zip_MIN_MATCH - 1; j++) {
  	//      UPDATE_HASH(ins_h, window[j]);
  		zip_ins_h = ((zip_ins_h << zip_H_SHIFT) ^ (zip_window[j] & 0xff)) & zip_HASH_MASK;
  		}
  	}
  
  	/* ==========================================================================
  	 * Set match_start to the longest match starting at the given string and
  	 * return its length. Matches shorter or equal to prev_length are discarded,
  	 * in which case the result is equal to prev_length and match_start is
  	 * garbage.
  	 * IN assertions: cur_match is the head of the hash chain for the current
  	 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
  	 */
  	function zip_longest_match(cur_match) {
  		var chain_length = zip_max_chain_length; // max hash chain length
  		var scanp = zip_strstart; // current string
  		var matchp; // matched string
  		var len; // length of current match
  		var best_len = zip_prev_length; // best match length so far
  
  		// Stop when cur_match becomes <= limit. To simplify the code,
  		// we prevent matches with the string of window index 0.
  		var limit = (zip_strstart > zip_MAX_DIST ? zip_strstart - zip_MAX_DIST : zip_NIL);
  
  		var strendp = zip_strstart + zip_MAX_MATCH;
  		var scan_end1 = zip_window[scanp + best_len - 1];
  		var scan_end = zip_window[scanp + best_len];
  
  		// Do not waste too much time if we already have a good match: */
  		if(zip_prev_length >= zip_good_match)
  		chain_length >>= 2;
  
  	//  Assert(encoder->strstart <= window_size-MIN_LOOKAHEAD, "insufficient lookahead");
  
  		do {
  	//    Assert(cur_match < encoder->strstart, "no future");
  		matchp = cur_match;
  
  		// Skip to next match if the match length cannot increase
  		// or if the match length is less than 2:
  		if(zip_window[matchp + best_len] !== scan_end  ||
  			zip_window[matchp + best_len - 1] !== scan_end1 ||
  			zip_window[matchp] !== zip_window[scanp] ||
  			zip_window[++matchp] !== zip_window[scanp + 1]) {
  			continue;
  		}
  
  		// The check at best_len-1 can be removed because it will be made
  		// again later. (This heuristic is not always a win.)
  		// It is not necessary to compare scan[2] and match[2] since they
  		// are always equal when the other bytes match, given that
  		// the hash keys are equal and that HASH_BITS >= 8.
  		scanp += 2;
  		matchp++;
  
  		// We check for insufficient lookahead only every 8th comparison;
  		// the 256th check will be made at strstart+258.
  		do {
  		} while(zip_window[++scanp] === zip_window[++matchp] &&
  			zip_window[++scanp] === zip_window[++matchp] &&
  			zip_window[++scanp] === zip_window[++matchp] &&
  			zip_window[++scanp] === zip_window[++matchp] &&
  			zip_window[++scanp] === zip_window[++matchp] &&
  			zip_window[++scanp] === zip_window[++matchp] &&
  			zip_window[++scanp] === zip_window[++matchp] &&
  			zip_window[++scanp] === zip_window[++matchp] &&
  			scanp < strendp);
  
  			len = zip_MAX_MATCH - (strendp - scanp);
  			scanp = strendp - zip_MAX_MATCH;
  
  			if(len > best_len) {
  			zip_match_start = cur_match;
  			best_len = len;
  			if(zip_FULL_SEARCH) {
  				if(len >= zip_MAX_MATCH) break;
  			} else {
  				if(len >= zip_nice_match) break;
  			}
  
  			scan_end1 = zip_window[scanp + best_len-1];
  			scan_end = zip_window[scanp + best_len];
  			}
  		} while((cur_match = zip_prev[cur_match & zip_WMASK]) > limit && --chain_length !== 0);
  
  		return best_len;
  	}
  
  	/* ==========================================================================
  	 * Fill the window when the lookahead becomes insufficient.
  	 * Updates strstart and lookahead, and sets eofile if end of input file.
  	 * IN assertion: lookahead < MIN_LOOKAHEAD && strstart + lookahead > 0
  	 * OUT assertions: at least one byte has been read, or eofile is set;
  	 *    file reads are performed for at least two bytes (required for the
  	 *    translate_eol option).
  	 */
  	function zip_fill_window() {
  		var n, m;
  
  	 // Amount of free space at the end of the window.
  		var more = zip_window_size - zip_lookahead - zip_strstart;
  
  		// If the window is almost full and there is insufficient lookahead,
  		// move the upper half to the lower one to make room in the upper half.
  		if(more === -1) {
  		// Very unlikely, but possible on 16 bit machine if strstart == 0
  		// and lookahead == 1 (input done one byte at time)
  		more--;
  		} else if(zip_strstart >= zip_WSIZE + zip_MAX_DIST) {
  		// By the IN assertion, the window is not empty so we can't confuse
  		// more == 0 with more == 64K on a 16 bit machine.
  	//	Assert(window_size == (ulg)2*WSIZE, "no sliding with BIG_MEM");
  
  	//	System.arraycopy(window, WSIZE, window, 0, WSIZE);
  		for(n = 0; n < zip_WSIZE; n++) {
  			zip_window[n] = zip_window[n + zip_WSIZE];
  		}
  
  		zip_match_start -= zip_WSIZE;
  		zip_strstart    -= zip_WSIZE; /* we now have strstart >= MAX_DIST: */
  		zip_block_start -= zip_WSIZE;
  
  		for(n = 0; n < zip_HASH_SIZE; n++) {
  			m = zip_head1(n);
  			zip_head2(n, m >= zip_WSIZE ? m - zip_WSIZE : zip_NIL);
  		}
  		for(n = 0; n < zip_WSIZE; n++) {
  		// If n is not on any hash chain, prev[n] is garbage but
  		// its value will never be used.
  			m = zip_prev[n];
  			zip_prev[n] = (m >= zip_WSIZE ? m - zip_WSIZE : zip_NIL);
  		}
  		more += zip_WSIZE;
  		}
  	 // At this point, more >= 2
  		if(!zip_eofile) {
  			n = zip_read_buff(zip_window, zip_strstart + zip_lookahead, more);
  			if(n <= 0) {
  				zip_eofile = true;
  			} else {
  				zip_lookahead += n;
  			}
  		}
  	}
  
  	/* ==========================================================================
  	 * Processes a new input file and return its compressed length. This
  	 * function does not perform lazy evaluationof matches and inserts
  	 * new strings in the dictionary only for unmatched strings or for short
  	 * matches. It is used only for the fast compression options.
  	 */
  	function zip_deflate_fast() {
  		while(zip_lookahead !== 0 && zip_qhead === null) {
  		var flush; // set if current block must be flushed
  
  		// Insert the string window[strstart .. strstart+2] in the
  		// dictionary, and set hash_head to the head of the hash chain:
  		zip_INSERT_STRING();
  
  		// Find the longest match, discarding those <= prev_length.
  		// At this point we have always match_length < MIN_MATCH
  		if(zip_hash_head !== zip_NIL &&
  			zip_strstart - zip_hash_head <= zip_MAX_DIST) {
  		// To simplify the code, we prevent matches with the string
  		// of window index 0 (in particular we have to avoid a match
  		// of the string with itself at the start of the input file).
  			zip_match_length = zip_longest_match(zip_hash_head);
  		// longest_match() sets match_start */
  			if(zip_match_length > zip_lookahead)
  			zip_match_length = zip_lookahead;
  		}
  		if(zip_match_length >= zip_MIN_MATCH) {
  		// check_match(strstart, match_start, match_length);
  
  			flush = zip_ct_tally(zip_strstart - zip_match_start, zip_match_length - zip_MIN_MATCH);
  			zip_lookahead -= zip_match_length;
  
  		// Insert new strings in the hash table only if the match length
  		// is not too large. This saves time but degrades compression.
  			if(zip_match_length <= zip_max_lazy_match) {
  				zip_match_length--; // string at strstart already in hash table
  				do {
  					zip_strstart++;
  					zip_INSERT_STRING();
  					// strstart never exceeds WSIZE-MAX_MATCH, so there are
  					// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
  					// these bytes are garbage, but it does not matter since
  					// the next lookahead bytes will be emitted as literals.
  				} while(--zip_match_length !== 0);
  				zip_strstart++;
  			} else {
  				zip_strstart += zip_match_length;
  				zip_match_length = 0;
  				zip_ins_h = zip_window[zip_strstart] & 0xff;
  	//		UPDATE_HASH(ins_h, window[strstart + 1]);
  				zip_ins_h = ((zip_ins_h<<zip_H_SHIFT) ^ (zip_window[zip_strstart + 1] & 0xff)) & zip_HASH_MASK;
  
  	//#if MIN_MATCH !== 3
  	//		Call UPDATE_HASH() MIN_MATCH-3 more times
  	//#endif
  
  			}
  		} else {
  		// No match, output a literal byte */
  			flush = zip_ct_tally(0, zip_window[zip_strstart] & 0xff);
  			zip_lookahead--;
  			zip_strstart++;
  		}
  		if(flush) {
  			zip_flush_block(0);
  			zip_block_start = zip_strstart;
  		}
  
  		// Make sure that we always have enough lookahead, except
  		// at the end of the input file. We need MAX_MATCH bytes
  		// for the next match, plus MIN_MATCH bytes to insert the
  		// string following the next match.
  		while(zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
  			zip_fill_window();
  		}
  	}
  
  	function zip_deflate_better() {
  		// Process the input block. */
  		while(zip_lookahead !== 0 && zip_qhead === null) {
  		// Insert the string window[strstart .. strstart+2] in the
  		// dictionary, and set hash_head to the head of the hash chain:
  		zip_INSERT_STRING();
  
  		// Find the longest match, discarding those <= prev_length.
  		zip_prev_length = zip_match_length;
  		zip_prev_match = zip_match_start;
  		zip_match_length = zip_MIN_MATCH - 1;
  
  		if(zip_hash_head !== zip_NIL &&
  			zip_prev_length < zip_max_lazy_match &&
  			zip_strstart - zip_hash_head <= zip_MAX_DIST) {
  			// To simplify the code, we prevent matches with the string
  			// of window index 0 (in particular we have to avoid a match
  			// of the string with itself at the start of the input file).
  			zip_match_length = zip_longest_match(zip_hash_head);
  			// longest_match() sets match_start */
  			if(zip_match_length > zip_lookahead) {
  				zip_match_length = zip_lookahead;
  			}
  
  			// Ignore a length 3 match if it is too distant: */
  			if(zip_match_length === zip_MIN_MATCH && zip_strstart - zip_match_start > zip_TOO_FAR) {
  				// If prev_match is also MIN_MATCH, match_start is garbage
  				// but we will ignore the current match anyway.
  				zip_match_length--;
  			}
  		}
  		// If there was a match at the previous step and the current
  		// match is not better, output the previous match:
  		if(zip_prev_length >= zip_MIN_MATCH &&
  			zip_match_length <= zip_prev_length) {
  			var flush; // set if current block must be flushed
  
  			// check_match(strstart - 1, prev_match, prev_length);
  			flush = zip_ct_tally(zip_strstart - 1 - zip_prev_match, zip_prev_length - zip_MIN_MATCH);
  
  			// Insert in hash table all strings up to the end of the match.
  			// strstart-1 and strstart are already inserted.
  			zip_lookahead -= zip_prev_length - 1;
  			zip_prev_length -= 2;
  			do {
  				zip_strstart++;
  				zip_INSERT_STRING();
  				// strstart never exceeds WSIZE-MAX_MATCH, so there are
  				// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
  				// these bytes are garbage, but it does not matter since the
  				// next lookahead bytes will always be emitted as literals.
  			} while(--zip_prev_length !== 0);
  			zip_match_available = 0;
  			zip_match_length = zip_MIN_MATCH - 1;
  			zip_strstart++;
  			if(flush) {
  				zip_flush_block(0);
  				zip_block_start = zip_strstart;
  			}
  		} else if(zip_match_available !== 0) {
  			// If there was no match at the previous position, output a
  			// single literal. If there was a match but the current match
  			// is longer, truncate the previous match to a single literal.
  			if(zip_ct_tally(0, zip_window[zip_strstart - 1] & 0xff)) {
  				zip_flush_block(0);
  				zip_block_start = zip_strstart;
  			}
  			zip_strstart++;
  			zip_lookahead--;
  		} else {
  			// There is no previous match to compare with, wait for
  			// the next step to decide.
  			zip_match_available = 1;
  			zip_strstart++;
  			zip_lookahead--;
  		}
  
  		// Make sure that we always have enough lookahead, except
  		// at the end of the input file. We need MAX_MATCH bytes
  		// for the next match, plus MIN_MATCH bytes to insert the
  		// string following the next match.
  		while(zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
  			zip_fill_window();
  		}
  	}
  
  	function zip_init_deflate() {
  		if(zip_eofile)
  		return;
  		zip_bi_buf = 0;
  		zip_bi_valid = 0;
  		zip_ct_init();
  		zip_lm_init();
  
  		zip_qhead = null;
  		zip_outcnt = 0;
  		zip_outoff = 0;
  
  		if(zip_compr_level <= 3)
  		{
  		zip_prev_length = zip_MIN_MATCH - 1;
  		zip_match_length = 0;
  		}
  		else
  		{
  		zip_match_length = zip_MIN_MATCH - 1;
  		zip_match_available = 0;
  		}
  
  		zip_complete = false;
  	}
  
  	/* ==========================================================================
  	 * Same as above, but achieves better compression. We use a lazy
  	 * evaluation for matches: a match is finally adopted only if there is
  	 * no better match at the next window position.
  	 */
  	function zip_deflate_internal(buff, off, buff_size) {
  		var n;
  
  		if(!zip_initflag)
  		{
  		zip_init_deflate();
  		zip_initflag = true;
  		if(zip_lookahead === 0) { // empty
  			zip_complete = true;
  			return 0;
  		}
  		}
  
  		if((n = zip_qcopy(buff, off, buff_size)) === buff_size)
  		return buff_size;
  
  		if(zip_complete)
  		return n;
  
  		if(zip_compr_level <= 3) // optimized for speed
  		zip_deflate_fast();
  		else
  		zip_deflate_better();
  		if(zip_lookahead === 0) {
  		if(zip_match_available !== 0)
  			zip_ct_tally(0, zip_window[zip_strstart - 1] & 0xff);
  		zip_flush_block(1);
  		zip_complete = true;
  		}
  		return n + zip_qcopy(buff, n + off, buff_size - n);
  	}
  
  	function zip_qcopy(buff, off, buff_size) {
  		var n, i, j;
  
  		n = 0;
  		while(zip_qhead !== null && n < buff_size)
  		{
  		i = buff_size - n;
  		if(i > zip_qhead.len)
  			i = zip_qhead.len;
  	//      System.arraycopy(qhead.ptr, qhead.off, buff, off + n, i);
  		for(j = 0; j < i; j++)
  			buff[off + n + j] = zip_qhead.ptr[zip_qhead.off + j];
  
  		zip_qhead.off += i;
  		zip_qhead.len -= i;
  		n += i;
  		if(zip_qhead.len === 0) {
  			var p;
  			p = zip_qhead;
  			zip_qhead = zip_qhead.next;
  			zip_reuse_queue(p);
  		}
  		}
  
  		if(n === buff_size)
  		return n;
  
  		if(zip_outoff < zip_outcnt) {
  		i = buff_size - n;
  		if(i > zip_outcnt - zip_outoff)
  			i = zip_outcnt - zip_outoff;
  		// System.arraycopy(outbuf, outoff, buff, off + n, i);
  		for(j = 0; j < i; j++)
  			buff[off + n + j] = zip_outbuf[zip_outoff + j];
  		zip_outoff += i;
  		n += i;
  		if(zip_outcnt === zip_outoff)
  			zip_outcnt = zip_outoff = 0;
  		}
  		return n;
  	}
  
  	/* ==========================================================================
  	 * Allocate the match buffer, initialize the various tables and save the
  	 * location of the internal file attribute (ascii/binary) and method
  	 * (DEFLATE/STORE).
  	 */
  	function zip_ct_init() {
  		var n; // iterates over tree elements
  		var bits; // bit counter
  		var length; // length value
  		var code; // code value
  		var dist; // distance index
  
  		if(zip_static_dtree[0].dl !== 0) return; // ct_init already called
  
  		zip_l_desc.dyn_tree = zip_dyn_ltree;
  		zip_l_desc.static_tree = zip_static_ltree;
  		zip_l_desc.extra_bits = zip_extra_lbits;
  		zip_l_desc.extra_base = zip_LITERALS + 1;
  		zip_l_desc.elems = zip_L_CODES;
  		zip_l_desc.max_length = zip_MAX_BITS;
  		zip_l_desc.max_code = 0;
  
  		zip_d_desc.dyn_tree = zip_dyn_dtree;
  		zip_d_desc.static_tree = zip_static_dtree;
  		zip_d_desc.extra_bits = zip_extra_dbits;
  		zip_d_desc.extra_base = 0;
  		zip_d_desc.elems = zip_D_CODES;
  		zip_d_desc.max_length = zip_MAX_BITS;
  		zip_d_desc.max_code = 0;
  
  		zip_bl_desc.dyn_tree = zip_bl_tree;
  		zip_bl_desc.static_tree = null;
  		zip_bl_desc.extra_bits = zip_extra_blbits;
  		zip_bl_desc.extra_base = 0;
  		zip_bl_desc.elems = zip_BL_CODES;
  		zip_bl_desc.max_length = zip_MAX_BL_BITS;
  		zip_bl_desc.max_code = 0;
  
  	 // Initialize the mapping length (0..255) -> length code (0..28)
  		length = 0;
  		for(code = 0; code < zip_LENGTH_CODES-1; code++) {
  		zip_base_length[code] = length;
  		for(n = 0; n < (1<<zip_extra_lbits[code]); n++)
  			zip_length_code[length++] = code;
  		}
  	 // Assert (length === 256, "ct_init: length !== 256");
  
  		// Note that the length 255 (match length 258) can be represented
  		// in two different ways: code 284 + 5 bits or code 285, so we
  		// overwrite length_code[255] to use the best encoding:
  		zip_length_code[length-1] = code;
  
  		// Initialize the mapping dist (0..32K) -> dist code (0..29) */
  		dist = 0;
  		for(code = 0 ; code < 16; code++) {
  		zip_base_dist[code] = dist;
  		for(n = 0; n < (1<<zip_extra_dbits[code]); n++) {
  			zip_dist_code[dist++] = code;
  		}
  		}
  	 // Assert (dist === 256, "ct_init: dist !== 256");
  		dist >>= 7; // from now on, all distances are divided by 128
  		for( ; code < zip_D_CODES; code++) {
  		zip_base_dist[code] = dist << 7;
  		for(n = 0; n < (1<<(zip_extra_dbits[code]-7)); n++)
  			zip_dist_code[256 + dist++] = code;
  		}
  	 // Assert (dist === 256, "ct_init: 256+dist !== 512");
  
  	 // Construct the codes of the static literal tree
  		for(bits = 0; bits <= zip_MAX_BITS; bits++) {
  			zip_bl_count[bits] = 0;
  		}
  		n = 0;
  		while(n <= 143) {
  			zip_static_ltree[n++].dl = 8;
  			zip_bl_count[8]++;
  		}
  		while(n <= 255) {
  			zip_static_ltree[n++].dl = 9;
  			zip_bl_count[9]++;
  		}
  		while(n <= 279) {
  			zip_static_ltree[n++].dl = 7;
  			zip_bl_count[7]++;
  		}
  		while(n <= 287) {
  			zip_static_ltree[n++].dl = 8;
  			zip_bl_count[8]++;
  		}
  		// Codes 286 and 287 do not exist, but we must include them in the
  		// tree construction to get a canonical Huffman tree (longest code
  		// all ones)
  		zip_gen_codes(zip_static_ltree, zip_L_CODES + 1);
  
  		// The static distance tree is trivial: */
  		for(n = 0; n < zip_D_CODES; n++) {
  		zip_static_dtree[n].dl = 5;
  		zip_static_dtree[n].fc = zip_bi_reverse(n, 5);
  		}
  
  	 // Initialize the first block of the first file:
  		zip_init_block();
  	}
  
  	/* ==========================================================================
  	 * Initialize a new block.
  	 */
  	function zip_init_block() {
  		var n; // iterates over tree elements
  
  	 // Initialize the trees.
  		for(n = 0; n < zip_L_CODES;  n++) zip_dyn_ltree[n].fc = 0;
  		for(n = 0; n < zip_D_CODES;  n++) zip_dyn_dtree[n].fc = 0;
  		for(n = 0; n < zip_BL_CODES; n++) zip_bl_tree[n].fc = 0;
  
  		zip_dyn_ltree[zip_END_BLOCK].fc = 1;
  		zip_opt_len = zip_static_len = 0;
  		zip_last_lit = zip_last_dist = zip_last_flags = 0;
  		zip_flags = 0;
  		zip_flag_bit = 1;
  	}
  
  	/* ==========================================================================
  	 * Restore the heap property by moving down the tree starting at node k,
  	 * exchanging a node with the smallest of its two sons if necessary, stopping
  	 * when the heap property is re-established (each father smaller than its
  	 * two sons).
  	 *
  	 * @param tree- tree to restore
  	 * @param k- node to move down
  	 */
  	function zip_pqdownheap(tree, k) {
  		var v = zip_heap[k],
  			j = k << 1; // left son of k
  
  		while(j <= zip_heap_len) {
  			// Set j to the smallest of the two sons:
  			if(j < zip_heap_len && zip_SMALLER(tree, zip_heap[j + 1], zip_heap[j])) {
  				j++;
  			}
  
  			// Exit if v is smaller than both sons
  			if(zip_SMALLER(tree, v, zip_heap[j])) {
  				break;
  			}
  
  			// Exchange v with the smallest son
  			zip_heap[k] = zip_heap[j];
  			k = j;
  
  			// And continue down the tree, setting j to the left son of k
  			j <<= 1;
  		}
  		zip_heap[k] = v;
  	}
  
  	/* ==========================================================================
  	 * Compute the optimal bit lengths for a tree and update the total bit length
  	 * for the current block.
  	 * IN assertion: the fields freq and dad are set, heap[heap_max] and
  	 *    above are the tree nodes sorted by increasing frequency.
  	 * OUT assertions: the field len is set to the optimal bit length, the
  	 *     array bl_count contains the frequencies for each bit length.
  	 *     The length opt_len is updated; static_len is also updated if stree is
  	 *     not null.
  	 */
  	function zip_gen_bitlen(desc) { // the tree descriptor
  		var tree = desc.dyn_tree;
  		var extra = desc.extra_bits;
  		var base = desc.extra_base;
  		var max_code = desc.max_code;
  		var max_length = desc.max_length;
  		var stree = desc.static_tree;
  		var h; // heap index
  		var n, m; // iterate over the tree elements
  		var bits; // bit length
  		var xbits; // extra bits
  		var f; // frequency
  		var overflow = 0; // number of elements with bit length too large
  
  		for(bits = 0; bits <= zip_MAX_BITS; bits++) {
  			zip_bl_count[bits] = 0;
  		}
  
  		// In a first pass, compute the optimal bit lengths (which may
  		// overflow in the case of the bit length tree).
  		tree[zip_heap[zip_heap_max]].dl = 0; // root of the heap
  
  		for(h = zip_heap_max + 1; h < zip_HEAP_SIZE; h++) {
  			n = zip_heap[h];
  			bits = tree[tree[n].dl].dl + 1;
  			if(bits > max_length) {
  				bits = max_length;
  				overflow++;
  			}
  			tree[n].dl = bits;
  			// We overwrite tree[n].dl which is no longer needed
  
  			if(n > max_code) {
  				continue; // not a leaf node
  			}
  
  			zip_bl_count[bits]++;
  			xbits = 0;
  			if(n >= base) {
  				xbits = extra[n - base];
  			}
  			f = tree[n].fc;
  			zip_opt_len += f * (bits + xbits);
  			if(stree !== null) {
  				zip_static_len += f * (stree[n].dl + xbits);
  			}
  		}
  		if(overflow === 0) {
  			return;
  		}
  
  	 // This happens for example on obj2 and pic of the Calgary corpus
  
  	 // Find the first bit length which could increase:
  		do {
  		bits = max_length - 1;
  		while(zip_bl_count[bits] === 0) {
  			bits--;
  		}
  		zip_bl_count[bits]--; // move one leaf down the tree
  		zip_bl_count[bits + 1] += 2; // move one overflow item as its brother
  		zip_bl_count[max_length]--;
  		// The brother of the overflow item also moves one step up,
  		// but this does not affect bl_count[max_length]
  		overflow -= 2;
  		} while(overflow > 0);
  
  		// Now recompute all bit lengths, scanning in increasing frequency.
  		// h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
  		// lengths instead of fixing only the wrong ones. This idea is taken
  		// from 'ar' written by Haruhiko Okumura.)
  		for(bits = max_length; bits !== 0; bits--) {
  			n = zip_bl_count[bits];
  			while(n !== 0) {
  				m = zip_heap[--h];
  				if(m > max_code) {
  					continue;
  				}
  				if(tree[m].dl !== bits) {
  					zip_opt_len += (bits - tree[m].dl) * tree[m].fc;
  					tree[m].fc = bits;
  				}
  				n--;
  			}
  		}
  	}
  
  	  /* ==========================================================================
  	   * Generate the codes for a given tree and bit counts (which need not be
  	   * optimal).
  	   * IN assertion: the array bl_count contains the bit length statistics for
  	   * the given tree and the field len is set for all tree elements.
  	   * OUT assertion: the field code is set for all tree elements of non
  	   *     zero code length.
  	   * @param tree- the tree to decorate
  	   * @param max_code- largest code with non-zero frequency
  	   */
  	function zip_gen_codes(tree, max_code) {
  		var next_code = []; // new Array(zip_MAX_BITS + 1); // next code value for each bit length
  		var code = 0; // running code value
  		var bits; // bit index
  		var n; // code index
  
  		// The distribution counts are first used to generate the code values
  		// without bit reversal.
  		for(bits = 1; bits <= zip_MAX_BITS; bits++) {
  			code = ((code + zip_bl_count[bits-1]) << 1);
  			next_code[bits] = code;
  		}
  
  		// Check that the bit counts in bl_count are consistent. The last code
  		// must be all ones.
  	// Assert (code + encoder->bl_count[MAX_BITS]-1 === (1<<MAX_BITS)-1, "inconsistent bit counts");
  	// Tracev((stderr,"\ngen_codes: max_code %d ", max_code));
  
  		for(n = 0; n <= max_code; n++) {
  			var len = tree[n].dl;
  			if(len === 0) {
  				continue;
  			}
  			// Now reverse the bits
  			tree[n].fc = zip_bi_reverse(next_code[len]++, len);
  
  			// Tracec(tree !== static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ", n, (isgraph(n) ? n : ' '), len, tree[n].fc, next_code[len]-1));
  		}
  	}
  
  	/* ==========================================================================
  	 * Construct one Huffman tree and assigns the code bit strings and lengths.
  	 * Update the total bit length for the current block.
  	 * IN assertion: the field freq is set for all tree elements.
  	 * OUT assertions: the fields len and code are set to the optimal bit length
  	 *     and corresponding code. The length opt_len is updated; static_len is
  	 *     also updated if stree is not null. The field max_code is set.
  	 */
  	function zip_build_tree(desc) { // the tree descriptor
  		var tree = desc.dyn_tree;
  		var stree = desc.static_tree;
  		var elems = desc.elems;
  		var n, m; // iterate over heap elements
  		var max_code = -1; // largest code with non zero frequency
  		var node = elems; // next internal node of the tree
  
  		// Construct the initial heap, with least frequent element in
  		// heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
  		// heap[0] is not used.
  		zip_heap_len = 0;
  		zip_heap_max = zip_HEAP_SIZE;
  
  		for(n = 0; n < elems; n++) {
  		if(tree[n].fc !== 0) {
  			zip_heap[++zip_heap_len] = max_code = n;
  			zip_depth[n] = 0;
  		} else
  			tree[n].dl = 0;
  		}
  
  		// The pkzip format requires that at least one distance code exists,
  		// and that at least one bit should be sent even if there is only one
  		// possible code. So to avoid special checks later on we force at least
  		// two codes of non zero frequency.
  		while(zip_heap_len < 2) {
  			var xnew = zip_heap[++zip_heap_len] = (max_code < 2 ? ++max_code : 0);
  			tree[xnew].fc = 1;
  			zip_depth[xnew] = 0;
  			zip_opt_len--;
  			if(stree !== null) {
  				zip_static_len -= stree[xnew].dl;
  			}
  			// new is 0 or 1 so it does not have extra bits
  		}
  		desc.max_code = max_code;
  
  		// The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
  		// establish sub-heaps of increasing lengths:
  		for (n = zip_heap_len >> 1; n >= 1; n--) {
  			zip_pqdownheap(tree, n);
  		}
  
  		// Construct the Huffman tree by repeatedly combining the least two
  		// frequent nodes.
  		do {
  			n = zip_heap[zip_SMALLEST];
  			zip_heap[zip_SMALLEST] = zip_heap[zip_heap_len--];
  			zip_pqdownheap(tree, zip_SMALLEST);
  
  			m = zip_heap[zip_SMALLEST]; // m = node of next least frequency
  
  			// keep the nodes sorted by frequency
  			zip_heap[--zip_heap_max] = n;
  			zip_heap[--zip_heap_max] = m;
  
  			// Create a new node father of n and m
  			tree[node].fc = tree[n].fc + tree[m].fc;
  			//	depth[node] = (char)(MAX(depth[n], depth[m]) + 1);
  			if(zip_depth[n] > zip_depth[m] + 1) {
  				zip_depth[node] = zip_depth[n];
  			} else {
  				zip_depth[node] = zip_depth[m] + 1;
  			}
  			tree[n].dl = tree[m].dl = node;
  
  			// and insert the new node in the heap
  			zip_heap[zip_SMALLEST] = node++;
  			zip_pqdownheap(tree, zip_SMALLEST);
  
  		} while(zip_heap_len >= 2);
  
  		zip_heap[--zip_heap_max] = zip_heap[zip_SMALLEST];
  
  		// At this point, the fields freq and dad are set. We can now
  		// generate the bit lengths.
  		zip_gen_bitlen(desc);
  
  		// The field len is now set, we can generate the bit codes
  		zip_gen_codes(tree, max_code);
  	}
  
  	/* ==========================================================================
  	 * Scan a literal or distance tree to determine the frequencies of the codes
  	 * in the bit length tree. Updates opt_len to take into account the repeat
  	 * counts. (The contribution of the bit length codes will be added later
  	 * during the construction of bl_tree.)
  	 *
  	 * @param tree- the tree to be scanned
  	 * @param max_code- and its largest code of non zero frequency
  	 */
  	function zip_scan_tree(tree, max_code) {
  		var n, // iterates over all tree elements
  			prevlen = -1, // last emitted length
  			curlen, // length of current code
  			nextlen = tree[0].dl, // length of next code
  			count = 0, // repeat count of the current code
  			max_count = 7, // max repeat count
  			min_count = 4; // min repeat count
  
  		if(nextlen === 0) {
  			max_count = 138;
  			min_count = 3;
  		}
  		tree[max_code + 1].dl = 0xffff; // guard
  
  		for(n = 0; n <= max_code; n++) {
  			curlen = nextlen;
  			nextlen = tree[n + 1].dl;
  			if(++count < max_count && curlen === nextlen) {
  				continue;
  			} else if(count < min_count) {
  				zip_bl_tree[curlen].fc += count;
  			} else if(curlen !== 0) {
  				if(curlen !== prevlen)
  				zip_bl_tree[curlen].fc++;
  				zip_bl_tree[zip_REP_3_6].fc++;
  			} else if(count <= 10) {
  				zip_bl_tree[zip_REPZ_3_10].fc++;
  			} else {
  				zip_bl_tree[zip_REPZ_11_138].fc++;
  			}
  			count = 0; prevlen = curlen;
  			if(nextlen === 0) {
  				max_count = 138;
  				min_count = 3;
  			} else if(curlen === nextlen) {
  				max_count = 6;
  				min_count = 3;
  			} else {
  				max_count = 7;
  				min_count = 4;
  			}
  		}
  	}
  
  	/* ==========================================================================
  	 * Send a literal or distance tree in compressed form, using the codes in
  	 * bl_tree.
  	 *
  	 * @param tree- the tree to be scanned
  	 * @param max_code- and its largest code of non zero frequency
  	 */
  	function zip_send_tree(tree, max_code) {
  		var n; // iterates over all tree elements
  		var prevlen = -1; // last emitted length
  		var curlen; // length of current code
  		var nextlen = tree[0].dl; // length of next code
  		var count = 0; // repeat count of the current code
  		var max_count = 7; // max repeat count
  		var min_count = 4; // min repeat count
  
  		// tree[max_code+1].dl = -1; */  /* guard already set */
  		if(nextlen === 0) {
  			max_count = 138;
  			min_count = 3;
  		}
  
  		for(n = 0; n <= max_code; n++) {
  		curlen = nextlen;
  		nextlen = tree[n+1].dl;
  		if(++count < max_count && curlen === nextlen) {
  			continue;
  		} else if(count < min_count) {
  			do { zip_SEND_CODE(curlen, zip_bl_tree); } while(--count !== 0);
  		} else if(curlen !== 0) {
  			if(curlen !== prevlen) {
  			zip_SEND_CODE(curlen, zip_bl_tree);
  			count--;
  			}
  		// Assert(count >= 3 && count <= 6, " 3_6?");
  			zip_SEND_CODE(zip_REP_3_6, zip_bl_tree);
  			zip_send_bits(count - 3, 2);
  		} else if(count <= 10) {
  			zip_SEND_CODE(zip_REPZ_3_10, zip_bl_tree);
  			zip_send_bits(count-3, 3);
  		} else {
  			zip_SEND_CODE(zip_REPZ_11_138, zip_bl_tree);
  			zip_send_bits(count-11, 7);
  		}
  		count = 0;
  		prevlen = curlen;
  		if(nextlen === 0) {
  			max_count = 138;
  			min_count = 3;
  		} else if(curlen === nextlen) {
  			max_count = 6;
  			min_count = 3;
  		} else {
  			max_count = 7;
  			min_count = 4;
  		}
  		}
  	}
  
  	/* ==========================================================================
  	 * Construct the Huffman tree for the bit lengths and return the index in
  	 * bl_order of the last bit length code to send.
  	 */
  	function zip_build_bl_tree() {
  		var max_blindex; // index of last bit length code of non zero freq
  
  	 // Determine the bit length frequencies for literal and distance trees
  		zip_scan_tree(zip_dyn_ltree, zip_l_desc.max_code);
  		zip_scan_tree(zip_dyn_dtree, zip_d_desc.max_code);
  
  	 // Build the bit length tree:
  		zip_build_tree(zip_bl_desc);
  		// opt_len now includes the length of the tree representations, except
  		// the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
  
  		// Determine the number of bit length codes to send. The pkzip format
  		// requires that at least 4 bit length codes be sent. (appnote.txt says
  		// 3 but the actual value used is 4.)
  		for(max_blindex = zip_BL_CODES-1; max_blindex >= 3; max_blindex--) {
  		if(zip_bl_tree[zip_bl_order[max_blindex]].dl !== 0) break;
  		}
  		// Update opt_len to include the bit length tree and counts */
  		zip_opt_len += 3*(max_blindex+1) + 5+5+4;
  		// Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
  		// encoder->opt_len, encoder->static_len));
  
  		return max_blindex;
  	}
  
  	/* ==========================================================================
  	 * Send the header for a block using dynamic Huffman trees: the counts, the
  	 * lengths of the bit length codes, the literal tree and the distance tree.
  	 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
  	 */
  	function zip_send_all_trees(lcodes, dcodes, blcodes) { // number of codes for each tree
  		var rank; // index in bl_order
  
  		// Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
  		// Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES, "too many codes");
  		// Tracev((stderr, "\nbl counts: "));
  		zip_send_bits(lcodes-257, 5); // not +255 as stated in appnote.txt
  		zip_send_bits(dcodes-1,   5);
  		zip_send_bits(blcodes-4,  4); // not -3 as stated in appnote.txt
  		for(rank = 0; rank < blcodes; rank++) {
  		// Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
  		zip_send_bits(zip_bl_tree[zip_bl_order[rank]].dl, 3);
  		}
  
  	 // send the literal tree
  		zip_send_tree(zip_dyn_ltree,lcodes-1);
  
  	 // send the distance tree
  		zip_send_tree(zip_dyn_dtree,dcodes-1);
  	}
  
  	/* ==========================================================================
  	 * Determine the best encoding for the current block: dynamic trees, static
  	 * trees or store, and output the encoded block to the zip file.
  	 */
  	function zip_flush_block(eof) { // true if this is the last block for a file
  		var opt_lenb, static_lenb, // opt_len and static_len in bytes
  			max_blindex, // index of last bit length code of non zero freq
  			stored_len, // length of input block
  			i;
  
  		stored_len = zip_strstart - zip_block_start;
  		zip_flag_buf[zip_last_flags] = zip_flags; // Save the flags for the last 8 items
  
  		// Construct the literal and distance trees
  		zip_build_tree(zip_l_desc);
  		// Tracev((stderr, "\nlit data: dyn %ld, stat %ld",
  		// encoder->opt_len, encoder->static_len));
  
  		zip_build_tree(zip_d_desc);
  		// Tracev((stderr, "\ndist data: dyn %ld, stat %ld",
  		// encoder->opt_len, encoder->static_len));
  		// At this point, opt_len and static_len are the total bit lengths of
  		// the compressed block data, excluding the tree representations.
  
  		// Build the bit length tree for the above two trees, and get the index
  		// in bl_order of the last bit length code to send.
  		max_blindex = zip_build_bl_tree();
  
  	 // Determine the best encoding. Compute first the block length in bytes
  		opt_lenb = (zip_opt_len   +3+7)>>3;
  		static_lenb = (zip_static_len+3+7)>>3;
  
  	//  Trace((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u dist %u ", opt_lenb, encoder->opt_len, static_lenb, encoder->static_len, stored_len, encoder->last_lit, encoder->last_dist));
  
  		if(static_lenb <= opt_lenb) {
  			opt_lenb = static_lenb;
  		}
  		if(stored_len + 4 <= opt_lenb && zip_block_start >= 0) { // 4: two words for the lengths
  			// The test buf !== NULL is only necessary if LIT_BUFSIZE > WSIZE.
  			// Otherwise we can't have processed more than WSIZE input bytes since
  			// the last block flush, because compression would have been
  			// successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
  			// transform a block into a stored block.
  			zip_send_bits((zip_STORED_BLOCK<<1)+eof, 3);  /* send block type */
  			zip_bi_windup();         /* align on byte boundary */
  			zip_put_short(stored_len);
  			zip_put_short(~stored_len);
  
  			// copy block
  			/*
  				p = &window[block_start];
  				for(i = 0; i < stored_len; i++)
  				put_byte(p[i]);
  			*/
  			for(i = 0; i < stored_len; i++) {
  				zip_put_byte(zip_window[zip_block_start + i]);
  			}
  		} else if(static_lenb === opt_lenb) {
  			zip_send_bits((zip_STATIC_TREES<<1)+eof, 3);
  			zip_compress_block(zip_static_ltree, zip_static_dtree);
  		} else {
  			zip_send_bits((zip_DYN_TREES<<1)+eof, 3);
  			zip_send_all_trees(zip_l_desc.max_code + 1, zip_d_desc.max_code + 1, max_blindex + 1);
  			zip_compress_block(zip_dyn_ltree, zip_dyn_dtree);
  		}
  
  		zip_init_block();
  
  		if(eof !== 0) {
  			zip_bi_windup();
  		}
  	}
  
  	/* ==========================================================================
  	 * Save the match info and tally the frequency counts. Return true if
  	 * the current block must be flushed.
  	 *
  	 * @param dist- distance of matched string
  	 * @param lc- (match length - MIN_MATCH) or unmatched char (if dist === 0)
  	 */
  	function zip_ct_tally(dist, lc) {
  		zip_l_buf[zip_last_lit++] = lc;
  		if(dist === 0) {
  		// lc is the unmatched char
  		zip_dyn_ltree[lc].fc++;
  		} else {
  		// Here, lc is the match length - MIN_MATCH
  		dist--; // dist = match distance - 1
  		// Assert((ush)dist < (ush)MAX_DIST && (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) && (ush)D_CODE(dist) < (ush)D_CODES,  "ct_tally: bad match");
  
  		zip_dyn_ltree[zip_length_code[lc]+zip_LITERALS+1].fc++;
  		zip_dyn_dtree[zip_D_CODE(dist)].fc++;
  
  		zip_d_buf[zip_last_dist++] = dist;
  		zip_flags |= zip_flag_bit;
  		}
  		zip_flag_bit <<= 1;
  
  		// Output the flags if they fill a byte
  		if((zip_last_lit & 7) === 0) {
  			zip_flag_buf[zip_last_flags++] = zip_flags;
  			zip_flags = 0;
  			zip_flag_bit = 1;
  		}
  		// Try to guess if it is profitable to stop the current block here
  		if(zip_compr_level > 2 && (zip_last_lit & 0xfff) === 0) {
  			// Compute an upper bound for the compressed length
  			var out_length = zip_last_lit * 8;
  			var in_length = zip_strstart - zip_block_start;
  			var dcode;
  
  			for(dcode = 0; dcode < zip_D_CODES; dcode++) {
  				out_length += zip_dyn_dtree[dcode].fc * (5 + zip_extra_dbits[dcode]);
  			}
  			out_length >>= 3;
  			// Trace((stderr,"\nlast_lit %u, last_dist %u, in %ld, out ~%ld(%ld%%) ", encoder->last_lit, encoder->last_dist, in_length, out_length, 100L - out_length*100L/in_length));
  			if(zip_last_dist < parseInt(zip_last_lit/2, 10) && out_length < parseInt(in_length/2, 10)) {
  				return true;
  			}
  		}
  		return (zip_last_lit === zip_LIT_BUFSIZE - 1 || zip_last_dist === zip_DIST_BUFSIZE);
  		// We avoid equality with LIT_BUFSIZE because of wraparound at 64K
  		// on 16 bit machines and because stored blocks are restricted to
  		// 64K-1 bytes.
  	}
  
  	  /* ==========================================================================
  	   * Send the block data compressed using the given Huffman trees
  	   *
  	   * @param ltree- literal tree
  	   * @param dtree- distance tree
  	   */
  	function zip_compress_block(ltree, dtree) {
  		var dist; // distance of matched string
  		var lc; // match length or unmatched char (if dist === 0)
  		var lx = 0; // running index in l_buf
  		var dx = 0; // running index in d_buf
  		var fx = 0; // running index in flag_buf
  		var flag = 0; // current flags
  		var code; // the code to send
  		var extra; // number of extra bits to send
  
  		if(zip_last_lit !== 0) {
  			do {
  				if((lx & 7) === 0) {
  					flag = zip_flag_buf[fx++];
  				}
  				lc = zip_l_buf[lx++] & 0xff;
  				if((flag & 1) === 0) {
  					zip_SEND_CODE(lc, ltree); /* send a literal byte */
  					//	Tracecv(isgraph(lc), (stderr," '%c' ", lc));
  				} else {
  					// Here, lc is the match length - MIN_MATCH
  					code = zip_length_code[lc];
  					zip_SEND_CODE(code+zip_LITERALS+1, ltree); // send the length code
  					extra = zip_extra_lbits[code];
  					if(extra !== 0) {
  						lc -= zip_base_length[code];
  						zip_send_bits(lc, extra); // send the extra length bits
  					}
  					dist = zip_d_buf[dx++];
  					// Here, dist is the match distance - 1
  					code = zip_D_CODE(dist);
  					//	Assert (code < D_CODES, "bad d_code");
  
  					zip_SEND_CODE(code, dtree); // send the distance code
  					extra = zip_extra_dbits[code];
  					if(extra !== 0) {
  						dist -= zip_base_dist[code];
  						zip_send_bits(dist, extra); // send the extra distance bits
  					}
  				} // literal or match pair ?
  				flag >>= 1;
  			} while(lx < zip_last_lit);
  		}
  
  		zip_SEND_CODE(zip_END_BLOCK, ltree);
  	}
  
  	/* ==========================================================================
  	 * Send a value on a given number of bits.
  	 * IN assertion: length <= 16 and value fits in length bits.
  	 *
  	 * @param value- value to send
  	 * @param length- number of bits
  	 */
  	var zip_Buf_size = 16; // bit size of bi_buf
  	function zip_send_bits(value, length) {
  		// If not enough room in bi_buf, use (valid) bits from bi_buf and
  		// (16 - bi_valid) bits from value, leaving (width - (16-bi_valid))
  		// unused bits in value.
  		if(zip_bi_valid > zip_Buf_size - length) {
  		zip_bi_buf |= (value << zip_bi_valid);
  		zip_put_short(zip_bi_buf);
  		zip_bi_buf = (value >> (zip_Buf_size - zip_bi_valid));
  		zip_bi_valid += length - zip_Buf_size;
  		} else {
  		zip_bi_buf |= value << zip_bi_valid;
  		zip_bi_valid += length;
  		}
  	}
  
  	/* ==========================================================================
  	 * Reverse the first len bits of a code, using straightforward code (a faster
  	 * method would use a table)
  	 * IN assertion: 1 <= len <= 15
  	 *
  	 * @param code- the value to invert
  	 * @param len- its bit length
  	 */
  	function zip_bi_reverse(code, len) {
  		var res = 0;
  		do {
  		res |= code & 1;
  		code >>= 1;
  		res <<= 1;
  		} while(--len > 0);
  		return res >> 1;
  	}
  
  	/* ==========================================================================
  	 * Write out any remaining bits in an incomplete byte.
  	 */
  	function zip_bi_windup() {
  		if(zip_bi_valid > 8) {
  		zip_put_short(zip_bi_buf);
  		} else if(zip_bi_valid > 0) {
  		zip_put_byte(zip_bi_buf);
  		}
  		zip_bi_buf = 0;
  		zip_bi_valid = 0;
  	}
  
  	function zip_qoutbuf() {
  		var q, i;
  		if(zip_outcnt !== 0) {
  			q = zip_new_queue();
  			if(zip_qhead === null) {
  				zip_qhead = zip_qtail = q;
  			} else {
  				zip_qtail = zip_qtail.next = q;
  			}
  			q.len = zip_outcnt - zip_outoff;
  			// System.arraycopy(zip_outbuf, zip_outoff, q.ptr, 0, q.len);
  			for(i = 0; i < q.len; i++) {
  				q.ptr[i] = zip_outbuf[zip_outoff + i];
  			}
  			zip_outcnt = zip_outoff = 0;
  		}
  	}
  
  	function zip_deflate(str, level) {
  		var i, j, buff, aout, cbuf;
  
  		zip_deflate_data = str;
  		zip_deflate_pos = 0;
  		if(typeof level === "undefined") {
  			level = zip_DEFAULT_LEVEL;
  		}
  		zip_deflate_start(level);
  
  		buff = [];
  		aout = [];
  		while((i = zip_deflate_internal(buff, 0, 1024)) > 0) {
  			cbuf = [];
  			for(j = 0; j < i; j++){
  				cbuf[j] = String.fromCharCode(buff[j]);
  			}
  			aout[aout.length] = cbuf.join("");
  		}
  		zip_deflate_data = null; // G.C.
  		return aout.join("");
  	}
  
  	module.exports = zip_deflate;
  }());
  

  provide("test/../lib/rawdeflate.js", module.exports);
  provide("test/../lib/rawdeflate.js", module.exports);
  $.ender(module.exports);
}(global));

// ender:test/base64 as test/base64
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*
   * $Id: base64.js,v 0.9 2009/03/01 20:51:18 dankogai Exp dankogai $
   */
  
  (function(window){
  	var b64chars
  		= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  	var b64charcodes = function(){
  		var a = [];
  		var codeA = 'A'.charCodeAt(0);
  		var codea = 'a'.charCodeAt(0);
  		var code0 = '0'.charCodeAt(0);
  		for (var i = 0; i < 26; i ++) a.push(codeA + i);
  		for (var i = 0; i < 26; i ++) a.push(codea + i);
  		for (var i = 0; i < 10; i ++) a.push(code0 + i);
  		a.push('+'.charCodeAt(0));
  		a.push('/'.charCodeAt(0));
  		return a;
  	}();
  
  	var b64tab = function(bin){
  		var t = {};
  		for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
  		return t;
  	}(b64chars);
  
  	var stringToArray = function(s){
  		var a = [];
  		for (var i = 0, l = s.length; i < l; i ++) a[i] = s.charCodeAt(i);
  		return a;
  	};
  
  	var convertUTF8ArrayToBase64 = function(bin){
  		var padlen = 0;
  		while (bin.length % 3){
  			bin.push(0);
  			padlen++;
  		};
  		var b64 = [];
  		for (var i = 0, l = bin.length; i < l; i += 3){
  			var c0 = bin[i], c1 = bin[i+1], c2 = bin[i+2];
  			if (c0 >= 256 || c1 >= 256 || c2 >= 256)
  				throw 'unsupported character found';
  			var n = (c0 << 16) | (c1 << 8) | c2;
  			b64.push(
  				b64charcodes[ n >>> 18],
  				b64charcodes[(n >>> 12) & 63],
  				b64charcodes[(n >>>  6) & 63],
  				b64charcodes[ n         & 63]
  			);
  		}
  		while (padlen--) b64[b64.length - padlen - 1] = '='.charCodeAt(0);
  		return String.fromCharCode.apply(String, b64);
  	};
  
  	var convertBase64ToUTF8Array = function(b64){
  		b64 = b64.replace(/[^A-Za-z0-9+\/]+/g, '');
  		var bin = [];
  		var padlen = b64.length % 4;
  		for (var i = 0, l = b64.length; i < l; i += 4){
  			var n = ((b64tab[b64.charAt(i  )] || 0) << 18)
  				|   ((b64tab[b64.charAt(i+1)] || 0) << 12)
  				|   ((b64tab[b64.charAt(i+2)] || 0) <<  6)
  				|   ((b64tab[b64.charAt(i+3)] || 0));
  			bin.push(
  				(  n >> 16 ),
  				( (n >>  8) & 0xff ),
  				(  n        & 0xff )
  			);
  		}
  		bin.length -= [0,0,2,1][padlen];
  		return bin;
  	};
  
  	var convertUTF16ArrayToUTF8Array = function(uni){
  		var bin = [];
  		for (var i = 0, l = uni.length; i < l; i++){
  			var n = uni[i];
  			if (n < 0x80)
  				bin.push(n);
  			else if (n < 0x800)
  				bin.push(
  					0xc0 | (n >>>  6),
  					0x80 | (n & 0x3f));
  			else
  				bin.push(
  					0xe0 | ((n >>> 12) & 0x0f),
  					0x80 | ((n >>>  6) & 0x3f),
  					0x80 |  (n         & 0x3f));
  		}
  		return bin;
  	};
  
  	var convertUTF8ArrayToUTF16Array = function(bin){
  		var uni = [];
  		for (var i = 0, l = bin.length; i < l; i++){
  			var c0 = bin[i];
  			if    (c0 < 0x80){
  				uni.push(c0);
  			}else{
  				var c1 = bin[++i];
  				if (c0 < 0xe0){
  					uni.push(((c0 & 0x1f) << 6) | (c1 & 0x3f));
  				}else{
  					var c2 = bin[++i];
  					uni.push(
  						   ((c0 & 0x0f) << 12) | ((c1 & 0x3f) << 6) | (c2 & 0x3f)
  					);
  				}
  			}
  		}
  		return uni;
  	};
  
  	var convertUTF8StringToBase64 = function(bin){
  		return convertUTF8ArrayToBase64(stringToArray(bin));
  	};
  
  	var convertBase64ToUTF8String = function(b64){
  		return String.fromCharCode.apply(String, convertBase64ToUTF8Array(b64));
  	};
  
  	var convertUTF8StringToUTF16Array = function(bin){
  		return convertUTF8ArrayToUTF16Array(stringToArray(bin));
  	};
  
  	var convertUTF8ArrayToUTF16String = function(bin){
  		return String.fromCharCode.apply(String, convertUTF8ArrayToUTF16Array(bin));
  	};
  
  	var convertUTF8StringToUTF16String = function(bin){
  		return String.fromCharCode.apply(String, convertUTF8ArrayToUTF16Array(stringToArray(bin)));
  	};
  
  	var convertUTF16StringToUTF8Array = function(uni){
  		return convertUTF16ArrayToUTF8Array(stringToArray(uni));
  	};
  
  	var convertUTF16ArrayToUTF8String = function(uni){
  		return String.fromCharCode.apply(String, convertUTF16ArrayToUTF8Array(uni));
  	};
  
  	var convertUTF16StringToUTF8String = function(uni){
  		return String.fromCharCode.apply(String, convertUTF16ArrayToUTF8Array(stringToArray(uni)));
  	};
  
  	if (window.btoa){
  		var btoa = window.btoa;
  		var convertUTF16StringToBase64 = function (uni){
  			return btoa(convertUTF16StringToUTF8String(uni));
  		};
  	}
  	else {
  		var btoa = convertUTF8StringToBase64;
  		var convertUTF16StringToBase64 = function (uni){
  			return convertUTF8ArrayToBase64(convertUTF16StringToUTF8Array(uni));
  		};
  	}
  
  	if (window.atob){
  		var atob = window.atob;
  		var convertBase64ToUTF16String = function (b64){
  			return convertUTF8StringToUTF16String(atob(b64));
  		};
  	}
  	else {
  		var atob = convertBase64ToUTF8String;
  		var convertBase64ToUTF16String = function (b64){
  			return convertUTF8ArrayToUTF16String(convertBase64ToUTF8Array(b64));
  		};
  	}
  
  	module.exports = {
  		convertUTF8ArrayToBase64:convertUTF8ArrayToBase64,
  		convertByteArrayToBase64:convertUTF8ArrayToBase64,
  		convertBase64ToUTF8Array:convertBase64ToUTF8Array,
  		convertBase64ToByteArray:convertBase64ToUTF8Array,
  		convertUTF16ArrayToUTF8Array:convertUTF16ArrayToUTF8Array,
  		convertUTF16ArrayToByteArray:convertUTF16ArrayToUTF8Array,
  		convertUTF8ArrayToUTF16Array:convertUTF8ArrayToUTF16Array,
  		convertByteArrayToUTF16Array:convertUTF8ArrayToUTF16Array,
  		convertUTF8StringToBase64:convertUTF8StringToBase64,
  		convertBase64ToUTF8String:convertBase64ToUTF8String,
  		convertUTF8StringToUTF16Array:convertUTF8StringToUTF16Array,
  		convertUTF8ArrayToUTF16String:convertUTF8ArrayToUTF16String,
  		convertByteArrayToUTF16String:convertUTF8ArrayToUTF16String,
  		convertUTF8StringToUTF16String:convertUTF8StringToUTF16String,
  		convertUTF16StringToUTF8Array:convertUTF16StringToUTF8Array,
  		convertUTF16StringToByteArray:convertUTF16StringToUTF8Array,
  		convertUTF16ArrayToUTF8String:convertUTF16ArrayToUTF8String,
  		convertUTF16StringToUTF8String:convertUTF16StringToUTF8String,
  		convertUTF16StringToBase64:convertUTF16StringToBase64,
  		convertBase64ToUTF16String:convertBase64ToUTF16String,
  		fromBase64:convertBase64ToUTF8String,
  		toBase64:convertUTF8StringToBase64,
  		atob:atob,
  		btoa:btoa,
  		utob:convertUTF16StringToUTF8String,
  		btou:convertUTF8StringToUTF16String,
  		encode:convertUTF16StringToBase64,
  		encodeURI:function(u){
  			return convertUTF16StringToBase64(u).replace(/[+\/]/g, function(m0){
  				return m0 == '+' ? '-' : '_';
  			}).replace(/=+$/, '');
  		},
  		decode:function(a){
  			return convertBase64ToUTF16String(a.replace(/[-_]/g, function(m0){
  				return m0 == '-' ? '+' : '/';
  			}));
  		}
  	};
  }(typeof window !== 'undefined' ? window : global));
  

  provide("test/base64", module.exports);
  provide("test/base64", module.exports);
  $.ender(module.exports);
}(global));

// ender:test as test
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
  	'use strict';
  
  	var inflate =  require('test/../lib/rawinflate.js'),
  		deflate =  require('test/../lib/rawdeflate.js'),
  		Base64 =  require('test/base64'),
  		ender = require('ender');
  
  	ender.domReady(function () {	
  		ender('#inflated').bind('keyup', function () {
  			var self = this, dst = ender('#deflated');
  
  			setTimeout(function(){
  				dst.val(Base64.toBase64(deflate(Base64.utob(self.value))));
  			},0);
  		});
  		ender('#deflated').bind('keyup', function () {
  			var self = this, dst = ender('#inflated');
  			setTimeout(function(){
  				dst.val(Base64.btou(inflate(Base64.fromBase64(self.value))));
  			},0);
  		});
  	});
  }());
  

  provide("test", module.exports);
  provide("test", module.exports);
  $.ender(module.exports);
}(global));