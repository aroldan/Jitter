(function() {
  var __callbacks, _ref, debug;
  var __slice = Array.prototype.slice;
  _ref = require('sys');
  debug = _ref.debug;
  __callbacks = [];
  ((typeof window !== "undefined" && window !== null) || exports).q = function(func) {
    var args, next;
    var _len = arguments.length, _result = _len >= 3, cb = arguments[_result ? _len - 1 : 1];
    args = __slice.call(arguments, 1, _len - 1);
    next = function() {
      var _ref2;
      return (typeof (_ref2 = __callbacks[0]) === "function" ? _ref2() : undefined);
    };
    if (__callbacks.length === 0) {
      process.nextTick(next);
    }
    return __callbacks.push(function() {
      var _ref2;
      if (!(cb)) {
        _ref2 = [func, process.nextTick];
        cb = _ref2[0];
        func = _ref2[1];
      }
      return func.apply(this, args.concat([function() {
        var _ref3, callbacks, results;
        results = __slice.call(arguments, 0);
        _ref3 = [__callbacks, [null]];
        callbacks = _ref3[0];
        __callbacks = _ref3[1];
        cb.apply(this, results);
        callbacks.splice.apply(callbacks, [0, 1].concat(__callbacks.slice(1)));
        __callbacks = callbacks;
        return next();
      }]));
    });
  };
}).call(this);