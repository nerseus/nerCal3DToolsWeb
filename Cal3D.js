/*!
 * Cal3D.js v1.0.0 (http://nersoftware.com/IMVUConversionTool/Cal3D.js)
 * Copyright 2021 by ner software, LLC.
 * Licensed under the MIT license.
 * This repo is hosted: https://github.com/nerseus/nerCal3DTools
 * A working example is also available here: http://nersoftware.com/IMVUConversionTool/nerImvuConversion.zip
 */

/*!
 * NOTE: This is NOT a general purpose Cal3D library. This library is used to load
 *       existing ascii Cal3D files, manipulate the data, then export to the IMVU-specific
 *       version of Cal3D.
 *
 *       This also allows loading generic Cal3D files (such as those exported by WorldViz)
 *       and converting them to IMVU format.
 *
 *       If you have files in binary format (CAF, CSF, etc.) check out the C# projects for working
 *       with those file formats.
 */

// The following will turn off the eslint rule for "gratuitous parentheses". Removing below may show warnings in Visual Studio.
/* eslint no-extra-parens: ["error", "all", { "nestedBinaryExpressions": false }] */

//************************************************************************************************************
//  This file exposes the main Cal3D files as classes with utility functions.
//      XAF, XMF, XSF, XPF
//  NOTE: XRF is not currently supported/exposed.
//
//  This library is used to load/parse existing Cal3D files into objects.
//  Creating a new/empty object is not supported (though adding support would be relatively trivial).
//  Since this library reads multiple formats of Cal3D files (those in IMVUs specific format as well as the
//  more generic format) - this library can act as a "conversion" - by reading in Cal3D files from
//  one format and then saving in IMVUs format. This allows someone to use a WorldViz exporter (for example)
//  in 3ds Max and export to XMF and XSF, then convert those files to be used in IMVU (since the WorldViz
//  files cannot be used by IMVU as-is).
//
//  General usage - create new instance of the type needed, with "rawData" being the XML string:
//      let rawData = '<SKELETON VERSION="1000" NUMBONES="7"><BONE ID="0"....'; // Cut short for brevity.
//      let xaf = new XAF(rawData);
//      // NOTE: xaf is now a fully parsed object.
//      let bones = xaf.Bones; // Array of bones.
//
//  Writing objects back to files:
//      All objects (and their child objects) support the method toFormattedString() which will return
//      the XML-based string for that type.
//      This can be called on the parent object to return the entire contents.
//
//      For example:
//          let rawData = '<SKELETON VERSION="1000" NUMBONES="7"><BONE ID="0"....'; // Cut short for brevity.
//          let xaf = new XAF(rawData);
//          let newData = xaf.toFormattedString();
//          NOTE: newData now contains the full string from the xaf and can be written out to file.
//
//  Functions supported per type:
//      XAF:
//          reverseAndAppend()
//          offset(offsetAmount)
//          lengthenLastFrame(lengthenTime)
//          stretch(stretchMultiplier)
//          unTwitch()
//      XMF:
//          merge(xaf2)
//      XPF:
//          mergeWithOffset(mergeMorph, newStartTime, newEndTime, newDuration, blendFrames)
//          NOTE: This is untested. Code originally written in C# and converted/untested.
//      XAF:
//          n/a (object supported for Conversion purposes)
//************************************************************************************************************

var XAF_HEADER = "<HEADER MAGIC=\"XAF\" VERSION=\"919\" />";
var XMF_HEADER = "<HEADER MAGIC=\"XMF\" VERSION=\"919\" />";
var XPF_HEADER = "<HEADER MAGIC=\"XPF\" VERSION=\"919\" />";
var XSF_HEADER = "<HEADER MAGIC=\"XSF\" VERSION=\"919\" />";

// Format of XAF Files
var AnimationFormat = "<ANIMATION VERSION=\"1000\" DURATION=\"{0}\" NUMTRACKS=\"{1}\">\r\n{2}</ANIMATION>";
var XAFTrackFormat = "\t<TRACK TRANSLATIONREQUIRED=\"0\" TRANSLATIONISDYNAMIC=\"0\" HIGHRANGEREQUIRED=\"0\" BONEID=\"{0}\" NUMKEYFRAMES=\"{1}\">\r\n{2}\t</TRACK>\r\n";
var XAFKeyframeTranslationFormat = "\t\t\t<TRANSLATION>{0}</TRANSLATION>\r\n";
var XAFKeyframeRotationFormat = "\t\t\t<ROTATION>{0}</ROTATION>\r\n";
var XAFKeyframeFormat = "\t\t<KEYFRAME TIME=\"{0}\">\r\n{1}{2}\t\t</KEYFRAME>\r\n";

