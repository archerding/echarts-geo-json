module.exports = {
    encodePolygon(coordinate, encodeScale) {
        let coordinateStr = '';
        for (let i = coordinate.length - 1; i > 0; i--) {
            let x = coordinate[i][0];
            let y = coordinate[i][1];
            x = x * encodeScale;
            y = y * encodeScale;
            x -= coordinate[i - 1][0] * encodeScale;
            y -= coordinate[i - 1][1] * encodeScale;
            x = (x << 1) ^ (x >> 31);
            y = (y << 1) ^ (y >> 31);
            coordinateStr = String.fromCharCode(x + 64) + String.fromCharCode(y + 64) + coordinateStr;
        }
        coordinateStr = '@@' + coordinateStr;
        let encodeOffsets = [coordinate[0][0] * encodeScale, coordinate[0][1] * encodeScale];
        return { coordinate: coordinateStr, encodeOffsets: encodeOffsets, encodeScale: encodeScale };
    },
    encode(json) {
        if (json.UTF8Encoding) {
            return json;
        }
        var encodeScale = json.UTF8Scale;
        if (encodeScale == null) {
            encodeScale = 1024;
        }

        var features = json.features;

        for (var f = 0; f < features.length; f++) {
            var feature = features[f];
            var geometry = feature.geometry;
            var coordinates = geometry.coordinates;
            feature.properties.childNum = coordinates.length;
            geometry.encodeOffsets = [];
            var encodeOffsets = geometry.encodeOffsets;
            for (var c = 0; c < coordinates.length; c++) {
                var coordinate = coordinates[c];

                if (geometry.type === 'Polygon') {
                    const encodeCoordinate = this.encodePolygon(
                        coordinate,
                        encodeScale
                    );
                    coordinates[c] = encodeCoordinate.coordinate;
                    encodeOffsets[c] = encodeCoordinate.encodeOffsets;
                }
                else if (geometry.type === 'MultiPolygon') {
                    for (var c2 = 0; c2 < coordinate.length; c2++) {
                        var polygon = coordinate[c2];
                        encodeOffsets[c] = [];
                        const encodeCoordinate = this.encodePolygon(
                            polygon,
                            encodeScale
                        );
                        coordinate[c2] = encodeCoordinate.coordinate;
                        encodeOffsets[c][c2] = encodeCoordinate.encodeOffsets;
                    }
                }
            }
        }
        // Has been encoded
        json.UTF8Encoding = true;
        return json;
    },

    decodePolygon(coordinate, encodeOffsets, encodeScale) {
        var result = [];
        var prevX = encodeOffsets[0];
        var prevY = encodeOffsets[1];

        for (var i = 0; i < coordinate.length; i += 2) {
            var x = coordinate.charCodeAt(i) - 64;
            var y = coordinate.charCodeAt(i + 1) - 64;
            // ZigZag decoding
            x = (x >> 1) ^ (-(x & 1));
            y = (y >> 1) ^ (-(y & 1));
            // Delta deocding
            x += prevX;
            y += prevY;

            prevX = x;
            prevY = y;
            // Dequantize
            result.push([x / encodeScale, y / encodeScale]);
        }

        return result;
    },
    decode(json) {
        if (!json.UTF8Encoding) {
            return json;
        }
        var encodeScale = json.UTF8Scale;
        if (encodeScale == null) {
            encodeScale = 1024;
        }

        var features = json.features;

        for (var f = 0; f < features.length; f++) {
            var feature = features[f];
            var geometry = feature.geometry;
            var coordinates = geometry.coordinates;
            var encodeOffsets = geometry.encodeOffsets;

            for (var c = 0; c < coordinates.length; c++) {
                var coordinate = coordinates[c];

                if (geometry.type === 'Polygon') {
                    coordinates[c] = this.decodePolygon(
                        coordinate,
                        encodeOffsets[c],
                        encodeScale
                    );
                }
                else if (geometry.type === 'MultiPolygon') {
                    for (var c2 = 0; c2 < coordinate.length; c2++) {
                        var polygon = coordinate[c2];
                        coordinate[c2] = this.decodePolygon(
                            polygon,
                            encodeOffsets[c][c2],
                            encodeScale
                        );
                    }
                }
            }
        }
        // Has been decoded
        json.UTF8Encoding = false;
        return json;
    }
};