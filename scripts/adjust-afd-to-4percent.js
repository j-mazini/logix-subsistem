/**
 * Ajusta os counts em dhl-lastday-pdf-data.js para que AFD % ≈ 4% (AFD por 100 entregas).
 * Mantém OK, PU, HN, DEPAR, ARRVD. Redefine os códigos AFD (BA, CA, CM, FP, ND, NH, etc.) para soma = round(0.04 * deliveries).
 */
var fs = require('fs');
var path = require('path');

var OPMS_AFD_EXCLUDED = ['OK', 'PU', 'HN', 'DEPAR', 'ARRVD'];
var TARGET_AFD_PCT = 0.04; // 4%

var dataPath = path.join(__dirname, '..', 'dhl-lastday-pdf-data.js');
var content = fs.readFileSync(dataPath, 'utf8');

var start = content.indexOf('var d = ');
if (start === -1) {
  console.error('Could not find "var d = " in file');
  process.exit(1);
}
start += 8; // length of "var d = "
var depth = 0;
var end = start;
for (var i = start; i < content.length; i++) {
  if (content[i] === '{') depth++;
  else if (content[i] === '}') {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
var jsonStr = content.slice(start, end);
var d = JSON.parse(jsonStr);

function adjustCounts(counts) {
  var deliveries = (counts.OK || 0) + (counts.PU || 0) + (counts.HN || 0);
  var targetAfd = deliveries > 0 ? Math.round(TARGET_AFD_PCT * deliveries) : 0;

  var excluded = {};
  OPMS_AFD_EXCLUDED.forEach(function (c) { excluded[c] = true; });

  var newCounts = {};
  Object.keys(counts).forEach(function (k) {
    if (excluded[k]) {
      newCounts[k] = counts[k];
    } else {
      newCounts[k] = 0;
    }
  });
  if (targetAfd > 0) newCounts['BA'] = targetAfd;
  return newCounts;
}

Object.keys(d).forEach(function (date) {
  var day = d[date];
  if (day && day.byRoute) {
    Object.keys(day.byRoute).forEach(function (key) {
      var rec = day.byRoute[key];
      if (rec && rec.counts) rec.counts = adjustCounts(rec.counts);
    });
  }
});

var newJson = JSON.stringify(d);
var newContent = content.slice(0, start) + newJson + content.slice(end);
fs.writeFileSync(dataPath, newContent, 'utf8');
console.log('Updated dhl-lastday-pdf-data.js: AFD set to ~4% of deliveries per route.');