// Format of XMF Files
var SubmeshFormat = "\t<SUBMESH NUMVERTICES=\"{0}\" NUMFACES=\"{1}\" NUMLODSTEPS=\"0\" NUMSPRINGS=\"0\" NUMMORPHS=\"{2}\" NUMTEXCOORDS=\"{3}\" MATERIAL=\"{4}\">\r\n{5}\t</SUBMESH>\r\n";
var VertexFormat = "\t\t<VERTEX NUMINFLUENCES=\"{0}\" ID=\"{1}\">\r\n{2}\t\t</VERTEX>\r\n";
var InfluenceFormat = "\t\t\t<INFLUENCE ID=\"{0}\">{1}</INFLUENCE>\r\n";
var MeshFormat = "<MESH NUMSUBMESH=\"{0}\">\r\n{1}</MESH>";

// Format of XPF Files
var XPFTrackFormat = "\t<TRACK NUMKEYFRAMES=\"{0}\" MORPHNAME=\"{1}\">\r\n{2}\t</TRACK>\r\n";
var XPFKeyFrameFormat = "\t\t<KEYFRAME TIME=\"{0}\">\r\n\t\t\t<WEIGHT>{1}</WEIGHT>\r\n\t\t</KEYFRAME>\r\n";

// Format of XSF Files
var SkeletonFormat = "<SKELETON NUMBONES=\"{0}\" SCENEAMBIENTCOLOR=\"{1}\">\r\n{2}</SKELETON>";
var BoneFormat = "\t<BONE NAME=\"{0}\" NUMCHILDS=\"{1}\" ID=\"{2}\">\r\n{3}\t</BONE>\r\n";

function XCal3DInt3 (rawValue) {
    if (!rawValue) {
        this.Used = false;
    }

    var values = rawValue.split(' ');
    if (values === null || values.length !== 3) {
        this.Used = false;
    }

    this.V1 = parseInt(values[0]);
    this.V2 = parseInt(values[1]);
    this.V3 = parseInt(values[2]);
    this.Used = true;

    this.toFormattedString = function () {
        if (!this.Used) {
            return '';
        } else {
            return this.V1 + ' ' + this.V2 + ' ' + this.V3;
        }
    };
}

function XCal3DPoint2 (rawValue) {
    if (!rawValue) {
        this.Used = false;
    }

    var values = rawValue.split(' ');
    if (values === null || values.length !== 2) {
        this.Used = false;
    }

    this.X = parseFloat(values[0]);
    this.Y = parseFloat(values[1]);
    this.Used = true;

    this.toFormattedString = function () {
        if (!this.Used) {
            return '';
        } else {
            return this.X + ' ' + this.Y;
        }
    };
}

function XCal3DPoint3 (rawValue) {
    if (!rawValue) {
        this.Used = false;
    }

    var values = rawValue.split(' ');
    if (values === null || values.length !== 3) {
        this.Used = false;
    }

    this.X = parseFloat(values[0]);
    this.Y = parseFloat(values[1]);
    this.Z = parseFloat(values[2]);
    this.Used = true;

    this.toFormattedString = function () {
        if (!this.Used) {
            return '';
        } else {
            return this.X + ' ' + this.Y + ' ' + this.Z;
        }
    };
}

function XCal3DPoint4 (rawValue) {
    if (!rawValue) {
        this.Used = false;
    }

    var values = rawValue.split(' ');
    if (values === null || values.length !== 4) {
        this.Used = false;
    }

    this.X = parseFloat(values[0]);
    this.Y = parseFloat(values[1]);
    this.Z = parseFloat(values[2]);
    this.A = parseFloat(values[3]);
    this.Used = true;

    this.toFormattedString = function () {
        if (!this.Used) {
            return '';
        } else {
            return this.X + ' ' + this.Y + ' ' + this.Z + ' ' + this.A;
        }
    };
}

