(function () {
    if (typeof module != "undefined") {
        const React = require("react");
        const { createRoot } = require("react-dom/client");
        React.createRoot = createRoot;
        module.exports = React;
    }
})();
