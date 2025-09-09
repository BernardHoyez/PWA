
/* --- GEO PICKER INTEGRATION (injected by editeurGPT1 assistant) ---
   Logic: when importing a file, if it's an mp4 and no GPS coords are found,
   we call GeoPicker.show({...}) and then assign the coords to the file metadata object.
   The code below attempts to hook into common import handlers.
*/

// Begin injected geo picker hook
function formatCoordsToDMS(lat, lng){
  // returns format XX°XX.XXN, YY°YY.YYE approximate
  function toDMS(v, isLat){
    var absv = Math.abs(v);
    var deg = Math.floor(absv);
    var minFloat = (absv - deg) * 60;
    var minutes = Math.floor(minFloat);
    var sec = (minFloat - minutes) * 60;
    // combine degrees and minutes with decimal for similarity to user's format
    var dec = (minutes + sec/60).toFixed(2);
    var hemi = '';
    if(isLat) hemi = (v>=0)?'N':'S'; else hemi = (v>=0)?'E':'W';
    return deg + "°" + dec + hemi;
  }
  return toDMS(lat,true) + ", " + toDMS(lng,false);
}

// Attempts to handle a file entry object {name, type, metadata: {...}} or raw File
function handleImportedFileForGeo(fileEntry, onDone){
  try {
    var isFile = (fileEntry instanceof File);
    var name = isFile ? fileEntry.name : (fileEntry.name || 'unknown');
    var type = isFile ? fileEntry.type : (fileEntry.type || '');
    var isVideo = type.indexOf('video')===0 || /\\.mp4$/i.test(name);
    if(!isVideo){
      if(onDone) onDone();
      return;
    }
    // check existing metadata coords
    var hasCoords = false;
    if(!isFile && fileEntry.metadata){
      if(fileEntry.metadata.latitude || fileEntry.metadata.lat || fileEntry.metadata.gps){
        hasCoords = true;
      }
    }
    // if it's a File, metadata extraction code may exist elsewhere; we conservatively prompt when no coords known
    if(!hasCoords){
      // show GeoPicker modal
      GeoPicker.show({
        lat: 46.0, lng: 2.0, zoom: 6,
        onConfirm: function(lat,lng){
          // assign into fileEntry metadata
          var dms = formatCoordsToDMS(lat,lng);
          if(isFile){
            // create a metadata object on the File wrapper (can't modify File), so we call callback with info
            if(onDone) onDone({name:name, type:type, latitude:lat, longitude:lng, coordsDMS:dms});
          } else {
            fileEntry.metadata = fileEntry.metadata || {};
            fileEntry.metadata.latitude = lat;
            fileEntry.metadata.longitude = lng;
            fileEntry.metadata.coordsDMS = dms;
            if(onDone) onDone(fileEntry);
          }
        },
        onCancel: function(){ if(onDone) onDone(); }
      });
    } else {
      if(onDone) onDone(fileEntry);
    }
  } catch(e){
    console.error("Geo hook error", e);
    if(onDone) onDone();
  }
}
// End injected geo picker hook

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('fetch', e => {});

// Wrapper: attempt to intercept file input change handlers and wrap processing to support geo picker for mp4
function wrapFileInputHandlers(){
  try {
    var inputs = document.querySelectorAll('input[type=file]');
    inputs.forEach(function(inp){
      if(inp._geoWrapped) return;
      inp._geoWrapped = true;
      inp.addEventListener('change', function(e){
        var files = Array.from(inp.files || []);
        var results = [];
        var pending = files.length;
        if(pending===0) return;
        files.forEach(function(f,i){
          handleImportedFileForGeo(f, function(result){
            results[i] = result || f;
            pending--;
            if(pending===0){
              // dispatch a custom event with the processed files
              var ev = new CustomEvent('geoFilesReady',{detail:results});
              inp.dispatchEvent(ev);
            }
          });
        });
      });
    });
  } catch(e){ console.error(e); }
}
document.addEventListener('DOMContentLoaded', wrapFileInputHandlers);