function stringFormat(format, values) {
    return format.replace(/{(\d+)}/g, function (match, index) {
        return typeof values[index] !== 'undefined'
            ? values[index]
            : match
        ;
    });
}

function readXml(rawXmlData, header) {
    var parser = new DOMParser();
    // If the rawXmlData has a header then remove it and append a root node (to make this valid xml).
    if (rawXmlData.startsWith(header)) {
        var xml1 = '<ROOT>' + rawXmlData.substring(XAF_HEADER.length) + '</ROOT>';
        return parser.parseFromString(xml1, "application/xml");
    } else { // else there is no header - just append a root node (to make this valid xml).
        var xml2 = '<ROOT>' + rawXmlData + '</ROOT>';
        return parser.parseFromString(xml2, "application/xml");
    }
}

function XAFKeyFrame () {
    this.Time = 0.0;
    this.Translation = null;
    this.Rotation = null;

    this.toFormattedString = function () {
        let translation = '';
        if (this.Translation != null) {
            translation = stringFormat(XAFKeyframeTranslationFormat, [this.Translation.toFormattedString()]);
        }
        
        let rotation = '';
        if (this.Rotation != null) {
            rotation = stringFormat(XAFKeyframeRotationFormat, [this.Rotation.toFormattedString()]);
        }
        
        return stringFormat(XAFKeyframeFormat, [this.Time, translation, rotation]);
    };
}

function XAFTrack () {
    this.BoneID = 0;
    this.KeyFrames = [];

    this.toFormattedString = function () {
        var keyFrameValues = '';
        $.each(this.KeyFrames, function (index, value) {
            keyFrameValues = keyFrameValues + value.toFormattedString();
        });

        return stringFormat(XAFTrackFormat, [this.BoneID, this.KeyFrames.length, keyFrameValues]);
    };
}

function getAllXAFTracks(rootAnimationNode) {
    var trackNodes = rootAnimationNode.getElementsByTagName("TRACK");
    var tracks = [];
    $.each(trackNodes, function (trackNodeIndex, trackNode) {
        var track = new XAFTrack();
        track.BoneID = trackNode.attributes["BONEID"].value;
        track.KeyFrames = [];

        var keyFrameNodes = trackNode.getElementsByTagName("KEYFRAME");
        $.each(keyFrameNodes, function (keyFrameIndex, keyFrameNode) {
            var keyFrame = new XAFKeyFrame();

            keyFrame.Time = keyFrameNode.attributes["TIME"].value;

            var translationNodes = keyFrameNode.getElementsByTagName("TRANSLATION");
            if(translationNodes.length > 0){
                var translationNode = translationNodes[0].innerHTML;
                keyFrame.Translation = new XCal3DPoint3(translationNode);
            }

            var rotationNodes = keyFrameNode.getElementsByTagName("ROTATION");
            if(rotationNodes.length > 0) {
                var rotationNode = rotationNodes[0].innerHTML;
                keyFrame.Rotation = new XCal3DPoint4(rotationNode);
            }
            
            track.KeyFrames.push(keyFrame);
        });

        tracks.push(track);
    });

    return tracks;
}

