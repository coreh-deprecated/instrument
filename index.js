var profiles = {}

var Profile = function() {
  this.samples = []
}

Profile.prototype.average = function() {
  var total = 0
  for (var i = 0; i < this.samples.length; i++) {
    total += this.samples[i].time
  }
  return total / this.samples.length
}

Profile.prototype.stdev = function() {
  var average = this.average()
  var variance = 0.0
  for (var i = 0; i < this.samples.length; i++) {
    variance += Math.pow(this.samples[i].time - average, 2)
  }
  variance /= this.samples.length
  return Math.sqrt(variance)
}

Profile.prototype.histogram = function(bars) {
  var max = this.samples.reduce(function(a,b) { return Math.max(a, b.time) }, 0)
  var min = this.samples.reduce(function(a,b) { return Math.min(a, b.time) }, 0)
  var range = max - min
  var step = range / bars
  var histogram = new Array(bars)
  for (var i = 0; i < bars; i++) {
    histogram[i] = 0
  }
  for (var i = 0; i < this.samples.length; i++) {
    var position = this.samples[i].time - min
    var index = Math.floor(position / step)
    if (!isNaN(index)) {
      if (position == range) {
        histogram[bars-1]++
      } else {
        histogram[index]++
      }
    }
  }
  for (var i = 0; i < bars; i++) {
    histogram[i] /= this.samples.length
  }
  return histogram
}

var wrapCallback = function(fn, profile, start) {
  return function() {
    var finish = new Date()
    var time = finish.valueOf() - start.valueOf()
    profile.samples.push({ start: start, finish: finish, time: time })
    return fn.apply(this, arguments)
  }
}

var wrapFunction = function(fn, name) {
  if (profiles[name]) {
    return fn
  }
  var profile = new Profile()
  var wrapper = function() {
    var start = new Date()
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] instanceof Function) {
        arguments[i] = wrapCallback(arguments[i], profile, start)
      }
    }
    return fn.apply(this, arguments)
  }
  profiles[name] = profile
  return wrapper
}

var wrapModule = function(m, name) {
  for (var k in m) {
    if (m[k] instanceof Function) {
      m[k] = wrapFunction(m[k], name + '.' + k)
    }
  }
  return m
}

var instrument = exports = module.exports = function(thing, name) {
  switch (true) {
    case thing instanceof Function:
      wrapModule(thing, name)
      return wrapFunction(thing, name)
    case thing instanceof String: 
    case 'string' === typeof thing:
      var module = require(thing)
      return wrapModule(module, thing.match(/[a-zA-Z0-9_]+$/)[0] || thing)
    default:
      return wrapModule(thing, name)
  }
}

exports.profiles = profiles

exports.report = function() {
  var report = {}
  for (var k in profiles) {
    var profile = profiles[k]
    if (profile.samples.length > 0) {
      report[k] = {
        samples: profile.samples.length
      , stdev: profile.stdev()
      , average: profile.average()
      }
    }
  }
  return report
}

var express = require('express')

exports.listen = function(port, fn) {
  
  var app = express.createServer()
  
  app.set('views', __dirname + '/views')
  app.set('view options', { layout: false })
  
  app.get('/', function(req, res) {
    res.render('index.jade', { report: exports.report() })
  })
  
  app.listen(port, fn)
}