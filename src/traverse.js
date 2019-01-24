// traverse.js
// MIT licensed, see LICENSE file

const defaultWalk = require("acorn-walk");
const dynamicImportWalk = require("acorn-dynamic-import/lib/walk").default(defaultWalk);

module.exports = function traverse(rootNode, options, pluginOptions = {}) {
    const walk = pluginOptions.dynamicImport ? dynamicImportWalk : defaultWalk;
    const ancestors = [];
    (function c(node, st, override) {
        const parent = ancestors[ancestors.length - 1];
        const isNew = node !== parent;
        if (options.pre && isNew) options.pre(node, parent);
        if (isNew) ancestors.push(node);
        walk.base[override || node.type](node, st, c);
        if (isNew) ancestors.pop();
        if (options.post && isNew) options.post(node, parent);
    })(rootNode);
};
