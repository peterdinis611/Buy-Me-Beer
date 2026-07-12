import { Schema, DOMParser, DOMSerializer } from "prosemirror-model"
import { EditorState, Plugin } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { schema as basicSchema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import {
  baseKeymap,
  chainCommands,
  exitCode,
  lift,
  setBlockType,
  toggleMark,
  wrapIn,
} from "prosemirror-commands"
import { keymap } from "prosemirror-keymap"
import { history, redo, undo } from "prosemirror-history"
import { inputRules, wrappingInputRule, textblockTypeInputRule, InputRule } from "prosemirror-inputrules"

const linkMark = {
  attrs: { href: { default: null } },
  inclusive: false,
  parseDOM: [
    {
      tag: "a[href]",
      getAttrs(dom) {
        return { href: dom.getAttribute("href") }
      },
    },
  ],
  toDOM(mark) {
    return [
      "a",
      {
        href: mark.attrs.href,
        rel: "noopener noreferrer",
        target: "_blank",
        class: "post-editor-link",
      },
      0,
    ]
  },
}

const strikeMark = {
  parseDOM: [
    { tag: "s" },
    { tag: "del" },
    { tag: "strike" },
    {
      style: "text-decoration",
      getAttrs(value) {
        return value === "line-through" ? null : false
      },
    },
  ],
  toDOM() {
    return ["s", 0]
  },
}

const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks.update("link", linkMark).addToEnd("strike", strikeMark),
})

function buildInputRules(contentSchema) {
  return inputRules({
    rules: [
      textblockTypeInputRule(/^#\s$/, contentSchema.nodes.heading, () => ({ level: 1 })),
      textblockTypeInputRule(/^##\s$/, contentSchema.nodes.heading, () => ({ level: 2 })),
      textblockTypeInputRule(/^###\s$/, contentSchema.nodes.heading, () => ({ level: 3 })),
      wrappingInputRule(/^\s*>\s$/, contentSchema.nodes.blockquote),
      wrappingInputRule(/^(\d+)\.\s$/, contentSchema.nodes.ordered_list, (match) => ({ order: +match[1] }), (match, node) =>
        node.childCount + node.attrs.order === +match[1]
      ),
      wrappingInputRule(/^\s*([-+*])\s$/, contentSchema.nodes.bullet_list),
      new InputRule(/^---$/, (state, _match, start, end) => {
        const hr = contentSchema.nodes.horizontal_rule
        if (!hr) return null
        const tr = state.tr.replaceWith(start - 1, end, hr.create())
        return tr
      }),
    ],
  })
}

function plainTextToDoc(text) {
  const lines = text.split(/\n/)
  const paragraphs = lines.map((line) =>
    schema.node("paragraph", null, line ? [schema.text(line)] : [])
  )
  return schema.node("doc", null, paragraphs.length ? paragraphs : [schema.node("paragraph")])
}

function docFromContent(content, contentSchema) {
  const trimmed = (content || "").trim()
  if (!trimmed) {
    return contentSchema.node("doc", null, [contentSchema.node("paragraph")])
  }

  if (!/<[a-z]/i.test(trimmed)) {
    return plainTextToDoc(trimmed)
  }

  const wrap = document.createElement("div")
  wrap.innerHTML = trimmed
  return DOMParser.fromSchema(contentSchema).parse(wrap)
}

function docToHtml(doc) {
  const div = document.createElement("div")
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content)
  div.appendChild(fragment)
  return div.innerHTML
}

function placeholderPlugin(text) {
  return new Plugin({
    props: {
      attributes(state) {
        const empty = state.doc.textContent.length === 0
        return empty ? { "data-placeholder": text, class: "is-doc-empty" } : {}
      },
    },
  })
}

function findMarkRange(state, markType) {
  const { $from, empty } = state.selection
  if (!empty) return { from: state.selection.from, to: state.selection.to }

  const pos = $from.pos
  const marks = $from.marks()
  if (!markType.isInSet(marks)) return null

  let from = pos
  let to = pos
  state.doc.nodesBetween(Math.max(0, pos - 500), Math.min(state.doc.content.size, pos + 500), (node, nodePos) => {
    if (!node.isText) return
    if (!markType.isInSet(node.marks)) return
    const nodeStart = nodePos
    const nodeEnd = nodePos + node.nodeSize
    if (nodeStart <= pos && nodeEnd >= pos) {
      from = Math.min(from, nodeStart)
      to = Math.max(to, nodeEnd)
    }
  })
  return from < to ? { from, to } : null
}

function setLink(state, dispatch) {
  const mark = schema.marks.link
  let { from, to, empty } = state.selection

  if (empty) {
    const range = findMarkRange(state, mark)
    if (range) {
      from = range.from
      to = range.to
    } else {
      return false
    }
  }

  const existing = mark.isInSet(state.doc.resolve(from).marks()) || mark.isInSet(state.storedMarks || state.selection.$from.marks())
  const currentHref = existing?.attrs?.href || ""
  const href = window.prompt("URL odkazu (prázdne = odstrániť)", currentHref || "https://")

  if (href === null) return false

  if (!href.trim()) {
    if (dispatch) {
      dispatch(state.tr.removeMark(from, to, mark).scrollIntoView())
    }
    return true
  }

  if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) return false

  if (dispatch) {
    const tr = state.tr.removeMark(from, to, mark).addMark(from, to, mark.create({ href: href.trim() }))
    dispatch(tr.scrollIntoView())
  }
  return true
}

function headingCommand(level) {
  return (state, dispatch) => {
    const nodeType = schema.nodes.heading
    if (!nodeType) return false
    return setBlockType(nodeType, { level })(state, dispatch)
  }
}

function toggleWrap(nodeType) {
  return (state, dispatch) => {
    const { $from } = state.selection
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type === nodeType) {
        return lift(state, dispatch)
      }
    }
    return wrapIn(nodeType)(state, dispatch)
  }
}

