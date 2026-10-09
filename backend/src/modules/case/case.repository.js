import Case from './models/Case.js';

/**
 * Data access layer for structured Case persistence
 */

export const createCase = async (caseData) => {
  return Case.create(caseData);
};

export const findCaseById = async (id) => {
  return Case.findById(id);
};

export const findCaseByConversationId = async (conversationId) => {
  return Case.findOne({ conversationId });
};

export const findCaseByIdAndPatientId = async (id, patientId) => {
  return Case.findOne({ _id: id, patientId });
};

export const findCasesByPatientId = async (patientId, { limit = 50, sort = { updatedAt: -1 } } = {}) => {
  return Case.find({ patientId }).sort(sort).limit(limit);
};

export const findAllCases = async (query = {}, { limit = 50, sort = { updatedAt: -1 } } = {}) => {
  return Case.find(query).sort(sort).limit(limit);
};

export const updateCaseById = async (id, updateData) => {
  return Case.findByIdAndUpdate(
    id,
    updateData,
    { returnDocument: 'after', runValidators: true }
  );
};

export const deleteCaseById = async (id) => {
  return Case.findByIdAndDelete(id);
};

export default {
  createCase,
  findCaseById,
  findCaseByConversationId,
  findCaseByIdAndPatientId,
  findCasesByPatientId,
  findAllCases,
  updateCaseById,
  deleteCaseById,
};
