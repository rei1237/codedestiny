import { mongoose } from './db.js';
import { scopedModel } from './db-scope-connection.js';
// Bounded catalogue and day aggregates use the existing _id index. No migration or seed.
const productSchema = new mongoose.Schema({ _id: String, data: mongoose.Schema.Types.Mixed }, { timestamps: true });
const settingSchema = new mongoose.Schema({ _id: String, data: mongoose.Schema.Types.Mixed }, { timestamps: true });
const metricSchema = new mongoose.Schema({ _id: String, day: String, service: String, placement: String, productId: String, event: String, count: Number });
const reportSchema = new mongoose.Schema({ _id: String, data: mongoose.Schema.Types.Mixed }, { timestamps: true });
export const RecommendationProduct = scopedModel(mongoose.models.RecommendationProduct || mongoose.model('RecommendationProduct', productSchema));
export const RecommendationSetting = scopedModel(mongoose.models.RecommendationSetting || mongoose.model('RecommendationSetting', settingSchema));
export const RecommendationMetric = scopedModel(mongoose.models.RecommendationMetric || mongoose.model('RecommendationMetric', metricSchema));
export const RecommendationReport = scopedModel(mongoose.models.RecommendationReport || mongoose.model('RecommendationReport', reportSchema));
