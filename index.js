
module.exports = (function (global_object) {
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
        var opts = require_script.babel || {
            filename: path.basename(src),
            sourceMaps: "inline",
            sourceFileName: src
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
    function require_script($require) {
        return function require_script(src_location) {
            const realPath = $require.resolve(src_location);
            const newRequire = createRequire(realPath);
            var new_require = function (src) {
                if (useBabel(src) && src[0] == ".")
                    return require_script(newRequire)(src);
                else return newRequire(src);

            }
            global_object.exports = {};
            global_object.module = { exports: global_object.exports };
            var module = global_object.module;
            var oldRequire = global_object.require;
            global_object.require = new_require;
            var output = useBabel(src_location) ? parseBabel(realPath) : fs.readFileSync(realPath);
            function requireWrap(src) {
                return "(function (require){" + src + "\n})(require);"
            }
            vm.runInThisContext(requireWrap(output), realPath);
            if (module && module.exports) {
                module.script = src_location;
            }
            global_object.require = oldRequire;
            global_object.exports = {};
            global_object.module = { exports: global_object.exports };
            return module.exports;
        }
    }
    return require_script;

})(
    typeof window != "undefined" ? window :
        typeof globalThis != "undefined" ? globalThis :
            typeof global != "undefined" ? global :
                false);
