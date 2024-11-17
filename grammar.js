/**
 * @file HTML grammar for tree-sitter
 * @author Max Brunsfeld <maxbrunsfeld@gmail.com>
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

module.exports = grammar({
  name: "html",

  extras: ($) => [$.comment, /\s+/],

  externals: ($) => [
    $._start_tag_name,
    $._script_start_tag_name,
    $._style_start_tag_name,
    $._end_tag_name,
    $.erroneous_end_tag_name,
    "/>",
    $._implicit_end_tag,
    $.raw_text,
    $.comment,
  ],

  rules: {
    document: ($) => repeat($._node),

    doctype: ($) => seq("<!", alias($._doctype, "doctype"), /[^>]+/, ">"),

    _doctype: (_) => /[Dd][Oo][Cc][Tt][Yy][Pp][Ee]/,

    _node: ($) =>
      choice(
        $.doctype,
        $.entity,
        $.text,
        $.tribracket,
        $.element,
        $.script_element,
        $.style_element,
        $.erroneous_end_tag
      ),

    // We have to wrap the opening '{{{' token in `token(prec())` calls here to
    // force the lexer to give precedence to this rule over the `text` rule. I'm
    // not 100% how this works, but this was suggested by @ahlinc in this
    // Discord thread:
    // https://discord.com/channels/1063097320771698699/1063097321648312354
    tribracket: ($) => seq(token(prec(1, "{{{")), $.tribracket_content, "}}}"),
    tribracket_content: ($) => /[^}]*/,

    element: ($) =>
      choice(
        seq(
          $.start_tag,
          repeat($._node),
          choice($.end_tag, $._implicit_end_tag)
        ),
        $.self_closing_tag
      ),

    script_element: ($) =>
      seq(
        alias($.script_start_tag, $.start_tag),
        optional($.raw_text),
        $.end_tag
      ),

    style_element: ($) =>
      seq(
        alias($.style_start_tag, $.start_tag),
        optional($.raw_text),
        $.end_tag
      ),

    start_tag: ($) =>
      seq("<", alias($._start_tag_name, $.tag_name), repeat($.attribute), ">"),

    script_start_tag: ($) =>
      seq(
        "<",
        alias($._script_start_tag_name, $.tag_name),
        repeat($.attribute),
        ">"
      ),

    style_start_tag: ($) =>
      seq(
        "<",
        alias($._style_start_tag_name, $.tag_name),
        repeat($.attribute),
        ">"
      ),

    self_closing_tag: ($) =>
      seq("<", alias($._start_tag_name, $.tag_name), repeat($.attribute), "/>"),

    end_tag: ($) => seq("</", alias($._end_tag_name, $.tag_name), ">"),

    erroneous_end_tag: ($) => seq("</", $.erroneous_end_tag_name, ">"),

    attribute: ($) =>
      seq(
        $.attribute_name,
        optional(seq("=", choice($.attribute_value, $.quoted_attribute_value)))
      ),

    attribute_name: (_) => /[^<>"'/=\s]+/,

    attribute_value: (_) => /[^<>"'=\s]+/,

    // An entity can be named, numeric (decimal), or numeric (hexacecimal). The
    // longest entity name is 29 characters long, and the HTML spec says that
    // no more will ever be added.
    entity: (_) => /&(#([xX][0-9a-fA-F]{1,6}|[0-9]{1,5})|[A-Za-z]{1,30});?/,

    quoted_attribute_value: ($) =>
      choice(
        seq("'", optional(alias(/[^']+/, $.attribute_value)), "'"),
        seq('"', optional(alias(/[^"]+/, $.attribute_value)), '"')
      ),

    text: (_) => /[^<>&\s]([^<>&]*[^<>&\s])?/,
  },
});
