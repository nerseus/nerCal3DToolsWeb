# nerCal3DTools
Tools for working with Cal3D files

This repository contains a javascript library for working with Cal3D files in the IMVU format.

This is NOT a general purpose Cal3D library. This library is used to load existing ASCII Cal3D files, manipulate the data, then export to the IMVU-specific version of Cal3D.
 
This also allows loading generic Cal3D files (such as those exported by WorldViz) and converting them to IMVU format.
 
If you have files in binary format (CAF, CSF, etc.) check out the C# projects for working with those file formats.

# Conversion App and Tools
The repo contains a test web app. This app allows converting Cal3D files into IMVUs format. It also has various tools for manipulating existing Cal3D files. The HTM page runs locally - no data is sent to another site. It uses Bootstrap and AngularJS.

For a description on what each function does below, see the comments in the web app.

## Animation (XAF):
* Reverse and Append
* Offset
* Lengthen Last Frame
* Stretch
* Untwitch

## Meshes(XMF)
* Merge

## Morph (XPF)
* Merge with Offset

## Material map (XRF)
* no operations supported currently.

# Cal3D Library
This file exposes the main Cal3D files as classes with utility functions.
      XAF, XMF, XSF, XPF
NOTE: XRF is not currently supported/exposed.

This library is used to load/parse existing Cal3D files into objects. Creating a new/empty object is not supported (though adding support would be relatively trivial). Since this library reads multiple formats of Cal3D files (those in IMVUs specific format as well as the more generic format) - this library can act as a "conversion" - by reading in Cal3D files from one format and then saving in IMVUs format. This allows someone to use a WorldViz exporter (for example) in 3ds Max and export to XMF and XSF, then convert those files to be used in IMVU (since the WorldViz files cannot be used by IMVU as-is).

General usage - create new instance of the type needed, with "rawData" being the XML string:

```     let rawData = '<SKELETON VERSION="1000" NUMBONES="7"><BONE ID="0"....'; // Cut short for brevity.
      let xaf = new XAF(rawData);
      // NOTE: xaf is now a fully parsed object.
      let bones = xaf.Bones; // Array of bones.
```

Writing objects back to files:
      All objects (and their child objects) support the method toFormattedString() which will return
      the XML-based string for that type.
      This can be called on the parent object to return the entire contents.

```    For example:
          let rawData = '<SKELETON VERSION="1000" NUMBONES="7"><BONE ID="0"....'; // Cut short for brevity.
          let xaf = new XAF(rawData);
          let newData = xaf.toFormattedString();
          // NOTE: newData now contains the full string from the xaf and can be written out to file.
```
