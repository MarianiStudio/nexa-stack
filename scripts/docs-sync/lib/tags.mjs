// scripts/docs-sync/lib/tags.mjs

export function stripTagBlocks(text, tagName) {
  const openRe = new RegExp(`<${tagName}(?![a-zA-Z0-9_])[^>]*?(/?)>`, "g");
  let out = "";
  let cursor = 0;

  while (true) {
    openRe.lastIndex = cursor;
    const m = openRe.exec(text);
    if (!m) {
      out += text.slice(cursor);
      break;
    }
    out += text.slice(cursor, m.index);

    if (m[1] === "/") {
      cursor = m.index + m[0].length;
      continue;
    }

    const closeStr = `</${tagName}>`;
    let depth = 1;
    let pos = m.index + m[0].length;
    while (depth > 0) {
      const nextCloseIdx = text.indexOf(closeStr, pos);
      if (nextCloseIdx === -1) {
        pos = text.length;
        depth = 0;
        break;
      }
      openRe.lastIndex = pos;
      const nextOpen = openRe.exec(text);
      if (nextOpen && nextOpen.index < nextCloseIdx && nextOpen[1] !== "/") {
        depth++;
        pos = nextOpen.index + nextOpen[0].length;
      } else {
        depth--;
        pos = nextCloseIdx + closeStr.length;
      }
    }
    cursor = pos;
  }
  return out;
}

export function unwrapTag(text, tagName) {
  const openRe = new RegExp(`<${tagName}(?![a-zA-Z0-9_])[^>]*>`, "g");
  const closeRe = new RegExp(`</${tagName}>`, "g");
  return text.replace(openRe, "").replace(closeRe, "");
}

export function extractAttrs(tagSource) {
  const attrs = {};
  const re = /(\w+)=(?:"([^"]*)"|\{([^}]*)\})/g;
  let m;
  while ((m = re.exec(tagSource))) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : m[3].trim();
  }
  return attrs;
}

export function findComponentCall(text, tagName, fromIndex = 0) {
  const re = new RegExp(`<${tagName}(?![a-zA-Z0-9_])([\\s\\S]*?)(/>|>)`, "g");
  re.lastIndex = fromIndex;
  const m = re.exec(text);
  if (!m) return null;

  const selfClosing = m[2] === "/>";
  const attrsSource = m[1];
  const attrs = extractAttrs(attrsSource);

  if (selfClosing) {
    return {
      fullMatch: m[0],
      attrs,
      children: null,
      start: m.index,
      end: m.index + m[0].length,
    };
  }

  const closeStr = `</${tagName}>`;
  const closeIdx = text.indexOf(closeStr, m.index + m[0].length);
  if (closeIdx === -1) {
    return {
      fullMatch: m[0],
      attrs,
      children: null,
      start: m.index,
      end: m.index + m[0].length,
    };
  }
  const children = text.slice(m.index + m[0].length, closeIdx);
  return {
    fullMatch: text.slice(m.index, closeIdx + closeStr.length),
    attrs,
    children,
    start: m.index,
    end: closeIdx + closeStr.length,
  };
}

export function replaceComponentCalls(text, tagName, render) {
  let out = "";
  let cursor = 0;
  while (true) {
    const call = findComponentCall(text, tagName, cursor);
    if (!call) {
      out += text.slice(cursor);
      break;
    }
    out += text.slice(cursor, call.start);
    out += render(call.attrs, call.children);
    cursor = call.end;
  }
  return out;
}