function XAF (rawXmlData) {
    var xmlDoc = readXml(rawXmlData, XAF_HEADER);

    var animationNodes = xmlDoc.getElementsByTagName('ANIMATION');
    if (animationNodes.length !== 1) {
        return;
    }

    this.Duration = animationNodes[0].attributes["DURATION"].value;
    this.Tracks = getAllXAFTracks(animationNodes[0]);

    // Use toFormattedString to return the updated XAF (write these details to a file).
    this.toFormattedString = function() {
        var trackValues = '';
        $.each(this.Tracks, function(trackIndex, track) {
            trackValues = trackValues + track.toFormattedString();
        });

        return XAF_HEADER + '\r\n' + stringFormat(AnimationFormat, [this.Duration, this.Tracks.length, trackValues]);
    };

    /// <summary>
    /// Doubles the duration of the animation. Copies the keyframes in reverse order and appends to the end of the animation. This creates a "smooth" cylcle of animation that ends where it began.
    /// </summary>
    this.reverseAndAppend = function () {
        let duration = this.Duration;
        $.each(this.Tracks, function (trackIndex, track) {
            // Copy the existing keyFrames (which should be sorted by Time ascending) into newKeyFrames
            var newKeyFrames = [].concat(track.KeyFrames);

            // Sort the KeyFrames by Time, descending.
            track.KeyFrames.sort(function(a, b) {
                if (a.Time > b.Time)
                    return -1;
                if (a.Time < b.Time)
                    return 1;
                return 0;
            });

            // Copy each keyframe in descending order - push onto newKeyFrames.
            $.each(track.KeyFrames, function (keyFrameIndex, keyFrame) {
                // Skip the "last" keyframe so there's not a duplicate in the "middle".
                if (keyFrame.Time !== duration) {
                    var newKeyFrame = new XAFKeyFrame();
                    newKeyFrame.Translation = keyFrame.Translation;
                    newKeyFrame.Rotation = keyFrame.Rotation;
                    // Adjust the time so that appended keyframes are offset an equal amount.
                    newKeyFrame.Time = (duration * 2) - keyFrame.Time;
                    newKeyFrames.push(newKeyFrame);
                }
            });

            track.KeyFrames = newKeyFrames;
        });

        // Double the duration to account for the copied keyframes.
        this.Duration *= 2;
    };

    /// <summary>
    /// Offset an animation by offsetAmount. The duration will be increased and all keyframes will be offset by this amount. This inserts "silence" at the beginning of an animation.
    /// </summary>
    this.offset = function (offsetAmount) {
        offsetAmount = parseFloat(offsetAmount);
        this.Duration = parseFloat(this.Duration) + offsetAmount;

        $.each(this.Tracks, function(trackIndex, track) {
            $.each(track.KeyFrames, function(keyFrameIndex, keyFrame) {
                keyFrame.Time = parseFloat(keyFrame.Time) + offsetAmount;
            });
        });
    };

    /// <summary>
    /// Lengthens an animation by lengthenTime.
    /// </summary>
    this.lengthenLastFrame = function (lengthenTime) {
        lengthenTime = parseFloat(lengthenTime);
        this.Duration = parseFloat(this.Duration) + lengthenTime;

        $.each(this.Tracks, function (trackIndex, track) {
            if (track.KeyFrames && track.KeyFrames.length > 1) {
                let lastKeyFrame = track.KeyFrames[track.KeyFrames.length - 1];
                lastKeyFrame.Time = parseFloat(lastKeyFrame.Time) + lengthenTime;
            }
        });
    };

    /// <summary>
    /// Stretches an animation by stretchMultiplier. The duration, as well as the time for all keyframes, will be multiplied by stretch amount. This can be used to increase a duration or decrease it (double it with 2 or cut the time in half with 0.5).
    /// </summary>
    this.stretch = function (stretchMultiplier) {
        stretchMultiplier = parseFloat(stretchMultiplier);
        this.Duration = parseFloat(this.Duration) * stretchMultiplier;

        $.each(this.Tracks, function (trackIndex, track) {
            $.each(track.KeyFrames, function (keyFrameIndex, keyFrame) {
                keyFrame.Time = parseFloat(keyFrame.Time) * stretchMultiplier;
            });
        });
    };

    /// <summary>
    /// Reduces the keyframes of all tracks to two keyframes, both have the same values (essentially leaving just one "pose").
    /// </summary>
    this.untwitch = function () {
        let xaf = this;
        $.each(this.Tracks, function (trackIndex, track) {
            // remove all but the first two keyframes
            track.KeyFrames.splice(2, track.KeyFrames.length - 2);

            // Force the 2nd keyframe (if it exists) to match the first keyframe
            if (track.KeyFrames.length > 1) {
                track.KeyFrames[1].Rotation = track.KeyFrames[0].Rotation;
                track.KeyFrames[1].Translation = track.KeyFrames[0].Translation;
                track.KeyFrames[1].Time = xaf.Duration;
            }
        });
    };
}

function XMFSubmesh () {
    this.MaterialID = 0;
    this.NumMorphs = 0;
    this.NumTextureCoordinates = 0;
    this.MorphData = '';
    this.Vertices = [];
    this.Faces = [];

    this.toFormattedString = function() {
        var vertexValues = '';
        $.each(this.Vertices, function(vertexIndex, vertex) {
            vertexValues = vertexValues + vertex.toFormattedString();
        });

        var faceValues = '';
        $.each(this.Faces, function(faceIndex, face) {
            faceValues = faceValues + face.toFormattedString();
        });

        return stringFormat(SubmeshFormat, [this.Vertices.length, this.Faces.length, this.NumMorphs, this.NumTextureCoordinates, this.MaterialID, vertexValues + this.MorphData + faceValues]);
    };
}

