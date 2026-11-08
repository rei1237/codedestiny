// Only the two new Mongo collections are simulated here. Existing payment routes use the shared fake driver.
export function addBusinessCollections(db) {
  const credentials = new Map(),
    meters = new Map();
  const findOne = db.findOne.bind(db),
    find = db.find.bind(db),
    update = db.updateOne.bind(db),
    del = db.deleteOne.bind(db);
  db.findOne = async (model, filter, opts) => {
    if (model.modelName !== "BusinessCredential")
      return findOne(model, filter, opts);
    const row = credentials.get(filter._id);
    return row && (!filter.hash || row.hash === filter.hash) ? row : null;
  };
  db.find = async (model, filter, opts) =>
    model.modelName === "BusinessMeter"
      ? Array.from(meters.values()).filter((row) =>
          filter._id.$in.includes(row._id),
        )
      : find(model, filter, opts);
  db.updateOne = async (model, filter, op, opts) => {
    if (model.modelName === "BusinessCredential") {
      credentials.set(filter._id, { _id: filter._id, ...op.$set });
      return { modifiedCount: 1 };
    }
    if (model.modelName !== "BusinessMeter")
      return update(model, filter, op, opts);
    if (!meters.has(filter._id))
      meters.set(filter._id, { _id: filter._id, calls: [], total: 0 });
    if (!Array.isArray(op)) return {};
    const row = meters.get(filter._id),
      [window, limit] = filter.$expr.$lt;
    const cutoff = window.$size.$filter.cond.$gt[1];
    const recent = row.calls.filter((t) => t > cutoff);
    if (recent.length >= limit) return { modifiedCount: 0 };
    row.calls = recent.concat(op[0].$set.calls.$concatArrays[1]);
    row.total++;
    return { modifiedCount: 1 };
  };
  db.deleteOne = async (model, filter) =>
    model.modelName === "BusinessCredential"
      ? credentials.delete(filter._id)
      : del(model, filter);
  return { credentials, meters };
}
