(function (global_object) {

    if (!global_object) return;
    const node_require = require;
    if (!node_require) return;
    if (global_object.require_script)
        return global_object.require_script;
    var evalScript = (_path, code, module, exports) => {
        module, exports;
        // try { return eval(code); } catch (e) { console.error(_path, e) }
        return eval(code);
    };
    return (function () {
        require_script.isWorker = (typeof WorkerGlobalScope != "undefined" && global_object instanceof WorkerGlobalScope);
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
        var path = node_require("path");
        var fs = node_require("fs");
        var vm = node_require('vm');

        var basePath = path.dirname(
            typeof global_object != "undefined" && global_object.location ? "." + global_object.location.pathname :
                typeof __filename != "undefined" ? __filename :
                    process.cwd() + "\\require_script.js");

        require_script.basepath = (path) => { basePath = path; }
        var babel;
        try {
            babel = node_require("@babel/standalone/babel.js");
            loadPlugin("@babel/plugin-transform-modules-umd");
            loadPreset("@babel/preset-react");
            loadPreset("@babel/preset-typescript");
            loadPreset("@babel/preset-flow");
        } catch (e) { babel = false; }
        function loadPlugin(name) {
            var babelPlugin = node_require(name);
            babel.registerPlugin(name, babelPlugin);
        }
        function loadPreset(name) {
            var babelPreset = node_require(name);
            babel.registerPreset(name, babelPreset);
        }
        require_script.global = global_object;
        global_object.require = require_script;
        global_object.require_script = require_script;
        global_object.requireScript = require_script;
        function require_script(src, useNode) {
            useNode = useNode || 0;
            if (src.indexOf("require_script") > -1)
                return require_script;
            var loadScript = require_script;
            try {
                if (src[0] == ".") throw '';
                try {
                    node_require && node_require.resolve(src);
                } catch (e) {
                    if (e.toString().indexOf("Cannot find module" != -1)) {
                        node_require && node_require.resolve(basePath + "/node_modules/" + src);
                        src = basePath + "/node_modules/" + src;
                    }
                }
                useNode = 1;
            } catch (e) { e; }
            if (require_script.isNode) {
                return new Promise(function (resolve) {
                    var module;
                    if (!useNode) {//
                        var output = parseBabel(src);
                        var realPath = fs.realpathSync(path.resolve(basePath, src));
                        global_object.exports = {};
                        global_object.module = { exports: global_object.exports };
                        module = global_object.module;
                        vm.runInThisContext(output, realPath);
                        // evalScript(realPath, output, global_object.module, global_object.exports)
                        if (module && module.exports) {
                            module.script = src;
                        }
                        global_object.exports = {};
                        global_object.module = { exports: global_object.exports };
                        loadScript[src] = module || {};
                        loadScript[src].exports = (loadScript[src].exports.default || loadScript[src].exports);
                        resolve(loadScript[src].exports);
                    } else {
                        module = node_require(src);
                        resolve(module && (module.default || module));
                    }
                });
            }
            function parseBabel(src) {
                var realPath = fs.realpathSync(path.resolve(basePath, src));
                var sourceFileName = require_script.isNode ? realPath : src;//.replace(process.cwd(), basePath).replaceAll("\\", "/");
                var contents = fs.existsSync(realPath) && fs.readFileSync(realPath).toString("utf8");
                var opts = require_script.babel || {
                    filename: path.basename(sourceFileName),
                    sourceMaps: "inline",
                    sourceFileName: sourceFileName
                };
                opts.plugins = ["@babel/plugin-transform-modules-umd"];
                opts.presets = [];
                // if (contents.indexOf("React") > -1)
                opts.presets.push(['@babel/preset-flow']);
                opts.presets.push(['@babel/preset-react']);
                if (path.extname(sourceFileName) == ".ts" || path.extname(sourceFileName) == ".tsx")
                    opts.presets.push("@babel/preset-typescript");
                var output = babel.transform(contents, opts).code;
                return output;
            }
            return new Promise(function (resolve, reject) {
                if (useNode) {
                    var resolved_module = node_require(src);
                    resolve(resolved_module && (resolved_module.default || resolved_module));
                } else {
                    global_object.exports = {};
                    global_object.module = { exports: global_object.exports };
                    var module = global_object.module;
                    if (loadScript[src] && loadScript[src].exports) return resolve(loadScript[src].exports);
                    if (babel) {
                        var sourceCode = parseBabel(src);
                        evalScript(src, sourceCode, global_object.module, global_object.exports);
                        if (module && module.exports) {
                            module.script = script;
                        }
                        global_object.exports = {};
                        global_object.module = { exports: global_object.exports };
                        loadScript[src] = module || {};
                        loadScript[src].exports = (loadScript[src].exports.default || loadScript[src].exports);
                        resolve(loadScript[src].exports);

                    } else if (!require_script.isWorker) {
                        var script = document.createElement('script');
                        script.src = src;
                        script.onload = function () {
                            if (module && module.exports) {
                                module.script = script;
                            }
                            global_object.exports = {};
                            global_object.module = { exports: global_object.exports };
                            loadScript[src] = module || {};
                            loadScript[src].exports = (loadScript[src].exports.default || loadScript[src].exports);
                            resolve(loadScript[src].exports);
                        };
                        script.onerror = function () {
                            document.head.removeChild(script);
                            // resolve(loadScript[src]);
                            reject(new Error('Error loading script: ' + src));
                        };
                        try {
                            document.head.appendChild(script);
                        } catch (e) { e; }
                    } else {
                        /* global importScripts WorkerGlobalScope */
                        importScripts(src);
                        if (module && module.exports) {
                            module.script = script;
                        }
                        global_object.exports = {};
                        global_object.module = { exports: global_object.exports };
                        loadScript[src] = module || {};
                        loadScript[src].exports = (loadScript[src].exports.default || loadScript[src].exports);
                        resolve(loadScript[src].exports);
                    }
                }
            });
        }
        if (typeof module != "undefined")
            module.exports = require_script;

        return require_script;
    })();
})(
    typeof window != "undefined" ? window :
        typeof globalThis != "undefined" ? globalThis :
            typeof global != "undefined" ? global :
                false
);