var fromjson = require('ngraph.fromjson');
var fs = require('fs');
var searchQuery = process.argv[2] || '(^lodash[.-])|(^lodash$)';
var graphName = process.argv[3] || './data/dependenciesGraph.out.graph';

console.log('Reading graph ' + graphName);
var graph = fromjson(fs.readFileSync(graphName, 'utf8'));
var allPackages = graph.getNodesCount();
console.log('Done. Found ' + allPackages + ' packages');
console.log('Searching modules matching: ' + searchQuery);
var dependents = Object.create(null);
var matchRegex = new RegExp(searchQuery);

graph.forEachNode(match);
var names = Object.keys(dependents);
console.log('Found ' + names.length + ' matches');
console.log('Computing transitive dependents for each module');

var globallySeen = Object.create(null);
names.forEach(computeDeps);
var results = names.sort(byDeps).map(toPrettyString);
console.log(results);

var grandTotal = Object.keys(globallySeen).length;
console.log(grandTotal + ' unique packages depend on ' + searchQuery + ' out of total ' + allPackages + ' packages');
console.log('That is ' + (100 * grandTotal / allPackages).toFixed(3) + '%');

function byDeps(x, y) {
  return dependents[y] - dependents[x];
}

function toPrettyString(x) {
  return 'https://www.npmjs.org/package/' + x + ' - ' + dependents[x];
}

function match(node) {
  if (node.id.match(matchRegex)) {
    dependents[node.id] = 0;
  }
}

function computeDeps(module) {
  var moduleDepepndents = 0;
  var seen = Object.create(null);
  countInside(module);
  dependents[module] = moduleDepepndents;

  function countInside(name) {
    // we don't want to stuck in infinite cycle here, so
    // opt out as soon as we already visited this package:
    if (seen[name]) return;

    // glballySeen will give us unique package names at the end
    globallySeen[name] = true;
    // while seen will just prevent stack size exceeded error.
    seen[name] = true;

    graph.forEachLinkedNode(name, countDependents);

    function countDependents(other, link) {
      var isDependent = link.toId === name;
      if (isDependent) {
        moduleDepepndents += 1;
        // go up the dependents tree
        countInside(link.fromId);
      }
    }
  }
}