function XMFVertex () {
    this.ID = 0;
    this.Position = null;    // XCal3DPoint3
    this.Normal = null;      // XCal3DPoint3
    this.Color = null;       // XCal3DPoint3
    this.TextureCoordinates = [];
    this.Influences = [];

    this.toFormattedString = function() {
        var textureCoordinateValues = '';
        $.each(this.TextureCoordinates, function (textureCoordinateIndex, textureCoordinate) {
            textureCoordinateValues = textureCoordinateValues + textureCoordinate.toFormattedString();
        });

        var influenceValues = '';
        $.each(this.Influences, function (influenceIndex, influence) {
            influenceValues = influenceValues + influence.toFormattedString();
        });

        var data = '';
        if (this.Position && this.Position.Used) {
            data += '\t\t\t<POS>' + this.Position.toFormattedString() + '</POS>\r\n';
        }

        if (this.Normal && this.Normal.Used) {
            data += '\t\t\t<NORM>' + this.Normal.toFormattedString() + '</NORM>\r\n';
        }

        if (this.Color && this.Color.Used) {
            data += '\t\t\t<COLOR>' + this.Color.toFormattedString() + '</COLOR>\r\n';
        }
        else {
            data += '\t\t\t<COLOR>0 0 0</COLOR>\r\n';
        }

        data += textureCoordinateValues;
        data += influenceValues;

        return stringFormat(VertexFormat, [this.Influences.length, this.ID, data]);
    };
}

function XMFTextureCoordinate () {
    this.TextureCoordinate = null; // XCal3DPoint2

    this.toFormattedString = function() {
        return '\t\t\t<TEXCOORD>' + this.TextureCoordinate.toFormattedString() + '</TEXCOORD>\r\n';
    };
}

function XMFInfluence () {
    this.BoneID = 0;
    this.Influence = 0.0;

    this.toFormattedString = function() {
        return stringFormat(InfluenceFormat, [this.BoneID, this.Influence]);
    };
}

function XMFFace () {
    this.FaceData = null; // XCal3DInt3

    this.toFormattedString = function() {
        return stringFormat('\t\t<FACE VERTEXID="{0}" />\r\n', [this.FaceData.toFormattedString()]);
    };
}

function getAllXMFSubmeshes(rootMeshNode) {
    var submeshNodes = rootMeshNode.getElementsByTagName("SUBMESH");
    var submeshes = [];
    $.each(submeshNodes, function(submeshIndex, submeshNode) {
        var submesh = new XMFSubmesh();

        if (submeshNode.attributes["NUMMORPHS"]) {
            submesh.NumMorphs = parseInt(submeshNode.attributes["NUMMORPHS"].value);
        }

        submesh.NumTextureCoordinates = parseInt(submeshNode.attributes["NUMTEXCOORDS"].value);
        submesh.MaterialID = parseInt(submeshNode.attributes["MATERIAL"].value);

        $.each(submeshNode.getElementsByTagName("VERTEX"), function(vertexIndex, vertexNode) {
            var vertex = new XMFVertex();
            vertex.ID = parseInt(vertexNode.attributes["ID"].value);
            vertex.Position = new XCal3DPoint3(vertexNode.getElementsByTagName("POS")[0].innerHTML);

            if (vertexNode.getElementsByTagName("NORM").length > 0) {
                vertex.Normal = new XCal3DPoint3(vertexNode.getElementsByTagName("NORM")[0].innerHTML);
            }

            if (vertexNode.getElementsByTagName("COLOR").length > 0) {
                vertex.Color = new XCal3DPoint3(vertexNode.getElementsByTagName("COLOR")[0].innerHTML);
            }

            $.each(vertexNode.getElementsByTagName("TEXCOORD"), function(textureCoordinateIndex, textureCoordinateNode) {
                var textureCoordinate = new XMFTextureCoordinate();
                textureCoordinate.TextureCoordinate = new XCal3DPoint2(textureCoordinateNode.innerHTML);
                vertex.TextureCoordinates.push(textureCoordinate);
            });

            $.each(vertexNode.getElementsByTagName("INFLUENCE"), function(influenceIndex, influenceNode) {
                var influence = new XMFInfluence();
                influence.BoneID = parseInt(influenceNode.attributes["ID"].value);
                influence.Influence = parseFloat(influenceNode.innerHTML);
                vertex.Influences.push(influence);
            });

            submesh.Vertices.push(vertex);
        });

        var morphData = '';
        $.each(submeshNode.getElementsByTagName("MORPH"), function(morphIndex, morphNode) {
            // Don't do anything with the MORPH data for now - just store as a string blob
            morphData += morphNode.outerXml;
        });
        submesh.MorphData = morphData;

        $.each(submeshNode.getElementsByTagName("FACE"), function(faceIndex, faceNode) {
            var face = new XMFFace();
            face.FaceData = new XCal3DInt3(faceNode.attributes["VERTEXID"].value);
            submesh.Faces.push(face);
        });

        submeshes.push(submesh);
    });

    return submeshes;
}

