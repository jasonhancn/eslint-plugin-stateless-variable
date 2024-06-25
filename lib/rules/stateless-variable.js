module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce root-level variables to be const and objects/arrays to be frozen",
      category: "Best Practices",
      recommended: false,
    },
    fixable: "code",
    schema: [],
  },
  create(context) {
    return {
      VariableDeclaration(node) {
        // Only check root-level variables
        if (node.parent.type !== "Program") {
          return;
        }

        node.declarations.forEach((declaration) => {
          const varName = declaration.id.name;
          const isConst = node.kind === "const";
          const init = declaration.init;

          if (!isConst) {
            context.report({
              node,
              message: `Variable '${varName}' should be defined as const.`,
              fix(fixer) {
                return fixer.replaceTextRange(
                  [node.start, node.start + node.kind.length],
                  "const"
                );
              },
            });
          }

          if (init && init.type === "Identifier") {
            context.report({
              node: init,
              message: `Variable '${varName}' should not be initialized from another variable '${init.name}'.`,
              fix(fixer) {
                return null;
              },
            });
          }

          // Only check object or array init or argument
          if (
            init.type === "ObjectExpression" ||
            init.type === "ArrayExpression" ||
            (init.arguments &&
              init.arguments.length === 1 &&
              (init.arguments[0].type === "ObjectExpression" ||
                init.arguments[0].type === "ArrayExpression"))
          ) {
            const isFrozenInit =
              init &&
              init.type === "CallExpression" &&
              init.callee.type === "MemberExpression" &&
              init.callee.object.name === "Object" &&
              init.callee.property.name === "freeze" &&
              init.arguments &&
              init.arguments.length === 1 &&
              (init.arguments[0].type === "ObjectExpression" ||
                init.arguments[0].type === "ArrayExpression");

            const isFrozenByCode =
              init &&
              (init.type === "ObjectExpression" ||
                init.type === "ArrayExpression") &&
              node.parent.body.some((sibling) => {
                return (
                  sibling.type === "ExpressionStatement" &&
                  sibling.expression.type === "CallExpression" &&
                  sibling.expression.callee.type === "MemberExpression" &&
                  sibling.expression.callee.object.name === "Object" &&
                  sibling.expression.callee.property.name === "freeze" &&
                  sibling.expression.arguments &&
                  sibling.expression.arguments.length === 1 &&
                  sibling.expression.arguments[0].name === varName
                );
              });

            if (!isFrozenInit && !isFrozenByCode) {
              context.report({
                node: init,
                message: `Object or array '${varName}' should be frozen using Object.freeze.`,
                fix(fixer) {
                  return fixer.insertTextAfter(
                    node,
                    `\nObject.freeze(${varName});\n`
                  );
                },
              });
            }
          }
        });
      },
    };
  },
};
