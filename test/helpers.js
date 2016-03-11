exports.routesToStrings = (server) => {
  return server.table()[0].table.map(r => `${r.path}|${r.method}`).sort();
}