function XMF (rawXmlData) {
    var xmlDoc = readXml(rawXmlData, XMF_HEADER);

    var meshNodes = xmlDoc.getElementsByTagName('MESH');
    if (meshNodes.length !== 1) {
        return;
    }

    this.Submeshes = getAllXMFSubmeshes(meshNodes[0]);

    // Use toFormattedString to return the updated XMF (write these details to a file).
    this.toFormattedString = function () {
        var submeshValues = '';
        $.each(this.Submeshes, function (submeshIndex, submeshNode) {
            submeshValues = submeshValues + submeshNode.toFormattedString();
        });

        return XMF_HEADER + '\r\n' + stringFormat(MeshFormat, [this.Submeshes.length, submeshValues]);
    };
	
    /// <summary>
    /// Combines the submeshes from xmf2 into this objects submeshes, effectively merging the two meshes into one file.
    /// </summary>
    this.merge = function (xmf2) {
        for (let i = 0; i < xmf2.Submeshes.length; i++) {
            this.Submeshes.push(xmf2.Submeshes[i]);
        }
    };
}

function XPFKeyFrame () {
    this.Time = 0.0;
    this.Weight = 0.0;

    this.toFormattedString = function () {
        return stringFormat(XPFKeyframeFormat, [this.Time, this.Weight]);
    };
}

function XPFTrack () {
    this.MorphName = '';
    this.KeyFrames = [];

    this.toFormattedString = function () {
        var keyFrameValues = '';
        $.each(this.KeyFrames, function (index, value) {
            keyFrameValues = keyFrameValues + value.toFormattedString();
        });

        return stringFormat(XPFTrackFormat, [this.KeyFrames.length, this.MorphName, keyFrameValues]);
    };
}

function getAllXPFTracks(rootAnimationNode) {
    var trackNodes = rootAnimationNode.getElementsByTagName("TRACK");
    var tracks = [];
    $.each(trackNodes, function (trackNodeIndex, trackNode) {
        var track = new XPFTrack();
        track.MorphName = trackNode.attributes["MORPHNAME"].value;
        track.KeyFrames = [];

        var keyFrameNodes = trackNode.getElementsByTagName("KEYFRAME");
        $.each(keyFrameNodes, function (keyFrameIndex, keyFrameNode) {
            var keyFrame = new XPFKeyFrame();

            keyFrame.Time = keyFrameNode.attributes["TIME"].value;
			keyFrame.Time = keyFrameNode.attributes["WEIGHT"].value;

            track.KeyFrames.push(keyFrame);
        });

        tracks.push(track);
    });

    return tracks;
}

