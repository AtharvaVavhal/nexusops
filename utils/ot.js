// ============================================
// OPERATIONAL TRANSFORMATION (OT) ENGINE
// Enables real-time collaborative editing
// ============================================

const ot = {
  // Apply an operation to a document
  apply: (doc, op) => {
    if (op.type === "insert") {
      return doc.slice(0, op.position) + op.text + doc.slice(op.position);
    }
    if (op.type === "delete") {
      return doc.slice(0, op.position) + doc.slice(op.position + op.length);
    }
    return doc;
  },

  // Transform op1 against op2 (concurrent operations)
  transform: (op1, op2) => {
    if (op1.type === "insert" && op2.type === "insert") {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    if (op1.type === "insert" && op2.type === "delete") {
      if (op2.position < op1.position) {
        return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      }
      return op1;
    }

    if (op1.type === "delete" && op2.type === "insert") {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    if (op1.type === "delete" && op2.type === "delete") {
      if (op2.position < op1.position) {
        return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      }
      if (op2.position >= op1.position && op2.position < op1.position + op1.length) {
        return { ...op1, length: op1.length - Math.min(op2.length, op1.position + op1.length - op2.position) };
      }
      return op1;
    }

    return op1;
  },

  // Compose multiple operations into one
  compose: (ops, doc) => {
    return ops.reduce((currentDoc, op) => ot.apply(currentDoc, op), doc);
  }
};

module.exports = ot;
