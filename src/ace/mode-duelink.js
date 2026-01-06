ace.define("ace/mode/duelink_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module){/*
 * TODO: duelink delimiters
 */
"use strict";
var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;
var DuelinkHighlightRules = function () {

    var keywords = (
        //DUELink methods
        "dim|fn|fend|while|wend|"+
        "for|in|to|step|range|next|"+
        "if|else|end|"+
        "@|goto|"+
        "exit|alias"     
        ); 

    var builtinConstants = (
        //DUELink array variables
        "b0|b1|b2|b3|b4|b5|b6|b7|b8|b9|a0|a1|a2|a3|a4|a5|a6|a7|a8|a9|"+
     
        //DUELink local variables
        "_a|_b|_c|_d|_e|_f|_g|_h|_i|_j|_k|_l|_m|_n|_o|_p|_q|_r|_s|_t|_u|_v|_w|_x|_y|_z"
    );
    var builtinFunctions = (
        // DUELink Standard Library
   //DUELink local variables
        "a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|"+
        //Device Addressing
        "sel|getadd|setadd|"+
        //Print
        "print|println|PrintLn|"+
        //Timing
        "wait|waitus|tickms|tickus|"+
        //Pin Control
            //Status LED
            "statled|"+
            //Digital
            "dread|dwrite|"+
            //Analog
            "aread|awrite|vread|"+
            //Button
            "btnen|btnup|btndown|btnread|"+
            //Frequency
            "freq|"+
            //PulseIn
            "pulsein|"+
        //Digital Control
            //Distance
            "dist|"+
            //Servo Motors
            "servost|"+
            //I2C
            "i2ccfg|i2cwr|"+
            //SPI
            "spicfg|spiwr|spiwrs|"+
            //Serial UART
            "sercfg|serrd|serrds|serwr|serwrs|serb2r|serdisc|"+
            //DMX
            "dmxw|dmxu|dmxrdy|dmxr|"+
            //Infrared
            "iren|irread|irwrite|"+
            //Temperature
            "temp|"+
            //Humidity
            "humid|"+
            //USB
            "hid|"+
            //Sound
            "melodyp|melodys|beep|wave|sweep|"+
            //System Info
            "info|"+
            //Graphics
            "clear|pixel|circle|line|rect|fill|text|texts|textt|img|imgs|imgb|show|show565|"+
            //File System
                //Mount
                "fsmnt|fsunmnt|fsfmt|"+
                //File Operations
                "fsopen|fsclose|fswrite|fsread|fssync|fsseek|fstell|fsdel|fsfind|fsfsz|"+
                //Directory Operations
                "fsmkdir|fsopdir|fsfnext|"+
            //Scheduler
            "sstart|sstat|sabort|"+
            //Interrupts
            "istart|istatled|iabort|irqen|"+
            //Downlink Control
            "dlmode|dli2cwr|cmd|cmdtmot|dlserwr|dlserrd|dlser2r|"+
            //Math
            "rnd|cos|sin|tan|sqrt|abs|ceil|floor|round|trunc|isnan|"+
            //Convertors
            "fmt|hex|chr|scale|memcpy|parse|sprintf|base64|"+
            //Asynchronous IO
            "asio|"+
            //System Reset
            "reset|"+
            //Low Power
            "lowpwr|"+
            //One-Time Programmable
            "otpr|otpw|"+
            //Coprocessor
                //Firmware Control
                "coproce|coprocp|coprocs|"+
                //Application Command
                "coprocv|coprocw|coprocr|"+
            //RTC
            "rtcw|rtcr|rtca|"+
            //MISC
            "version|echo|len|readvcc|exit|esp32gw|"    
    );



    var keywordMapper = this.createKeywordMapper({
        "invalid.deprecated": "debugger",
        "support.function": builtinFunctions,
        "variable.language": "self|cls",
        "constant.language": builtinConstants,
        "keyword": keywords
    }, "identifier");
    var strPre = "[uU]?";
    var strRawPre = "[rR]";
    var strFormatPre = "[fF]";
    var strRawFormatPre = "(?:[rR][fF]|[fF][rR])";
    var decimalInteger = "(?:(?:[1-9]\\d*)|(?:0))";
    var octInteger = "(?:0[oO]?[0-7]+)";
    var hexInteger = "(?:0[xX][\\dA-Fa-f]+)";
    var binInteger = "(?:0[bB][01]+)";
    var integer = "(?:" + decimalInteger + "|" + octInteger + "|" + hexInteger + "|" + binInteger + ")";
    var exponent = "(?:[eE][+-]?\\d+)";
    var fraction = "(?:\\.\\d+)";
    var intPart = "(?:\\d+)";
    var pointFloat = "(?:(?:" + intPart + "?" + fraction + ")|(?:" + intPart + "\\.))";
    var exponentFloat = "(?:(?:" + pointFloat + "|" + intPart + ")" + exponent + ")";
    var floatNumber = "(?:" + exponentFloat + "|" + pointFloat + ")";
    var stringEscape = "\\\\(x[0-9A-Fa-f]{2}|[0-7]{3}|[\\\\abfnrtv'\"]|U[0-9A-Fa-f]{8}|u[0-9A-Fa-f]{4})";
    this.$rules = {
        "start": [{
                token: "comment",
                regex: "#.*$",
                caseInsensitive: true
            }, {
                token: "string",
                regex: strPre + '"{3}',
                next: "qqstring3",
                caseInsensitive: true
            }, {
                token: "string",
                regex: strPre + '"(?=.)',
                next: "qqstring",
                caseInsensitive: true
            }, {
                token: "string",
                regex: strPre + "'{3}",
                next: "qstring3",
                caseInsensitive: true
            }, {
                token: "string",
                regex: strPre + "'(?=.)",
                next: "qstring",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawPre + '"{3}',
                next: "rawqqstring3",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawPre + '"(?=.)',
                next: "rawqqstring",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawPre + "'{3}",
                next: "rawqstring3",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawPre + "'(?=.)",
                next: "rawqstring",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strFormatPre + '"{3}',
                next: "fqqstring3",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strFormatPre + '"(?=.)',
                next: "fqqstring",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strFormatPre + "'{3}",
                next: "fqstring3",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strFormatPre + "'(?=.)",
                next: "fqstring",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawFormatPre + '"{3}',
                next: "rfqqstring3",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawFormatPre + '"(?=.)',
                next: "rfqqstring",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawFormatPre + "'{3}",
                next: "rfqstring3",
                 caseInsensitive: true
            }, {
                token: "string",
                regex: strRawFormatPre + "'(?=.)",
                next: "rfqstring",
                 caseInsensitive: true
            }, {
                token: "keyword.operator",
                regex: "\\+|\\-|\\*|\\*\\*|\\/|\\/\\/|%|@|<<|>>|&|\\||\\^|~|<|>|<=|=>|==|!=|<>|=",
                 caseInsensitive: true
            }, {
                token: "punctuation",
                regex: ",|:|;|\\->|\\+=|\\-=|\\*=|\\/=|\\/\\/=|%=|@=|&=|\\|=|^=|>>=|<<=|\\*\\*=",
                 caseInsensitive: true
            }, {
                token: "paren.lparen",
                regex: "[\\[\\(\\{]",
                 caseInsensitive: true
            }, {
                token: "paren.rparen",
                regex: "[\\]\\)\\}]",
                 caseInsensitive: true
            }, {
                token: ["keyword", "text", "entity.name.function"],
                regex: "(def|class)(\\s+)([\\u00BF-\\u1FFF\\u2C00-\\uD7FF\\w]+)",
                 caseInsensitive: true
            }, {
                token: "text",
                regex: "\\s+",
                 caseInsensitive: true
            }, {
                include: "constants"
            }],
          "qqstring3": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: '"{3}',
                next: "start",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "qstring3": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "'{3}",
                next: "start",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "qqstring": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "\\\\$",
                next: "qqstring",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: '"|$',
                next: "start",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "qstring": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "\\\\$",
                next: "qstring",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "'|$",
                next: "start",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rawqqstring3": [{
                token: "string",
                regex: '"{3}',
                next: "start",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rawqstring3": [{
                token: "string",
                regex: "'{3}",
                next: "start",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rawqqstring": [{
                token: "string",
                regex: "\\\\$",
                next: "rawqqstring",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: '"|$',
                next: "start",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rawqstring": [{
                token: "string",
                regex: "\\\\$",
                next: "rawqstring",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "'|$",
                next: "start"
            }, {
                defaultToken: "string"
            }],
        "fqqstring3": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: '"{3}',
                next: "start"
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "fqstring3": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "'{3}",
                next: "start",
                caseInsensitive: true 
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "fqqstring": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "\\\\$",
                next: "fqqstring",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: '"|$',
                next: "start",
                caseInsensitive: true 
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "fqstring": [{
                token: "constant.language.escape",
                regex: stringEscape,
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "'|$",
                next: "start",
                caseInsensitive: true 
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rfqqstring3": [{
                token: "string",
                regex: '"{3}',
                next: "start",
                caseInsensitive: true 
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rfqstring3": [{
                token: "string",
                regex: "'{3}",
                next: "start",
                caseInsensitive: true 
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rfqqstring": [{
                token: "string",
                regex: "\\\\$",
                next: "rfqqstring",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: '"|$',
                next: "start",
                caseInsensitive: true 
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "rfqstring": [{
                token: "string",
                regex: "'|$",
                next: "start",
                caseInsensitive: true 
            }, {
                token: "paren.lparen",
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }, {
                defaultToken: "string"
            }],
        "fqstringParRules": [{
                token: "paren.lparen",
                regex: "[\\[\\(]",
                caseInsensitive: true 
            }, {
                token: "paren.rparen",
                regex: "[\\]\\)]",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "\\s+",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: "'[^']*'",
                caseInsensitive: true 
            }, {
                token: "string",
                regex: '"[^"]*"',
                caseInsensitive: true 
            }, {
                token: "function.support",
                regex: "(!s|!r|!a)",
                caseInsensitive: true 
            }, {
                include: "constants"
            }, {
                token: 'paren.rparen',
                regex: "}",
                next: 'pop',
                caseInsensitive: true 
            }, {
                token: 'paren.lparen',
                regex: "{",
                push: "fqstringParRules",
                caseInsensitive: true 
            }],
        "constants": [{
                token: "constant.numeric",
                regex: "(?:" + floatNumber + "|\\d+)[jJ]\\b",
                caseInsensitive: true 
            }, {
                token: "constant.numeric",
                regex: floatNumber,
                caseInsensitive: true 
            }, {
                token: "constant.numeric",
                regex: integer + "[lL]\\b",
                caseInsensitive: true 
            }, {
                token: "constant.numeric",
                regex: integer + "\\b",
                caseInsensitive: true 
            }, {
                token: ["punctuation", "function.support"],
                regex: "(\\.)([a-zA-Z_]+)\\b",
                caseInsensitive: true 
            }, {
                token: keywordMapper,
                regex: "[a-zA-Z_$][a-zA-Z0-9_$]*\\b",
                caseInsensitive: true 
            }]
    };
    this.normalizeRules();
};
oop.inherits(DuelinkHighlightRules, TextHighlightRules);
exports.DuelinkHighlightRules = DuelinkHighlightRules;

});

