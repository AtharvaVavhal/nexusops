const ot = {
  apply: (doc, op) => {
    if (op.type === "insert") {
      return doc.slice(0, op.position) + op.text + doc.slice(op.position);
    }
    if (op.type === "delete") {
      return doc.slice(0, op.position) + doc.slice(op.position + op.length);
    }
    return doc;
  },
  transform: (op1, op2) => {
    if (op1.type === "insert" && op2.type === "insert") {
      if (op2.position <= op1.position) return { ...op1, position: op1.position + op2.text.length };
      return op1;
    }
    if (op1.type === "insert" && op2.type === "delete") {
      if (op2.position < op1.position) return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      return op1;
    }
    if (op1.type === "delete" && op2.type === "insert") {
      if (op2.position <= op1.position) return { ...op1, position: op1.position + op2.text.length };
      return op1;
    }
    if (op1.type === "delete" && op2.type === "delete") {
      if (op2.position < op1.position) return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      return op1;
    }
    return op1;
  },
  compose: (ops, doc) => ops.reduce((currentDoc, op) => ot.apply(currentDoc, op), doc)
};
module.exports = ot;
