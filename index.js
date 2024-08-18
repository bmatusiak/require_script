(function () {
    const isWorker = (typeof WorkerGlobalScope != "undefined" && globalThis instanceof WorkerGlobalScope);
    const global_object = (() => {
        if (process.__nwjs) {
            return globalThis;
        } else {
            return global;
        }
    })();
    var { createRequire } = require("module");
    var fs = require("fs");
    var path = require("path");
    var vm = require("vm");
    var babel;
    try {
        babel = require("@babel/standalone/babel.js");
        loadPlugin("@babel/plugin-transform-modules-umd");
        loadPreset("@babel/preset-react");
        loadPreset("@babel/preset-typescript");
        loadPreset("@babel/preset-flow");
    } catch (e) { babel = false; }
    function loadPlugin(name) {
        if (babel.availablePlugins[name]) return;
        var babelPlugin = require(name);
        babel.registerPlugin(name, babelPlugin);
    }
    function loadPreset(name) {
        if (babel.availablePresets[name]) return;
        var babelPreset = require(name);
        babel.registerPreset(name, babelPreset);
    }
    function parseBabel(src) {
        var contents = fs.existsSync(src) && fs.readFileSync(src).toString("utf8");
        var srcPath = src;
        if (process.__nwjs) {
            srcPath = path.relative(path.dirname(path.normalize(process.cwd() + global_object.location.pathname)), src);
        }
        var opts = requireScript.babel || {
            filename: path.basename(src),
            sourceMaps: "inline",
            sourceFileName: srcPath
        };
        opts.plugins = ["@babel/plugin-transform-modules-umd"];
        opts.presets = [];
        // if (contents.indexOf("React") > -1)
        opts.presets.push(['@babel/preset-flow']);
        opts.presets.push(['@babel/preset-react']);
        if (path.extname(src) == ".ts" || path.extname(src) == ".tsx")
            opts.presets.push("@babel/preset-typescript");
        var output = babel.transform(contents, opts).code;
        return output;
    }
    function useBabel(realPath) {
        var useBabel = false;
        switch (path.extname(realPath)) {
            case ".js":
            case ".jsx":
            case ".ts":
            case ".tsx":
                useBabel = true;
                break;
            default:
                useBabel = false;
        }

        return useBabel;
    }
    function requireScript($require, request_dir, request_file) {
        require_script.isWorker = isWorker;
        require_script.isFork = (typeof process != "undefined" && process.send ? 1 : 0);
        if (typeof process != "undefined") {
            if (process.__nwjs) {
                require_script.isNWJS = 1;
                require_script.isNode = 0;
            } else {
                require_script.isNWJS = 0;
                require_script.isNode = 1;
            }
        }
        var basePath = path.dirname(path.resolve(request_dir, request_file));
        require_script.basepath = (path) => { basePath = path; };
        require_script.wrap = function requireWrap(src) {
            return "(function (require,__dirname, __filename, module){" + src + "\n})(global.require,global.__dirname,global.__filename, global.module);";
        };
        require_script.resolve = function requireResolve(src_location) {
            if (!(src_location[0] == ".")) return $require.resolve(src_location);
            return path.resolve(basePath, src_location);
        };
        function require_script(src_location) {
            if (!(src_location[0] == ".")) return $require(src_location);
            var realPath = path.resolve(basePath, src_location);
            const script_dir = path.dirname(realPath);
            const script_name = path.basename(realPath);
            if (path.extname(realPath) == ".json") { return JSON.parse(fs.readFileSync(realPath)); }
            if (realPath == src_location) return $require(src_location);
            const newRequire = createRequire(realPath);
            var new_require = requireScript(newRequire, script_dir, script_name);
            var output = useBabel(src_location) ? parseBabel(realPath) : fs.readFileSync(realPath);
            var module = ((global_object) => {
                global_object.exports = {};
                global_object.module = { exports: global_object.exports };
                var module = global_object.module;
                var oldRequire = global_object.require;
                global_object.require = new_require;
                var old_dirname = global_object.__dirname;
                global_object.__dirname = script_dir;
                var old_filename = global_object.__filename;
                global_object.__filename = script_name;
                if (!require_script.isWorker) {
                    vm.runInThisContext(require_script.wrap(output), realPath);
                } else {
                    eval(require_script.wrap(output));
                }
                global_object.require = oldRequire;
                global_object.__dirname = old_dirname;
                global_object.__filename = old_filename;
                global_object.exports = {};
                global_object.module = { exports: global_object.exports };
                return module;
            })(require_script.isWorker ? global : global_object);

            if (module && module.exports) {
                module.script = src_location;
            }
            return module.exports;

        }
        return require_script;
    }

    if ((typeof WorkerGlobalScope != "undefined" && globalThis instanceof WorkerGlobalScope) || typeof module.exports == "undefined") {
        globalThis.require_script = requireScript;
    } else {
        module.exports = requireScript;
    }
})();
