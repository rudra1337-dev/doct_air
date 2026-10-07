import Document from './models/Document.js';

/**
 * Data access layer for Document metadata records
 */

export const createDocument = async (data) => {
  return Document.create(data);
};

export const findDocumentById = async (id) => {
  return Document.findById(id);
};

export const findDocumentByIdAndConversationId = async (id, conversationId) => {
  return Document.findOne({ _id: id, conversationId });
};

export const findDocumentsByConversationId = async (conversationId) => {
  return Document.find({
    conversationId,
    status: { $ne: 'deleted' },
  }).sort({ createdAt: 1 });
};

export const deleteDocumentById = async (id) => {
  return Document.findByIdAndDelete(id);
};

export const updateDocumentStatus = async (id, status) => {
  return Document.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: 'after' }
  );
};

export const updateDocument = async (id, updateData) => {
  return Document.findByIdAndUpdate(
    id,
    updateData,
    { returnDocument: 'after' }
  );
};

