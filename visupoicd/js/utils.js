(function(){
    function toRad(deg){ 
        return deg * Math.PI / 180; 
    }
    
    function toDeg(rad){ 
        return rad * 180 / Math.PI; 
    }

    var exported = {};

    exported.haversineDistance = function(lat1, lon1, lat2, lon2){
        const R = 6371000;
        const phi1 = toRad(lat1);
        const phi2 = toRad(lat2);
        const deltaPhi = toRad(lat2 - lat1);
        const deltaLambda = toRad(lon2 - lon1);
        const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    exported.bearing = function(lat1, lon1, lat2, lon2){
        const phi1 = toRad(lat1);
        const phi2 = toRad(lat2);
        const lambda1 = toRad(lon1);
        const lambda2 = toRad(lon2);
        const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
        const x = Math.cos(phi1) * Math.sin(phi2) -
                  Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
        let theta = toDeg(Math.atan2(y, x));
        theta = (theta + 360) % 360;
        return theta;
    };

    exported.formatLat = function(lat){
        const hemi = lat >= 0 ? 'N' : 'S';
        return Math.abs(lat).toFixed(6) + '°' + hemi;
    };

    exported.formatLon = function(lon){
        const hemi = lon >= 0 ? 'E' : 'W';
        return Math.abs(lon).toFixed(6) + '°' + hemi;
    };

    window.visupoiUtils = exported;
})();