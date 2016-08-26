"use strict";
/// <reference path="typings/index.d.ts" />
var path = require('path');
function hex2a(hexx) {
    var hex = hexx.toString(); //force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}
exports.hex2a = hex2a;
function a2hex(str) {
    var arr = [];
    for (var i = 0, l = str.length; i < l; i++) {
        var hex = Number(str.charCodeAt(i)).toString(16);
        arr.push(hex);
    }
    var builtString = arr.join('');
    // Must have even number of hex digits
    if (builtString.length % 2 !== 0) {
        builtString = "0" + builtString;
    }
    return builtString;
}
exports.a2hex = a2hex;
function str2Hex(str) {
    return new Buffer(str, 'hex');
}
exports.str2Hex = str2Hex;
function hex2str(hex) {
    return hex.toString("hex");
}
exports.hex2str = hex2str;
function getProperIP(ip) {
    var IPFromRequest = ip;
    var indexOfColon = IPFromRequest.lastIndexOf(':');
    var IP = IPFromRequest.substring(indexOfColon + 1, IPFromRequest.length);
    return IP;
}
exports.getProperIP = getProperIP;
function getPacketLengthFromData(hexStr) {
    var prePacketLength = (hexStr.length / 2).toString(16);
    if (prePacketLength.length !== 4) {
        for (var j = prePacketLength.length; j < 4; j++) {
            prePacketLength = "0" + prePacketLength;
        }
    }
    // Assign hex packet length
    var packetLength = (prePacketLength.length / 2 + parseInt(prePacketLength, 16)).toString(16);
    // Ensure it takes up 4 hex digits
    if (packetLength.length !== 4) {
        for (var j = packetLength.length; j < 4; j++) {
            packetLength = "0" + packetLength;
        }
    }
    // Reverse byte order
    var firstByte = packetLength.substr(0, 2);
    var secondByte = packetLength.substr(2, 2);
    packetLength = secondByte + firstByte + packetLength.substr(4);
    return packetLength;
}
exports.getPacketLengthFromData = getPacketLengthFromData;
function getPacketTypeFromHexString(str) {
    // Index 4, Length 2, Base 16
    return parseInt(str.substr(4, 2), 16);
}
exports.getPacketTypeFromHexString = getPacketTypeFromHexString;
function getPacketsFromHexString(str) {
    var packets = [];
    var end = false;
    var length;
    var data;
    var index = 0;
    var packetType;
    var bufferPacket = "";
    while (!end) {
        if (str.substr(index).length > 0) {
            //console.log(str.substr(index)+" - "+str.substr(index).length);
            // Length is *2 because we are parsing individual characters,
            // instead of individual bytes
            length = parseInt(str.substr(index + 2, 2) + str.substr(index, 2), 16) * 2;
            if (length === 0) {
                end = true;
            }
            else {
                data = str.substr(index, length);
                index += length;
                if (index > str.length) {
                    //console.log("Index [" + index + "] exceeds data length [" + str.length + "]");
                    bufferPacket = data;
                }
                else {
                    packetType = getPacketTypeFromHexString(data);
                    packets.push({
                        packetType: packetType,
                        data: data
                    });
                }
            }
        }
        else {
            end = true;
        }
    }
    return { bufferPacket: bufferPacket, packets: packets };
}
exports.getPacketsFromHexString = getPacketsFromHexString;
var PacketFactory = (function () {
    function PacketFactory() {
        this.packetData = "0000";
    }
    PacketFactory.prototype.setType = function (type) {
        var typeHex = (type).toString(16);
        // Length must be even
        if (typeHex.length % 2 !== 0) {
            typeHex = "0" + typeHex;
        }
        this.packetData = this.packetData.substr(0, 4) + typeHex + this.packetData.substr(6);
        this.updateLength();
        return this;
    };
    PacketFactory.prototype.packString = function (str) {
        var strHex = a2hex(str);
        var strHexLength = (strHex.length / 2).toString(16);
        // Length must be even
        if (strHexLength.length % 2 !== 0) {
            strHexLength = "0" + strHexLength;
        }
        this.packetData += strHexLength + strHex;
        this.updateLength();
        return this;
    };
    PacketFactory.prototype.packHex = function (hex) {
        this.packetData += hex;
        this.updateLength();
        return this;
    };
    PacketFactory.prototype.packByte = function (byte) {
        // 2 hex digits
        var intHex = (byte).toString(16);
        if (intHex.length !== 2) {
            for (var j = intHex.length; j < 2; j++) {
                intHex = "0" + intHex;
            }
        }
        this.packetData += intHex;
        this.updateLength();
        return this;
    };
    PacketFactory.prototype.packInt16 = function (int16) {
        // 4 hex digits
        var intHex = (int16).toString(16);
        if (intHex.length !== 4) {
            for (var j = intHex.length; j < 4; j++) {
                intHex = "0" + intHex;
            }
        }
        // Reverse byte order
        var firstByte = intHex.substr(0, 2);
        var secondByte = intHex.substr(2, 2);
        intHex = secondByte + firstByte;
        this.packetData += intHex;
        this.updateLength();
        return this;
    };
    PacketFactory.prototype.packInt32 = function (int32) {
        if (int32 < 0) {
            int32 = 4294967295;
        }
        var intHex = (int32).toString(16);
        if (intHex.length !== 8) {
            for (var j = intHex.length; j < 8; j++) {
                intHex = "0" + intHex;
            }
        }
        // Reverse byte order
        var firstByte = intHex.substr(0, 2);
        var secondByte = intHex.substr(2, 2);
        var thirdByte = intHex.substr(4, 2);
        var fourthByte = intHex.substr(6, 2);
        intHex = fourthByte + thirdByte + secondByte + firstByte;
        this.packetData += intHex;
        this.updateLength();
        return this;
    };
    PacketFactory.prototype.packSingle = function (float) {
        var tempBuffer = new Buffer(4);
        tempBuffer.writeFloatLE(float, 0);
        var single = tempBuffer.toString('hex');
        this.packetData += single;
        this.updateLength();
        return this;
    };
    PacketFactory.prototype.packColor = function (r, g, b) {
        this.packByte(r);
        this.packByte(g);
        this.packByte(b);
        return this;
    };
    PacketFactory.prototype.updateLength = function () {
        this.packetData = getPacketLengthFromData(this.packetData.substr(4)) + this.packetData.substr(4);
    };
    PacketFactory.prototype.data = function () {
        return this.packetData;
    };
    return PacketFactory;
}());
exports.PacketFactory = PacketFactory;
var ReadPacketFactory = (function () {
    function ReadPacketFactory(data) {
        // Store data after length and type
        this.packetData = data.substr(6);
        this.type = parseInt(data.substr(4, 2), 16);
    }
    ReadPacketFactory.prototype.readByte = function () {
        // Read byte and convert to int
        var byte = parseInt(this.packetData.substr(0, 2), 16);
        // Chop off read data
        this.packetData = this.packetData.substr(2);
        return byte;
    };
    ReadPacketFactory.prototype.readSByte = function () {
        var byte = parseInt(this.packetData.substr(0, 2), 16);
        // Chop off read data
        this.packetData = this.packetData.substr(2);
        var binaryValues = {
            0: 1,
            1: 2,
            2: 4,
            3: 8,
            4: 16,
            5: 32,
            6: 64,
            7: 128
        };
        // Convert byte to signed
        var sbyte = 0;
        for (var i = 7; i >= 0; i--) {
            if ((byte & binaryValues[i]) === binaryValues[i]) {
                if (binaryValues[i] === 128) {
                    sbyte = -128;
                }
                else {
                    sbyte += binaryValues[i];
                }
            }
        }
        return sbyte;
    };
    ReadPacketFactory.prototype.readInt16 = function () {
        // Read bytes
        var firstByte = this.packetData.substr(2, 2);
        var secondByte = this.packetData.substr(0, 2);
        // Convert to int
        var int16 = parseInt(firstByte + secondByte, 16);
        // Chop off read data
        this.packetData = this.packetData.substr(4);
        return int16;
    };
    ReadPacketFactory.prototype.readInt32 = function () {
        // Read bytes
        var firstByte = this.packetData.substr(6, 2);
        var secondByte = this.packetData.substr(4, 2);
        var thirdByte = this.packetData.substr(2, 2);
        var fourthByte = this.packetData.substr(0, 2);
        // Convert to int
        var int32 = parseInt(firstByte + secondByte + thirdByte + fourthByte, 16);
        // Chop off read data
        this.packetData = this.packetData.substr(8);
        return int32;
    };
    ReadPacketFactory.prototype.readSingle = function () {
        // Get hex string
        var hex = this.packetData.substr(0, 8);
        // Use buffer to read Float
        var buf = new Buffer(hex, 'hex');
        var single = buf.readFloatLE(0);
        // Chop off read data
        this.packetData = this.packetData.substr(8);
        return single;
    };
    ReadPacketFactory.prototype.readString = function () {
        // Read string length
        var strLength = parseInt(this.packetData.substr(0, 2), 16) * 2;
        // Read string content using length
        var strContent = hex2a(this.packetData.substr(2, strLength));
        // Chop off read data
        this.packetData = this.packetData.substr(2 + strLength);
        return strContent;
    };
    return ReadPacketFactory;
}());
exports.ReadPacketFactory = ReadPacketFactory;
function _invalidateRequireCacheForFile(filePath, require) {
    var realPath = path.resolve(filePath);
    delete require.cache[realPath];
}
exports._invalidateRequireCacheForFile = _invalidateRequireCacheForFile;
function requireNoCache(filePath, require) {
    _invalidateRequireCacheForFile(filePath, require);
    return require(filePath);
}
exports.requireNoCache = requireNoCache;
var MathEx = {
    getRandomInt: function (min, max) {
        return Math.floor(Math.random() * ((max + 1) - min)) + min;
    }
};