function XPF (rawXmlData) {
    var xmlDoc = readXml(rawXmlData, XMF_HEADER);

    var animationNodes = xmlDoc.getElementsByTagName('ANIMATION');
    if (animationNodes.length !== 1) {
		return;
    }
	
	this.Duration = animationNodes[0].attributes["DURATION"].value;
    this.Tracks = getAllXPFTracks(animationNodes[0]);

	/// <summary>
    /// Merges a morph at an offset. Useful to combine morphs made with an external tool (that are always at time 0) to begin at an offset. This is useful to have a morph animation (such as a face animation) made in an external tool made to synch up with a skeletal animation. For example, creating a romantic animation in 3ds Max and wanting eyes to close or the mouth to make a certain shape, but only at a certain point in the skeletal animation.
    /// Paramaeters:
	///		mergeMorph		: The morph in which to merge.
	///		newStartTime	: At what point in time the new morph will begin playing.
	///		newEndTime		: At what point in time the new morph will stop playing.
	///		newDuration		: The total time of the combined morphs (this morph + mergeMorph).
	///		blendFrames		: How many frames to blend the mergeMorph. Typically 5-10.
	/// </summary>
    this.mergeWithOffset = function (mergeMorph, newStartTime, newEndTime, newDuration, blendFrames) {
		var tracks = [];

		// Create tracks from the current morph - but force each keyframe to begin at time 0.
		// This will initialize each morph target to be "fixed" at time 0, which allows
		// a base version of the track from which we can build a blending into the morph.
		// For example, a morph that moves the upper and lower lips (2 tracks) will initialize
		// those lips to begin/freeze their animation at frame 0.
		$.each(this.Tracks, function (trackIndex, track) {
			var newTrack = new XPFTrack();
			newTrack.MorphName = track.MorphName;

			var newKeyFrame = new XPFKeyFrame();
			newKeyFrame.Time = 0.0;
			if (track.KeyFrames.Count > 0)
			{
				newKeyFrame.Weight = track.KeyFrames[0].Weight;
			}
			else
			{
				newKeyFrame.Weight = 0.0;
			}

			newTrack.KeyFrames.push(newKeyFrame);
			tracks.push(newTrack);
		});
		
		// Add three more keyFrames to tracks[]:
		//      Time                    Weight                      Desc
		//      =====================   =========                   ====================================================================================================
		//      newStartTime - blend    match weight at frame 0     Start the transition from base morph into this morph
		//      newStartTime            this morph's weight         Play this morph
		//      newEndTime              this morph's weight         Continue playing this morph until end time
		//      newEndTime + blend      match weight at frame 0     Begin blending back to base morph. This will stick til animation is complete (for the duration)
		var blendTime = blendFrames / 30;
		var blendInTime = newStartTime - blendTime;
		var blendOutTime = newEndTime + blendTime;
		if (blendInTime < 0.0) blendInTime = 0.0001;
		if (blendOutTime > newDuration) blendOutTime = newDuration - 0.0001;

        $.each(mergeMorph, function (trackIndex, mergeTrack) {
            // Find track in our original set of tracks, matching by name 
            var matchingTracks = tracks.filter(function (x) { return x.MorphName === mergeTrack.MorphName; });

            // Make sure all morph targets in the merge morph are in this morph.
            // They might be missing if they didn't exist.
            var matchingTrack;
            if (matchingTracks.length === 0) {
                matchingTrack = new XPFTrack();
                matchingTrack.MorphName = mergeTrack.MorphName;

                var newKeyFrame = new XPFKeyFrame();
                newKeyFrame.Time = 0.0;
                if (mergeTrack.KeyFrames.length > 0) {
                    newKeyFrame.Weight = track.KeyFrames[0].Weight;
                }
                else {
                    newKeyFrame.Weight = 0.0;
                }

                matchingTrack.KeyFrames.push(newKeyFrame);
                tracks.push(matchingTrack);
            }
            else {
                matchingTrack = matchingTracks[0];
            }

            var baseWeight = matchingTrack.KeyFrames[0].Weight;
            var thisWeight = mergeTrack.KeyFrames[0].Weight;
            if (baseWeight !== thisWeight) {
                // Create the "blendIn" keyframe
                var blendInFrame = new XPFKeyFrame();
                blendInFrame.Time = blendInTime;
                blendInFrame.Weight = baseWeight;
                matchingTrack.KeyFrames.push(blendInFrame);

                // Create the main morph keyframe at start Time
                var startMorphFrame = new XPFKeyFrame();
                startMorphFrame.Time = newStartTime;
                startMorphFrame.Weight = thisWeight;
                matchingTrack.KeyFrames.push(startMorphFrame);

                // Create the main morph keyframe at end Time
                var endMorphFrame = new XPFKeyFrame();
                endMorphFrame.Time = newEndTime;
                endMorphFrame.Weight = thisWeight;
                matchingTrack.KeyFrames.push(endMorphFrame);

                // Create the "blendOut" keyframe
                var blendOutFrame = new XPFKeyFrame();
                blendOutFrame.Time = blendOutTime;
                blendOutFrame.Weight = baseWeight;
                matchingTrack.KeyFrames.push(blendOutFrame);
            }
        });
		
		this.Duration = newDuration;
		this.Tracks = tracks;
    };
}

