// traverse.js
// MIT licensed, see LICENSE file

const walk = require("acorn-walk");

const customWalkFunctions = walk.make({
    MemberExpression: (node, st, c) => {
        c(node.object, st, "Expression");
        c(node.property, st, "Expression");
    },
});

module.exports = function traverse(rootNode, options, pluginOptions = {}) {
    const ancestors = [];
    (function c(node, st, override) {
        const parent = ancestors[ancestors.length - 1];
        const isNew = node !== parent;
        if (options.pre && isNew) options.pre(node, parent);
        if (isNew) ancestors.push(node);
        customWalkFunctions[override || node.type](node, st, c);
        if (isNew) ancestors.pop();
        if (options.post && isNew) options.post(node, parent);
    })(rootNode);
};
