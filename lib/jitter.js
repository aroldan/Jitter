(function() {
  var BANNER, CoffeeScript, _ref, baseSource, baseTarget, baseTest, compile, compileScript, compileScripts, die, exec, fs, isWatched, notifyGrowl, optionParser, options, optparse, parseOptions, path, pending, readScript, rootCompile, runTests, spawn, testFiles, usage, watchScript, writeJS;
  var __hasProp = Object.prototype.hasOwnProperty;
  /*
    Jitter, a CoffeeScript compilation utility

    The latest version and documentation, can be found at:
    http://github.com/TrevorBurnham/Jitter

    Copyright (c) 2010 Trevor Burnham
    http://iterative.ly

    Based on command.coffee by Jeremy Ashkenas
    http://jashkenas.github.com/coffee-script/documentation/docs/command.html

    Growl notification code contributed by Andrey Tarantsov
    http://www.tarantsov.com/

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
  */
  fs = require('fs');
  path = require('path');
  optparse = require('./optparse');
  CoffeeScript = require('coffee-script');
  _ref = require('child_process');
  spawn = _ref.spawn;
  exec = _ref.exec;
  BANNER = 'Jitter takes a directory of *.coffee files and recursively compiles\nthem to *.js files, preserving the original directory structure.\n\nJitter also watches for changes and automatically recompiles as\nneeded. It even detects new files, unlike the coffee utility.\n\nUsage:\n  jitter coffee-path js-path [test-path]';
  options = {};
  baseSource = '';
  baseTarget = '';
  baseTest = null;
  optionParser = null;
  isWatched = {};
  testFiles = [];
  pending = 0;
  exports.run = function() {
    parseOptions();
    if (!(baseTarget)) {
      return usage();
    }
    return compileScripts();
  };
  compileScripts = function() {
    var _i, _ref2, _result, dirs, name;
    dirs = {
      Source: baseSource,
      Target: baseTarget
    };
    if (baseTest) {
      dirs.Test = baseTest;
    }
    _result = []; _ref2 = dirs;
    for (_i in _ref2) {
      if (!__hasProp.call(_ref2, _i)) continue;
      (function() {
        var name = _i;
        var dir = _ref2[_i];
        return _result.push((function() {
          ++pending;
          return path.exists(dir, function(exists) {
            if (!(exists)) {
              die("" + (name) + " directory '" + (dir) + "' does not exist.");
            } else {
              if (!(fs.statSync(dir).isDirectory())) {
                die("" + (name) + " '" + (dir) + "' is a file; Jitter needs a directory.");
              }
            }
            if (--pending === 0) {
              rootCompile();
              puts('Watching for changes and new files. Press Ctrl+C to stop.');
              return setInterval(rootCompile, 500);
            }
          });
        })());
      })();
    }
    return _result;
  };
  compile = function(source, target) {
    var _i, _len, _ref2, _result, changed, item, sourcePath;
    changed = false;
    _result = []; _ref2 = fs.readdirSync(source);
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      item = _ref2[_i];
      sourcePath = ("" + (source) + "/" + (item));
      if (isWatched[sourcePath]) {
        continue;
      }
      if (path.extname(sourcePath) === '.coffee') {
        readScript(sourcePath, target);
      } else if (fs.statSync(sourcePath).isDirectory()) {
        compile(sourcePath, target);
      }
    }
    return _result;
  };
  rootCompile = function() {
    compile(baseSource, baseTarget);
    if (baseTest) {
      return compile(baseTest, baseTest);
    }
  };
  readScript = function(source, target) {
    var code;
    code = fs.readFileSync(source);
    compileScript(source, code.toString(), target);
    puts('Compiled ' + source);
    return watchScript(source, target);
  };
  watchScript = function(source, target) {
    isWatched[source] = true;
    return fs.watchFile(source, {
      persistent: true,
      interval: 250
    }, function(curr, prev) {
      var code;
      if (curr.mtime.getTime() === prev.mtime.getTime()) {
        return null;
      }
      code = fs.readFileSync(source);
      compileScript(source, code.toString(), target);
      return puts('Recompiled ' + source);
    });
  };
  compileScript = function(source, code, target) {
    var js;
    try {
      js = CoffeeScript.compile(code, {
        source: source
      });
      return writeJS(source, js, target);
    } catch (err) {
      puts(err.message);
      return notifyGrowl(source, err.message);
    }
  };
  writeJS = function(source, js, target) {
    var base, dir, filename, jsPath;
    base = target === baseTest ? baseTest : baseSource;
    filename = path.basename(source, path.extname(source)) + '.js';
    dir = target + path.dirname(source).substring(base.length);
    jsPath = path.join(dir, filename);
    ++pending;
    return exec("mkdir -p " + (dir), function() {
      var _i, _len;
      fs.writeFileSync(jsPath, js);
      if (target === baseTest && !(function(){ for (var _i=0, _len=testFiles.length; _i<_len; _i++) { if (testFiles[_i] === jsPath) return true; } return false; }).call(this)) {
        testFiles.push(jsPath);
      }
      if (--pending === 0 && baseTest) {
        return runTests();
      }
    });
  };
  notifyGrowl = function(source, errMessage) {
    var args, basename, m, message;
    basename = source.replace(/^.*[\/\\]/, '');
    if (m = errMessage.match(/Parse error on line (\d+)/)) {
      message = ("Parse error in " + (basename) + "\non line " + (m[1]) + ".");
    } else {
      message = ("Error in " + (basename) + ".");
    }
    args = ['growlnotify', '-n', 'CoffeeScript', '-p', '2', '-t', "\"Compilation failed\"", '-m', ("\"" + (message) + "\"")];
    return exec(args.join(' '));
  };
  runTests = function() {
    var _i, _len, _ref2, _result;
    _result = []; _ref2 = testFiles;
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      (function() {
        var test = _ref2[_i];
        return _result.push((function() {
          puts("running " + (test));
          return exec("node " + (test), function(error, stdout, stderr) {
            print(stdout);
            print(stderr);
            if (stderr) {
              return notifyGrowl(test, stderr);
            }
          });
        })());
      })();
    }
    return _result;
  };
  parseOptions = function() {
    optionParser = new optparse.OptionParser([], BANNER);
    options = optionParser.parse(process.argv);
    if (options.arguments[2]) {
      baseSource = options.arguments[2];
    }
    if (options.arguments[3]) {
      baseTarget = options.arguments[3];
    }
    if (options.arguments[4]) {
      baseTest = options.arguments[4];
    }
    if (baseSource[-1] === '/') {
      baseSource = baseSource.slice(0, -1);
    }
    return baseTarget[-1] === '/' ? (baseTarget = baseTarget.slice(0, -1)) : null;
  };
  usage = function() {
    puts(optionParser.help());
    return process.exit(0);
  };
  die = function(message) {
    puts(message);
    return process.exit(1);
  };
}).call(this);