function XSFBone() {

    this.Name = null;
    this.ID = 0;
    this.ParentID = 0;
    this.Translation = null;        // XCal3DPoint3
    this.Rotation = null;           // XCal3DPoint4
    this.LocalTranslation = null;   // XCal3DPoint3
    this.LocalRotation = null;      // XCal3DPoint4
    this.Children = [];

    this.toFormattedString = function () {
        var boneValues = '';
        if (this.Translation.Used)      boneValues += "\t\t<TRANSLATION>" + this.Translation.toFormattedString() + "</TRANSLATION>\r\n";
        if (this.Rotation.Used)         boneValues += "\t\t<ROTATION>" + this.Rotation.toFormattedString() + "</ROTATION>\r\n";
        if (this.LocalTranslation.Used) boneValues += "\t\t<LOCALTRANSLATION>" + this.LocalTranslation.toFormattedString() + "</LOCALTRANSLATION>\r\n";
        if (this.LocalRotation.Used)    boneValues += "\t\t<LOCALROTATION>" + this.LocalRotation.toFormattedString() + "</LOCALROTATION>\r\n";

        boneValues += "\t\t<PARENTID>" + this.ParentID + "</PARENTID>\r\n";

        $.each(this.Children, function (childIndex, child) {
            boneValues += "\t\t<CHILDID>" + child.ID + "</CHILDID>\r\n";
        });

        return stringFormat(BoneFormat, [this.Name, this.Children.length, this.ID, boneValues]);
    };
}

function getAllXSFBones(boneNodes) {
    let bones = [];

    $.each(boneNodes, function (boneNodeIndex, boneNode) {
        var bone = new XSFBone();

        bone.Name = boneNode.attributes["NAME"].value;
        bone.ID = parseInt(boneNode.attributes["ID"].value);
        bone.Translation = new XCal3DPoint3(boneNode.getElementsByTagName("TRANSLATION")[0].innerHTML);
        bone.Rotation = new XCal3DPoint3(boneNode.getElementsByTagName("ROTATION")[0].innerHTML);
        bone.LocalTranslation = new XCal3DPoint3(boneNode.getElementsByTagName("LOCALTRANSLATION")[0].innerHTML);
        bone.LocalRotation = new XCal3DPoint3(boneNode.getElementsByTagName("LOCALROTATION")[0].innerHTML);
        bone.ParentID = parseInt(boneNode.getElementsByTagName("PARENTID")[0].innerHTML);
        bone.Children = [];
        bones.push(bone);
    });

    $.each(bones, function (boneIndex, bone) {
        // A parent of -1 indicates a root bone.
        // For all other bones, find the parent bone and add this one to their Children collection.
        if (bone.ParentID !== -1) {
            $.each(bones, function (boneIndex2, potentialParent) {
                if (potentialParent.ID === bone.ParentID) {
                    potentialParent.Children.push(bone);
                }
            });
        }
    });

    return bones;
}

function XSF(rawXmlData) {
    var xslDoc = readXml(rawXmlData, XSF_HEADER);

    var skeletonNodes = xslDoc.getElementsByTagName('SKELETON');
    if (skeletonNodes.length !== 1) {
        return;
    }

    let sceneAmbientColorAttribute = skeletonNodes[0].attributes["SCENEAMBIENTCOLOR"];
    if (sceneAmbientColorAttribute) {
        this.SceneAmbientColor = new XCal3DPoint3(sceneAmbientColorAttribute.innerHTML);
    }
    else {
        this.SceneAmbientColor = new XCal3DPoint3("0.0 0.0 0.0");
    }

    var boneNodes = skeletonNodes[0].getElementsByTagName('BONE');
    if (boneNodes.length === 0) {
        return;
    }

    this.Bones = getAllXSFBones(boneNodes);

    // Use toFormattedString to return the updated XSF
    this.toFormattedString = function () {
        var boneValues = '';
        $.each(this.Bones, function (boneIndex, boneNode) {
            boneValues = boneValues + boneNode.toFormattedString();
        });

        return XSF_HEADER + '\r\n' + stringFormat(SkeletonFormat, [this.Bones.length, this.SceneAmbientColor.toFormattedString(), boneValues]);
    };
}