function toggleCodeBlock(state, dispatch) {
  const { $from } = state.selection
  if ($from.parent.type === schema.nodes.code_block) {
    return setBlockType(schema.nodes.paragraph)(state, dispatch)
  }
  return setBlockType(schema.nodes.code_block)(state, dispatch)
}

function insertHorizontalRule(state, dispatch) {
  const hr = schema.nodes.horizontal_rule
  if (!hr) return false

  if (dispatch) {
    const tr = state.tr.replaceSelectionWith(hr.create()).scrollIntoView()
    dispatch(tr)
  }
  return true
}

function clearFormatting(state, dispatch) {
  const { from, to, $from } = state.selection
  let tr = state.tr

  for (const name of Object.keys(schema.marks)) {
    tr = tr.removeMark(from, to, schema.marks[name])
  }

  if ($from.parent.type !== schema.nodes.paragraph) {
    tr = tr.setBlockType(from, to, schema.nodes.paragraph)
  }

  if (dispatch) dispatch(tr.scrollIntoView())
  return true
}

function parentAtDepth($from, nodeType) {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === nodeType) return true
  }
  return false
}

export function createRichPostEditor(mountEl, { placeholder = "Share news, behind-the-scenes, or member-only updates…", onUpdate } = {}) {
  if (!mountEl) {
    throw new Error("ProseMirror mount element is required")
  }

  let view = null

  const state = EditorState.create({
    doc: docFromContent("", schema),
    plugins: [
      history(),
      buildInputRules(schema),
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-Shift-z": redo,
        "Mod-b": toggleMark(schema.marks.strong),
        "Mod-i": toggleMark(schema.marks.em),
        "Mod-k": setLink,
        "Mod-`": toggleMark(schema.marks.code),
        "Mod-Shift-s": toggleMark(schema.marks.strike),
        "Mod-Shift-8": toggleWrap(schema.nodes.blockquote),
        Enter: chainCommands(exitCode, baseKeymap.Enter),
      }),
      keymap(baseKeymap),
      placeholderPlugin(placeholder),
    ],
  })

  view = new EditorView(mountEl, {
    state,
    dispatchTransaction(transaction) {
      const next = view.state.apply(transaction)
      view.updateState(next)

      if (onUpdate) {
        onUpdate({
          html: docToHtml(next.doc),
          textLength: next.doc.textContent.length,
        })
      }
    },
  })

  function runCommand(command) {
    if (!view) return
    command(view.state, view.dispatch, view)
    view.focus()
  }

  const api = {
    view,
    schema,

    getHtml() {
      return docToHtml(view.state.doc)
    },

    getTextLength() {
      return view.state.doc.textContent.length
    },

    focus() {
      view.focus()
    },

    destroy() {
      view?.destroy()
      view = null
    },

    toggleBold() {
      runCommand(toggleMark(schema.marks.strong))
    },

    toggleItalic() {
      runCommand(toggleMark(schema.marks.em))
    },

    toggleStrike() {
      runCommand(toggleMark(schema.marks.strike))
    },

    toggleCode() {
      runCommand(toggleMark(schema.marks.code))
    },

    toggleLink() {
      runCommand(setLink)
    },

    toggleBulletList() {
      runCommand(toggleWrap(schema.nodes.bullet_list))
    },

    toggleOrderedList() {
      runCommand(toggleWrap(schema.nodes.ordered_list))
    },

    toggleBlockquote() {
      runCommand(toggleWrap(schema.nodes.blockquote))
    },

    toggleCodeBlock() {
      runCommand(toggleCodeBlock)
    },

    insertHorizontalRule() {
      runCommand(insertHorizontalRule)
    },

    setHeading1() {
      runCommand(headingCommand(1))
    },

    setHeading2() {
      runCommand(headingCommand(2))
    },

    setHeading3() {
      runCommand(headingCommand(3))
    },

    setParagraph() {
      runCommand(setBlockType(schema.nodes.paragraph))
    },

    clearFormatting() {
      runCommand(clearFormatting)
    },

    undo() {
      runCommand(undo)
    },

    redo() {
      runCommand(redo)
    },

    isActive(name) {
      const { state: editorState } = view
      const { $from } = editorState.selection
      const marks = editorState.storedMarks || $from.marks()

      if (name === "bold") return !!schema.marks.strong?.isInSet(marks)
      if (name === "italic") return !!schema.marks.em?.isInSet(marks)
      if (name === "strike") return !!schema.marks.strike?.isInSet(marks)
      if (name === "code") return !!schema.marks.code?.isInSet(marks)
      if (name === "link") return !!schema.marks.link?.isInSet(marks)
      if (name === "heading1") return $from.parent.type === schema.nodes.heading && $from.parent.attrs.level === 1
      if (name === "heading2") return $from.parent.type === schema.nodes.heading && $from.parent.attrs.level === 2
      if (name === "heading3") return $from.parent.type === schema.nodes.heading && $from.parent.attrs.level === 3
      if (name === "paragraph") return $from.parent.type === schema.nodes.paragraph
      if (name === "codeBlock") return $from.parent.type === schema.nodes.code_block
      if (name === "blockquote") return parentAtDepth($from, schema.nodes.blockquote)
      if (name === "bulletList") return parentAtDepth($from, schema.nodes.bullet_list)
      if (name === "orderedList") return parentAtDepth($from, schema.nodes.ordered_list)
      return false
    },
  }

  if (onUpdate) {
    onUpdate({
      html: api.getHtml(),
      textLength: api.getTextLength(),
    })
  }

  return api
}
