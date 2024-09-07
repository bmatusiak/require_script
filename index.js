(function () {
    // console.log("require_script")
    const require_cache = {};
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
        babel.registerPlugin("manual-code-wrapper", manual_code_wrapper);
        loadPreset("@babel/preset-react");
        loadPreset("@babel/preset-typescript");
        loadPreset("@babel/preset-flow");
    } catch (e) { babel = false; console.error(e); }
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
            filenameRelative: src,
            sourceMaps: "inline",
            // sourceFileName: srcPath
        };
        opts.plugins = [
            'manual-code-wrapper'
        ];
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
        require_script.require = $require;
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
        require_script.cache = (src, module) => {
            if (module) {
                require_cache[src] = module;
            }
            return require_cache[src];
        };
        function require_script(src_location) {
            if (!(src_location[0] == ".")) return $require(src_location);
            var realPath = path.resolve(basePath, src_location);
            const script_dir = path.dirname(realPath);
            const script_name = realPath;
            if (path.extname(realPath) == ".json") { return JSON.parse(fs.readFileSync(realPath)); }
            if (realPath == src_location) return $require(src_location);
            var module = require_script.cache(realPath);
            if (module) return module.exports;
            const newRequire = createRequire(realPath);
            var new_require = requireScript(newRequire, script_dir, script_name);
            var use_babel = useBabel(src_location);
            var output = use_babel ? parseBabel(realPath) : fs.readFileSync(realPath);
            module = ((global_object) => {
                global_object.exports = {};
                global_object.module = { exports: global_object.exports };
                var module = global_object.module;
                module.require = new_require;
                module.__dirname = script_dir;
                module.__filename = script_name;
                var oldRequire = global_object.require;
                var old_dirname = global_object.__dirname;
                var old_filename = global_object.__filename;
                global_object.require = new_require;
                global_object.__dirname = script_dir;
                global_object.__filename = script_name;
                if (!require_script.isWorker) {
                    vm.runInThisContext(use_babel ? output : require_script.wrap(output), realPath);
                } else {
                    eval(use_babel ? output : require_script.wrap(output));
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
            require_script.cache(realPath, module);
            return module.exports;
        }
        return require_script;
    }
    if ((typeof WorkerGlobalScope != "undefined" && globalThis instanceof WorkerGlobalScope) || typeof module.exports == "undefined") {
        globalThis.require_script = requireScript;
    } else {
        module.exports = requireScript;
    }

    function manual_code_wrapper({ types: t }) {
        return {
            name: "manual-code-wrapper",
            visitor: {
                Program(path) {
                    if (!path.wrapped) {
                        path.wrapped = true; // Set the flag to true

                        const wrapperFunction = t.functionExpression(
                            null,
                            [
                                t.identifier("require"),
                                t.identifier("__dirname"),
                                t.identifier("__filename"),
                                t.identifier("module")
                            ],
                            t.blockStatement(path.node.body)
                        );

                        const wrappedExpression = t.callExpression(
                            wrapperFunction,
                            [
                                t.memberExpression(
                                    t.identifier("global"),
                                    t.identifier("require")
                                ),
                                t.memberExpression(
                                    t.identifier("global"),
                                    t.identifier("__dirname")
                                ),
                                t.memberExpression(
                                    t.identifier("global"),
                                    t.identifier("__filename")
                                ),
                                t.memberExpression(
                                    t.identifier("global"),
                                    t.identifier("module")
                                )
                            ]
                        );

                        const newProgram = t.program([t.expressionStatement(wrappedExpression)]);

                        path.replaceWith(newProgram);
                    }
                }
            }
        };
    };


})();
