/*!
 * Common.js v1.0.0 (http://nersoftware.com/IMVUConversionTool/Common.js)
 * Copyright 2021 by ner software, LLC.
 * Licensed under the MIT license.
 *
 * This repo is hosted: https://github.com/nerseus/nerCal3DTools
 * A working example is also available here: http://nersoftware.com/IMVUConversionTool/nerImvuConversion.zip
 */

// The following will turn off the eslint rule for "gratuitous parentheses". Removing below may show warnings in Visual Studio.
/* eslint no-extra-parens: ["error", "all", { "nestedBinaryExpressions": false }] */

//************************************************************************************************************
//  This file provides some common global functions:
//      getExtension(filename)
//      validExtension(filename, extensionToCheck, showMessage)
//      saveFile(contents, filename)
//          Uses saveAs(), also defined here.
//      appendToFilename(filename, stringToAppend)
//      isFileMatch(file1, file2)
//     calcProgress(currentValue, maxValue)
//************************************************************************************************************

// defaultExtensions is not, probably should not, be used. It represents all of the X-based Cal3D file extensions.
//      Thiat is: individual functions (conversion, xaf tools, xmf tools, etc.) require specific extensions to work.
var defaultExtensions = ['xaf', 'xpf', 'xmf', 'xsf', 'xrf'];

function getExtension(filename) {
    var findExtensionRegEx = /(?:\.([^.]+))?$/;
    var extension = findExtensionRegEx.exec(filename)[1].toLowerCase();
    return extension;
}

function validExtension(filename, extensionsToCheck, showMessage) {
    var extension = getExtension(filename);
    if (extension === null) {
        toastr["error"]("File type could not be determined - no extension? File: " + filename);
        return false;
    }

    if (typeof extensionsToCheck === 'undefined' || extensionsToCheck === null) {
        extensionsToCheck = defaultExtensions.slice();
    } else if (!Array.isArray(extensionsToCheck)) {
        extensionsToCheck = [extensionsToCheck];
    }

    if (extensionsToCheck.length === 0) {
        extensionsToCheck = defaultExtensions.slice();
    }

    // Check if extension is in the list of valid extensions.
    var foundValid = extensionsToCheck.some(function (validExtension) {
        return extension === validExtension.toLowerCase();
    });

    if (!foundValid && showMessage) {
        var validExtensionsString = extensionsToCheck.join(', ');
        toastr.error("Invalid file type: " + filename + "<br/>Expected type(s): " + validExtensionsString, "Invalid or unhandled filetype");
    }

    return foundValid;
}

var saveAs = saveAs || function (e) { "use strict"; if (typeof e === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) { return; } var t = e.document, n = function () { return e.URL || e.webkitURL || e; }, r = t.createElementNS("http://www.w3.org/1999/xhtml", "a"), o = "download" in r, a = function (e) { var t = new MouseEvent("click"); e.dispatchEvent(t); }, i = /constructor/i.test(e.HTMLElement) || e.safari, f = /CriOS\/[\d]+/.test(navigator.userAgent), u = function (t) { (e.setImmediate || e.setTimeout)(function () { throw t; }, 0); }, s = "application/octet-stream", d = 1e3 * 40, c = function (e) { var t = function () { if (typeof e === "string") { n().revokeObjectURL(e); } else { e.remove(); } }; setTimeout(t, d); }, l = function (e, t, n) { t = [].concat(t); var r = t.length; while (r--) { var o = e["on" + t[r]]; if (typeof o === "function") { try { o.call(e, n || e); } catch (a) { u(a); } } } }, p = function (e) { if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)) { return new Blob([String.fromCharCode(65279), e], { type: e.type }); } return e; }, v = function (t, u, d) { if (!d) { t = p(t); } var v = this, w = t.type, m = w === s, y, h = function () { l(v, "writestart progress write writeend".split(" ")); }, S = function () { if ((f || m && i) && e.FileReader) { var r = new FileReader; r.onloadend = function () { var t = f ? r.result : r.result.replace(/^data:[^;]*;/, "data:attachment/file;"); var n = e.open(t, "_blank"); if (!n) e.location.href = t; t = undefined; v.readyState = v.DONE; h(); }; r.readAsDataURL(t); v.readyState = v.INIT; return; } if (!y) { y = n().createObjectURL(t); } if (m) { e.location.href = y; } else { var o = e.open(y, "_blank"); if (!o) { e.location.href = y; } } v.readyState = v.DONE; h(); c(y); }; v.readyState = v.INIT; if (o) { y = n().createObjectURL(t); setTimeout(function () { r.href = y; r.download = u; a(r); h(); c(y); v.readyState = v.DONE; }); return; } S(); }, w = v.prototype, m = function (e, t, n) { return new v(e, t || e.name || "download", n); }; if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) { return function (e, t, n) { t = t || e.name || "download"; if (!n) { e = p(e); } return navigator.msSaveOrOpenBlob(e, t); }; } w.abort = function () { }; w.readyState = w.INIT = 0; w.WRITING = 1; w.DONE = 2; w.error = w.onwritestart = w.onprogress = w.onwrite = w.onabort = w.onerror = w.onwriteend = null; return m; }(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content); if (typeof module !== "undefined" && module.exports) { module.exports.saveAs = saveAs; } else if (typeof define !== "undefined" && define !== null && define.amd !== null) { define("FileSaver.js", function () { return saveAs; }); }

function saveFile(contents, filename) {
    var file = new File([contents], filename, { type: "text/plain;charset=utf-8" });
    saveAs(file);
}

function appendToFilename(filename, stringToAppend) {
    return filename.substring(0, filename.length - 4) + stringToAppend + '.' + getExtension(filename);
}

function isFileMatch(file1, file2) {
    return file1.name === file2.name
        && file1.size === file2.size
        && file1.lastModified === file2.lastModified;
}

function calcProgress(currentValue, maxValue) {
    if (currentValue === 0) {
        return '0%';
    }
    else if (currentValue >= maxValue) {
        return '100%';
    }
    else {
        var percent = currentValue / maxValue * 100.0;
        return percent + '%';
    }
}