ace.define("ace/mode/folding/pythonic",["require","exports","module","ace/lib/oop","ace/mode/folding/fold_mode"], function(require, exports, module){"use strict";
var oop = require("../../lib/oop");
var BaseFoldMode = require("./fold_mode").FoldMode;
var FoldMode = exports.FoldMode = function (markers) {
    this.foldingStartMarker = new RegExp("([\\[{])(?:\\s*)$|(" + markers + ")(?:\\s*)(?:#.*)?$");
};
oop.inherits(FoldMode, BaseFoldMode);
(function () {
    this.getFoldWidgetRange = function (session, foldStyle, row) {
        var line = session.getLine(row);
        var match = line.match(this.foldingStartMarker);
        if (match) {
            if (match[1])
                return this.openingBracketBlock(session, match[1], row, match.index);
            if (match[2])
                return this.indentationBlock(session, row, match.index + match[2].length);
            return this.indentationBlock(session, row);
        }
    };
}).call(FoldMode.prototype);

});

ace.define("ace/mode/duelink",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/duelink_highlight_rules","ace/mode/folding/pythonic","ace/range"], function(require, exports, module){"use strict";
var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var DuelinkHighlightRules = require("./duelink_highlight_rules").DuelinkHighlightRules;
var DuelinkFoldMode = require("./folding/pythonic").FoldMode;
var Range = require("../range").Range;
var Mode = function () {
    this.HighlightRules = DuelinkHighlightRules;
    this.foldingRules = new DuelinkFoldMode("\\:");
    this.$behaviour = this.$defaultBehaviour;
};
oop.inherits(Mode, TextMode);
(function () {
    this.lineCommentStart = "#";
    this.$pairQuotesAfter = {
        "'": /[ruf]/i,
        '"': /[ruf]/i
    };
    this.getNextLineIndent = function (state, line, tab) {
        var indent = this.$getIndent(line);
        var tokenizedLine = this.getTokenizer().getLineTokens(line, state);
        var tokens = tokenizedLine.tokens;
        if (tokens.length && tokens[tokens.length - 1].type == "comment") {
            return indent;
        }
        if (state == "start") {
            var match = line.match(/^.*[\{\(\[:]\s*$/);
            if (match) {
                indent += tab;
            }
        }
        return indent;
    };
    var outdents = {
        "pass": 1,
        "return": 1,
        "raise": 1,
        "break": 1,
        "continue": 1
    };
    this.checkOutdent = function (state, line, input) {
        if (input !== "\r\n" && input !== "\r" && input !== "\n")
            return false;
        var tokens = this.getTokenizer().getLineTokens(line.trim(), state).tokens;
        if (!tokens)
            return false;
        do {
            var last = tokens.pop();
        } while (last && (last.type == "comment" || (last.type == "text" && last.value.match(/^\s+$/))));
        if (!last)
            return false;
        return (last.type == "keyword" && outdents[last.value]);
    };
    this.autoOutdent = function (state, doc, row) {
        row += 1;
        var indent = this.$getIndent(doc.getLine(row));
        var tab = doc.getTabString();
        if (indent.slice(-tab.length) == tab)
            doc.remove(new Range(row, indent.length - tab.length, row, indent.length));
    };
    this.$id = "ace/mode/duelink";
    this.snippetFileId = "ace/snippets/duelink";
}).call(Mode.prototype);
exports.Mode = Mode;

});                (function() {
                    ace.require(["ace/mode/duelink"], function(m) {
                        if (typeof module == "object" && typeof exports == "object" && module) {
                            module.exports = m;
                        }
                    });
                })();
            