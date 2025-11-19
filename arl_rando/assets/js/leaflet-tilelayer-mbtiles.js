/*
 * L.TileLayer.MBTiles
 * A Leaflet tile layer for MBTiles files.
 */

L.TileLayer.MBTiles = L.TileLayer.extend({
    initialize: function (mbtiles, options) {
        this._mbtiles = mbtiles;
        L.TileLayer.prototype.initialize.call(this, '', options);
    },

    createTile: function (coords, done) {
        var tile = document.createElement('img');

        L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

        this._loadTile(coords, tile);

        return tile;
    },

    _loadTile: function (coords, tile) {
        var self = this;
        var z = coords.z;
        var x = coords.x;
        var y = this._getTmsY(coords.y);

        if (this._mbtiles instanceof ArrayBuffer) {
            this._readMBTiles(this._mbtiles, function (err, mbtiles) {
                if (err) {
                    tile.src = L.Util.emptyImageUrl;
                    return;
                }
                self._mbtiles = mbtiles;
                self._getTile(z, x, y, function (err, data) {
                    if (err) {
                        tile.src = L.Util.emptyImageUrl;
                        return;
                    }
                    var blob = new Blob([data], { type: 'image/png' });
                    tile.src = URL.createObjectURL(blob);
                });
            });
        } else {
            this._getTile(z, x, y, function (err, data) {
                if (err) {
                    tile.src = L.Util.emptyImageUrl;
                    return;
                }
                var blob = new Blob([data], { type: 'image/png' });
                tile.src = URL.createObjectURL(blob);
            });
        }
    },

    _getTmsY: function (y) {
        return (1 << this._getZoomForUrl()) - 1 - y;
    },

    _readMBTiles: function (arrayBuffer, callback) {
        try {
            var mbtiles = {};
            var view = new DataView(arrayBuffer);

            // Check the header
            if (new TextDecoder().decode(new Uint8Array(arrayBuffer.slice(0, 4))) !== 'SQLi') {
                return callback(new Error('Not a valid MBTiles file'));
            }

            // Version number
            mbtiles.version = view.getUint8(4);

            // Metadata
            this._readMetadata(arrayBuffer, function (err, metadata) {
                if (err) return callback(err);
                mbtiles.metadata = metadata;
                callback(null, mbtiles);
            });
        } catch (e) {
            callback(e);
        }
    },

    _readMetadata: function (arrayBuffer, callback) {
        var view = new DataView(arrayBuffer);
        var metadataOffset = view.getUint32(36, true);
        var metadataLength = view.getUint32(40, true);
        var metadata = new Uint8Array(arrayBuffer, metadataOffset, metadataLength);
        var metadataStr = new TextDecoder().decode(metadata);
        var metadataObj = JSON.parse(metadataStr);
        callback(null, metadataObj);
    },

    _getTile: function (z, x, y, callback) {
        var self = this;
        var view = new DataView(this._mbtiles);
        var tileDataOffset = view.getUint32(24, true);
        var tileDataLength = view.getUint32(28, true);
        var tileMapOffset = view.getUint32(32, true);

        var tileMapView = new DataView(this._mbtiles, tileMapOffset);
        var numTiles = tileMapView.getUint32(0, true);
        var tileMapEntries = [];

        for (var i = 0; i < numTiles; i++) {
            var offset = 8 + i * 8;
            var tileZ = tileMapView.getUint8(offset);
            var tileX = tileMapView.getUint32(offset + 4, true);
            var tileY = tileMapView.getUint32(offset + 8, true);
            var tileOffset = tileMapView.getUint32(offset + 12, true);
            var tileLength = tileMapView.getUint32(offset + 16, true);
            tileMapEntries.push({
                z: tileZ,
                x: tileX,
                y: tileY,
                offset: tileDataOffset + tileOffset,
                length: tileLength
            });
        }

        var foundTile = tileMapEntries.find(function (entry) {
            return entry.z === z && entry.x === x && entry.y === y;
        });

        if (!foundTile) {
            return callback(new Error('Tile not found'));
        }

        var tileData = new Uint8Array(this._mbtiles, foundTile.offset, foundTile.length);
        callback(null, tileData);
    }
});

L.tileLayer.mbTiles = function (mbtiles, options) {
    return new L.TileLayer.MBTiles(mbtiles, options);
};
